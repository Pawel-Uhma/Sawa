import type { Leg } from "@sawa/shared";

/** Numer linii ZTM w barwach pojazdu: tramwaj czerwony, autobus granatowy (jak w makiecie D); pieszo szary. */
export function LineBadge({ line, mode }: { line: string; mode: Leg["mode"] }) {
  return (
    <span
      className={`inline-grid h-5 min-w-[26px] place-items-center rounded-[5px] px-1 text-[11.5px] font-extrabold text-white ${
        mode === "tram" ? "bg-[#C8102E]" : mode === "walk" ? "bg-[#6b7280]" : "bg-[#1F2A44]"
      }`}
    >
      {mode === "walk" ? "pieszo" : line}
    </span>
  );
}

/** Kolejne odcinki bez powtórzeń z rzędu: pieszo → 22 → 1 → 10. */
export function journeyLegs(legs: readonly Leg[]): Leg[] {
  return legs.filter(
    (leg, index, all) =>
      index === 0 || leg.mode !== all[index - 1].mode || leg.line !== all[index - 1].line,
  );
}

/** Przebieg trasy jako znaczki linii ze strzałkami. */
export function Journey({ legs }: { legs: readonly Leg[] }) {
  return journeyLegs(legs).map((leg, index) => (
    <span key={`${leg.mode}-${leg.line}-${leg.departAt}`} className="flex items-center gap-1.5">
      {index > 0 && <span aria-hidden="true">→</span>}
      <LineBadge line={leg.line} mode={leg.mode} />
    </span>
  ));
}
