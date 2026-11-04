
const request = require("supertest");
const app = require("../app");
const pool = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

describe("Authentication API", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPass123!";
  const createdEmails = [testEmail];

  afterAll(async () => {
    try {
      for (const email of createdEmails) {
        await pool.query("DELETE FROM users WHERE email = $1", [email]);
      }
    } finally {
      await pool.end();
    }
  });

  test("POST /auth/register creates a user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        name: "Automated Test User",
      });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBeDefined();

    const storedUser = await pool.query(
      "SELECT email, password_hash FROM users WHERE id = $1",
      [response.body.userId]
    );
    expect(storedUser.rowCount).toBe(1);
    expect(storedUser.rows[0].email).toBe(testEmail);
    expect(storedUser.rows[0].password_hash).not.toBe(testPassword);
    expect(await bcrypt.compare(testPassword, storedUser.rows[0].password_hash)).toBe(true);
    expect(response.body).toEqual({ userId: response.body.userId });
    expect(response.body).not.toHaveProperty("password_hash");
  });

  test.each([
    ["missing email", { password: testPassword }],
    ["invalid email", { email: "not-an-email", password: testPassword }],
    ["non-string email", { email: 42, password: testPassword }],
  ])("POST /auth/register rejects a %s", async (_description, body) => {
    const response = await request(app).post("/auth/register").send(body);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_EMAIL");
  });

  test.each([
    ["missing password", undefined],
    ["short password", "Aa1!abc"],
    ["password without uppercase", "testpass123!"],
    ["password without lowercase", "TESTPASS123!"],
    ["password without a number", "TestPassword!"],
    ["password without a special character", "TestPass123"],
  ])("POST /auth/register rejects a %s", async (_description, password) => {
    const email = `weak-${Date.now()}-${Math.random()}@example.com`;
    const response = await request(app)
      .post("/auth/register")
      .send({ email, password });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("WEAK_PASSWORD");

    const storedUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    expect(storedUser.rowCount).toBe(0);
  });

  test("POST /auth/register rejects a duplicate normalized email", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: ` ${testEmail.toUpperCase()} `,
        password: testPassword,
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_EXISTS");
  });

  test("POST /auth/login returns a session token", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toEqual({
      id: expect.anything(),
      email: testEmail,
      name: "Automated Test User",
    });
    expect(response.body).not.toHaveProperty("password_hash");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  test("POST /auth/login rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "WrongPass123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("POST /auth/logout invalidates the session", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    const response = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(204);
  });

  test("POST /auth/logout rejects the invalidated session", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    const token = login.body.token;

    await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test("a logged-out session cannot access protected task routes", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: testEmail, password: testPassword });
    const token = login.body.token;

    await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test("POST /auth/change-password rejects an incorrect current password", async () => {
    const email = `wrong-current-${Date.now()}@example.com`;
    createdEmails.push(email);
    const password = "TestPass123!";

    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password, name: "Password Test" });

    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);

    const response = await request(app)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        currentPassword: "WrongPass123!",
        newPassword: "NewTestPass456!",
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("POST /auth/change-password changes the password and invalidates sessions", async () => {
    const email = `change-password-${Date.now()}@example.com`;
    createdEmails.push(email);
    const oldPassword = "TestPass123!";
    const newPassword = "NewTestPass456!";

    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password: oldPassword, name: "Password Test" });

    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });

    expect(login.status).toBe(200);
    const token = login.body.token;

    const change = await request(app)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: oldPassword,
        newPassword,
      });

    expect(change.status).toBe(204);

    const storedUser = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email]
    );
    expect(storedUser.rowCount).toBe(1);
    expect(storedUser.rows[0].password_hash).not.toBe(oldPassword);
    expect(await bcrypt.compare(newPassword, storedUser.rows[0].password_hash)).toBe(true);
    expect(await bcrypt.compare(oldPassword, storedUser.rows[0].password_hash)).toBe(false);

    const sessions = await pool.query(
      "SELECT id FROM sessions WHERE user_id = $1",
      [login.body.user.id]
    );
    expect(sessions.rowCount).toBe(0);

    const oldSession = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(oldSession.status).toBe(401);

    const oldLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });

    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: newPassword });

    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeDefined();
  });

  test("rejects a session idle for more than 30 minutes", async () => {
    const email = `timeout-${Date.now()}@example.com`;
    createdEmails.push(email);
    const password = "TestPass123!";

    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password, name: "Timeout Test" });

    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);

    const tokenHash = crypto
      .createHash("sha256")
      .update(login.body.token)
      .digest("hex");

    await pool.query(
      `UPDATE sessions
       SET last_activity_at = NOW() - INTERVAL '31 minutes'
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test("refreshes activity for a session active within the 30-minute window", async () => {
    const email = `active-timeout-${Date.now()}@example.com`;
    createdEmails.push(email);
    const password = "TestPass123!";
    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password });
    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(login.status).toBe(200);

    const tokenHash = crypto
      .createHash("sha256")
      .update(login.body.token)
      .digest("hex");
    await pool.query(
      `UPDATE sessions
       SET last_activity_at = NOW() - INTERVAL '29 minutes'
       WHERE token_hash = $1`,
      [tokenHash]
    );
    const before = await pool.query(
      "SELECT last_activity_at FROM sessions WHERE token_hash = $1",
      [tokenHash]
    );

    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(response.status).toBe(200);

    const after = await pool.query(
      "SELECT last_activity_at FROM sessions WHERE token_hash = $1",
      [tokenHash]
    );
    expect(after.rowCount).toBe(1);
    expect(new Date(after.rows[0].last_activity_at).getTime()).toBeGreaterThan(
      new Date(before.rows[0].last_activity_at).getTime()
    );
    expect(Date.now() - new Date(after.rows[0].last_activity_at).getTime()).toBeLessThan(
      60_000
    );
  });

  test("expires a session at 30 minutes of inactivity", async () => {
    const email = `exact-timeout-${Date.now()}@example.com`;
    createdEmails.push(email);
    const password = "TestPass123!";
    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password });
    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(login.status).toBe(200);

    const tokenHash = crypto
      .createHash("sha256")
      .update(login.body.token)
      .digest("hex");
    await pool.query(
      `UPDATE sessions
       SET last_activity_at = NOW() - INTERVAL '30 minutes'
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });
});
