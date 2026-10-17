import type { LatLng, TrackLeg } from "@sawa/shared";
import type { BBox, Place, PlaceAlongLine, PlaceSummary } from "../domain/place";
import type { Network } from "../domain/routing/types";
import type { SpeechAudio } from "../domain/speech";
import type { VehicleReport } from "../domain/vehicles/types";

/** Interfaces services depend on; adapters implement them (docs/11-zasady-pracy-i-kodu.md §4). */

export interface PlacesRepository {
  /** Places inside the box, richest first. `interests` keeps places matching any of them. */
  listInBBox(bbox: BBox, interests?: string[]): Promise<PlaceSummary[]>;
  /** One place with facts, sources and photos; null when the id is unknown. */
  getById(id: string): Promise<Place | null>;
  /** Places within `radiusM` of the line, ordered from its start to its end. */
  listNearLine(line: LatLng[], radiusM: number, interests?: string[]): Promise<PlaceAlongLine[]>;
}

/** Real departures from dane.um.warszawa.pl; undefined when unknown (no token, timeout, no data). */
export interface DepartureSource {
  /** Departures of `line` from the platform on the Warsaw service day of `day`. */
  departures(stopId: string, line: string, day: Date): Promise<Date[] | undefined>;
}

/**
 * Live estimate of when the vehicle for a leg reaches its boarding stop (from ZTM positions).
 * Undefined when unknown: no token, stale positions, vehicle not found or too slow to answer.
 */
export interface LiveBoardingSource {
  boardAtMs(leg: TrackLeg): Promise<number | undefined>;
}

/** Live tram and bus positions (ZTM, refreshed every 10 s). Throws AppError when ZTM fails. */
export interface VehiclePositionSource {
  positions(): Promise<VehicleReport[]>;
}

/** Walking paths along streets and footways (OSRM foot profile). */
export interface WalkPathSource {
  /**
   * The path through `points` in order, as [lng, lat] pairs starting and ending at the first
   * and last point; undefined when unknown (router down, timeout, no path).
   */
  path(points: LatLng[]): Promise<[number, number][] | undefined>;
}

/** Tram and bus network for one service day (apps/api/data/transit-graph.json.gz). */
export type TransitData = {
  network: Network;
  serviceDate: string;
  attribution: string[];
};

export type LlmRequest = { system: string; user: string; maxTokens: number };

/** Chat model behind Sawa's words. Answers JSON text; throws AppError on upstream failure. */
export interface LlmProvider {
  /** Model id, logged next to every story. */
  readonly model: string;
  complete(request: LlmRequest): Promise<string>;
}

/** Text-to-speech provider (ElevenLabs). Throws AppError on upstream failure or timeout. */
export interface SpeechSynthesizer {
  synthesize(text: string): Promise<SpeechAudio>;
}
