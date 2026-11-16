describe("Brevo password reset email delivery", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  let sendPasswordResetEmail;

  beforeEach(() => {
    jest.resetModules();

    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_SENDER_EMAIL = "noreply@example.test";
    process.env.BREVO_SENDER_NAME = "Task Manager";
    process.env.PASSWORD_RESET_URL = "mobile://reset-password";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });

    sendPasswordResetEmail =
      require("../services/email").sendPasswordResetEmail;
  });

  afterEach(() => {
    global.fetch = originalFetch;

    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  test("sends the correct Brevo request and reset link", async () => {
    await sendPasswordResetEmail("user@example.test", "a".repeat(64));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options.method).toBe("POST");
    expect(options.redirect).toBe("error");
    expect(options.headers).toEqual({
      accept: "application/json",
      "api-key": "test-api-key",
      "content-type": "application/json",
    });

    const payload = JSON.parse(options.body);

    expect(payload.sender).toEqual({
      name: "Task Manager",
      email: "noreply@example.test",
    });
    expect(payload.to).toEqual([{ email: "user@example.test" }]);
    expect(payload.subject).toBe("Reset your Task Manager password");
    expect(payload.textContent).toContain(
      "mobile://reset-password?token="
    );
    expect(payload.htmlContent).toContain(
      "mobile://reset-password?token="
    );
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test("rejects when the API key is missing", async () => {
    delete process.env.BREVO_API_KEY;

    await expect(
      sendPasswordResetEmail("user@example.test", "a".repeat(64))
    ).rejects.toThrow("BREVO_API_KEY is not configured.");

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects when the sender email is missing", async () => {
    delete process.env.BREVO_SENDER_EMAIL;

    await expect(
      sendPasswordResetEmail("user@example.test", "a".repeat(64))
    ).rejects.toThrow("BREVO_SENDER_EMAIL is not configured.");

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("uses the default sender name when none is configured", async () => {
    delete process.env.BREVO_SENDER_NAME;

    await sendPasswordResetEmail("user@example.test", "a".repeat(64));

    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload.sender.name).toBe("Task Manager");
  });

  test("rejects non-success Brevo responses without exposing response bodies", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue("sensitive provider response"),
    });

    await expect(
      sendPasswordResetEmail("user@example.test", "b".repeat(64))
    ).rejects.toMatchObject({
      message: "Brevo email request failed with HTTP 401.",
      code: "BREVO_HTTP_401",
    });
  });

  test("does not expose credentials or reset tokens in network errors", async () => {
    global.fetch.mockRejectedValueOnce(
      new Error("Failed using test-api-key and " + "c".repeat(64))
    );

    await expect(
      sendPasswordResetEmail("user@example.test", "c".repeat(64))
    ).rejects.toMatchObject({
      message: "Brevo email request failed.",
      code: "BREVO_NETWORK_ERROR",
    });
  });

  test("reports request timeouts without exposing the original error", async () => {
    const timeout = new Error("request timed out");
    timeout.name = "TimeoutError";
    global.fetch.mockRejectedValueOnce(timeout);

    await expect(
      sendPasswordResetEmail("user@example.test", "d".repeat(64))
    ).rejects.toMatchObject({
      message: "Brevo email request timed out.",
      code: "BREVO_TIMEOUT",
    });
  });

  test("rejects when the reset URL is missing", async () => {
    delete process.env.PASSWORD_RESET_URL;

    await expect(
      sendPasswordResetEmail("user@example.test", "e".repeat(64))
    ).rejects.toThrow("PASSWORD_RESET_URL is not configured.");

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
