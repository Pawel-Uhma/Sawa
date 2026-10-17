/** Today's date in Warsaw, YYYY-MM-DD. */
export function warsawDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(now);
}
