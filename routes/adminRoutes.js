const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/employees', auth(), requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query("SELECT id, username, role, created_at FROM users WHERE role IN ('employee','admin') ORDER BY created_at DESC");
    res.json({ employees: r.rows });
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

router.post('/employees', auth(), requireRole('admin'), async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query("INSERT INTO users (username, password_hash, role) VALUES ($1,$2,'employee') RETURNING id, username, role, created_at", [username, hash]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'username already exists' });
    res.status(500).json({ error: 'failed' });
  }
});

router.get('/dashboard', auth(), requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT u.id as employee_id, u.username, COUNT(r.*) as total, COUNT(CASE WHEN r.status='Win' THEN 1 END) as win, COUNT(CASE WHEN r.status='Lose' THEN 1 END) as lose, COUNT(CASE WHEN r.status='Pending' THEN 1 END) as pending FROM users u LEFT JOIN records r ON r.employee_id=u.id WHERE u.role='employee' GROUP BY u.id, u.username ORDER BY u.username ASC"
    );
    res.json({ employees: r.rows });
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

router.get('/records', auth(), requireRole('admin'), async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  try {
    const r = await pool.query(
      "SELECT r.id, r.data, r.status, r.reason, r.updated_at, f.filename FROM records r LEFT JOIN files f ON f.id=r.file_id WHERE r.employee_id=$1 ORDER BY r.created_at ASC",
      [employeeId]
    );
    res.json({ records: r.rows });
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
