const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parseBufferToRows(file) {
  const name = file.originalname || '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) {
    const text = file.buffer.toString('utf8');
    const wb = XLSX.read(text, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, blankrows: false });
    if (rows.length === 0) {
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false });
      rows = buildRowsFromMatrix(matrix);
    }
    return rows;
  }
  const wb = XLSX.read(file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  let rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, blankrows: false });
  if (rows.length === 0) {
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false });
    rows = buildRowsFromMatrix(matrix);
  }
  return rows;
}

function buildRowsFromMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) return [];
  let headerRowIndex = -1;
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const hasAny = row.some(v => String(v ?? '').trim() !== '');
    if (hasAny) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) return [];
  const headers = (matrix[headerRowIndex] || []).map((h, i) => {
    const base = String(h || '').trim();
    return base ? base : `Column${i + 1}`;
  });
  const dataRows = matrix.slice(headerRowIndex + 1);
  const out = [];
  for (const r of dataRows) {
    if (!Array.isArray(r)) continue;
    const hasAny = r.some(v => String(v ?? '').trim() !== '');
    if (!hasAny) continue;
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    out.push(obj);
  }
  return out;
}

router.post('/upload', auth(), requireRole('admin'), upload.single('file'), async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  if (!req.file) return res.status(400).json({ error: 'file required' });

  try {
    const emp = await pool.query("SELECT id FROM users WHERE id=$1 AND role='employee'", [employeeId]);
    if (!emp.rowCount) return res.status(404).json({ error: 'employee not found' });

    const rows = parseBufferToRows(req.file);
    const filename = req.file.originalname;
    const uploader = req.user.id;
    const url = `excel://${filename}`;

    await pool.query('BEGIN');
    const f = await pool.query(
      "INSERT INTO files (filename, url, uploaded_by, assigned_to) VALUES ($1,$2,$3,$4) RETURNING id",
      [filename, url, uploader, employeeId]
    );
    const fileId = f.rows[0].id;

    let inserted = 0;
    for (const r of rows) {
      const isEmpty = Object.values(r).every(v => String(v ?? '').trim() === '');
      if (isEmpty) continue;
      await pool.query(
        "INSERT INTO records (file_id, employee_id, data) VALUES ($1,$2,$3::jsonb)",
        [fileId, employeeId, JSON.stringify(r)]
      );
      inserted += 1;
    }
    await pool.query('COMMIT');

    res.json({ ok: true, fileId, rowsInserted: inserted });
  } catch {
    try { await pool.query('ROLLBACK'); } catch {}
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
