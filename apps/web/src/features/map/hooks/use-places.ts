import { type PlaceSummaryFeature, PlaceSummaryFeatureSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import placesSample from "../__fixtures__/api-places-sample.json";

/** Features that fail validation are skipped, not fatal (contract: validated one by one). */
function parsePlaces(collection: { features: unknown[] }): PlaceSummaryFeature[] {
  return collection.features.flatMap((feature) => {
    const parsed = PlaceSummaryFeatureSchema.safeParse(feature);
    return parsed.success ? [parsed.data] : [];
  });
}

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    // TODO(T-30): switch to api.v1.places.$get() once R2 mounts GET /v1/places.
    queryFn: async () => parsePlaces(placesSample),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
