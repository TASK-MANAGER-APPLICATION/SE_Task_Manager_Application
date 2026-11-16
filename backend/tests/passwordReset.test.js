const request = require("supertest");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const app = require("../app");
const pool = require("../db");

jest.mock("../services/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
const { sendPasswordResetEmail } = require("../services/email");

describe("password reset flow", () => {
  const email = `password-reset-${Date.now()}@example.com`;
  const originalPassword = "OriginalPass123!";
  let userId;

  beforeAll(async () => {
    const result = await request(app).post("/auth/register").send({
      email,
      password: originalPassword,
      name: "Reset Test",
    });
    expect(result.status).toBe(201);
    userId = result.body.userId;
  });

  afterAll(async () => {
    try {
      if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    } finally {
      await pool.end();
    }
  });

  async function insertResetToken({ minutes = 30, used = false } = {}) {
    await pool.query(
      "UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [userId]
    );
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, used)
      VALUES ($1, $2, NOW() + ($3::integer * INTERVAL '1 minute'), $4)`,
      [userId, tokenHash, minutes, used]
    );
    return token;
  }

  test("returns the same generic response for existing and missing accounts", async () => {
    const existing = await request(app).post("/auth/forgot-password").send({ email });
    const missing = await request(app).post("/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(existing.status).toBe(202);
    expect(missing.status).toBe(202);
    expect(existing.body).toEqual(missing.body);
    expect(existing.body.message).toMatch(/If an account matches/);
    await new Promise((resolve) => setImmediate(resolve));
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  test("keeps the generic response when email delivery fails", async () => {
    const resetToken = "f".repeat(64);
    const deliveryError = Object.assign(
      new Error(`SMTP failure for ${email} with token ${resetToken}`),
      { code: "EAUTH" }
    );
    jest.mocked(sendPasswordResetEmail).mockRejectedValueOnce(deliveryError);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const response = await request(app).post("/auth/forgot-password").send({ email });
    await new Promise((resolve) => setImmediate(resolve));
    expect(response.status).toBe(202);
    expect(response.body.message).toMatch(/If an account matches/);
    expect(log).toHaveBeenCalledWith("Password reset email delivery failed.", { code: "EAUTH" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(email);
    expect(JSON.stringify(log.mock.calls)).not.toContain(resetToken);
    log.mockRestore();
  });

  test("rejects malformed email addresses", async () => {
    const response = await request(app).post("/auth/forgot-password").send({ email: "invalid" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_EMAIL");
  });

  test("normalizes email and replaces previous active tokens while storing only hashes", async () => {
    jest.mocked(sendPasswordResetEmail).mockClear();
    const first = await request(app).post("/auth/forgot-password").send({ email: email.toUpperCase() });
    const second = await request(app).post("/auth/forgot-password").send({ email });
    expect(first.status).toBe(202);
    expect(second.status).toBe(202);

    await new Promise((resolve) => setImmediate(resolve));
    const active = await pool.query(
      "SELECT token_hash, expires_at, created_at FROM password_resets WHERE user_id = $1 AND used = FALSE",
      [userId]
    );
    expect(active.rowCount).toBe(1);
    expect(active.rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(active.rows[0].created_at).toBeTruthy();
    expect(active.rows[0].expires_at.getTime()).toBeGreaterThan(Date.now());
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(2);
    expect(active.rows[0].token_hash).not.toBe(sendPasswordResetEmail.mock.calls[1][1]);
  });

  test("rejects malformed, expired, and consumed tokens", async () => {
    const expiredToken = await insertResetToken({ minutes: -1 });
    const usedToken = await insertResetToken({ used: true });
    const responses = await Promise.all([
      request(app).post("/auth/reset-password").send({ token: "short", newPassword: "Password123!" }),
      request(app).post("/auth/reset-password").send({ token: expiredToken, newPassword: "Password123!" }),
      request(app).post("/auth/reset-password").send({ token: usedToken, newPassword: "Password123!" }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("INVALID_RESET_TOKEN");
    }
  });

  test("rejects a weak replacement password", async () => {
    const token = await insertResetToken();
    const response = await request(app).post("/auth/reset-password").send({ token, newPassword: "weak" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("WEAK_PASSWORD");
  });

  test("resets password once, updates its hash, and invalidates sessions", async () => {
    const login = await request(app).post("/auth/login").send({ email, password: originalPassword });
    expect(login.status).toBe(200);
    const token = await insertResetToken();
    const newPassword = "UpdatedPass456!";
    const [first, concurrent] = await Promise.all([
      request(app).post("/auth/reset-password").send({ token, newPassword }),
      request(app).post("/auth/reset-password").send({ token, newPassword }),
    ]);

    expect([first.status, concurrent.status].sort()).toEqual([200, 400]);
    const user = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    expect(await bcrypt.compare(newPassword, user.rows[0].password_hash)).toBe(true);
    expect(await bcrypt.compare(originalPassword, user.rows[0].password_hash)).toBe(false);
    expect((await pool.query("SELECT id FROM sessions WHERE user_id = $1", [userId])).rowCount).toBe(0);
    expect((await request(app).post("/auth/login").send({ email, password: originalPassword })).status).toBe(401);
    expect((await request(app).post("/auth/login").send({ email, password: newPassword })).status).toBe(200);
  });
});
