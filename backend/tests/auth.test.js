
const request = require("supertest");
const app = require("../app");
const pool = require("../db");
const crypto = require("crypto");

describe("Authentication API", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPass123!";

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "test-%@example.com",
    ]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "wrong-current-%@example.com",
    ]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "change-password-%@example.com",
    ]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "timeout-%@example.com",
    ]);
    await pool.end();
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
    expect(response.body.user.email).toBe(testEmail);
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

  test("POST /auth/change-password rejects an incorrect current password", async () => {
    const email = `wrong-current-${Date.now()}@example.com`;
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
      .post("/auth/logout")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });
});
