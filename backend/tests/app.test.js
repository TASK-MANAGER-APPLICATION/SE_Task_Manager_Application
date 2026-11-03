const request = require("supertest");
const app = require("../app");

describe("HTTP app configuration", () => {
  test("allows the Expo Web development origin", async () => {
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
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
