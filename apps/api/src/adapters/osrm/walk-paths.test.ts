import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOsrmWalkPathSource,
  defaultMaxInFlight,
  firstWalkPath,
  LOCAL_MAX_IN_FLIGHT,
  PUBLIC_MAX_IN_FLIGHT,
  parseWalkPath,
} from "./walk-paths";

const from = { lat: 52.224, lng: 21.0049 };
const to = { lat: 52.2297, lng: 21.0122 };
const osrm = (coordinates: [number, number][]) => ({
  code: "Ok",
  routes: [{ geometry: { type: "LineString", coordinates }, distance: 1053.8, duration: 842.8 }],
});

afterEach(() => vi.unstubAllGlobals());

describe("parseWalkPath", () => {
  it("joins the path to the requested ends when OSRM snapped them to a street", () => {
    const path = parseWalkPath(
      osrm([
        [21.00485, 52.22409],
        [21.0074, 52.22467],
        [21.0122, 52.2297],
      ]),
      from,
      to,
    );
    expect(path).toEqual([
      [21.0049, 52.224],
      [21.00485, 52.22409],
      [21.0074, 52.22467],
      [21.0122, 52.2297],
    ]);
  });

  it("returns nothing for an error answer", () => {
    expect(parseWalkPath({ code: "NoRoute", routes: [] }, from, to)).toBeUndefined();
  });
});

describe("defaultMaxInFlight", () => {
  it("is higher for a router on this machine", () => {
    expect(defaultMaxInFlight("http://127.0.0.1:5000")).toBe(LOCAL_MAX_IN_FLIGHT);
    expect(defaultMaxInFlight("http://localhost:5000")).toBe(LOCAL_MAX_IN_FLIGHT);
    expect(defaultMaxInFlight("https://routing.openstreetmap.de/routed-foot")).toBe(
      PUBLIC_MAX_IN_FLIGHT,
    );
    expect(defaultMaxInFlight("not a url")).toBe(PUBLIC_MAX_IN_FLIGHT);
  });
});

describe("createOsrmWalkPathSource", () => {
  it("asks once per walk through all its points and caches the path", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        osrm([
          [21.0049, 52.224],
          [21.0122, 52.2297],
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const source = createOsrmWalkPathSource("https://osrm.test/routed-foot");

    expect(await source.path([from, to])).toHaveLength(2);
    expect(await source.path([from, to])).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/routed-foot/route/v1/driving/21.004900,52.224000;21.012200,52.229700?");
  });

  /** The most requests in flight at once when `count` paths are asked for together. */
  async function mostInFlight(baseUrl: string, count: number, options?: { maxInFlight?: number }) {
    let inFlight = 0;
    let most = 0;
    const fetchMock = vi.fn(async () => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return Response.json(
        osrm([
          [21.0049, 52.224],
          [21.0122, 52.2297],
        ]),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const source = createOsrmWalkPathSource(baseUrl, undefined, options);

    const ends = Array.from({ length: count }, (_, i) => ({
      lat: 52.2297,
      lng: 21.0122 + i / 1000,
    }));
    const paths = await Promise.all(ends.map((end) => source.path([from, end])));
    expect(paths.every(Boolean)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(count);
    return most;
  }

  it("keeps at most two requests in flight (the public server answers 429 to bursts)", async () => {
    expect(await mostInFlight("https://osrm.test/routed-foot", 5)).toBe(2);
  });

  it("sends more at once to its own router next to the API", async () => {
    expect(await mostInFlight("http://127.0.0.1:5000", 12)).toBe(LOCAL_MAX_IN_FLIGHT);
  });

  it("takes the limit from options", async () => {
    expect(await mostInFlight("https://osrm.test/routed-foot", 6, { maxInFlight: 3 })).toBe(3);
  });

  it("returns undefined when the router fails, and asks again next time", async () => {
    const fetchMock = vi.fn(async () => new Response("busy", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const source = createOsrmWalkPathSource("https://osrm.test/routed-foot");

    expect(await source.path([from, to])).toBeUndefined();
    expect(await source.path([from, to])).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("firstWalkPath", () => {
  const line: [number, number][] = [
    [21.0049, 52.224],
    [21.0122, 52.2297],
  ];
  const failing = () => ({ path: vi.fn(async () => undefined) });
  const working = () => ({ path: vi.fn(async () => line) });

  it("asks the next router when the first finds no path", async () => {
    const [osrm, valhalla] = [failing(), working()];
    expect(await firstWalkPath([osrm, valhalla]).path([from, to])).toEqual(line);
    expect(osrm.path).toHaveBeenCalledTimes(1);
  });

  it("skips a failed router for a minute, then tries it again", async () => {
    let now = 0;
    const [osrm, valhalla] = [failing(), working()];
    const source = firstWalkPath([osrm, valhalla], () => now);
    await source.path([from, to]);
    now = 30_000;
    await source.path([from, to]);
    expect(osrm.path).toHaveBeenCalledTimes(1);
    now = 61_000;
    await source.path([from, to]);
    expect(osrm.path).toHaveBeenCalledTimes(2);
    expect(valhalla.path).toHaveBeenCalledTimes(3);
  });

  it("asks all routers when all failed recently", async () => {
    const [osrm, valhalla] = [failing(), failing()];
    const source = firstWalkPath([osrm, valhalla], () => 0);
    expect(await source.path([from, to])).toBeUndefined();
    expect(await source.path([from, to])).toBeUndefined();
    expect(osrm.path).toHaveBeenCalledTimes(2);
    expect(valhalla.path).toHaveBeenCalledTimes(2);
  });
});
