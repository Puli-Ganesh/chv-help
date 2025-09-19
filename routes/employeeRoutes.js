import express from "express";
import { many, one } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/files", requireAuth, async (req, res) => {
  const me = req.user;
  const rows = await many(
    `SELECT id, filename, url, created_at
       FROM files
      WHERE assigned_to = $1
   ORDER BY created_at DESC`,
    [me.id]
  );
  res.json({ files: rows });
});

router.get("/records", requireAuth, async (req, res) => {
  const me = req.user;
  const { fileId } = req.query;
  const rows = await many(
    `SELECT r.id, r.file_id, r.data, r.status, r.reason, r.updated_at, r.created_at
       FROM records r
      WHERE r.employee_id = $1
        AND ($2::uuid IS NULL OR r.file_id = $2::uuid)
   ORDER BY r.created_at ASC`,
    [me.id, fileId || null]
  );
  res.json({ records: rows });
});

router.patch("/records/:id", requireAuth, async (req, res) => {
  const me = req.user;
  const { id } = req.params;
  const { status, reason } = req.body || {};
  if (status && !["Win", "Lose", "Pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const rec = await one(
    `SELECT id FROM records WHERE id = $1 AND employee_id = $2`,
    [id, me.id]
  );
  if (!rec) return res.status(404).json({ error: "Record not found" });

  const row = await one(
    `UPDATE records
        SET status = $1,
            reason = $2,
            updated_at = NOW()
      WHERE id = $3
   RETURNING id, file_id, data, status, reason, updated_at`,
    [status || null, reason || null, id]
  );
  res.json(row);
});

export default router;
