import type { Place } from "@sawa/shared";
import { useState } from "react";
import { placeTagLabel } from "@/lib/interest-labels";
import { usePlace } from "../hooks/use-place";
import { PLACE_KIND_LABELS, placeKindColor } from "../lib/map-style";

const FACTS_PREVIEW = 3;

export type PlaceSheetPlace = {
  id: string;
  /** Unknown until the detail loads when the place is not among the places in view. */
  name?: string;
  kind?: string;
  tags?: string[];
  /** Position on the route, when the place is one of its stops for a story. */
  order?: number;
};

type PlaceSheetProps = {
  place: PlaceSheetPlace;
  onClose: () => void;
};

/** Bottom sheet on phones, side panel from md up. Summary shows at once, details load after. */
export function PlaceSheet({ place, onClose }: PlaceSheetProps) {
  const detail = usePlace(place.id);
  const kind = detail.data?.kind ?? place.kind;
  const tags = detail.data?.interests ?? place.tags ?? [];
  const kindLabel = kind ? PLACE_KIND_LABELS[kind] : undefined;
  const name = detail.data?.name ?? place.name;
  const eyebrow = [kindLabel, place.order && `${place.order}. na trasie`].filter(Boolean);

  return (
    <section
      aria-label={name ?? "Miejsce"}
      className="absolute inset-x-0 bottom-0 z-10 max-h-[50dvh] overflow-y-auto rounded-t-2xl bg-powierzchnia p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:max-h-[calc(100dvh-2rem)] md:w-[380px] md:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow.length > 0 && (
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-tekst-2">
              {kind && (
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: placeKindColor(kind) }}
                />
              )}
              {eyebrow.join(" · ")}
            </p>
          )}
          <h2 className="mt-1 text-lg font-semibold leading-snug text-tekst">
            {name ?? <span className="inline-block h-5 w-40 animate-pulse rounded bg-tlo-2" />}
          </h2>
          {detail.data && <PlaceMeta place={detail.data} />}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="-mt-1 -mr-1 shrink-0 rounded-full p-2 text-tekst-2 hover:bg-tlo-2 hover:text-tekst"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="currentColor">
            <path d="M5.3 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.7 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.3 4.3Z" />
          </svg>
        </button>
      </div>

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full bg-tlo-2 px-2.5 py-1 text-xs text-tekst-2">
              {placeTagLabel(tag)}
            </li>
          ))}
        </ul>
      )}

      {detail.isPending && <DetailSkeleton />}
      {detail.isError && (
        <p className="mt-4 text-sm text-tekst-2">
          Nie udało się pobrać szczegółów.{" "}
          <button type="button" className="font-medium underline" onClick={() => detail.refetch()}>
            Spróbuj ponownie
          </button>
        </p>
      )}
      {detail.data === null && <p className="mt-4 text-sm text-tekst-2">Nie ma takiego miejsca.</p>}
      {detail.data && <PlaceDetail key={detail.data.id} place={detail.data} />}
    </section>
  );
}

function PlaceMeta({ place }: { place: Place }) {
  const meta = [place.period, place.addressToday].filter(Boolean);
  if (meta.length === 0) return null;
  return <p className="mt-0.5 text-sm text-tekst-2">{meta.join(" · ")}</p>;
}

function PlaceDetail({ place }: { place: Place }) {
  const [showAllFacts, setShowAllFacts] = useState(false);
  const photo = place.photos[0];
  const facts = showAllFacts ? place.facts : place.facts.slice(0, FACTS_PREVIEW);

  return (
    <div className="mt-4 space-y-4">
      {photo && (
        <figure>
          {/* biome-ignore lint/performance/noImgElement: photos come from many archives (Commons, warszawa1939), next/image would need each domain configured */}
          <img
            src={photo.url}
            alt={photo.caption ?? place.name}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-lg bg-tlo-2 object-cover"
          />
          <figcaption className="mt-1 text-xs text-tekst-2">
            {[photo.caption, photo.year, photo.author, photo.license].filter(Boolean).join(" · ")}
          </figcaption>
        </figure>
      )}

      {facts.length > 0 && (
        <div>
          <ul className="space-y-2 text-sm leading-relaxed text-tekst">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          {place.facts.length > FACTS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllFacts((isShown) => !isShown)}
              className="mt-2 text-sm font-medium text-tekst underline"
            >
              {showAllFacts ? "Pokaż mniej" : `Pokaż wszystkie (${place.facts.length})`}
            </button>
          )}
        </div>
      )}

      {place.sources.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-tekst-2">Źródła</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {place.sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-tekst-2 underline hover:text-tekst"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="mt-4 space-y-2">
      <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-tlo-2" />
      <div className="h-3 w-full animate-pulse rounded bg-tlo-2" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-tlo-2" />
    </div>
  );
}
