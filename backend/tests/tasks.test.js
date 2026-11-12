
const request = require("supertest");
const app = require("../app");
const pool = require("../db");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

describe("Tasks API", () => {
  const password = "TestPass123!";
  const users = [];

  let tokenA;
  let tokenB;
  let taskId;
  let userAEmail;
  let userAId;
  let userBId;
  let categoryOwnedByB;

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
      email,
      userId: login.body.user.id,
      token: login.body.token,
    };
  }

  beforeAll(async () => {
    const userA = await createUser("A");
    const userB = await createUser("B");

    userAEmail = userA.email;
    userAId = userA.userId;
    userBId = userB.userId;
    tokenA = userA.token;
    tokenB = userB.token;

    const category = await pool.query(
      "INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id",
      [userB.userId, "Private category"]
    );
    categoryOwnedByB = category.rows[0].id;
  });

  async function failTaskEventInsert(action, sendRequest) {
    const originalConnect = pool.connect.bind(pool);
    const checkedOutClients = new Set();
    const releasedClients = new Set();
    const failedTaskIds = [];
    let injectedFailures = 0;
    let rollbackCount = 0;
    const connectSpy = jest.spyOn(pool, "connect");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    connectSpy.mockImplementation(async (...args) => {
      const client = await originalConnect(...args);
      checkedOutClients.add(client);

      const originalQuery = client.query.bind(client);
      const originalRelease = client.release.bind(client);

      return {
        query(sql, ...queryArgs) {
          if (typeof sql === "string" && /^\s*ROLLBACK\b/i.test(sql)) {
            rollbackCount += 1;
          }

          if (
            typeof sql === "string" &&
            /^INSERT\s+INTO\s+task_events\b/i.test(sql.trim()) &&
            sql.includes(`'${action}'`)
          ) {
            injectedFailures += 1;
            const values = queryArgs[0];
            if (Array.isArray(values)) {
              failedTaskIds.push(values[1]);
            }
            return Promise.reject(new Error("Injected task event failure."));
          }

          return originalQuery(sql, ...queryArgs);
        },
        release(...releaseArgs) {
          releasedClients.add(client);
          return originalRelease(...releaseArgs);
        },
      };
    });

    try {
      const response = await sendRequest();

      expect(injectedFailures).toBe(1);
      expect(rollbackCount).toBe(1);
      expect(releasedClients.size).toBe(checkedOutClients.size);

      return { response, failedTaskIds };
    } finally {
      connectSpy.mockRestore();
      errorSpy.mockRestore();

      for (const client of checkedOutClients) {
        if (!releasedClients.has(client)) {
          client.release();
        }
      }
    }
  }

  async function getAvailablePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      await new Promise((resolve) => server.close(resolve));
      throw new Error("Unable to allocate a local backend test port.");
    }

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    return address.port;
  }

  async function startBackendServer(port) {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "..", "server.js")],
      {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, PORT: String(port) },
        stdio: "ignore",
      }
    );

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(`Backend test server exited with code ${child.exitCode}.`);
      }

      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.status === 200) {
          return child;
        }
      } catch {
        // The socket is expected to refuse connections until the server starts.
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    child.kill();
    throw new Error("Backend test server did not become ready.");
  }

  async function stopBackendServer(child) {
    if (child.exitCode !== null) {
      return;
    }

    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
  }

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

  test("rejects listing tasks with an invalid session token", async () => {
    const response = await request(app)
      .get("/tasks")
      .set("Authorization", "Bearer invalid-session-token");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test.each([
    ["creating", () => request(app).post("/tasks").send({ title: "Unauthorized task" })],
    ["editing", () => request(app).put("/tasks/1").send({ title: "Unauthorized update" })],
    ["completing", () => request(app).patch("/tasks/1/complete")],
    ["deleting", () => request(app).delete("/tasks/1")],
  ])("rejects unauthenticated task %s", async (_operation, makeRequest) => {
    const response = await makeRequest();

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

  test("uses the authenticated user instead of a client-supplied owner ID", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Owner cannot be spoofed", user_id: userBId });

    expect(response.status).toBe(201);
    expect(String(response.body.task.user_id)).toBe(String(userAId));
    expect(String(response.body.task.user_id)).not.toBe(String(userBId));
  });

  test("rejects a task with an empty title", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "   " });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TITLE");
  });

  test.each([
    ["an invalid priority", { title: "Bad priority", priority: "Urgent" }, "INVALID_PRIORITY"],
    ["an invalid due date", { title: "Bad date", due_at: "not-a-date" }, "INVALID_DUE_DATE"],
    ["an invalid category ID", { title: "Bad category", category_id: 0 }, "INVALID_CATEGORY"],
  ])("rejects task creation with %s", async (_description, body, code) => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(code);
  });

  test("does not assign another user's category to a task", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Foreign category", category_id: categoryOwnedByB });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("CATEGORY_NOT_FOUND");
  });

  test("rejects invalid updates without changing the existing task", async () => {
    const invalidUpdates = [
      { title: "   " },
      { priority: "Urgent" },
      { due_at: "not-a-date" },
      { category_id: categoryOwnedByB },
    ];

    for (const update of invalidUpdates) {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send(update);

      expect(response.status).toBe(update.category_id ? 404 : 400);
    }

    const storedTask = await pool.query(
      "SELECT title, priority FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, userAId]
    );
    expect(storedTask.rows[0]).toMatchObject({
      title: "Test task",
      priority: "High",
    });
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

  test("prevents cross-user task access and preserves the owner's data and audit events", async () => {
    const created = await request(app)
      .post("/tasks")
      .auth(tokenB, { type: "bearer" })
      .send({ title: "Private task for user B" });
    expect(created.status).toBe(201);
    const foreignTaskId = created.body.task.id;

    const listedWithOwnerId = await request(app)
      .get("/tasks")
      .query({ user_id: userBId })
      .auth(tokenA, { type: "bearer" });
    expect(listedWithOwnerId.status).toBe(200);
    expect(
      listedWithOwnerId.body.tasks.some(
        (task) => String(task.id) === String(foreignTaskId)
      )
    ).toBe(false);

    const edit = await request(app)
      .put(`/tasks/${foreignTaskId}`)
      .query({ user_id: userBId })
      .auth(tokenA, { type: "bearer" })
      .send({ title: "Unauthorized edit", user_id: userBId });
    const complete = await request(app)
      .patch(`/tasks/${foreignTaskId}/complete`)
      .query({ user_id: userBId })
      .auth(tokenA, { type: "bearer" })
      .send({ user_id: userBId });
    const deletion = await request(app)
      .delete(`/tasks/${foreignTaskId}`)
      .query({ user_id: userBId })
      .auth(tokenA, { type: "bearer" })
      .send({ user_id: userBId });

    expect(edit.status).toBe(404);
    expect(complete.status).toBe(404);
    expect(deletion.status).toBe(404);

    const storedTask = await pool.query(
      "SELECT user_id, title, status, completed_at FROM tasks WHERE id = $1",
      [foreignTaskId]
    );
    expect(String(storedTask.rows[0].user_id)).toBe(String(userBId));
    expect(storedTask.rows[0]).toMatchObject({
      title: "Private task for user B",
      status: "Pending",
      completed_at: null,
    });

    const events = await pool.query(
      "SELECT user_id, action FROM task_events WHERE task_id = $1 ORDER BY id",
      [foreignTaskId]
    );
    expect(events.rows.map((event) => String(event.user_id))).toEqual([
      String(userBId),
    ]);
    expect(events.rows.map((event) => event.action)).toEqual(["CREATED"]);
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

  test("rolls back task creation when audit event insertion fails", async () => {
    const title = `Rollback create ${Date.now()}`;
    const { response, failedTaskIds } = await failTaskEventInsert("CREATED", () =>
      request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title })
    );

    expect(response.status).toBe(500);
    expect(failedTaskIds).toHaveLength(1);
    const storedTask = await pool.query(
      "SELECT id FROM tasks WHERE user_id = $1 AND title = $2",
      [userAId, title]
    );
    expect(storedTask.rowCount).toBe(0);

    const events = await pool.query(
      "SELECT id FROM task_events WHERE user_id = $1 AND task_id = $2",
      [userAId, failedTaskIds[0]]
    );
    expect(events.rowCount).toBe(0);
  });

  test("rolls back task updates, completion and deletion when event insertion fails", async () => {
    const created = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Rollback mutations" });
    expect(created.status).toBe(201);
    const id = created.body.task.id;

    const { response: edit, failedTaskIds: editedTaskIds } = await failTaskEventInsert("EDITED", () =>
      request(app)
        .put(`/tasks/${id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title: "Must not persist" })
    );
    expect(edit.status).toBe(500);
    expect(editedTaskIds).toEqual([id]);

    const { response: complete, failedTaskIds: completedTaskIds } = await failTaskEventInsert("COMPLETED", () =>
      request(app)
        .patch(`/tasks/${id}/complete`)
        .set("Authorization", `Bearer ${tokenA}`)
    );
    expect(complete.status).toBe(500);
    expect(completedTaskIds).toEqual([id]);

    const { response: deletion, failedTaskIds: deletedTaskIds } = await failTaskEventInsert("DELETED", () =>
      request(app)
        .delete(`/tasks/${id}`)
        .set("Authorization", `Bearer ${tokenA}`)
    );
    expect(deletion.status).toBe(500);
    expect(deletedTaskIds).toEqual([id]);

    const storedTask = await pool.query(
      "SELECT title, status, completed_at FROM tasks WHERE id = $1 AND user_id = $2",
      [id, userAId]
    );
    expect(storedTask.rows[0]).toMatchObject({
      title: "Rollback mutations",
      status: "Pending",
      completed_at: null,
    });

    const events = await pool.query(
      "SELECT action FROM task_events WHERE task_id = $1 AND user_id = $2 ORDER BY id",
      [id, userAId]
    );
    expect(events.rows.map((event) => event.action)).toEqual(["CREATED"]);
  });

  test("preserves tasks across refresh, logout, login and backend restart", async () => {
    jest.setTimeout(30000);
    const port = await getAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    let server = await startBackendServer(port);

    try {
      const created = await request(baseUrl)
        .post("/tasks")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title: "Persistent across restart" });
      expect(created.status).toBe(201);
      const persistentTaskId = String(created.body.task.id);

      const refreshed = await request(baseUrl)
        .get("/tasks")
        .set("Authorization", `Bearer ${tokenA}`);
      expect(refreshed.body.tasks.some(
        (task) => String(task.id) === persistentTaskId
      )).toBe(true);

      const logout = await request(baseUrl)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${tokenA}`);
      expect(logout.status).toBe(204);

      const login = await request(baseUrl)
        .post("/auth/login")
        .send({ email: userAEmail, password });
      expect(login.status).toBe(200);
      tokenA = login.body.token;

      await stopBackendServer(server);
      server = await startBackendServer(port);

      const afterRestart = await request(baseUrl)
        .get("/tasks")
        .set("Authorization", `Bearer ${login.body.token}`);
      expect(afterRestart.status).toBe(200);
      expect(afterRestart.body.tasks.some(
        (task) => String(task.id) === persistentTaskId
      )).toBe(true);
    } finally {
      await stopBackendServer(server);
    }
  });

  test("records timestamps for task creation, editing, completion and deletion", async () => {
    const startedAt = Date.now();
    const created = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Audit timestamp lifecycle" });
    expect(created.status).toBe(201);
    const id = created.body.task.id;

    const edited = await request(app)
      .put(`/tasks/${id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Edited audit timestamp lifecycle" });
    expect(edited.status).toBe(200);

    const completed = await request(app)
      .patch(`/tasks/${id}/complete`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(completed.status).toBe(200);

    const deleted = await request(app)
      .delete(`/tasks/${id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(deleted.status).toBe(204);

    const events = await pool.query(
      `SELECT action, occurred_at
       FROM task_events
       WHERE task_id = $1 AND user_id = $2
       ORDER BY id`,
      [id, userAId]
    );
    expect(events.rows.map((event) => event.action)).toEqual([
      "CREATED",
      "EDITED",
      "COMPLETED",
      "DELETED",
    ]);

    const eventTimes = events.rows.map((event) =>
      new Date(event.occurred_at).getTime()
    );
    expect(eventTimes).toHaveLength(4);
    for (const occurredAt of eventTimes) {
      expect(Number.isFinite(occurredAt)).toBe(true);
      expect(occurredAt).toBeGreaterThanOrEqual(startedAt - 1000);
      expect(occurredAt).toBeLessThanOrEqual(Date.now() + 1000);
    }
  });

  test("returns not found when requesting a nonexistent task", async () => {
    const response = await request(app)
      .put("/tasks/999999999")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Nonexistent task" });

    expect(response.status).toBe(404);
  });
});
