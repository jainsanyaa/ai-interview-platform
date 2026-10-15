import "dotenv/config";
import express from "express";
import cors from "cors";
import resumeRoutes from "./routes/resume.js";

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "⚠️  GROQ_API_KEY is not set. Add it to backend/.env before uploading a resume."
  );
}

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));

// Health checks
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Route handlers
app.use("/api/resume", resumeRoutes);
app.use("/resume", resumeRoutes);

// Serve frontend static build on the same port (Unified single URL)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleDistPaths = [
  path.join(__dirname, "../frontend/dist"),
  path.join(__dirname, "../../frontend/dist"),
  path.join(process.cwd(), "ai-interview-platform/frontend/dist"),
  path.join(process.cwd(), "frontend/dist")
];

const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html")));

if (distPath) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/resume")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Unexpected server error." });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AI Interview backend running on http://localhost:${PORT}`);
  });
}

export default app;
