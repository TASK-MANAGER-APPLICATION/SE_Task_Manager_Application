const app = require("./app");
const pool = require("./db");

const requiredInProduction = [
  "DATABASE_URL",
  "CORS_ORIGINS",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "PASSWORD_RESET_URL",
];

if (process.env.NODE_ENV === "production") {
  const missing = requiredInProduction.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error(
      `Missing required production environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT || 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error("PORT must be a valid TCP port number.");
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}; closing the server.`);

  server.close(() => {
    pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
