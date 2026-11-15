const request = require("supertest");
const app = require("../app");
const pool = require("../db");

describe("Categories API", () => {
  const password = "TestPass123!";
  const userEmails = [];

  let tokenA;
  let userAId;
  let userBId;
  let categoryOwnedByB;

  async function createUser(label) {
    const email = `categories-${label}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@example.com`;
    const registration = await request(app)
      .post("/auth/register")
      .send({ email, password, name: `Category Test ${label}` });

    expect(registration.status).toBe(201);
    userEmails.push(email);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);
    return { userId: login.body.user.id, token: login.body.token };
  }

  beforeAll(async () => {
    const userA = await createUser("A");
    const userB = await createUser("B");
    userAId = userA.userId;
    userBId = userB.userId;
    tokenA = userA.token;

    const category = await pool.query(
      "INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id",
      [userB.userId, "Private category"]
    );
    categoryOwnedByB = category.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (userEmails.length) {
        await pool.query(
          "DELETE FROM users WHERE email = ANY($1::text[])",
          [userEmails]
        );
      }
    } finally {
      await pool.end();
    }
  });

  test.each([
    ["create", () => request(app).post("/categories").send({ name: "Work" })],
    ["list", () => request(app).get("/categories")],
    [
      "rename",
      () => request(app).put("/categories/1").send({ name: "Renamed" }),
    ],
    ["delete", () => request(app).delete("/categories/1")],
  ])("rejects unauthenticated category %s requests", async (_operation, send) => {
    const response = await send();
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_EXPIRED");
  });

  test("creates and lists only categories owned by the authenticated user", async () => {
    const create = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "  Work  ", user_id: 999999 });

    expect(create.status).toBe(201);
    expect(create.body.category).toMatchObject({ name: "Work" });

    const stored = await pool.query(
      "SELECT user_id FROM categories WHERE id = $1",
      [create.body.category.id]
    );
    expect(String(stored.rows[0].user_id)).toBe(String(userAId));

    const list = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(list.status).toBe(200);
    expect(list.body.categories).toContainEqual(create.body.category);
    expect(list.body.categories).not.toContainEqual({
      id: categoryOwnedByB,
      name: "Private category",
    });
  });

  test.each([
    ["missing", {}],
    ["blank", { name: "  " }],
    ["non-string", { name: 7 }],
    ["too long", { name: "x".repeat(256) }],
  ])("rejects a %s category name", async (_case, body) => {
    const response = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_CATEGORY_NAME");
  });

  test("accepts 255 Unicode code points and rejects 256", async () => {
    const validName = "😀".repeat(255);
    const valid = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: validName });

    expect(valid.status).toBe(201);
    expect(valid.body.category.name).toBe(validName);

    const invalid = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "😀".repeat(256) });

    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("INVALID_CATEGORY_NAME");
  });

  test("rejects duplicate names on create and rename", async () => {
    const first = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Personal" });
    expect(first.status).toBe(201);

    const duplicateCreate = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Personal" });
    expect(duplicateCreate.status).toBe(409);
    expect(duplicateCreate.body.code).toBe("DUPLICATE_CATEGORY");

    const second = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "School" });
    expect(second.status).toBe(201);

    const duplicateRename = await request(app)
      .put(`/categories/${second.body.category.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Personal" });
    expect(duplicateRename.status).toBe(409);
    expect(duplicateRename.body.code).toBe("DUPLICATE_CATEGORY");
  });

  test("rejects invalid names when renaming a category", async () => {
    const category = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Original" });

    const response = await request(app)
      .put(`/categories/${category.body.category.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: " ".repeat(1) });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_CATEGORY_NAME");
  });

  test("renames a category and trims the new name", async () => {
    const created = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Old name" });

    const renamed = await request(app)
      .put(`/categories/${created.body.category.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "  New name  " });

    expect(renamed.status).toBe(200);
    expect(renamed.body.category).toMatchObject({
      id: created.body.category.id,
      name: "New name",
    });
  });

  test("accepts PostgreSQL BIGINT maximum as a route ID", async () => {
    const id = "9223372036854775807";
    const rename = await request(app)
      .put(`/categories/${id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Valid name" });
    const remove = await request(app)
      .delete(`/categories/${id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(rename.status).toBe(404);
    expect(rename.body.code).toBe("CATEGORY_NOT_FOUND");
    expect(remove.status).toBe(404);
    expect(remove.body.code).toBe("CATEGORY_NOT_FOUND");
  });

  test.each([
    "0",
    "-1",
    "+1",
    "abc",
    "1.5",
    "1e3",
    "01",
    " 1",
    "1 ",
    "9223372036854775808",
  ])(
    "rejects invalid category ID %s",
    async (id) => {
      const rename = await request(app)
        .put(`/categories/${encodeURIComponent(id)}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Valid name" });
      const remove = await request(app)
        .delete(`/categories/${encodeURIComponent(id)}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(rename.status).toBe(400);
      expect(rename.body.code).toBe("INVALID_CATEGORY_ID");
      expect(remove.status).toBe(400);
      expect(remove.body.code).toBe("INVALID_CATEGORY_ID");
    }
  );

  test("returns not found for a nonexistent category", async () => {
    const missingId = await pool.query(
      "SELECT (COALESCE(MAX(id), 0) + 10000)::text AS id FROM categories"
    );
    const response = await request(app)
      .delete(`/categories/${missingId.rows[0].id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("CATEGORY_NOT_FOUND");
  });

  test("does not allow another user to rename or delete a category", async () => {
    const rename = await request(app)
      .put(`/categories/${categoryOwnedByB}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Stolen category" });
    const remove = await request(app)
      .delete(`/categories/${categoryOwnedByB}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(rename.status).toBe(404);
    expect(rename.body.code).toBe("CATEGORY_NOT_FOUND");
    expect(remove.status).toBe(404);
    expect(remove.body.code).toBe("CATEGORY_NOT_FOUND");

    const stored = await pool.query(
      "SELECT user_id, name FROM categories WHERE id = $1",
      [categoryOwnedByB]
    );
    expect(String(stored.rows[0].user_id)).toBe(String(userBId));
    expect(stored.rows[0].name).toBe("Private category");
  });

  test("deleting a category preserves its tasks and clears their category ID", async () => {
    const category = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Tasks to keep" });
    const task = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Keep this task", category_id: category.body.category.id });

    expect(task.status).toBe(201);

    const remove = await request(app)
      .delete(`/categories/${category.body.category.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(remove.status).toBe(204);
    const storedTask = await pool.query(
      "SELECT title, category_id FROM tasks WHERE id = $1 AND user_id = $2",
      [task.body.task.id, userAId]
    );
    expect(storedTask.rowCount).toBe(1);
    expect(storedTask.rows[0]).toMatchObject({
      title: "Keep this task",
      category_id: null,
    });
  });
});
