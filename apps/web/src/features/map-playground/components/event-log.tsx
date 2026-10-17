export type MapEvent = { id: number; at: Date; name: string; detail: string };

/** Last callbacks SawaMap fired, newest first. */
export function EventLog({ events, onClear }: { events: MapEvent[]; onClear: () => void }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl bg-tlo-2 px-3 py-2.5 text-xs text-tekst-3">
        Kliknij ponumerowane miejsce na trasie, zdarzenia pojawią się tutaj.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <ol className="max-h-36 space-y-1 overflow-y-auto rounded-xl bg-tlo-2 p-2 font-mono text-[11px]">
        {events.map((event) => (
          <li key={event.id} className="flex gap-2">
            <span className="tabular-nums text-tekst-3">
              {event.at.toLocaleTimeString("pl-PL", { hour12: false })}
            </span>
            <span className="font-semibold text-glebia">{event.name}</span>
            <span className="truncate text-tekst-2">{event.detail}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-tekst-3 hover:text-tekst"
      >
        Wyczyść
      </button>
    </div>
  );
}
