"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SPRING, useIsDesktop, useIsWide } from "../lib/device";
import {
  buildMockRoute,
  HOME_PINS,
  type MockStop,
  ROUTE_LINE,
  USER_LOCATION,
} from "../lib/mock-data";
import { EMPTY_PROFILE, type Profile } from "../lib/onboarding";
import { HomePanel } from "./home-panel";
import { OnboardingFlow, type OnboardingStep } from "./onboarding-flow";
import { RouteSheet } from "./route-sheet";
import { type MapCamera, type MapPadding, SawaMap } from "./sawa-map";
import { type Tab, TabBar } from "./tab-bar";
import { TabPlaceholder } from "./tab-placeholder";
import { TopBar } from "./top-bar";

type Stage = "onboarding" | "map" | "route";

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
  const [route, setRoute] = useState<MockStop[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetCoverPx, setSheetCoverPx] = useState(360);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

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

  const editInterests = useCallback(() => {
    setOnboardingStep("interests");
    setStage("onboarding");
  }, []);

  // Mapa jest jedna pod wszystkimi ekranami. Ekrany zmieniają tylko kamerę i to, co na niej leży.
  const isRoute = stage === "route" && route.length > 0;
  const activeStop = route[activeIndex];

  const padding: MapPadding = useMemo(() => {
    if (isDesktop) {
      return {
        top: 96,
        right: DESKTOP_GAP_PX,
        bottom: DESKTOP_GAP_PX,
        left: (isWide ? PANEL_PX.laptop : PANEL_PX.tablet) + DESKTOP_GAP_PX * 2,
      };
    }
    return isRoute
      ? { top: 88, right: 0, bottom: sheetCoverPx, left: 0 }
      : { top: 120, right: 0, bottom: panelCollapsed ? 200 : 430, left: 0 };
  }, [isDesktop, isWide, isRoute, sheetCoverPx, panelCollapsed]);

  const camera: MapCamera = useMemo(() => {
    if (isRoute && activeStop) {
      return { kind: "center", coord: activeStop.coord, zoom: 15.4 };
    }
    return { kind: "center", coord: USER_LOCATION, zoom: isDesktop ? 15.3 : 14.8 };
  }, [isRoute, activeStop, isDesktop]);

  const stops = useMemo(
    () =>
      isRoute
        ? route.map((stop, index) => ({
            id: stop.id,
            coord: stop.coord,
            label: String(index + 1),
            isActive: index === activeIndex,
          }))
        : [],
    [isRoute, route, activeIndex],
  );

  const pins = stage === "map" && tab === "map" ? HOME_PINS : [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 overflow-hidden bg-mapa">
        <SawaMap
          user={USER_LOCATION}
          camera={camera}
          padding={padding}
          pins={pins}
          stops={stops}
          route={isRoute ? ROUTE_LINE : null}
          onStopClick={(id) => {
            const index = route.findIndex((stop) => stop.id === id);
            if (index >= 0) setActiveIndex(index);
          }}
        />

        {/* Mgiełka pod paskiem statusu na telefonie */}
        <div className="mgla pointer-events-none absolute inset-x-0 top-0 z-10 h-28 md:hidden" />

        <AnimatePresence>
          {stage !== "onboarding" && <TopBar key="top" hideLogoOnDesktop={isRoute} />}
        </AnimatePresence>

        <AnimatePresence>
          {stage === "map" && tab === "map" && (
            <HomePanel
              key="home"
              interests={profile.interests}
              durationMin={durationMin}
              onDurationChange={setDurationMin}
              onEditInterests={editInterests}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              onGenerate={() => {
                setRoute(buildMockRoute(durationMin, profile.interests));
                setActiveIndex(0);
                setStage("route");
              }}
            />
          )}
          {stage === "map" && tab !== "map" && (
            <TabPlaceholder
              key={tab}
              tab={tab}
              hasRoute={route.length > 0}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              onOpenRoute={() => {
                setTab("map");
                setStage("route");
              }}
            />
          )}
          {isRoute && (
            <RouteSheet
              key="route"
              durationMin={durationMin}
              stops={route}
              activeIndex={activeIndex}
              onActiveChange={setActiveIndex}
              onBack={() => setStage("map")}
              isDesktop={isDesktop}
              onCoverChange={setSheetCoverPx}
            />
          )}
        </AnimatePresence>

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
    </MotionConfig>
  );
}
