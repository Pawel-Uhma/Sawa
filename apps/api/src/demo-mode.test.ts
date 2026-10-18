import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFixtureStore } from "./adapters/demo/fixture-store";
import { createApp } from "./app";
import { createReplayStoryService } from "./services/demo";
import { createFakeRoutePlanner } from "./services/fake-route-planner";

/**
 * The pitch runs on DEMO_MODE=replay (services/demo.ts): the committed fixtures must load and
 * every saved story must come back through the API, after any change to the contract or app.
 */
describe("demo replay on the committed fixtures", () => {
  const fixtures = createFixtureStore(new URL("../data/demo/", import.meta.url));
  const app = createApp({
    corsOrigins: [],
    demoMode: "replay",
    services: {
      routePlanner: createFakeRoutePlanner(),
      stories: (built) => createReplayStoryService(fixtures, built),
    },
  });

  it("loads the saved stories", () => {
    expect(fixtures.size().stories).toBeGreaterThan(0);
  });

  it("tells each saved story through POST /v1/stories", async () => {
    const file = new URL("../data/demo/stories.json", import.meta.url);
    const ids = Object.keys(JSON.parse(readFileSync(file, "utf8")));
    for (const placeId of ids) {
      const res = await app.request("/v1/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, targetSec: 60 }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ placeId, text: fixtures.story(placeId)?.text });
    }
  });

  it("says so on /health", async () => {
    const res = await app.request("/health");
    expect(await res.json()).toMatchObject({ demoMode: "replay" });
  });
});
