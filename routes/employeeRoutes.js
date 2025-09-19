const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/records', auth(), requireRole('employee'), async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT r.id, r.data, r.status, r.reason, r.updated_at, f.id as file_id, f.filename, f.created_at as file_created_at FROM records r JOIN files f ON f.id=r.file_id WHERE r.employee_id=$1 ORDER BY r.created_at ASC",
      [req.user.id]
    );
    res.json({ records: r.rows });
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

router.patch('/records/:id/status', auth(), requireRole('employee'), async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};
  if (!status || !['Win', 'Lose', 'Pending'].includes(status)) return res.status(400).json({ error: 'invalid status' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'reason required' });
  try {
    const r = await pool.query(
      "UPDATE records SET status=$1::status, reason=$2, updated_at=NOW() WHERE id=$3 AND employee_id=$4 RETURNING id, data, status, reason, updated_at",
      [status, reason, id, req.user.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
