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

router.get("/", (_req, res) => res.json({ ok: true, msg: "CHV backend ready" }));
router.get("/health", (_req, res) => res.json({ ok: true }));

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/employee", employeeRoutes);

app.use("/", router);
app.use("/api", router);

export default app;
