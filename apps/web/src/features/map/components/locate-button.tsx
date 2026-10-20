"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { useT } from "@/features/i18n";

/** Where the phone is, as the map button sees it. */
export type LocateStatus = "found" | "locating" | "denied" | "unavailable";

export type LocateProps = {
  status: LocateStatus;
  /** Asks the browser again (after a refusal or when GPS went quiet). */
  onRetry: () => void;
};

const SPRING = { type: "spring", bounce: 0, duration: 0.45 } as const;

/** Above this share of the map height a panel covers the corner, so the button hides (like Google Maps). */
const MAX_LIFT_SHARE = 0.6;

/**
 * "Back to me" button in the bottom right corner, above whatever panel covers the map.
 * Found: tap centres on the dot and follows it, a filled arrow means following.
 * No location: tap asks again; after a refusal a hint says where to turn it back on.
 */
export function LocateButton({
  status,
  onRetry,
  isFollowing,
  onLocate,
  bottomPx,
  rightPx,
  mapHeightPx,
  above,
}: LocateProps & {
  isFollowing: boolean;
  onLocate: () => void;
  bottomPx: number;
  rightPx: number;
  mapHeightPx: number;
  /** Another round map button stacked above this one (the 2D / 3D switch). */
  above?: ReactNode;
}) {
  const t = useT();
  const [hint, setHint] = useState(false);
  const isMissing = status === "denied" || status === "unavailable";
  // Which problem the hint explains, kept while the browser is asked again
  const [lastMissing, setLastMissing] = useState<LocateStatus>("denied");
  useEffect(() => {
    if (isMissing) setLastMissing(status);
  }, [isMissing, status]);

  // The hint answers a tap; once the location is back (or after a while) it goes away.
  // Asking again passes through "locating", so only "found" closes it early.
  useEffect(() => {
    if (status === "found") setHint(false);
  }, [status]);
  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(false), 9_000);
    return () => window.clearTimeout(timer);
  }, [hint]);

  const isHidden = mapHeightPx > 0 && bottomPx > mapHeightPx * MAX_LIFT_SHARE;

  function press() {
    if (status === "found") {
      onLocate();
      return;
    }
    if (isMissing) {
      onRetry();
      setHint(true);
    }
  }

  const label =
    status === "found"
      ? t("Pokaż moją lokalizację", "Show my location")
      : status === "locating"
        ? t("Szukam Twojej lokalizacji", "Finding your location")
        : t("Włącz lokalizację", "Turn on location");

  return (
    <motion.div
      className="pointer-events-none absolute bottom-0 z-[15] flex items-end gap-2"
      style={{ right: rightPx }}
      initial={false}
      animate={{ y: -bottomPx, opacity: isHidden ? 0 : 1 }}
      transition={SPRING}
    >
      <AnimatePresence>
        {hint && status !== "found" && (
          <motion.p
            key="hint"
            role="status"
            initial={{ opacity: 0, x: 8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.96 }}
            transition={SPRING}
            className="karta mb-0.5 max-w-[15rem] origin-right rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug text-tekst"
          >
            {lastMissing === "denied"
              ? t(
                  "Brak zgody na lokalizację. Włącz ją dla tej strony: w Safari „aA” → Ustawienia witryny → Lokalizacja, w Chrome kłódka obok adresu.",
                  "No location permission. Allow it for this site: in Safari tap “aA” → Website Settings → Location, in Chrome the lock next to the address.",
                )
              : t(
                  "Nie widzę lokalizacji. Sprawdź, czy usługi lokalizacji są włączone (iPhone: Ustawienia → Prywatność → Usługi lokalizacji).",
                  "Can't see your location. Check that Location Services are on (iPhone: Settings → Privacy → Location Services).",
                )}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex flex-col items-end gap-2">
        {above && <div inert={isHidden}>{above}</div>}
        <button
          type="button"
          aria-label={label}
          aria-pressed={status === "found" ? isFollowing : undefined}
          tabIndex={isHidden ? -1 : 0}
          onClick={press}
          className={`szklo flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 active:scale-[0.92] ${
            isHidden ? "" : "pointer-events-auto"
          } ${isMissing ? "text-koral" : "text-glebia"}`}
        >
          {status === "found" ? (
            <ArrowIcon filled={isFollowing} />
          ) : status === "locating" ? (
            <ArrowIcon filled={false} className="animate-pulse" />
          ) : (
            <NoLocationIcon />
          )}
        </button>
      </div>
    </motion.div>
  );
}

function ArrowIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`size-[22px] ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M20 4 4 11l7 2 2 7 7-16Z" />
    </svg>
  );
}

function NoLocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 4 4 11l7 2 2 7 7-16Z" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
