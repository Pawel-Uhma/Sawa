"use client";

import { HACKATHON_VENUE, INTERESTS, MAX_DURATION_MIN, MIN_DURATION_MIN } from "@sawa/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useDemoRoute, useRoutePlan } from "@/features/planner";
import { INTEREST_LABELS } from "@/lib/interest-labels";
import {
  type CameraPreset,
  cameraForPreset,
  DEFAULT_PADDING,
  INITIAL_STATE,
  type PlaygroundState,
  type RouteSource,
  USER_PRESET_OPTIONS,
  type UserPreset,
  userPosition,
} from "../lib/playground-state";
import { buildUsageSnippet } from "../lib/usage-snippet";
import { CodePreview } from "./code-preview";
import { Chips, Section, Segmented, Slider, Toggle } from "./controls";
import { EventLog, type MapEvent } from "./event-log";
import { PaddingOverlay } from "./padding-overlay";

// MapLibre needs window and WebGL, so the map renders only in the browser.
const SawaMap = dynamic(() => import("@/features/map").then((mod) => mod.SawaMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-mapa" />,
});

const MAX_EVENTS = 30;

const PADDING_PRESETS = {
  default: { label: "Domyślny", padding: DEFAULT_PADDING },
  sheet: { label: "Arkusz na telefonie", padding: { top: 64, right: 24, bottom: 380, left: 24 } },
  side: { label: "Panel z lewej", padding: { top: 48, right: 48, bottom: 48, left: 420 } },
  none: { label: "Zero", padding: { top: 0, right: 0, bottom: 0, left: 0 } },
};

export function MapPlayground() {
  const [state, setState] = useState<PlaygroundState>(INITIAL_STATE);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const nextEventId = useRef(0);
  const demoRoute = useDemoRoute();
  const plan = useRoutePlan();

  const set = (patch: Partial<PlaygroundState>) => setState((prev) => ({ ...prev, ...patch }));

  const route = { none: undefined, demo: demoRoute.data, plan: plan.data }[state.routeSource];
  const stops = useMemo(
    () => (route ? [...route.places].sort((a, b) => a.etaSec - b.etaSec) : []),
    [route],
  );
  const activeStop = state.activeIndex === null ? undefined : stops[state.activeIndex];
  const user = userPosition(state.userPreset);
  const camera = cameraForPreset(state.cameraPreset, {
    zoom: state.zoom,
    user,
    activeStop: activeStop?.position,
  });

  function logEvent(name: string, detail: string) {
    const event = { id: nextEventId.current++, at: new Date(), name, detail };
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }

  function handleStopClick(placeId: string) {
    const index = stops.findIndex((stop) => stop.placeId === placeId);
    logEvent("onStopClick", `"${placeId}" → aktywny nr ${index + 1}`);
    if (index >= 0) set({ activeIndex: index });
  }

  function changeRouteSource(routeSource: RouteSource) {
    set({ routeSource, activeIndex: null });
  }

  function planRide() {
    set({ activeIndex: null });
    plan.mutate({
      origin: user ?? HACKATHON_VENUE,
      durationMin: state.durationMin,
      // The planner needs at least one category; an empty choice still means "everything" on the map.
      interests: state.interests.length > 0 ? state.interests : ["historical"],
      returnToStart: state.returnToStart,
    });
  }

  function stepActive(delta: number) {
    if (stops.length === 0) return;
    const current = state.activeIndex ?? (delta > 0 ? -1 : stops.length);
    set({ activeIndex: Math.min(stops.length - 1, Math.max(0, current + delta)) });
  }

  const snippet = buildUsageSnippet({
    hasRoute: Boolean(route),
    camera,
    padding: state.padding,
    user,
    activeStopId: activeStop?.placeId,
    isStopClickHandled: state.isStopClickHandled,
    hasPlaceSheet: state.hasPlaceSheet,
    hasZoomControls: state.hasZoomControls,
  });

  const routeStatus =
    state.routeSource === "none"
      ? "bez trasy"
      : state.routeSource === "demo"
        ? demoRoute.isPending
          ? "ładuję trasę demo…"
          : demoRoute.isError
            ? "trasa demo niedostępna"
            : `${stops.length} miejsc na trasie`
        : plan.isPending
          ? "planer liczy trasę…"
          : plan.isError
            ? "planer nie odpowiedział"
            : route
              ? `${stops.length} miejsc na trasie`
              : "kliknij „Zaplanuj”";

  return (
    <div className="flex h-dvh flex-col bg-mapa md:flex-row">
      <aside className="order-2 h-[50dvh] shrink-0 overflow-y-auto bg-white md:order-1 md:h-full md:w-[400px] md:border-r md:border-tekst/8">
        <header className="sticky top-0 z-10 border-b border-tekst/8 bg-white/95 px-5 pt-5 pb-4 backdrop-blur">
          <p className="etykieta">Narzędzie R3</p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-tekst">
            Playground mapy <span className="font-logo text-glebia">Sawa</span>
          </h1>
          <p className="mt-1 text-[13px] leading-snug text-tekst-2">
            Każda kontrolka ustawia jeden prop <code className="font-mono text-xs">SawaMap</code>.
            Gotowy kod jest na dole.{" "}
            <Link href="/mapa" className="font-semibold text-glebia underline">
              Zwykła mapa
            </Link>
          </p>
        </header>

        <Section title="Zainteresowania" prop="interests">
          <Chips
            label="Kategorie"
            selected={state.interests}
            options={INTERESTS.map((value) => ({ value, label: INTEREST_LABELS[value] }))}
            onChange={(interests) => set({ interests })}
          />
          <p className="text-xs text-tekst-3">
            Wpływa na planowanie trasy i kolor miejsc z kilkoma tematami.
          </p>
        </Section>

        <Section title="Trasa" prop="route">
          <Segmented<RouteSource>
            label="Źródło trasy"
            value={state.routeSource}
            onChange={changeRouteSource}
            options={[
              { value: "none", label: "Brak" },
              { value: "demo", label: "Demo" },
              { value: "plan", label: "Z planera" },
            ]}
          />
          {state.routeSource === "plan" && (
            <div className="space-y-3 rounded-xl bg-tlo-2 p-3">
              <Slider
                label="Czas jazdy"
                value={state.durationMin}
                min={MIN_DURATION_MIN}
                max={MAX_DURATION_MIN}
                step={15}
                unit=" min"
                onChange={(durationMin) => set({ durationMin })}
              />
              <Toggle
                label="Pętla"
                hint="koniec przy starcie (returnToStart)"
                isOn={state.returnToStart}
                onChange={(returnToStart) => set({ returnToStart })}
              />
              <button
                type="button"
                onClick={planRide}
                disabled={plan.isPending}
                className="w-full rounded-full bg-glebia py-2.5 text-sm font-bold text-white transition-colors hover:bg-glebia-ciemna disabled:opacity-60"
              >
                {plan.isPending ? "Planuję…" : "Zaplanuj"}
              </button>
              <p className="text-xs text-tekst-3">
                Start w pozycji użytkownika (albo przy 42 Warsaw), kategorie z sekcji wyżej.
              </p>
            </div>
          )}
          {route && (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Stat label="minut" value={Math.round(route.totalMin)} />
              <Stat label="odcinków" value={route.legs.length} />
              <Stat label="miejsc" value={route.places.length} />
            </dl>
          )}
        </Section>

        <Section title="Aktywny przystanek" prop="activeStopId">
          <div className="flex gap-2">
            <StepButton label="Poprzedni" onClick={() => stepActive(-1)} isDisabled={!route}>
              ‹
            </StepButton>
            <select
              aria-label="Aktywne miejsce"
              value={state.activeIndex ?? ""}
              disabled={!route}
              onChange={(event) =>
                set({ activeIndex: event.target.value === "" ? null : Number(event.target.value) })
              }
              className="min-w-0 flex-1 rounded-xl border border-tekst/10 bg-white px-3 text-[13px] font-semibold text-tekst disabled:opacity-40"
            >
              <option value="">Brak</option>
              {stops.map((stop, index) => (
                <option key={stop.placeId} value={index}>
                  {index + 1}. {stop.name}
                </option>
              ))}
            </select>
            <StepButton label="Następny" onClick={() => stepActive(1)} isDisabled={!route}>
              ›
            </StepButton>
          </div>
        </Section>

        <Section title="Kamera" prop="camera">
          <Segmented<CameraPreset>
            label="Widok"
            value={state.cameraPreset}
            onChange={(cameraPreset) => set({ cameraPreset })}
            options={[
              { value: "auto", label: "Auto (bez propsa)" },
              { value: "route", label: "Trasa", isDisabled: !route },
              { value: "venue", label: "42 Warsaw" },
              { value: "active", label: "Aktywny przystanek", isDisabled: !activeStop },
              {
                value: "user-and-active",
                label: "Ty + przystanek",
                isDisabled: !user && !activeStop,
              },
            ]}
          />
          <Slider
            label="Zoom (center) / maks. zoom (fit)"
            value={state.zoom}
            min={12}
            max={18}
            step={0.5}
            onChange={(zoom) => set({ zoom })}
          />
        </Section>

        <Section title="Padding" prop="padding">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PADDING_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => set({ padding: preset.padding })}
                className="rounded-full bg-tlo-2 px-3 py-1.5 text-[13px] font-semibold text-tekst-2 hover:bg-mieta-jasna hover:text-glebia-ciemna"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <Slider
                key={side}
                label={{ top: "Góra", right: "Prawo", bottom: "Dół", left: "Lewo" }[side]}
                value={state.padding[side]}
                min={0}
                max={450}
                step={4}
                unit=" px"
                onChange={(value) => set({ padding: { ...state.padding, [side]: value } })}
              />
            ))}
          </div>
          <Toggle
            label="Pokaż obszar na mapie"
            hint="paski = zajęte przez panele, ramka = tam ląduje kamera"
            isOn={state.isPaddingShown}
            onChange={(isPaddingShown) => set({ isPaddingShown })}
          />
        </Section>

        <Section title="Użytkownik" prop="user">
          <Segmented<UserPreset>
            label="Pozycja użytkownika"
            value={state.userPreset}
            onChange={(userPreset) => set({ userPreset })}
            options={USER_PRESET_OPTIONS}
          />
        </Section>

        <Section title="Interakcja">
          <Toggle
            label="Przekazuj onStopClick"
            hint="klik w miejsce trasy ustawia aktywny przystanek zamiast karty"
            isOn={state.isStopClickHandled}
            onChange={(isStopClickHandled) => set({ isStopClickHandled })}
          />
          <Toggle
            label="Karta miejsca"
            hint="hasPlaceSheet: wbudowana karta po kliknięciu (?p=)"
            isOn={state.hasPlaceSheet}
            onChange={(hasPlaceSheet) => set({ hasPlaceSheet })}
          />
          <Toggle
            label="Przyciski zoomu"
            hint="hasZoomControls"
            isOn={state.hasZoomControls}
            onChange={(hasZoomControls) => set({ hasZoomControls })}
          />
        </Section>

        <Section title="Zdarzenia">
          <EventLog events={events} onClear={() => setEvents([])} />
        </Section>

        <Section title="Kod">
          <CodePreview code={snippet} />
          <button
            type="button"
            onClick={() => setState(INITIAL_STATE)}
            className="text-xs font-semibold text-tekst-3 hover:text-tekst"
          >
            Przywróć ustawienia startowe
          </button>
        </Section>
      </aside>

      <div className="relative order-1 min-h-0 flex-1 md:order-2">
        <SawaMap
          route={route}
          camera={camera}
          padding={state.padding}
          user={user}
          activeStopId={activeStop?.placeId}
          interests={state.interests}
          onStopClick={state.isStopClickHandled ? handleStopClick : undefined}
          hasPlaceSheet={state.hasPlaceSheet}
          hasZoomControls={state.hasZoomControls}
        />
        {state.isPaddingShown && <PaddingOverlay padding={state.padding} />}
        <p className="szklo pointer-events-none absolute top-3 left-3 z-10 rounded-full px-3 py-1.5 text-xs font-semibold text-tekst-2">
          {routeStatus}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-tlo-2 py-2">
      <dd className="text-lg font-extrabold tabular-nums text-tekst">{value}</dd>
      <dt className="text-[11px] font-semibold text-tekst-3">{label}</dt>
    </div>
  );
}

function StepButton({
  label,
  isDisabled,
  onClick,
  children,
}: {
  label: string;
  isDisabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tlo-2 text-xl font-bold text-tekst-2 hover:bg-mieta-jasna hover:text-glebia-ciemna disabled:opacity-40"
    >
      {children}
    </button>
  );
}
