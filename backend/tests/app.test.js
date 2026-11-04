const request = require("supertest");

const loadAppWithCorsOrigins = (origins) => {
  const previousOrigins = process.env.CORS_ORIGINS;

  if (origins === undefined) {
    process.env.CORS_ORIGINS = "";
  } else {
    process.env.CORS_ORIGINS = origins;
  }

  let app;
  try {
    jest.isolateModules(() => {
      app = require("../app");
    });
  } finally {
    if (previousOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previousOrigins;
    }
  }

  return app;
};

describe("HTTP app configuration", () => {
  test("allows an origin on a normal request and continues to the route", async () => {
    const app = loadAppWithCorsOrigins(undefined);
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:8081");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:8081"
    );
    expect(response.body).toEqual({
      status: "ok",
      message: "Task Manager backend is running",
    });
  });

  test("allows the Expo Web development origin", async () => {
    const app = loadAppWithCorsOrigins(undefined);
    const response = await request(app)
      .options("/auth/login")
      .set("Origin", "http://localhost:8081")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:8081"
    );
    expect(response.headers["access-control-allow-headers"]).toBe(
      "Content-Type, Authorization"
    );
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  test("does not grant CORS access to an unconfigured origin", async () => {
    const app = loadAppWithCorsOrigins(undefined);
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("does not grant CORS headers to a disallowed preflight request", async () => {
    const app = loadAppWithCorsOrigins(undefined);
    const response = await request(app)
      .options("/health")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers["access-control-allow-headers"]).toBeUndefined();
    expect(response.headers["access-control-allow-methods"]).toBeUndefined();
  });

  test("uses configured CORS origins without granting access to other origins", async () => {
    const app = loadAppWithCorsOrigins(
      "https://mobile.example, https://admin.example"
    );

    const allowedResponse = await request(app)
      .get("/health")
      .set("Origin", "https://mobile.example");
    const disallowedResponse = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(allowedResponse.headers["access-control-allow-origin"]).toBe(
      "https://mobile.example"
    );
    expect(disallowedResponse.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
