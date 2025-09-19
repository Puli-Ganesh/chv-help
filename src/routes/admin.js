import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { many, one, tx } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { parseExcelBufferToJson } from "../utils/excel.js";

const upload = multer(); // memory
const router = express.Router();

router.get("/employees", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await many(
    `SELECT id, username, role, created_at
       FROM users
      WHERE role = 'employee'
   ORDER BY created_at DESC`
  );
  res.json({ employees: rows });
});

router.post("/employees", requireAuth, requireAdmin, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const hash = await bcrypt.hash(password, 10);
  try {
    const row = await one(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'employee')
       RETURNING id, username, role, created_at`,
      [username, hash]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Username taken" });
    throw e;
  }
});

// Upload Excel and assign rows to employee
router.post(
  "/files/upload",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    const { file } = req;
    const { employeeId } = req.body || {};
    const uploadedBy = req.user.id;

    if (!file || !employeeId) {
      return res.status(400).json({ error: "file and employeeId required" });
    }

    const filename = file.originalname;
    const url = `memory://${filename}`; // plug S3 later

    const result = await tx(async (client) => {
      const f = await client.query(
        `INSERT INTO files (filename, url, uploaded_by, assigned_to)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [filename, url, uploadedBy, employeeId]
      );
      const fileId = f.rows[0].id;

      const jsonRows = parseExcelBufferToJson(file.buffer); // first sheet
      if (!jsonRows.length) return { fileId, count: 0 };

      const values = [];
      const params = [];
      let i = 1;
      for (const row of jsonRows) {
        values.push(`($${i++}, $${i++}, $${i++})`);
        params.push(fileId, employeeId, JSON.stringify(row));
      }
      await client.query(
        `INSERT INTO records (file_id, employee_id, data) VALUES ${values.join(",")}`,
        params
      );

      return { fileId, count: jsonRows.length };
    });

    res.json({ ok: true, fileId: result.fileId, rowsInserted: result.count });
  }
);

// Optional admin stats
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await many(
    `SELECT u.id as employee_id, u.username,
            COUNT(r.*) as total,
            COUNT(*) FILTER (WHERE r.status = 'Win') as win,
            COUNT(*) FILTER (WHERE r.status = 'Lose') as lose,
            COUNT(*) FILTER (WHERE r.status = 'Pending') as pending
       FROM users u
  LEFT JOIN records r ON r.employee_id = u.id
      WHERE u.role = 'employee'
   GROUP BY u.id, u.username
   ORDER BY u.username`
  );
  res.json({ stats: rows });
});

router.get("/records", requireAuth, requireAdmin, async (req, res) => {
  const { employeeId } = req.query;
  const rows = await many(
    `SELECT r.id, r.file_id, r.employee_id, r.data, r.status, r.reason, r.created_at, r.updated_at
       FROM records r
      WHERE ($1::uuid IS NULL OR r.employee_id = $1::uuid)
   ORDER BY r.created_at DESC`,
    [employeeId || null]
  );
  res.json({ records: rows });
});

export default router;
