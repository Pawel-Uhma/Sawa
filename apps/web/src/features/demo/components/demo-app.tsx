"use client";

import { useState } from "react";
import { buildMockRoute, type MockStop } from "../lib/mock-data";
import { MapScreen } from "./map-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { RouteScreen } from "./route-screen";
import { StartScreen } from "./start-screen";

type Stage = "start" | "onboarding" | "map" | "route";

export function DemoApp() {
  const [stage, setStage] = useState<Stage>("start");
  const [interests, setInterests] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(90);
  const [route, setRoute] = useState<MockStop[]>([]);

  // Każdy ekran to osobne wejście, żeby przejścia były spójne na telefonie i desktopie.
  switch (stage) {
    case "start":
      return <StartScreen onStart={() => setStage("onboarding")} />;

    case "onboarding":
      return (
        <OnboardingScreen
          initial={interests}
          onBack={() => setStage("start")}
          onDone={(picked) => {
            setInterests(picked);
            setStage("map");
          }}
        />
      );

    case "map":
      return (
        <MapScreen
          interests={interests}
          durationMin={durationMin}
          onDurationChange={setDurationMin}
          onEditInterests={() => setStage("onboarding")}
          onGenerate={() => {
            setRoute(buildMockRoute(durationMin, interests));
            setStage("route");
          }}
        />
      );

    case "route":
      return (
        <RouteScreen
          key={route.map((stop) => stop.id).join(",") + durationMin}
          durationMin={durationMin}
          stops={route}
          onBack={() => setStage("map")}
        />
      );
  }
}
