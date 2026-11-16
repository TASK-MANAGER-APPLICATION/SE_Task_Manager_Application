jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
}), { virtual: true });

describe("SMTP password reset email delivery", () => {
  const originalEnv = { ...process.env };
  let nodemailer;
  let sendMail;
  let sendPasswordResetEmail;

  beforeEach(() => {
    jest.resetModules();
    nodemailer = require("nodemailer");
    sendPasswordResetEmail = require("../services/email").sendPasswordResetEmail;
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "password";
    process.env.SMTP_FROM = "Task Manager <noreply@example.test>";
    process.env.PASSWORD_RESET_URL = "mobile://reset-password";
    sendMail = jest.fn().mockResolvedValue({ messageId: "test-message" });
    nodemailer.createTransport.mockReturnValue({ sendMail });
  });

  afterAll(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  test("uses the configured SMTP transport and reset deep link", async () => {
    await sendPasswordResetEmail("user@example.test", "a".repeat(64));
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.test",
      port: 587,
      secure: false,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@example.test",
      text: expect.stringContaining("mobile://reset-password?token="),
    }));
  });

  test("propagates SMTP failures without exposing token or recipient in errors", async () => {
    const deliveryError = new Error("SMTP unavailable");
    sendMail.mockRejectedValue(deliveryError);
    await expect(sendPasswordResetEmail("user@example.test", "b".repeat(64)))
      .rejects.toBe(deliveryError);
  });
});
