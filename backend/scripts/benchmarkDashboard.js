require("dotenv").config();

const { performance } = require("perf_hooks");
const pool = require("../db");

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function benchmark() {
  const baseUrl = process.env.DASHBOARD_BASE_URL;
  const token = process.env.DASHBOARD_ACCESS_TOKEN;
  const userId = process.env.DASHBOARD_USER_ID;
  const runs = Number(process.env.DASHBOARD_RUNS || 50);
  if (!baseUrl || !token || !userId || !Number.isInteger(runs) || runs < 10) {
    throw new Error("Set DASHBOARD_BASE_URL, DASHBOARD_ACCESS_TOKEN, DASHBOARD_USER_ID, and DASHBOARD_RUNS (at least 10).");
  }

  const countResult = await pool.query(
    "SELECT COUNT(*)::int AS count FROM tasks WHERE user_id = $1",
    [userId]
  );
  const taskCount = countResult.rows[0].count;
  if (taskCount < 1000) {
    throw new Error(`Representative dashboard benchmark requires at least 1,000 tasks; found ${taskCount}.`);
  }

  const explain = await pool.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
     SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
            COUNT(*) FILTER (WHERE status = 'Pending' AND due_at < NOW())::int AS overdue,
            COUNT(*) FILTER (WHERE priority = 'Low')::int AS priority_low,
            COUNT(*) FILTER (WHERE priority = 'Medium')::int AS priority_medium,
            COUNT(*) FILTER (WHERE priority = 'High')::int AS priority_high
     FROM tasks
     WHERE user_id = $1`,
    [userId]
  );
  const databaseExecutionMs = explain.rows[0]["QUERY PLAN"][0]["Execution Time"];

  const requestUrl = new URL("/tasks/summary", baseUrl);
  const samples = [];
  for (let index = 0; index < runs + 5; index += 1) {
    const start = performance.now();
    const response = await fetch(requestUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Dashboard request failed with HTTP ${response.status}.`);
    }
    await response.json();
    const durationMs = performance.now() - start;
    if (index >= 5) samples.push(durationMs);
  }

  const p50 = percentile(samples, 0.5);
  const p95 = percentile(samples, 0.95);
  console.log(JSON.stringify({
    environment: process.env.NODE_ENV || "unspecified",
    taskCount,
    apiRuns: runs,
    warmupRuns: 5,
    summaryQueriesPerRequest: 1,
    databaseExecutionMs,
    apiP50Ms: Number(p50.toFixed(2)),
    apiP95Ms: Number(p95.toFixed(2)),
    apiTargetUnderThreeSeconds: p95 < 3000,
  }, null, 2));
}

benchmark()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
