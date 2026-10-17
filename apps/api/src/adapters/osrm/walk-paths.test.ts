import { afterEach, describe, expect, it, vi } from "vitest";
import { createOsrmWalkPathSource, parseWalkPath } from "./walk-paths";

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

  it("keeps at most two requests in flight (the public server answers 429 to bursts)", async () => {
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
    const source = createOsrmWalkPathSource("https://osrm.test/routed-foot");

    const ends = [0, 1, 2, 3, 4].map((i) => ({ lat: 52.2297, lng: 21.0122 + i / 1000 }));
    const paths = await Promise.all(ends.map((end) => source.path([from, end])));
    expect(paths.every(Boolean)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(most).toBe(2);
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
