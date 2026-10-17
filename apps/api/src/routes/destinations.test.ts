import { ApiErrorSchema, DestinationsResponseSchema } from "@sawa/shared";
import { describe, expect, it } from "vitest";
import { toDestination } from "../adapters/google-places/destination-search";
import { createApp } from "../app";
import { createFakeRoutePlanner } from "../services/fake-route-planner";
import {
  createDestinationService,
  createDisabledDestinationService,
} from "../services/search-destinations";

const PKIN = {
  id: "ChIJ-pkin",
  name: "Pałac Kultury i Nauki",
  address: "plac Defilad 1, 00-901 Warszawa",
  position: { lat: 52.2318, lng: 21.006 },
};

const appWith = (destinations = createDestinationService({ search: async () => [PKIN] })) =>
  createApp({
    corsOrigins: [],
    services: { routePlanner: createFakeRoutePlanner(), destinations },
  });

describe("GET /v1/destinations", () => {
  it("returns places found by name", async () => {
    const res = await appWith().request("/v1/destinations?q=pałac%20kultury");
    expect(res.status).toBe(200);
    expect(DestinationsResponseSchema.parse(await res.json()).results).toEqual([PKIN]);
  });

  it("rejects a one-letter query", async () => {
    const res = await appWith().request("/v1/destinations?q=p");
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });

  it("answers 502 when search is not configured", async () => {
    const res = await appWith(createDisabledDestinationService()).request(
      "/v1/destinations?q=pkin",
    );
    expect(res.status).toBe(502);
  });

  it("asks the source once for the same query typed differently", async () => {
    let calls = 0;
    const service = createDestinationService({
      search: async () => {
        calls += 1;
        return [PKIN];
      },
    });
    await service.search("Pałac  Kultury");
    await service.search("pałac kultury ");
    expect(calls).toBe(1);
  });
});

describe("toDestination", () => {
  it("maps a Google place and drops the country", () => {
    expect(
      toDestination({
        id: "x",
        displayName: { text: "Łazienki Królewskie" },
        formattedAddress: "Agrykoli 1, 00-460 Warszawa, Polska",
        location: { latitude: 52.215, longitude: 21.035 },
      }),
    ).toEqual([
      {
        id: "x",
        name: "Łazienki Królewskie",
        address: "Agrykoli 1, 00-460 Warszawa",
        position: { lat: 52.215, lng: 21.035 },
        kind: "place",
      },
    ]);
  });

  it("skips a place without a location", () => {
    expect(toDestination({ id: "x", displayName: { text: "Bez punktu" } })).toEqual([]);
  });
});
