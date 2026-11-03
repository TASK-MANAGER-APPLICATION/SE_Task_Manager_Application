
require("dotenv").config();

const express = require("express");
const app = express();

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
