
const pool = require("../db");

const DEMO_EMAIL = (process.env.DEMO_EMAIL || "").trim().toLowerCase();
const TOTAL_TASKS = 1200;
const COMPLETED_COUNT = 420;
const OVERDUE_COUNT = 120;

const CATEGORIES = [
  "Work",
  "Personal",
  "Studies",
  "Projects",
  "Health",
  "Finance",
  "Learning",
  "Miscellaneous",
];

const ACTIONS = [
  "Review", "Complete", "Prepare", "Organize", "Update",
  "Research", "Finalize", "Plan", "Submit", "Schedule",
  "Evaluate", "Design", "Document", "Implement", "Test",
  "Improve", "Discuss", "Analyze", "Draft", "Coordinate",
];

const SUBJECTS = [
  "project proposal", "weekly report", "meeting notes",
  "presentation slides", "database schema", "API documentation",
  "frontend components", "backend integration", "research paper",
  "assignment submission", "study schedule", "exam preparation",
  "budget spreadsheet", "monthly expenses", "client requirements",
  "user feedback", "testing strategy", "deployment pipeline",
  "portfolio website", "resume updates", "design mockups",
  "course materials", "project milestones", "team deliverables",
  "software documentation", "performance metrics",
  "security checklist", "learning roadmap", "code review",
  "product requirements",
];

const CONTEXTS = [
  "for the upcoming review",
  "before the next deadline",
  "for the current sprint",
  "for the monthly assessment",
  "as part of ongoing development",
  "for the team discussion",
  "before final submission",
  "for future reference",
  "for the next project milestone",
  "as part of routine maintenance",
];

const DESCRIPTIONS = [
  "Review the relevant requirements and document the necessary changes.",
  "Coordinate with the team and track progress against the planned timeline.",
  "Check the current status, identify gaps and prepare the next steps.",
  "Gather the necessary information and organize the deliverables.",
  "Complete the work, verify the results and record any outstanding issues.",
  "Review available resources and prepare a concise progress update.",
  "Validate the implementation and document potential improvements.",
  "Break the work into smaller milestones and monitor completion.",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomDate(start, end) {
  return new Date(
    start.getTime() +
    Math.random() * (end.getTime() - start.getTime())
  );
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateTitles() {
  const titles = [];

  for (const action of ACTIONS) {
    for (const subject of SUBJECTS) {
      for (const context of CONTEXTS) {
        titles.push(`${action} ${subject} ${context}`);
      }
    }
  }

  return shuffle(titles).slice(0, TOTAL_TASKS);
}

function generateTasks(categoryIds) {
  const now = new Date();
  const titles = generateTitles();

  const statuses = shuffle([
    ...Array(COMPLETED_COUNT).fill("Completed"),
    ...Array(TOTAL_TASKS - COMPLETED_COUNT).fill("Pending"),
  ]);

  let overdueAssigned = 0;

  return shuffle(titles.map((title, index) => {
    const status = statuses[index];

    const createdAt = randomDate(
      new Date(now.getTime() - 180 * 86400000),
      now
    );

    const priorityRoll = Math.random();
    const priority =
      priorityRoll < 0.25 ? "Low" :
      priorityRoll < 0.75 ? "Medium" : "High";

    let dueAt;
    let completedAt = null;

    if (status === "Completed") {
      dueAt = randomDate(
        new Date(now.getTime() - 90 * 86400000),
        new Date(now.getTime() + 30 * 86400000)
      );

      completedAt = randomDate(createdAt, now);
    } else if (overdueAssigned < OVERDUE_COUNT) {
      dueAt = randomDate(
        new Date(now.getTime() - 45 * 86400000),
        new Date(now.getTime() - 86400000)
      );

      overdueAssigned++;
    } else {
      dueAt = randomDate(
        now,
        new Date(now.getTime() + 120 * 86400000)
      );
    }

    const updatedAt = status === "Completed"
      ? completedAt
      : randomDate(createdAt, now);

    return {
      title,
      description: randomItem(DESCRIPTIONS),
      dueAt,
      priority,
      status,
      categoryId: randomItem(categoryIds),
      createdAt,
      updatedAt,
      completedAt,
    };
  }));
}

async function seedDemo() {
  if (!DEMO_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DEMO_EMAIL)) {
    throw new Error(
      "Set DEMO_EMAIL to the email address of your existing demo account."
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the account that was already registered.
    const userResult = await client.query(
      `SELECT id, email, name
       FROM users
       WHERE email = $1`,
      [DEMO_EMAIL]
    );

    if (userResult.rowCount === 0) {
      throw new Error(`No account found for ${DEMO_EMAIL}`);
    }

    const user = userResult.rows[0];

    // Never mix generated demo data with existing user tasks.
    const existingTasks = await client.query(
      "SELECT COUNT(*)::int AS count FROM tasks WHERE user_id = $1",
      [user.id]
    );

    if (existingTasks.rows[0].count > 0) {
      throw new Error(
        `This account already has ${existingTasks.rows[0].count} tasks. ` +
        "No data was changed. Use an empty demo account."
      );
    }

    console.log(`Seeding demo account: ${user.email}`);

    // Create or reuse categories belonging to this user.
    const categoryIds = [];

    for (const name of CATEGORIES) {
      const result = await client.query(
        `INSERT INTO categories (user_id, name)
         VALUES ($1, $2)
         ON CONFLICT (user_id, name)
         DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [user.id, name]
      );

      categoryIds.push(result.rows[0].id);
    }

    const tasks = generateTasks(categoryIds);

    // Insert tasks in batches.
    const insertedTaskIds = [];
    const BATCH_SIZE = 200;

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);

      const values = [];
      const placeholders = batch.map((task, index) => {
        const offset = index * 10;

        values.push(
          user.id,
          task.title,
          task.description,
          task.dueAt,
          task.priority,
          task.status,
          task.categoryId,
          task.createdAt,
          task.updatedAt,
          task.completedAt
        );

        return `(
          $${offset + 1}, $${offset + 2}, $${offset + 3},
          $${offset + 4}, $${offset + 5}, $${offset + 6},
          $${offset + 7}, $${offset + 8}, $${offset + 9},
          $${offset + 10}
        )`;
      });

      const result = await client.query(
        `INSERT INTO tasks (
          user_id, title, description, due_at,
          priority, status, category_id,
          created_at, updated_at, completed_at
        )
        VALUES ${placeholders.join(", ")}
        RETURNING id`,
        values
      );

      insertedTaskIds.push(...result.rows.map(row => row.id));

      console.log(
        `Inserted ${insertedTaskIds.length}/${TOTAL_TASKS} tasks`
      );
    }

    // Record creation events for the audit history.
    for (let i = 0; i < insertedTaskIds.length; i += 500) {
      const batch = insertedTaskIds.slice(i, i + 500);
      const values = [];
      const placeholders = batch.map((taskId, index) => {
        const offset = index * 3;

        values.push(user.id, taskId, "CREATED");

        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      });

      await client.query(
        `INSERT INTO task_events (user_id, task_id, action)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");

    console.log("\nDemo dataset created successfully.");
    console.log(`Account: ${user.email}`);
    console.log(`Tasks inserted: ${insertedTaskIds.length}`);
    console.log(`Completed: ${COMPLETED_COUNT}`);
    console.log(`Pending: ${TOTAL_TASKS - COMPLETED_COUNT}`);
    console.log(`Overdue pending: ${OVERDUE_COUNT}`);
    console.log(`Categories: ${CATEGORIES.length}`);
    console.log(`Audit events: ${insertedTaskIds.length}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo().catch(error => {
  console.error("\nDemo seeding failed:", error.message);
  process.exitCode = 1;
});
