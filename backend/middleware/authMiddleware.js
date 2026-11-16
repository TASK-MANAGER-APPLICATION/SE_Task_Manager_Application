
const crypto = require("crypto");
const pool = require("../db");

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

async function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      code: "SESSION_EXPIRED",
      message: "Authentication required.",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      code: "SESSION_EXPIRED",
      message: "Authentication required.",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT s.id AS session_id,
              s.user_id,
              s.last_activity_at
       FROM sessions s
       WHERE s.token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(401).json({
        code: "SESSION_EXPIRED",
        message: "Session is invalid or expired.",
      });
    }

    const session = result.rows[0];
    const lastActivity = new Date(session.last_activity_at).getTime();

    if (
      !Number.isFinite(lastActivity) ||
      Date.now() - lastActivity >= IDLE_TIMEOUT_MS
    ) {
      await client.query(
        "DELETE FROM sessions WHERE id = $1",
        [session.session_id]
      );

      await client.query("COMMIT");

      return res.status(401).json({
        code: "SESSION_EXPIRED",
        message: "Session is invalid or expired.",
      });
    }

    await client.query(
      "UPDATE sessions SET last_activity_at = NOW() WHERE id = $1",
      [session.session_id]
    );

    await client.query("COMMIT");

    req.user = { id: session.user_id };
    req.sessionId = session.session_id;

    return next();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Authentication middleware failed:", err.message);

    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to authenticate request.",
    });
  } finally {
    client.release();
  }
}

module.exports = authMiddleware;
