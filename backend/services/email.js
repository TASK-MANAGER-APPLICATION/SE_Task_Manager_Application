const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10000;

function buildResetLink(token) {
  const configuredUrl = process.env.PASSWORD_RESET_URL;
  if (!configuredUrl) {
    throw new Error("PASSWORD_RESET_URL is not configured.");
  }

  const resetUrl = new URL(configuredUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

async function sendPasswordResetEmail(email, token) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Task Manager";

  if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL is not configured.");

  const link = buildResetLink(token);

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email }],
    subject: "Reset your Task Manager password",
    textContent: `Use this link to reset your password. It expires in 30 minutes: ${link}`,
    htmlContent: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p>`,
  };

  let response;

  try {
    response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const deliveryError = new Error(
      error.name === "TimeoutError" || error.name === "AbortError"
        ? "Brevo email request timed out."
        : "Brevo email request failed."
    );
    deliveryError.code =
      error.name === "TimeoutError" || error.name === "AbortError"
        ? "BREVO_TIMEOUT"
        : "BREVO_NETWORK_ERROR";
    throw deliveryError;
  }

  if (!response.ok) {
    const deliveryError = new Error(
      `Brevo email request failed with HTTP ${response.status}.`
    );
    deliveryError.code = `BREVO_HTTP_${response.status}`;
    throw deliveryError;
  }
}

module.exports = { sendPasswordResetEmail };
