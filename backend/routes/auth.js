
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Register a new user
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return res.status(400).json({
      code: "WEAK_PASSWORD",
      message: "Password must have at least 8 characters, including uppercase, lowercase, a number and a special character.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.trim().toLowerCase(), passwordHash, name || null]
    );

    return res.status(201).json({
      userId: result.rows[0].id,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", err.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to register right now.",
    });
  }
});

// Login and create a server-side session
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Email and password are required.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, name, password_hash
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }

    const token = createSessionToken();
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash)
       VALUES ($1, $2)`,
      [user.id, tokenHash]
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to log in right now.",
    });
  }
});

const authMiddleware = require("../middleware/authMiddleware");

// Logout: invalidate the current session
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM sessions WHERE id = $1 AND user_id = $2",
      [req.sessionId, req.user.id]
    );

    return res.status(204).end();
  } catch (err) {
    console.error("Logout failed:", err.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to log out right now.",
    });
  }
});

// Change password
router.post("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" ||
      typeof newPassword !== "string") {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Current and new passwords are required.",
    });
  }

  if (
    newPassword.length < 8 ||
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/\d/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    return res.status(400).json({
      code: "WEAK_PASSWORD",
      message: "The new password does not meet the requirements.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT password_hash FROM users WHERE id = $1 FOR UPDATE",
      [req.user.id]
    );

    if (
      result.rowCount === 0 ||
      !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))
    ) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "Current password is incorrect.",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newHash, req.user.id]
    );

    // Invalidate all sessions after a password change.
    await client.query(
      "DELETE FROM sessions WHERE user_id = $1",
      [req.user.id]
    );

    await client.query("COMMIT");
    return res.status(204).end();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Password change failed:", err.message);

    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to change password right now.",
    });
  } finally {
    client.release();
  }
});


module.exports = router;
