"use client";

import { interestsOfTags, type Route } from "@sawa/shared";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MapCamera, MapPadding } from "@/features/map";
import { planRoute, routeStops, toPlannerInterests } from "../lib/api-data";
import { SPRING, useIsDesktop, useIsWide } from "../lib/device";
import { type MockStop, USER_LOCATION } from "../lib/mock-data";
import { EMPTY_PROFILE, type Profile } from "../lib/onboarding";
import {
  CUSTOM_DESTINATION_NAME,
  DESTINATION_PRESETS,
  type RideEnd,
  type RideEndType,
} from "../lib/ride-end";
import { HomePanel } from "./home-panel";
import { OnboardingFlow, type OnboardingStep } from "./onboarding-flow";
import type { PlaceSelection } from "./place-card-host";
import { RidesPanel } from "./rides-panel";
import { RouteSheet } from "./route-sheet";
import { type ProfileStep, type SawaMenuActions, SawaMenuProvider } from "./sawa-menu";
import { type Tab, TabBar } from "./tab-bar";
import { TabPlaceholder } from "./tab-placeholder";
import { TopBar } from "./top-bar";

// Mapa Antka (features/map). MapLibre potrzebuje window i WebGL, więc tylko w przeglądarce.
const SawaMap = dynamic(() => import("@/features/map").then((mod) => mod.SawaMap), {
  ssr: false,
});

// Karta miejsca czyta wybór z URL-a (`?p=`) i dane mapy, więc też tylko w przeglądarce.
const PlaceCardHost = dynamic(() => import("./place-card-host").then((mod) => mod.PlaceCardHost), {
  ssr: false,
});

type Stage = "onboarding" | "map" | "route";

const USER = { lat: USER_LOCATION[1], lng: USER_LOCATION[0] };

// Szerokość panelu (md: 360, lg: 400) i margines wokół niego, jak w route-sheet.tsx i home-panel.tsx
const PANEL_PX = { tablet: 360, laptop: 400 };
const DESKTOP_GAP_PX = 24;

export function DemoApp() {
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();
  const [stage, setStage] = useState<Stage>("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [tab, setTab] = useState<Tab>("map");
  const [durationMin, setDurationMin] = useState(90);
  const [rideEnd, setRideEnd] = useState<RideEnd>({ type: "open" });
  // Ostatni wybrany cel wraca po przełączeniu „Przed siebie” → „Do celu”
  const [lastDestination, setLastDestination] = useState<Extract<RideEnd, { type: "destination" }>>(
    { type: "destination", ...DESTINATION_PRESETS[0] },
  );
  const [route, setRoute] = useState<MockStop[]>([]);
  const [planned, setPlanned] = useState<Route | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetCoverPx, setSheetCoverPx] = useState(360);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSelection | null>(null);
  const [placeCoverPx, setPlaceCoverPx] = useState(360);

  const showRoute = useCallback((next: Route) => {
    setPlanned(next);
    setRoute(routeStops(next));
    setActiveIndex(0);
    setStage("route");
  }, []);

  const generateRoute = useCallback(async () => {
    setPlanning(true);
    setPlanError(null);
    try {
      showRoute(await planRoute(durationMin, profile.interests, rideEnd, profile));
    } catch {
      setPlanError("Nie udało się ułożyć trasy. Spróbuj jeszcze raz.");
    } finally {
      setPlanning(false);
    }
  }, [durationMin, profile, rideEnd, showRoute]);

  const changeRideEnd = useCallback((next: RideEnd) => {
    if (next.type === "destination") setLastDestination(next);
    setRideEnd(next);
  }, []);

  const changeRideEndType = useCallback(
    (type: RideEndType) => setRideEnd(type === "destination" ? lastDestination : { type }),
    [lastDestination],
  );

  // Safari na iOS pomija user-scalable=no, więc szczypanie strony blokujemy wprost. Mapa ma własny zoom na dotyku.
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", block);
    document.addEventListener("gesturechange", block);
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
    };
  }, []);

  const finishOnboarding = useCallback((next: Profile) => {
    setProfile(next);
    setStage("map");
  }, []);

  const editProfile = useCallback((step: ProfileStep) => {
    setOnboardingStep(step);
    setStage("onboarding");
  }, []);

  const editInterests = useCallback(() => editProfile("interests"), [editProfile]);

  const restart = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    setRoute([]);
    setPlanned(null);
    setTab("map");
    setOnboardingStep("welcome");
    setStage("onboarding");
  }, []);

  // Mapa jest jedna pod wszystkimi ekranami. Ekrany zmieniają tylko kamerę i to, co na niej leży.
  const isRoute = stage === "route" && planned !== null && route.length > 0;
  const activeStop = route[activeIndex];
  const isHome = stage === "map" && tab === "map";
  const destination = rideEnd.type === "destination" ? rideEnd : null;
  const isPlaceOpen = isHome && selectedPlace !== null;

  const padding: MapPadding = useMemo(() => {
    if (isDesktop) {
      return {
        top: 96,
        right: DESKTOP_GAP_PX,
        bottom: DESKTOP_GAP_PX,
        left: (isWide ? PANEL_PX.laptop : PANEL_PX.tablet) + DESKTOP_GAP_PX * 2,
      };
    }
    if (isRoute) return { top: 88, right: 0, bottom: sheetCoverPx, left: 0 };
    if (isPlaceOpen) return { top: 120, right: 0, bottom: placeCoverPx, left: 0 };
    return { top: 120, right: 0, bottom: panelCollapsed ? 200 : destination ? 560 : 480, left: 0 };
  }, [
    isDesktop,
    isWide,
    isRoute,
    isPlaceOpen,
    sheetCoverPx,
    placeCoverPx,
    panelCollapsed,
    destination,
  ]);

  const camera: MapCamera = useMemo(() => {
    if (isRoute && activeStop) {
      const [lng, lat] = activeStop.coord;
      return { type: "center", center: { lat, lng }, zoom: 15.4 };
    }
    // Wybrane miejsce jedzie nad kartę; zoom zostaje taki, jaki ustawił użytkownik
    if (isPlaceOpen && selectedPlace.position) {
      return { type: "center", center: selectedPlace.position };
    }
    // Wybrany cel: mapa pokazuje start i cel naraz
    if (isHome && destination) {
      return { type: "fit", points: [USER, destination.point], maxZoom: 15 };
    }
    return { type: "center", center: USER, zoom: isDesktop ? 15.3 : 14.8 };
  }, [isRoute, activeStop, isDesktop, isHome, destination, isPlaceOpen, selectedPlace]);

  const storyInterests = useMemo(() => toPlannerInterests(profile.interests), [profile.interests]);
  // Na mapie pusta lista znaczy „wszystkie miejsca”, więc bez zapasowej kategorii z planera.
  const mapInterests = useMemo(() => interestsOfTags(profile.interests), [profile.interests]);

  const menu: SawaMenuActions = useMemo(
    () => ({
      profile,
      onEditProfile: editProfile,
      lastRouteStops: planned && route.length > 0 ? route.length : null,
      onOpenLastRoute: () => {
        setTab("map");
        setStage("route");
      },
      onRestart: restart,
    }),
    [profile, editProfile, planned, route.length, restart],
  );

  return (
    <MotionConfig reducedMotion="user">
      <SawaMenuProvider value={menu}>
        <div className="fixed inset-0 overflow-hidden bg-mapa">
          <div className="absolute inset-0">
            <SawaMap
              interests={mapInterests}
              route={isRoute ? (planned ?? undefined) : undefined}
              camera={camera}
              padding={padding}
              user={USER}
              destination={isRoute || isHome ? destination?.point : undefined}
              onMapClick={
                isHome && destination
                  ? (point) =>
                      changeRideEnd({ type: "destination", name: CUSTOM_DESTINATION_NAME, point })
                  : undefined
              }
              activeStopId={isRoute ? activeStop?.id : undefined}
              onStopClick={(id) => {
                const index = route.findIndex((stop) => stop.id === id);
                if (index >= 0) setActiveIndex(index);
              }}
              // Ekrany mają własne karty nad mapą; wbudowana karta miejsca wjechałaby pod nie
              hasPlaceSheet={false}
            />
          </div>

          {/* Mgiełka pod paskiem statusu na telefonie */}
          <div className="mgla pointer-events-none absolute inset-x-0 top-0 z-10 h-28 md:hidden" />

          <AnimatePresence>
            {stage !== "onboarding" && <TopBar key="top" hideOnDesktop={isRoute} />}
          </AnimatePresence>

          <AnimatePresence>
            {isHome && !isPlaceOpen && (
              <HomePanel
                key="home"
                interests={profile.interests}
                durationMin={durationMin}
                onDurationChange={setDurationMin}
                rideEnd={rideEnd}
                onRideEndTypeChange={changeRideEndType}
                onRideEndChange={changeRideEnd}
                onEditInterests={editInterests}
                collapsed={panelCollapsed}
                onCollapsedChange={setPanelCollapsed}
                onGenerate={generateRoute}
                planning={planning}
                planError={planError}
              />
            )}
            {stage === "map" && tab === "rides" && (
              <RidesPanel
                key="rides"
                interests={profile.interests}
                durationMin={durationMin}
                onDurationChange={setDurationMin}
                lastRoute={route}
                onOpenLastRoute={() => {
                  setTab("map");
                  setStage("route");
                }}
                onStart={(preview) => {
                  setTab("map");
                  if (preview) showRoute(preview);
                  else generateRoute();
                }}
              />
            )}
            {stage === "map" && tab === "sawa" && (
              <TabPlaceholder
                key="sawa"
                collapsed={panelCollapsed}
                onCollapsedChange={setPanelCollapsed}
              />
            )}
            {isRoute && (
              <RouteSheet
                key="route"
                durationMin={durationMin}
                end={planned ? routeEnd(planned, rideEnd) : null}
                stops={route}
                interests={storyInterests}
                activeIndex={activeIndex}
                onActiveChange={setActiveIndex}
                onBack={() => setStage("map")}
                isDesktop={isDesktop}
                onCoverChange={setSheetCoverPx}
              />
            )}
          </AnimatePresence>

          {stage !== "onboarding" && (
            <PlaceCardHost
              isActive={isHome}
              interests={storyInterests}
              onSelectionChange={setSelectedPlace}
              onCoverChange={setPlaceCoverPx}
            />
          )}

          <AnimatePresence>
            {stage === "map" && <TabBar key="tabs" active={tab} onChange={setTab} />}
          </AnimatePresence>

          {/* Onboarding to warstwa nad mapą. Po wyjściu mapa „wyjeżdża” spod spodu. */}
          <AnimatePresence>
            {stage === "onboarding" && (
              <motion.div
                key="onboarding"
                className="fixed inset-0 z-40"
                exit={{ opacity: 0, scale: 1.02 }}
                transition={SPRING}
              >
                <OnboardingFlow
                  initialStep={onboardingStep}
                  initialProfile={profile}
                  onDone={finishOnboarding}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SawaMenuProvider>
    </MotionConfig>
  );
}

/** Podpis końca trasy w arkuszu; gdy planer nie dojechał do celu albo nie zamknął pętli, mówi to wprost. */
function routeEnd(route: Route, end: RideEnd): { label: string; reached: boolean } | null {
  switch (end.type) {
    case "open":
      return null;
    case "loop":
      return route.endsAtStart
        ? { label: "Wracasz na start", reached: true }
        : { label: "Nie udało się wrócić na start w tym czasie", reached: false };
    case "destination":
      return route.endsAtDestination
        ? { label: `Do celu: ${end.name}`, reached: true }
        : { label: `Nie udało się dojechać do celu (${end.name}) w tym czasie`, reached: false };
  }
}
