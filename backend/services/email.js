const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass) {
    throw new Error("SMTP configuration is incomplete.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function buildResetLink(token) {
  const configuredUrl = process.env.PASSWORD_RESET_URL;
  if (!configuredUrl) throw new Error("PASSWORD_RESET_URL is not configured.");

  const resetUrl = new URL(configuredUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

async function sendPasswordResetEmail(email, token) {
  const link = buildResetLink(token);
  const from = process.env.SMTP_FROM;
  if (!from) throw new Error("SMTP_FROM is not configured.");

  await getTransporter().sendMail({
    from,
    to: email,
    subject: "Reset your Task Manager password",
    text: `Use this link to reset your password. It expires in 30 minutes: ${link}`,
    html: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p>`,
  });
}

module.exports = { sendPasswordResetEmail };
