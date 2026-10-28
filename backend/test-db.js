
const pool = require("./db");

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    console.log("Database connection successful!");
    console.log(result.rows[0]);
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
