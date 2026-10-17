import { toLngLat } from "@sawa/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../lib/errors";
import type { PlacesRepository } from "../../services/ports";
import type { Database } from "./database.types";
import { toPlace, toPlaceSummaries, toPlacesAlongLine } from "./place-mappers";

const TIMEOUT_MS = 5_000;

export type SupabaseConfig = { url: string; serviceRoleKey: string };

export function createSupabaseClient({ url, serviceRoleKey }: SupabaseConfig) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }),
    },
  });
}

export function createSupabasePlacesRepository(db: SupabaseClient<Database>): PlacesRepository {
  return {
    async listInBBox(bbox, interests) {
      const { data, error } = await db.rpc("places_in_bbox", {
        min_lng: bbox.minLng,
        min_lat: bbox.minLat,
        max_lng: bbox.maxLng,
        max_lat: bbox.maxLat,
        filter_interests: interests?.length ? interests : undefined,
      });
      if (error) throw upstream("places_in_bbox", error);
      return toPlaceSummaries(data);
    },

    async getById(id) {
      const { data, error } = await db.rpc("place_detail", { place_id: id });
      if (error) throw upstream("place_detail", error);
      return toPlace(data);
    },

    async listNearLine(line, radiusM, interests) {
      const { data, error } = await db.rpc("places_near_line", {
        line: { type: "LineString", coordinates: line.map(toLngLat) },
        radius_m: radiusM,
        filter_interests: interests?.length ? interests : undefined,
      });
      if (error) throw upstream("places_near_line", error);
      return toPlacesAlongLine(data);
    },
  };
}

function upstream(fn: string, cause: { message: string }) {
  const isTimeout = /abort|timeout/i.test(cause.message);
  return new AppError(isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR", `Supabase ${fn} failed`, {
    cause,
  });
}
