const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/upload', auth(), requireRole('admin'), upload.single('file'), async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const emp = await pool.query("SELECT id FROM users WHERE id=$1 AND role='employee'", [employeeId]);
    if (!emp.rowCount) return res.status(404).json({ error: 'employee not found' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const filename = req.file.originalname;
    const uploader = req.user.id;
    const url = `excel://${filename}`;
    await pool.query('BEGIN');
    const f = await pool.query("INSERT INTO files (filename, url, uploaded_by, assigned_to) VALUES ($1,$2,$3,$4) RETURNING id", [filename, url, uploader, employeeId]);
    const fileId = f.rows[0].id;
    for (const r of rows) {
      await pool.query("INSERT INTO records (file_id, employee_id, data) VALUES ($1,$2,$3::jsonb)", [fileId, employeeId, JSON.stringify(r)]);
    }
    await pool.query('COMMIT');
    res.json({ ok: true, fileId, rowsInserted: rows.length });
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch {}
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
