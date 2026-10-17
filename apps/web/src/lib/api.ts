import type { AppType } from "@sawa/api";
import { hc } from "hono/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

/** The only place in apps/web that talks to the backend. */
export const api = hc<AppType>(API_URL);
