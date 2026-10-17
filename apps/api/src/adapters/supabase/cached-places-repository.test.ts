import { describe, expect, it, vi } from "vitest";
import type { PlacesRepository } from "../../services/ports";
import { createCachedPlacesRepository } from "./cached-places-repository";
import { createFakePlacesRepository } from "./fake-places-repository";

const box = { minLng: 20.975, minLat: 52.232, maxLng: 20.985, maxLat: 52.239 };

function setup() {
  const fake = createFakePlacesRepository();
  const repo = {
    listInBBox: vi.fn(fake.listInBBox),
    getById: vi.fn(fake.getById),
    listNearLine: vi.fn(fake.listNearLine),
  } satisfies PlacesRepository;
  let now = 0;
  const cached = createCachedPlacesRepository(repo, () => now);
  return { fake, repo, cached, advance: (ms: number) => (now += ms) };
}

describe("createCachedPlacesRepository", () => {
  it("answers a hundred parallel map requests with one Supabase query", async () => {
    const { repo, cached } = setup();
    await Promise.all(Array.from({ length: 100 }, () => cached.listInBBox(box)));
    expect(repo.listInBBox).toHaveBeenCalledTimes(1);
  });

  it("shares one query between nearby boxes and different interests", async () => {
    const { repo, cached } = setup();
    await cached.listInBBox(box);
    await cached.listInBBox({ ...box, minLng: box.minLng + 0.001 }, ["jewish_warsaw"]);
    expect(repo.listInBBox).toHaveBeenCalledTimes(1);
  });

  it("returns the same places as the direct query, richest first", async () => {
    const { fake, cached } = setup();
    for (const interests of [undefined, ["jewish_warsaw"], ["sport"]]) {
      expect(await cached.listInBBox(box, interests)).toEqual(
        await fake.listInBBox(box, interests),
      );
    }
  });

  it("caches place details, including unknown ids", async () => {
    const { repo, cached } = setup();
    await Promise.all([cached.getById("kercelak"), cached.getById("kercelak")]);
    expect(await cached.getById("nope")).toBeNull();
    expect(await cached.getById("nope")).toBeNull();
    expect(repo.getById).toHaveBeenCalledTimes(2);
  });

  it("does not keep failures", async () => {
    const { repo, cached } = setup();
    repo.getById.mockRejectedValueOnce(new Error("timeout"));
    await expect(cached.getById("kercelak")).rejects.toThrow("timeout");
    expect((await cached.getById("kercelak"))?.id).toBe("kercelak");
  });

  it("serves a stale value at once and refetches it in the background", async () => {
    const { repo, cached, advance } = setup();
    await cached.getById("kercelak");
    advance(6 * 60_000);
    expect((await cached.getById("kercelak"))?.id).toBe("kercelak");
    expect(repo.getById).toHaveBeenCalledTimes(2);
    await cached.getById("kercelak");
    expect(repo.getById).toHaveBeenCalledTimes(2);
  });

  it("keeps the stale value when the refetch fails", async () => {
    const { repo, cached, advance } = setup();
    await cached.getById("kercelak");
    advance(6 * 60_000);
    repo.getById.mockRejectedValueOnce(new Error("down"));
    expect((await cached.getById("kercelak"))?.id).toBe("kercelak");
    await Promise.resolve();
    expect((await cached.getById("kercelak"))?.id).toBe("kercelak");
  });
});
