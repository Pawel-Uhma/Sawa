import { afterEach, describe, expect, it, vi } from "vitest";
import autocomplete from "./__fixtures__/google-autocomplete-marszalkowska-10.json";
import details from "./__fixtures__/google-details-marszalkowska-10.json";
import textSearch from "./__fixtures__/google-text-search-marszalkowska-10.json";
import { createGoogleDestinationSearch, pickAddress } from "./destination-search";

afterEach(() => vi.unstubAllGlobals());

/** Answers like Google: Text Search, Autocomplete and Place Details by URL. */
function stubGoogle(answers: { text?: unknown; autocomplete?: unknown; details?: unknown }) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const body = url.endsWith(":searchText")
      ? answers.text
      : url.endsWith(":autocomplete")
        ? answers.autocomplete
        : answers.details;
    if (body === undefined) return new Response("PERMISSION_DENIED", { status: 403 });
    return Response.json(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createGoogleDestinationSearch", () => {
  it("puts the typed address before the businesses at it", async () => {
    stubGoogle({ text: textSearch, autocomplete, details });
    const { results, partial } =
      await createGoogleDestinationSearch("key").search("marszałkowska 10");

    expect(partial).toBe(false);
    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({
      id: autocomplete.suggestions[0]?.placePrediction.placeId,
      name: "Marszałkowska 10",
      address: "Marszałkowska 10, 00-590 Warszawa",
      position: { lat: 52.2166453, lng: 21.0183716 },
      kind: "address",
    });
    expect(results.slice(1).map((r) => [r.name, r.kind])).toEqual([
      ["HOTPOT Asia Deli", "place"],
      ["BBP Kancelaria Adwokacka", "place"],
      ["Pracownia Psychoterapii", "place"],
      ["Hm & Hare Design", "place"],
    ]);
  });

  it("asks for coordinates of the chosen address only", async () => {
    const fetchMock = stubGoogle({ text: textSearch, autocomplete, details });
    await createGoogleDestinationSearch("key").search("marszałkowska 10");
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.filter((url) => url.includes("/places/"))).toEqual([
      `https://places.googleapis.com/v1/places/${autocomplete.suggestions[0]?.placePrediction.placeId}?languageCode=pl`,
    ]);
  });

  it("returns the places marked partial and reports why when Autocomplete fails", async () => {
    stubGoogle({ text: textSearch });
    const onAddressError = vi.fn();
    const { results, partial } = await createGoogleDestinationSearch("secret-key", {
      onAddressError,
    }).search("marszałkowska 10");

    expect(results.map((r) => r.name)[0]).toBe("HOTPOT Asia Deli");
    expect(results).toHaveLength(5);
    expect(partial).toBe(true);
    expect(onAddressError).toHaveBeenCalledOnce();
    const message = String((onAddressError.mock.calls[0]?.[0] as Error).message);
    expect(message).toMatch(/403/);
    expect(message).not.toContain("secret-key");
  });

  it("names Google's error status when the address lookup is refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) =>
        String(input).endsWith(":searchText")
          ? Response.json(textSearch)
          : Response.json(
              { error: { code: 403, message: "API not enabled", status: "PERMISSION_DENIED" } },
              { status: 403 },
            ),
      ),
    );
    const onAddressError = vi.fn();
    await createGoogleDestinationSearch("key", { onAddressError }).search("lwa");
    expect((onAddressError.mock.calls[0]?.[0] as Error).message).toMatch(
      /^Google Places answered 403 PERMISSION_DENIED/,
    );
  });

  it("returns the address alone, marked partial, when Text Search fails", async () => {
    stubGoogle({ autocomplete, details });
    const { results, partial } =
      await createGoogleDestinationSearch("key").search("marszałkowska 10");
    expect(results.map((r) => r.kind)).toEqual(["address"]);
    expect(partial).toBe(true);
  });

  it("fails when neither search answers", async () => {
    stubGoogle({});
    await expect(createGoogleDestinationSearch("key").search("marszałkowska 10")).rejects.toThrow(
      /403/,
    );
  });
});

describe("pickAddress", () => {
  const street = (mainText: string) => ({
    suggestions: [
      {
        placePrediction: {
          placeId: "route-1",
          structuredFormat: { mainText: { text: mainText } },
        },
      },
    ],
  });

  it("takes the first suggestion for a query with a house number", () => {
    expect(pickAddress(autocomplete, "Grzybowska 62")?.name).toBe("Marszałkowska 10");
  });

  it("finds a street typed without a number, ignoring case, Polish letters and „ul.”", () => {
    expect(pickAddress(street("Marszałkowska"), "ul. marszalkowska")?.placeId).toBe("route-1");
  });

  it("does not turn a landmark name into a street that only looks similar", () => {
    expect(pickAddress(street("Pałacowa"), "pałac kultury")).toBeUndefined();
  });

  it("returns nothing for an empty answer", () => {
    expect(pickAddress({}, "Marszałkowska 10")).toBeUndefined();
  });
});
