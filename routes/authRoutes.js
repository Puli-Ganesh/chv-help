import express from "express";
import bcrypt from "bcryptjs";
import { one } from "../db.js";
import { signToken, verifyUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing creds" });
  const user = await verifyUser(username, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user);
  res.json({ token, user });
});

router.post("/bootstrap-admin", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing creds" });
  const existing = await one(`SELECT 1 FROM users WHERE role = 'admin'`);
  if (existing) return res.status(400).json({ error: "Admin already exists" });
  const hash = await bcrypt.hash(password, 10);
  const row = await one(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin') RETURNING id, username, role`,
    [username, hash]
  );
  const token = signToken(row);
  res.json({ token, user: row });
});

router.post("/logout", (_req, res) => res.json({ ok: true }));

export default router;
