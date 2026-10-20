import { isTransitMode, type Leg } from "@sawa/shared";
import { useT } from "@/features/i18n";
import { legLineIndexes, lineColor } from "@/features/map";
import { BikeIcon, BusIcon, CarIcon, TramIcon, WalkIcon } from "./icons";

const MODE_COLOR: Record<Leg["mode"], string> = {
  tram: "#C8102E",
  bus: "#1F2A44",
  walk: "#6b7280",
  // Jak na mapie (WHEEL_COLORS)
  bike: "#2e8b3e",
  car: "#475569",
};
const MODE_ICON = {
  tram: TramIcon,
  bus: BusIcon,
  walk: WalkIcon,
  bike: BikeIcon,
  car: CarIcon,
} as const;

/**
 * Numer linii ZTM z ikoną pojazdu (tramwaj, autobus, pieszo). `color`: barwa linii na mapie
 * (`lineColor`), żeby lista i mapa mówiły tym samym kolorem; bez niej barwa pojazdu.
 */
export function LineBadge({
  line,
  mode,
  color,
}: {
  line: string;
  mode: Leg["mode"];
  color?: string;
}) {
  const t = useT();
  const Icon = MODE_ICON[mode];
  const label =
    mode === "tram" ? t("Tramwaj", "Tram") : mode === "bus" ? t("Autobus", "Bus") : null;
  return (
    <span
      style={{
        backgroundColor: isTransitMode(mode) ? (color ?? MODE_COLOR[mode]) : MODE_COLOR[mode],
      }}
      className="inline-flex h-5 min-w-[26px] shrink-0 items-center justify-center gap-1 rounded-[5px] px-1.5 text-[11.5px] font-extrabold text-white"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.4} />
      {label && <span className="sr-only">{label}</span>}
      {mode === "walk"
        ? t("pieszo", "walk")
        : mode === "bike"
          ? t("rower", "bike")
          : mode === "car"
            ? t("auto", "car")
            : line}
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

/**
 * Gdzie wysiąść z linii wsiadanej na odcinku `legIndex`: ostatni przystanek kolejnych odcinków tej
 * samej linii (planer dzieli przejazd na odcinki między miejscami), i ile trwa cały przejazd.
 */
export function rideEnd(legs: readonly Leg[], legIndex: number): { stop: string; min: number } {
  let i = legIndex;
  let min = legs[i]?.durationMin ?? 0;
  while (
    legs[i + 1] &&
    legs[i + 1].mode === legs[i].mode &&
    legs[i + 1].line === legs[i].line &&
    legs[i + 1].fromStop.id === legs[i].toStop.id
  ) {
    i += 1;
    min += legs[i].durationMin;
  }
  return { stop: legs[i]?.toStop.name ?? "", min };
}

/** Kolor każdego odcinka na mapie (indeks linii jak w `legLineIndexes`); pieszo bez koloru. */
export function legColors(legs: readonly Leg[]): Map<Leg, { lineIndex: number; color: string }> {
  const lines = legLineIndexes(legs);
  return new Map(
    legs.flatMap((leg, i) => {
      const lineIndex = lines[i] ?? -1;
      return lineIndex < 0 ? [] : [[leg, { lineIndex, color: lineColor(lineIndex) }] as const];
    }),
  );
}

/** Przebieg trasy jako znaczki linii ze strzałkami. */
export function Journey({ legs }: { legs: readonly Leg[] }) {
  const colors = legColors(legs);
  return journeyLegs(legs).map((leg, index) => (
    <span key={`${leg.mode}-${leg.line}-${leg.departAt}`} className="flex items-center gap-1.5">
      {index > 0 && <span aria-hidden="true">→</span>}
      <LineBadge line={leg.line} mode={leg.mode} color={colors.get(leg)?.color} />
    </span>
  ));
}
