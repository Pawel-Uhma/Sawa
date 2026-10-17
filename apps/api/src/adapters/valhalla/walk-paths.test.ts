import { afterEach, describe, expect, it, vi } from "vitest";
import { createValhallaWalkPathSource, decodePolyline6, parseValhallaPath } from "./walk-paths";

// A real answer of valhalla1.openstreetmap.de, pedestrian, Stawki ~110 m north.
const SHAPE = "muftbBy{m`g@g@c@yBmBcAdEm@dCi@zBs@zCy@q@KK[W][OK{G_GeRkPuEiAo@dEyFvk@";
const from = { lat: 52.2525, lng: 20.9955 };
const to = { lat: 52.2535, lng: 20.995 };
const valhalla = (...shapes: string[]) => ({
  trip: { status: 0, legs: shapes.map((shape) => ({ shape, summary: {} })) },
});

afterEach(() => vi.unstubAllGlobals());

describe("decodePolyline6", () => {
  it("decodes Valhalla's shape to [lng, lat] pairs", () => {
    const line = decodePolyline6(SHAPE);
    expect(line).toHaveLength(17);
    expect(line[0]).toEqual([20.995533, 52.252519]);
    expect(line[16]).toEqual([20.994991, 52.253481]);
  });
});

describe("parseValhallaPath", () => {
  it("joins the legs without repeating the point between them", () => {
    const path = parseValhallaPath(valhalla(SHAPE, SHAPE), from, to);
    // Both legs are the same shape here: 17 + 16 points, plus the requested ends.
    expect(path).toHaveLength(35);
    expect(path?.[0]).toEqual([from.lng, from.lat]);
    expect(path?.[34]).toEqual([to.lng, to.lat]);
  });

  it("returns nothing for an error answer", () => {
    expect(
      parseValhallaPath({ error_code: 171, error: "No suitable edges" }, from, to),
    ).toBeUndefined();
  });
});

describe("createValhallaWalkPathSource", () => {
  it("posts all points with pedestrian costing once and caches the path", async () => {
    const fetchMock = vi.fn(async () => Response.json(valhalla(SHAPE)));
    vi.stubGlobal("fetch", fetchMock);
    const source = createValhallaWalkPathSource("https://valhalla.test");

    expect(await source.path([from, to])).toHaveLength(19);
    expect(await source.path([from, to])).toHaveLength(19);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://valhalla.test/route");
    expect(JSON.parse(init.body as string)).toMatchObject({
      costing: "pedestrian",
      locations: [
        { lat: 52.2525, lon: 20.9955 },
        { lat: 52.2535, lon: 20.995 },
      ],
    });
  });

  it("logs a failed request and asks again next time", async () => {
    const fetchMock = vi.fn(async () => new Response("busy", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.fn();
    const source = createValhallaWalkPathSource("https://valhalla.test", { warn });

    expect(await source.path([from, to])).toBeUndefined();
    expect(await source.path([from, to])).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      { router: "valhalla", status: 429 },
      "walk path request failed",
    );
  });
});
