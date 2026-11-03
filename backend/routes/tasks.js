
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

const validPriorities = ["Low", "Medium", "High"];

function validDueDate(value) {
  return value == null || (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Date.parse(value))
  );
}

// Create a task
router.post("/", async (req, res) => {
  const { title, description, due_at, priority, category_id } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      code: "INVALID_TITLE",
      message: "Task title is required.",
    });
  }

  const taskPriority = priority || "Medium";

  if (!validPriorities.includes(taskPriority)) {
    return res.status(400).json({
      code: "INVALID_PRIORITY",
      message: "Priority must be Low, Medium, or High.",
    });
  }

  if (!validDueDate(due_at)) {
    return res.status(400).json({
      code: "INVALID_DUE_DATE",
      message: "Due date must be valid.",
    });
  }

  if (
    category_id != null &&
    (!Number.isInteger(Number(category_id)) || Number(category_id) <= 0)
  ) {
    return res.status(400).json({
      code: "INVALID_CATEGORY",
      message: "Category ID must be a positive integer.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO tasks
        (user_id, title, description, due_at, priority, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description ?? null,
        due_at ?? null,
        taskPriority,
        category_id ?? null,
      ]
    );

    const task = result.rows[0];

    await client.query(
      `INSERT INTO task_events (user_id, task_id, action)
       VALUES ($1, $2, 'CREATED')`,
      [req.user.id, task.id]
    );

    await client.query("COMMIT");
    return res.status(201).json({ task });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create task failed:", err.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to create task.",
    });
  } finally {
    client.release();
  }
});

// List tasks for the authenticated user, with filters and sorting
router.get("/", async (req, res) => {
  const {
    status, priority, categoryId, dueBefore, dueAfter,
    sortBy = "created_at", order = "desc",
  } = req.query;

  const allowedSortColumns = {
    created_at: "created_at",
    due_at: "due_at",
    priority: "priority",
    title: "title",
    status: "status",
  };

  if (!allowedSortColumns[sortBy]) {
    return res.status(400).json({ code: "INVALID_SORT", message: "Unsupported sort field." });
  }

  if (!["asc", "desc"].includes(String(order).toLowerCase())) {
    return res.status(400).json({ code: "INVALID_ORDER", message: "Order must be asc or desc." });
  }

  if (status && !["Pending", "Completed"].includes(status)) {
    return res.status(400).json({ code: "INVALID_STATUS", message: "Invalid status." });
  }

  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ code: "INVALID_PRIORITY", message: "Invalid priority." });
  }

  if (categoryId !== undefined &&
      (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0)) {
    return res.status(400).json({ code: "INVALID_CATEGORY", message: "Invalid category ID." });
  }

  if (!validDueDate(dueBefore) || !validDueDate(dueAfter)) {
    return res.status(400).json({ code: "INVALID_DUE_DATE", message: "Invalid due-date filter." });
  }

  const conditions = ["user_id = $1"];
  const values = [req.user.id];

  function addFilter(column, value, operator = "=") {
    values.push(value);
    conditions.push(`${column} ${operator} $${values.length}`);
  }

  if (status) addFilter("status", status);
  if (priority) addFilter("priority", priority);
  if (categoryId !== undefined) addFilter("category_id", Number(categoryId));
  if (dueBefore) addFilter("due_at", dueBefore, "<");
  if (dueAfter) addFilter("due_at", dueAfter, ">");

  try {
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${allowedSortColumns[sortBy]} ${String(order).toUpperCase()}`,
      values
    );

    return res.status(200).json({ tasks: result.rows });
  } catch (err) {
    console.error("List tasks failed:", err.message);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to retrieve tasks.",
    });
  }
});

// Edit a task
router.put("/:id", async (req, res) => {
  const { title, description, due_at, priority, category_id } = req.body;

  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ code: "INVALID_TASK_ID", message: "Invalid task ID." });
  }

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return res.status(400).json({ code: "INVALID_TITLE", message: "Title cannot be empty." });
  }

  if (priority !== undefined && !validPriorities.includes(priority)) {
    return res.status(400).json({ code: "INVALID_PRIORITY", message: "Invalid priority." });
  }

  if (due_at !== undefined && !validDueDate(due_at)) {
    return res.status(400).json({ code: "INVALID_DUE_DATE", message: "Invalid due date." });
  }

  if (category_id !== undefined && category_id !== null &&
      (!Number.isInteger(Number(category_id)) || Number(category_id) <= 0)) {
    return res.status(400).json({ code: "INVALID_CATEGORY", message: "Invalid category ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.id, req.user.id]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ code: "TASK_NOT_FOUND", message: "Task not found." });
    }

    const oldTask = existing.rows[0];
    const newTitle = title === undefined ? oldTask.title : title.trim();
    const newDescription = description === undefined ? oldTask.description : description;
    const newDueAt = due_at === undefined ? oldTask.due_at : due_at;
    const newPriority = priority === undefined ? oldTask.priority : priority;
    const newCategoryId = category_id === undefined ? oldTask.category_id : category_id;

    const result = await client.query(
      `UPDATE tasks
       SET title = $1, description = $2, due_at = $3,
           priority = $4, category_id = $5,
           reminder_sent = CASE WHEN due_at IS DISTINCT FROM $3 THEN FALSE ELSE reminder_sent END,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        newTitle, newDescription, newDueAt, newPriority,
        newCategoryId, req.params.id, req.user.id,
      ]
    );

    await client.query(
      "INSERT INTO task_events (user_id, task_id, action) VALUES ($1, $2, 'EDITED')",
      [req.user.id, req.params.id]
    );

    await client.query("COMMIT");
    return res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Edit task failed:", err.message);
    return res.status(500).json({ code: "INTERNAL_ERROR", message: "Unable to edit task." });
  } finally {
    client.release();
  }
});

// Mark a task completed
router.patch("/:id/complete", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ code: "INVALID_TASK_ID", message: "Invalid task ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE tasks
       SET status = 'Completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status <> 'Completed'
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      const existing = await pool.query(
        "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
        [req.params.id, req.user.id]
      );

      if (existing.rowCount === 0) {
        return res.status(404).json({ code: "TASK_NOT_FOUND", message: "Task not found." });
      }

      return res.status(409).json({ code: "ALREADY_COMPLETED", message: "Task is already completed." });
    }

    await client.query(
      "INSERT INTO task_events (user_id, task_id, action) VALUES ($1, $2, 'COMPLETED')",
      [req.user.id, req.params.id]
    );

    await client.query("COMMIT");
    return res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Complete task failed:", err.message);
    return res.status(500).json({ code: "INTERNAL_ERROR", message: "Unable to complete task." });
  } finally {
    client.release();
  }
});

// Delete a task while preserving its audit history
router.delete("/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ code: "INVALID_TASK_ID", message: "Invalid task ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.id, req.user.id]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ code: "TASK_NOT_FOUND", message: "Task not found." });
    }

    await client.query(
      "INSERT INTO task_events (user_id, task_id, action) VALUES ($1, $2, 'DELETED')",
      [req.user.id, req.params.id]
    );

    await client.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    await client.query("COMMIT");
    return res.status(204).end();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Delete task failed:", err.message);
    return res.status(500).json({ code: "INTERNAL_ERROR", message: "Unable to delete task." });
  } finally {
    client.release();
  }
});

module.exports = router;
