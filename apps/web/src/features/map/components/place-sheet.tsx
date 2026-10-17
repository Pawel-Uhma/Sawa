import { interestLabel } from "@/lib/interest-labels";
import { PLACE_KIND_LABELS, placeKindColor } from "../lib/map-style";

export type PlaceSheetPlace = {
  name: string;
  kind?: string;
  interests?: string[];
  /** Position on the route, when the place is one of its stops for a story. */
  order?: number;
};

type PlaceSheetProps = {
  place: PlaceSheetPlace;
  onClose: () => void;
};

/** Bottom sheet on phones, side panel from md up. Facts and photos arrive with GET /v1/places/:id. */
export function PlaceSheet({ place, onClose }: PlaceSheetProps) {
  const kindLabel = place.kind ? PLACE_KIND_LABELS[place.kind] : undefined;

  return (
    <section
      aria-label={place.name}
      className="absolute inset-x-0 bottom-0 z-10 max-h-[45dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] md:inset-x-auto md:top-4 md:left-4 md:bottom-auto md:w-[380px] md:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {(kindLabel || place.order) && (
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {place.kind && (
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: placeKindColor(place.kind) }}
                />
              )}
              {[kindLabel, place.order && `${place.order}. na trasie`].filter(Boolean).join(" · ")}
            </p>
          )}
          <h2 className="mt-1 text-lg font-semibold leading-snug text-zinc-900">{place.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="-mr-1 -mt-1 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="currentColor">
            <path d="M5.3 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.7 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.3 4.3Z" />
          </svg>
        </button>
      </div>
      {place.interests && place.interests.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {place.interests.map((interest) => (
            <li
              key={interest}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
            >
              {interestLabel(interest)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
