const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const r = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username=$1', [username]);
    if (!r.rowCount) return res.status(401).json({ error: 'invalid credentials' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, username: user.username });
  } catch {
    res.status(500).json({ error: 'login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
