
require("dotenv").config();

const express = require("express");
const pool = require("./db");
const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const configuredOrigins = process.env.CORS_ORIGINS;
const allowedOrigins = new Set(
  (configuredOrigins
    ? configuredOrigins.split(",")
    : [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
      ]
  )
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.get("Origin");

  if (!origin || !allowedOrigins.has(origin)) {
    return next();
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.vary("Origin");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({
      status: "ok",
      message: "Task Manager backend is running",
    });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
});

app.use("/auth", require("./routes/auth"));
app.use("/tasks", require("./routes/tasks"));
app.use("/categories", require("./routes/categories"));

app.use((req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "Route not found." });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled request error:", err.message);
  } else {
    console.error("Unhandled request error.");
  }
  return res.status(err.status >= 400 && err.status < 500 ? err.status : 500).json({
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
  });
});

module.exports = app;
