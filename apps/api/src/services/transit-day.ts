import { warsawDate } from "../lib/warsaw-date";
import type { TransitCalendar, TransitData } from "./ports";

/** The graph in force at `now`: one day as is, or the calendar's day for the Warsaw date. */
export function transitOn(transit: TransitData | TransitCalendar, now: Date): TransitData {
  return "forDate" in transit ? transit.forDate(warsawDate(now)) : transit;
}
