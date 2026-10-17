import type { Destination } from "@sawa/shared";
import { AppError } from "../../lib/errors";
import type { DestinationSearch } from "../../services/ports";

const API = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;
const TEXT_SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.location";
/** Essentials fields only: the name comes from the autocomplete suggestion. */
const DETAILS_FIELDS = "id,formattedAddress,location";
/** Text Search finds businesses; addresses and streets come from Autocomplete limited to these. */
const ADDRESS_TYPES = ["street_address", "premise", "subpremise", "route"];

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

type GoogleAutocomplete = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }[];
};

type AddressPrediction = { placeId: string; name: string };

/**
 * Places API (New), limited to Warsaw, answers in Polish. Text Search gives businesses and
 * landmarks; in parallel Autocomplete looks for the typed street or address, which goes first.
 */
export function createGoogleDestinationSearch(
  apiKey: string,
  opts: { onAddressError?: (err: unknown) => void } = {},
): DestinationSearch {
  const call = async (url: string, fieldMask: string | undefined, body?: unknown) => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
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
      const text = await res.text();
      const status = googleStatus(text);
      const detail = text.slice(0, 300);
      throw new AppError(
        "UPSTREAM_ERROR",
        `Google Places answered ${res.status}${status ? ` ${status}` : ""}: ${detail}`,
      );
    }
    return res.json();
  };

  const searchPlaces = async (query: string) => {
    const body = (await call(`${API}/places:searchText`, TEXT_SEARCH_FIELDS, {
      textQuery: query,
      languageCode: "pl",
      regionCode: "PL",
      maxResultCount: MAX_RESULTS,
      locationRestriction: { rectangle: WARSAW },
    })) as { places?: GooglePlace[] };
    return (body.places ?? []).flatMap(toDestination);
  };

  const findAddress = async (query: string) => {
    const suggestions = (await call(`${API}/places:autocomplete`, undefined, {
      input: query,
      languageCode: "pl",
      includedRegionCodes: ["pl"],
      includedPrimaryTypes: ADDRESS_TYPES,
      locationRestriction: { rectangle: WARSAW },
    })) as GoogleAutocomplete;
    const prediction = pickAddress(suggestions, query);
    if (!prediction) return undefined;
    const details = (await call(
      `${API}/places/${encodeURIComponent(prediction.placeId)}?languageCode=pl`,
      DETAILS_FIELDS,
    )) as GooglePlace;
    return toAddressDestination(prediction, details);
  };

  return {
    async search(query) {
      const [places, address] = await Promise.allSettled([searchPlaces(query), findAddress(query)]);
      // A failed address lookup is not an error for the user: they still get the places. The
      // answer is marked partial so it is not cached, and the failure is reported.
      const found = address.status === "fulfilled" ? address.value : undefined;
      if (address.status === "rejected") opts.onAddressError?.(address.reason);
      if (places.status === "rejected") {
        if (found) return { results: [found], partial: true };
        throw places.reason;
      }
      return {
        results: mergeDestinations(found, places.value),
        partial: address.status === "rejected",
      };
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
      address: withoutCountry(place.formattedAddress),
      position: { lat, lng },
      kind: "place",
    },
  ];
}

/**
 * The first address suggestion worth putting above the places. With a house number Autocomplete
 * already answers the address; without one ("Marszałkowska") the street must start with what the
 * user typed, so "pałac kultury" does not turn into "Pałacowa".
 */
export function pickAddress(
  body: GoogleAutocomplete,
  query: string,
): AddressPrediction | undefined {
  const hasNumber = /\d/.test(query);
  const typed = normalize(query);
  for (const suggestion of body.suggestions ?? []) {
    const prediction = suggestion.placePrediction;
    const name = prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text;
    if (!prediction?.placeId || !name) continue;
    if (hasNumber || normalize(name).startsWith(typed)) {
      return { placeId: prediction.placeId, name };
    }
  }
  return undefined;
}

export function toAddressDestination(
  prediction: AddressPrediction,
  details: GooglePlace,
): Destination | undefined {
  const lat = details.location?.latitude;
  const lng = details.location?.longitude;
  if (lat === undefined || lng === undefined) return undefined;
  return {
    id: prediction.placeId,
    name: prediction.name,
    address: withoutCountry(details.formattedAddress),
    position: { lat, lng },
    kind: "address",
  };
}

/** The address first, then the places without a repeat of it, at most MAX_RESULTS. */
export function mergeDestinations(
  address: Destination | undefined,
  places: Destination[],
): Destination[] {
  if (!address) return places.slice(0, MAX_RESULTS);
  return [address, ...places.filter((place) => place.id !== address.id)].slice(0, MAX_RESULTS);
}

/** Google's error status ("PERMISSION_DENIED", "RESOURCE_EXHAUSTED") from an error body. */
function googleStatus(body: string): string | undefined {
  try {
    const status = (JSON.parse(body) as { error?: { status?: unknown } }).error?.status;
    return typeof status === "string" ? status : undefined;
  } catch {
    return undefined;
  }
}

/** "Plac Defilad 1, 00-901 Warszawa, Polska" → "Plac Defilad 1, 00-901 Warszawa" */
function withoutCountry(formattedAddress: string | undefined) {
  return (formattedAddress ?? "").replace(/, Polska$/, "");
}

/** Lower case, no Polish letters and no "ul." in front, for comparing typed text with a street. */
function normalize(text: string) {
  return text
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/^(ul\.?|ulica|al\.?|aleja|aleje|pl\.?|plac)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}
