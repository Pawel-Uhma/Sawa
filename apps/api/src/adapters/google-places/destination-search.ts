import type { Destination } from "@sawa/shared";
import { AppError } from "../../lib/errors";
import type { DestinationSearch } from "../../services/ports";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location";

/** Warsaw with a margin: the planner only knows ZTM lines, so results outside are useless. */
const WARSAW = {
  low: { latitude: 52.09, longitude: 20.85 },
  high: { latitude: 52.37, longitude: 21.28 },
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

/** Places API (New) Text Search, limited to Warsaw, answers in Polish. */
export function createGoogleDestinationSearch(apiKey: string): DestinationSearch {
  return {
    async search(query) {
      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: "pl",
            regionCode: "PL",
            maxResultCount: MAX_RESULTS,
            locationRestriction: { rectangle: WARSAW },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new AppError("UPSTREAM_TIMEOUT", "Place search timed out", { cause: err });
        }
        throw new AppError("UPSTREAM_ERROR", "Place search unreachable", { cause: err });
      }
      if (!res.ok) {
        // The body explains quota and permission errors; it never contains the key.
        const detail = (await res.text()).slice(0, 300);
        throw new AppError("UPSTREAM_ERROR", `Google Places answered ${res.status}: ${detail}`);
      }
      const body = (await res.json()) as { places?: GooglePlace[] };
      return (body.places ?? []).flatMap(toDestination);
    },
  };
}

export function toDestination(place: GooglePlace): Destination[] {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const name = place.displayName?.text;
  if (!place.id || !name || lat === undefined || lng === undefined) return [];
  return [
    {
      id: place.id,
      name,
      // "Plac Defilad 1, 00-901 Warszawa, Polska" → "Plac Defilad 1, 00-901 Warszawa"
      address: (place.formattedAddress ?? "").replace(/, Polska$/, ""),
      position: { lat, lng },
    },
  ];
}
