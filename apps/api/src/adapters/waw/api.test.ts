import { afterEach, describe, expect, it, vi } from "vitest";
import bus from "./__fixtures__/vehicles-bus.json";
import { DEFAULT_WAW_API, wawActionUrl, wawHeaders } from "./api";
import { createWawVehiclePositionSource } from "./vehicle-positions";

const PROXY = { baseUrl: "https://proxy.example/", proxyKey: "secret" };

describe("wawActionUrl", () => {
  it("points at the city by default", () => {
    expect(wawActionUrl(DEFAULT_WAW_API, "get_x")).toBe(
      "https://dane.um.warszawa.pl/api/action/get_x",
    );
  });

  it("uses the proxy base without a double slash", () => {
    expect(wawActionUrl(PROXY, "get_x")).toBe("https://proxy.example/api/action/get_x");
  });
});

describe("wawHeaders", () => {
  it("adds X-Proxy-Key only when a key is set", () => {
    expect(wawHeaders(DEFAULT_WAW_API, "tok")).not.toHaveProperty("X-Proxy-Key");
    expect(wawHeaders(PROXY, "tok")).toMatchObject({
      Authorization: "tok",
      "X-Proxy-Key": "secret",
    });
  });
});

describe("createWawVehiclePositionSource through the proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks the proxy with the token and the proxy key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(bus)));
    vi.stubGlobal("fetch", fetchMock);
    await createWawVehiclePositionSource("tok", PROXY).positions();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proxy.example/api/action/get_ztm_lokalizacja_pojazdow");
    expect(init.headers).toMatchObject({ Authorization: "tok", "X-Proxy-Key": "secret" });
  });
});
