
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

  test("rejects an invalid email address during registration", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "not-an-email",
        password: "TestPass123!",
        name: "Validation Test",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_EMAIL");
  });

  test("rejects a weak password during registration", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: `weak-password-${Date.now()}@example.com`,
        password: "weak",
        name: "Validation Test",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("WEAK_PASSWORD");
  });

  test("rejects duplicate registration even when email case differs", async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    const password = "TestPass123!";

    const first = await request(app)
      .post("/auth/register")
      .send({ email, password, name: "Duplicate Test" });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/auth/register")
      .send({
        email: email.toUpperCase(),
        password,
        name: "Duplicate Test",
      });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("EMAIL_EXISTS");

    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  });

  test("does not expose the password hash in the registration response", async () => {
    const email = `no-hash-${Date.now()}@example.com`;

    const response = await request(app)
      .post("/auth/register")
      .send({
        email,
        password: "TestPass123!",
        name: "Response Security Test",
      });

    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash/i);
    expect(response.body.password).toBeUndefined();

    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  });

  test("rejects login when email or password is missing", async () => {
    const missingEmail = await request(app)
      .post("/auth/login")
      .send({ password: "TestPass123!" });

    expect(missingEmail.status).toBe(400);
    expect(missingEmail.body.code).toBe("VALIDATION_ERROR");

    const missingPassword = await request(app)
      .post("/auth/login")
      .send({ email: "missing@example.com" });

    expect(missingPassword.status).toBe(400);
    expect(missingPassword.body.code).toBe("VALIDATION_ERROR");
  });

  test("does not expose the password hash in the login response", async () => {
    const email = `login-no-hash-${Date.now()}@example.com`;
    const password = "TestPass123!";

    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password, name: "Login Security Test" });

    expect(registration.status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toMatch(/password_hash/i);
    expect(login.body.user.password).toBeUndefined();

    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  });

  test("rejects logout without an authentication token", async () => {
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(401);
  });

  test("rejects task operations without authentication", async () => {
    const responses = await Promise.all([
      request(app).get("/tasks"),
      request(app).post("/tasks").send({ title: "Unauthorized task" }),
      request(app).put("/tasks/1").send({ title: "Modified task" }),
      request(app).patch("/tasks/1/complete"),
      request(app).delete("/tasks/1"),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  test("prevents one user from editing or deleting another user's task", async () => {
    const suffix = Date.now();
    const userA = {
      email: `owner-${suffix}@example.com`,
      password: "TestPass123!",
      name: "Task Owner",
    };
    const userB = {
      email: `other-${suffix}@example.com`,
      password: "TestPass123!",
      name: "Other User",
    };

    let userAId;

    try {
      // Register both test users.
      const registerA = await request(app)
        .post("/auth/register")
        .send(userA);

      expect(registerA.status).toBe(201);
      userAId = registerA.body.userId;

      const registerB = await request(app)
        .post("/auth/register")
        .send(userB);

      expect(registerB.status).toBe(201);

      // Log in as both users.
      const loginA = await request(app)
        .post("/auth/login")
        .send({ email: userA.email, password: userA.password });

      const loginB = await request(app)
        .post("/auth/login")
        .send({ email: userB.email, password: userB.password });

      expect(loginA.status).toBe(200);
      expect(loginB.status).toBe(200);

      const tokenA = loginA.body.token;
      const tokenB = loginB.body.token;

      // User A creates a task.
      const created = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title: "Private task belonging to User A" });

      expect(created.status).toBe(201);
      const taskId = created.body.task.id;

      // User B attempts to edit User A's task.
      const edit = await request(app)
        .put(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ title: "Unauthorized change" });

      expect(edit.status).toBe(404);
      expect(edit.body.code).toBe("TASK_NOT_FOUND");

      // User B attempts to delete User A's task.
      const deletion = await request(app)
        .delete(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(deletion.status).toBe(404);
      expect(deletion.body.code).toBe("TASK_NOT_FOUND");

      // Verify the original task still belongs to User A and is unchanged.
      const ownerTasks = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(ownerTasks.status).toBe(200);

      const originalTask = ownerTasks.body.tasks.find(
        (task) => String(task.id) === String(taskId)
      );

      expect(originalTask).toBeDefined();
      expect(originalTask.title).toBe("Private task belonging to User A");
    } finally {
      // Clean up only the records created by this test.
      if (userAId) {
        await pool.query(
          "DELETE FROM task_events WHERE user_id = $1",
          [userAId]
        );
        await pool.query(
          "DELETE FROM tasks WHERE user_id = $1",
          [userAId]
        );
      }

      await pool.query(
        "DELETE FROM users WHERE email = $1 OR email = $2",
        [userA.email, userB.email]
      );
    }
  });
});
