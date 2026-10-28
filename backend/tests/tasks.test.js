
const request = require("supertest");
const app = require("../app");
const pool = require("../db");

describe("Tasks API", () => {
  const password = "TestPass123!";
  const users = [];

  let tokenA;
  let tokenB;
  let taskId;

  async function createUser(label) {
    const email = `tasks-${label}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@example.com`;

    const registration = await request(app)
      .post("/auth/register")
      .send({
        email,
        password,
        name: `Task Test ${label}`,
      });

    expect(registration.status).toBe(201);

    users.push(email);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);

    return {
      userId: login.body.user.id,
      token: login.body.token,
    };
  }

  beforeAll(async () => {
    const userA = await createUser("A");
    const userB = await createUser("B");

    tokenA = userA.token;
    tokenB = userB.token;
  });

  afterAll(async () => {
    // Clean up test users and their dependent records.
    if (users.length) {
      await pool.query(
        "DELETE FROM users WHERE email = ANY($1::text[])",
        [users]
      );
    }

    await pool.end();
  });

  test("rejects listing tasks without authentication", async () => {
    const response = await request(app).get("/tasks");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test("creates a task for the authenticated user", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "Test task",
        description: "Created by automated test",
        priority: "High",
      });

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe("Test task");
    expect(response.body.task.priority).toBe("High");

    taskId = response.body.task.id;
  });

  test("rejects a task with an empty title", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "   " });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TITLE");
  });

  test("lists the authenticated user's tasks", async () => {
    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tasks)).toBe(true);
    expect(
      response.body.tasks.some(
        (task) => String(task.id) === String(taskId)
      )
    ).toBe(true);
  });

  test("does not expose one user's tasks to another user", async () => {
    const response = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(200);
    expect(
      response.body.tasks.some(
        (task) => String(task.id) === String(taskId)
      )
    ).toBe(false);
  });

  test("edits a task owned by the authenticated user", async () => {
    const response = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Updated test task" });

    expect(response.status).toBe(200);
    expect(response.body.task.title).toBe("Updated test task");
  });

  test("does not allow another user to edit the task", async () => {
    const response = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "Unauthorized edit" });

    expect(response.status).toBe(404);
  });

  
  test("does not allow another user to complete the task", async () => {
    const response = await request(app)
      .patch(`/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("TASK_NOT_FOUND");
  });

test("marks the task as completed", async () => {
    const response = await request(app)
      .patch(`/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe("Completed");
  });

  test("rejects completing an already completed task", async () => {
    const response = await request(app)
      .patch(`/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ALREADY_COMPLETED");
  });

  test("does not allow another user to delete the task", async () => {
    const response = await request(app)
      .delete(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });

  test("deletes the task owned by the authenticated user", async () => {
    const response = await request(app)
      .delete(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(204);
  });

  test("returns not found when requesting a nonexistent task", async () => {
    const response = await request(app)
      .put("/tasks/999999999")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Nonexistent task" });

    expect(response.status).toBe(404);
  });
});
