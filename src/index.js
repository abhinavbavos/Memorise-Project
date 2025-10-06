// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import compression from "compression";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import trophyRoutes from "./routes/trophies.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import billingRoutes from "./routes/billing.js";
import fileRoutes from "./routes/files.js";
import metaRoutes from "./routes/meta.js";

const app = express();
const PORT = process.env.PORT || 4060;

// If running behind a proxy (NGINX/ELB/etc.)
app.set("trust proxy", 1);

/* =========================
   CORS (allowlist + credentials)
   ========================= */
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://13.235.238.42", // frontend over HTTP using IP (testing)
  "http://memorise.kpfchickland.com",
  "https://memorise.kpfchickland.com",
];

// Optional: allow override via env (comma-separated)
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser clients like curl/postman (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Ensure preflight succeeds quickly
app.options("*", cors());

/* =========================
   Security & core middleware
   ========================= */
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(mongoSanitize());
app.use(xss());
app.use(compression());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Rate limiter (skip OPTIONS to avoid counting preflight)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS",
  })
);

/* ========
   Health
   ======== */
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

/* ========
   Routes
   ======== */
app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/trophies", trophyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/files", fileRoutes);

/* =========================
   404 + error handler
   ========================= */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  // Minimal, safe error surface
  console.error(err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? status === 500
        ? "Server error"
        : err.message || "Request error"
      : err.message || "Server error";
  res.status(status).json({ error: message });
});

/* ========
   Start
   ======== */
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log(`API running on :${PORT}`));
  })
  .catch((e) => {
    console.error("DB connection failed:", e);
    process.exit(1);
  });
