import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import skillsRouter from "./routes/skills";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: ["http://localhost:3000", "https://*.vercel.app"], credentials: true }));
app.use(express.json({ limit: "5mb" }));

// Routes
app.use("/api/skills", skillsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SkillForge API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Connect DB and start
async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/skillforge";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🦞 SkillForge API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  }
}

start();

export default app;