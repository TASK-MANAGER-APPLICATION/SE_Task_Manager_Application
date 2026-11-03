
require("dotenv").config();

const express = require("express");
const app = express();

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

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Task Manager backend is running",
  });
});

app.use("/auth", require("./routes/auth"));
app.use("/tasks", require("./routes/tasks"));

module.exports = app;
