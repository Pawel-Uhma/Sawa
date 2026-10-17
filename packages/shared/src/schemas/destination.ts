import { z } from "zod";
import { LatLngSchema } from "./common";

/** `GET /v1/destinations?q=`: where the user wants to ride, typed by name. */
export const DestinationQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});
export type DestinationQuery = z.infer<typeof DestinationQuerySchema>;

export const DestinationSchema = z.object({
  /** Google Places id. */
  id: z.string(),
  name: z.string(),
  /** Street and district, for telling two results with the same name apart. */
  address: z.string(),
  position: LatLngSchema,
  /** `address`: a street or a street with a number; `place`: a business or landmark. Missing = place. */
  kind: z.enum(["address", "place"]).optional(),
});
export type Destination = z.infer<typeof DestinationSchema>;

export const DestinationsResponseSchema = z.object({
  results: z.array(DestinationSchema),
});
export type DestinationsResponse = z.infer<typeof DestinationsResponseSchema>;
