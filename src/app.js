// D:\chv-final-backend\src\app.js
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

// Define a router WITHOUT the /api prefix
const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/employee", employeeRoutes);

// Mount it at "/" so Vercel (which strips /api) matches "/health"
app.use("/", router);

// Mount it at "/api" too so your local calls to /api/... still work
app.use("/api", router);

export default app;
