import { describe, expect, it, vi } from "vitest";
import { createFootRoutingSource, parseFootRoute } from "./foot-routing";

const A = { lat: 52.2359, lng: 20.9789 };
const B = { lat: 52.2302, lng: 20.9842 };
const OSRM = {
  code: "Ok",
  routes: [
    {
      geometry: {
        coordinates: [
          [20.9789, 52.2359],
          [20.981, 52.233],
          [20.9842, 52.2302],
        ],
      },
    },
  ],
};

const answer = (body: unknown, ok = true) =>
  vi.fn(async (_url: string) => ({ ok, json: async () => body }) as Response);

describe("parseFootRoute", () => {
  it("reads the street path of an OSRM answer", () => {
    expect(parseFootRoute(OSRM)).toEqual([A, { lat: 52.233, lng: 20.981 }, B]);
  });

  it.each([[{ code: "NoRoute", routes: [] }], [{}], [null]])("gives nothing for %j", (body) => {
    expect(parseFootRoute(body)).toBeUndefined();
  });
});

describe("createFootRoutingSource", () => {
  it("asks once per pair of points", async () => {
    const fetch = answer(OSRM);
    const source = createFootRoutingSource(fetch as unknown as typeof globalThis.fetch);
    expect(await source.path(A, B)).toHaveLength(3);
    await source.path(A, B);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("20.97890,52.23590;20.98420,52.23020");
  });

  it("gives nothing on an error and asks again next time", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("timeout");
    });
    const source = createFootRoutingSource(fetch as unknown as typeof globalThis.fetch);
    expect(await source.path(A, B)).toBeUndefined();
    await new Promise((r) => setTimeout(r, 0));
    await source.path(A, B);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives nothing on an HTTP error", async () => {
    const source = createFootRoutingSource(answer({}, false) as unknown as typeof globalThis.fetch);
    expect(await source.path(A, B)).toBeUndefined();
  });
});
