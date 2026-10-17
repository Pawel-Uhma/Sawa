import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { AppError, toErrorBody } from "./errors";
import { rateLimit } from "./rate-limit";

function appWith(now: () => number) {
  return new Hono()
    .onError((err, c) =>
      err instanceof AppError
        ? c.json(toErrorBody(err.code, err.message), err.status)
        : c.text("", 500),
    )
    .use("*", rateLimit({ limit: 2, windowMs: 60_000, now }))
    .get("/", (c) => c.text("ok"));
}

const get = (app: ReturnType<typeof appWith>, ip: string) =>
  app.request("/", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

describe("rateLimit", () => {
  it("answers 429 past the limit, per client IP", async () => {
    const app = appWith(() => 0);
    expect((await get(app, "1.1.1.1")).status).toBe(200);
    expect((await get(app, "1.1.1.1")).status).toBe(200);
    const blocked = await get(app, "1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect((await get(app, "2.2.2.2")).status).toBe(200);
  });

  it("lets the client in again in the next window", async () => {
    let t = 0;
    const app = appWith(() => t);
    for (let i = 0; i < 3; i++) await get(app, "1.1.1.1");
    t = 60_000;
    expect((await get(app, "1.1.1.1")).status).toBe(200);
  });
});
