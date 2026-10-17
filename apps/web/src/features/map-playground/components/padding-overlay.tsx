import type { MapPadding } from "@/features/map";

const STRIPES =
  "repeating-linear-gradient(135deg, rgba(242,117,95,0.16) 0 8px, rgba(242,117,95,0.06) 8px 16px)";

/** Shows which part of the map the padding reserves for panels; camera targets land in the clear area. */
export function PaddingOverlay({ padding }: { padding: MapPadding }) {
  const { top, right, bottom, left } = padding;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute inset-x-0 top-0" style={{ height: top, background: STRIPES }} />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: bottom, background: STRIPES }}
      />
      <div className="absolute left-0" style={{ top, bottom, width: left, background: STRIPES }} />
      <div
        className="absolute right-0"
        style={{ top, bottom, width: right, background: STRIPES }}
      />
      <div
        className="absolute rounded-lg border-2 border-dashed border-koral/70"
        style={{ top, right, bottom, left }}
      >
        <span className="absolute top-1.5 left-1.5 rounded bg-koral px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          obszar kamery
        </span>
      </div>
    </div>
  );
}
