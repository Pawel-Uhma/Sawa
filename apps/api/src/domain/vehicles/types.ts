import type { LatLng } from "@sawa/shared";
import type { Mode } from "../routing/types";

/** One position report from ZTM, already mapped from the portal's format. */
export type VehicleReport = {
  /** Mode + ZTM vehicle number: bus and tram numbers overlap. */
  id: string;
  line: string;
  mode: Mode;
  brigade: string;
  position: LatLng;
  reportedAtMs: number;
};

export type VehicleSample = { atMs: number; position: LatLng };

/** Recent positions of one vehicle, oldest first. */
export type VehicleHistory = Omit<VehicleReport, "position" | "reportedAtMs"> & {
  samples: VehicleSample[];
};

/** A vehicle position as a distance along one pattern's shape. */
export type AlongSample = { atMs: number; alongM: number };

/** A predicted point: the vehicle is `alongM` along the pattern at `atMs`. */
export type Knot = { atMs: number; alongM: number };

export type SpeedSource = "leader" | "schedule" | "hold";

/** A vehicle of the line moving along the pattern, with its positions projected on it. */
export type VehicleOnPattern = {
  history: VehicleHistory;
  /** Monotone (never goes back), oldest first. */
  along: AlongSample[];
  /** Hardly moved recently, so the direction is unknown (e.g. standing at a terminus). */
  standing: boolean;
};
