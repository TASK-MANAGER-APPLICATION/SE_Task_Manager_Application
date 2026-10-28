
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = [
      "001_initial_schema.sql",
      "002_session_token_hash.sql",
    ];

    for (const filename of migrationFiles) {
      const existing = await client.query(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [filename]
      );

      if (existing.rowCount > 0) {
        console.log(`${filename} has already been applied.`);
        continue;
      }

      const migrationPath = path.join(
        __dirname,
        "migrations",
        filename
      );

      const sql = fs.readFileSync(migrationPath, "utf8");

      await client.query(sql);

      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename]
      );

      console.log(`Successfully applied ${filename}`);
    }

    await client.query("COMMIT");
    console.log("All migrations are up to date.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
