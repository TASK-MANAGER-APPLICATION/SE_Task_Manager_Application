
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { rateLimit } = require("express-rate-limit");
const pool = require("../db");
const { sendPasswordResetEmail } = require("../services/email");

const router = express.Router();

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const PASSWORD_RESET_MESSAGE =
  "If an account matches that email, a password reset link will be sent.";
const passwordResetRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Too many password reset attempts. Please try again later.",
  },
};
const forgotPasswordLimiter = rateLimit(passwordResetRateLimitOptions);
const resetPasswordLimiter = rateLimit(passwordResetRateLimitOptions);

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function safeErrorCode(error) {
  return (
    typeof error?.code === "string" && /^E[A-Z0-9_]{1,15}$/.test(error.code)
      ? error.code
      : "UNKNOWN"
  );
}

function logPasswordResetEmailDeliveryFailure(error) {
  const code = safeErrorCode(error);
  console.error("Password reset email delivery failed.", { code });
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Register a new user
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
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

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (
    typeof email !== "string" ||
    email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();
  let resetEmail;
  let resetToken;

  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      "SELECT id, email FROM users WHERE email = $1 FOR UPDATE",
      [normalizedEmail]
    );

    if (userResult.rowCount > 0) {
      const user = userResult.rows[0];
      resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

      await client.query(
        "UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE",
        [user.id]
      );
      await client.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at, used)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes', FALSE)`,
        [user.id, tokenHash]
      );
      resetEmail = user.email;
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Password reset request failed.", {
      code: safeErrorCode(err),
    });
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to process the password reset request.",
    });
  } finally {
    client.release();
  }

  // Send after the generic response so SMTP latency cannot reveal account existence.
  res.status(202).json({ message: PASSWORD_RESET_MESSAGE });
  if (resetEmail && resetToken) {
    setImmediate(() => {
      sendPasswordResetEmail(resetEmail, resetToken).catch((error) => {
        logPasswordResetEmailDeliveryFailure(error);
      });
    });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({
      code: "INVALID_RESET_TOKEN",
      message: "This password reset link is invalid or has expired.",
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      code: "WEAK_PASSWORD",
      message: "Password must have at least 8 characters, including uppercase, lowercase, a number and a special character.",
    });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const candidateResult = await client.query(
      `SELECT id, user_id
       FROM password_resets
       WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );

    if (candidateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        code: "INVALID_RESET_TOKEN",
        message: "This password reset link is invalid or has expired.",
      });
    }

    const { id: resetId, user_id: userId } = candidateResult.rows[0];
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const resetResult = await client.query(
      `SELECT id
       FROM password_resets
       WHERE id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > NOW()
       FOR UPDATE`,
      [resetId, tokenHash]
    );
    if (resetResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        code: "INVALID_RESET_TOKEN",
        message: "This password reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      userId,
    ]);
    await client.query(
      "UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [userId]
    );
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await client.query("COMMIT");

    return res.status(200).json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Password reset failed.", {
      code: safeErrorCode(err),
    });
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to reset your password right now.",
    });
  } finally {
    client.release();
  }
});

const authMiddleware = require("../middleware/authMiddleware");
// Retrieve the authenticated user's profile.
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "Profile not found.",
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
      },
    });
  } catch (err) {
    console.error("Profile retrieval failed:", err.message);

    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to retrieve your profile right now.",
    });
  }
});

// Update the authenticated user's name and email.
router.put("/profile", authMiddleware, async (req, res) => {
  const { name, email } = req.body || {};

  if (typeof name !== "string" || !name.trim() || name.trim().length > 255) {
    return res.status(400).json({
      code: "INVALID_NAME",
      message: "Name must contain between 1 and 255 characters.",
    });
  }

  if (
    typeof email !== "string" ||
    email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    });
  }

  try {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE id = $3
       RETURNING id, email, name`,
      [normalizedName, normalizedEmail, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "Profile not found.",
      });
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists.",
      });
    }

    console.error("Profile update failed:", err.message);

    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to update your profile right now.",
    });
  }
});

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
