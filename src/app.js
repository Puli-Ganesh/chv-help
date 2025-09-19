import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import employeeRoutes from "./routes/employee.js";

dotenv.config();

const app = express();

const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, origins.length ? origins : true),
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const router = express.Router();

// health route (no /api prefix inside the app)
router.get("/health", (_req, res) => res.json({ ok: true }));

// your feature routes (no /api prefix inside the app)
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/employee", employeeRoutes);

// mount for Vercel (which strips /api)
app.use("/", router);

// ALSO mount under /api for local dev
app.use("/api", router);

export default app;
