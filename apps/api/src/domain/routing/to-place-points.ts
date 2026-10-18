import { interestsOfTags, type PlaceSubkind } from "@sawa/shared";
import type { PlaceSummary } from "../place";
import { weightFromRichness } from "./score";
import type { PlacePoint } from "./types";

/** Everyday places a ride never stops for: Sawa has nothing to tell a passer-by about them. */
const DULL_SUBKINDS: ReadonlySet<PlaceSubkind> = new Set(["school", "library", "pitch"]);

/** The same by name, for places whose marker says otherwise ("Plac zabaw w parku" is a park). */
const DULL_NAME =
  /przedszkol|żłob|szk[oó][lł](?!a (g[lł][oó]wna|wy[zż]sza))|liceum|gimnazj|bibliotek|boisk|orlik|plac zabaw|siłowni|basen|pływal|hala sport|centrum sport|ośrodek sport|\bosir\b|\bkort|skatepark|przychodni|parking|ogr[oó]dk\p{L}* działk/iu;

/** False for places not worth a stop: nothing left to tell (only map data) or an everyday place. */
export function isWorthAStop({ name, subkind, richness }: PlaceSummary): boolean {
  if (richness <= 0) return false;
  if (subkind && DULL_SUBKINDS.has(subkind)) return false;
  return !DULL_NAME.test(name);
}

/** Places from the repository → what the planner scores (detailed tags → broad interests). */
export function toPlacePoints(places: PlaceSummary[]): PlacePoint[] {
  return places.filter(isWorthAStop).map(({ id, name, kind, position, interests, richness }) => ({
    id,
    name,
    kind,
    position,
    interests: interestsOfTags(interests),
    weight: weightFromRichness(richness),
    richness,
  }));
}
