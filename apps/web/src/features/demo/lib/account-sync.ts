// Czyste przekształcenia między pamięcią i profilem na urządzeniu a wierszami konta w Supabase
// (supabase/migrations/20261020120000_accounts.sql). Wszystko, co przychodzi z bazy, przechodzi
// przez zod. IO jest w lib/account.ts.

import { LatLngSchema, type Route, TRAVEL } from "@sawa/shared";
import { z } from "zod";
import type { Memory, RememberedStory } from "./memory";
import type { Profile } from "./onboarding";

/** Ile zapisanych tras pokazuje „Moje trasy”. */
export const SAVED_ROUTES_LIMIT = 20;

export const VisitRowSchema = z.object({
  place_id: z.string(),
  place_name: z.string().nullable(),
  fact_ids: z.array(z.string()),
  context_ids: z.array(z.string()),
  heard_at: z.string(),
});
export type VisitRow = z.infer<typeof VisitRowSchema>;
export type VisitInsert = Omit<VisitRow, "heard_at"> & { heard_at?: string };

export const ProfileRowSchema = z.object({
  familiarity: z.string().nullable(),
  interests: z.array(z.string()),
  story_style: z.string().nullable(),
  audience: z.string().nullable(),
  context_ids: z.array(z.string()),
});
export type ProfileRow = z.infer<typeof ProfileRowSchema>;

const RideEndSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("loop") }),
  z.object({
    type: z.literal("destination"),
    name: z.string(),
    address: z.string().optional(),
    point: LatLngSchema,
  }),
]);

/** Parametry planera, z których „Powtórz” liczy tę samą przejażdżkę od nowa. */
export const SavedRouteRequestSchema = z.object({
  origin: LatLngSchema,
  durationMin: z.number().int().positive(),
  rideEnd: RideEndSchema,
  travel: z.enum(TRAVEL),
});
export type SavedRouteRequest = z.infer<typeof SavedRouteRequestSchema>;

export const SavedRouteRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  request: SavedRouteRequestSchema,
  place_ids: z.array(z.string()),
  place_names: z.array(z.string()),
  total_min: z.number(),
  created_at: z.string(),
});

export type SavedRoute = {
  id: string;
  title: string;
  request: SavedRouteRequest;
  placeNames: string[];
  totalMin: number;
  /** ms UTC */
  at: number;
};

/** Wiersze z bazy → lista „Moje trasy”; wiersz w złym kształcie pomija, zamiast psuć całą listę. */
export function parseSavedRoutes(rows: unknown): SavedRoute[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = SavedRouteRowSchema.safeParse(row);
    if (!parsed.success) return [];
    const { id, title, request, place_names, total_min, created_at } = parsed.data;
    return [
      {
        id,
        title,
        request,
        placeNames: place_names,
        totalMin: total_min,
        at: Date.parse(created_at),
      },
    ];
  });
}

/** Nowy wiersz `saved_routes` z ułożonej trasy. Tytuł: cel albo pętla. */
export function savedRouteInsert(route: Route, request: SavedRouteRequest) {
  const title = request.rideEnd.type === "destination" ? request.rideEnd.name : "loop";
  return {
    title,
    request,
    place_ids: route.places.map((place) => place.placeId),
    place_names: route.places.map((place) => place.name),
    total_min: Math.round(route.totalMin),
  };
}

export function parseVisits(rows: unknown): VisitRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = VisitRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Historia z konta jako pamięć Sawy: fakty miejsca sumują się, czas to ostatnie słuchanie. */
export function memoryFromVisits(visits: VisitRow[], profileContexts: string[] = []): Memory {
  const places: Memory["places"] = {};
  const contexts = new Set(profileContexts);
  for (const visit of visits) {
    const at = Date.parse(visit.heard_at);
    const previous = places[visit.place_id];
    places[visit.place_id] = {
      name: visit.place_name ?? previous?.name,
      facts: [...new Set([...(previous?.facts ?? []), ...visit.fact_ids])],
      at: Math.max(previous?.at ?? 0, Number.isFinite(at) ? at : 0),
    };
    for (const id of visit.context_ids) contexts.add(id);
  }
  return { places, contexts: [...contexts] };
}

/** Suma dwóch pamięci (urządzenie i konto). Nic nie ginie, nazwa i czas z nowszej. */
export function mergeMemory(a: Memory, b: Memory): Memory {
  const places: Memory["places"] = { ...a.places };
  for (const [id, place] of Object.entries(b.places)) {
    const previous = places[id];
    if (!previous) {
      places[id] = place;
      continue;
    }
    const newer = place.at >= previous.at ? place : previous;
    places[id] = {
      name: newer.name ?? previous.name ?? place.name,
      facts: [...new Set([...previous.facts, ...place.facts])],
      at: Math.max(previous.at, place.at),
    };
  }
  return { places, contexts: [...new Set([...a.contexts, ...b.contexts])] };
}

/**
 * Co z urządzenia trzeba dopisać do konta: miejsca i fakty, których konto jeszcze nie zna.
 * Przy pierwszym logowaniu to cała pamięć z localStorage; potem tylko to, co padło bez konta.
 */
export function missingVisits(local: Memory, remote: Memory): VisitInsert[] {
  return Object.entries(local.places).flatMap(([id, place]) => {
    const known = new Set(remote.places[id]?.facts ?? []);
    const facts = place.facts.filter((fact) => !known.has(fact));
    if (remote.places[id] && facts.length === 0) return [];
    return [
      {
        place_id: id,
        place_name: place.name ?? null,
        fact_ids: facts,
        context_ids: [],
        heard_at: new Date(place.at).toISOString(),
      },
    ];
  });
}

export function visitInsert(story: RememberedStory): VisitInsert {
  return {
    place_id: story.placeId,
    place_name: story.placeName ?? null,
    fact_ids: story.factIds,
    context_ids: story.contextIds,
  };
}

/** Profil z konta; null, gdy słuchacz nie przeszedł jeszcze onboardingu (brak zainteresowań). */
export function profileFromRow(row: ProfileRow): Profile | null {
  if (row.interests.length === 0) return null;
  return {
    familiarity: row.familiarity,
    interests: row.interests,
    storyStyle: row.story_style,
    audience: row.audience,
  };
}

export function profileToRow(profile: Profile, contexts: string[]): ProfileRow {
  return {
    familiarity: profile.familiarity,
    interests: profile.interests,
    story_style: profile.storyStyle,
    audience: profile.audience,
    context_ids: contexts,
  };
}
