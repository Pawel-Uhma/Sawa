"use client";

import { type Audience, HACKATHON_VENUE, type Route, type Travel } from "@sawa/shared";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingCover } from "@/components/waiting";
import { type Lang, pick, useLang, useT } from "@/features/i18n";
import {
  highlightedLegs,
  type LocateStatus,
  type MapCamera,
  type MapPadding,
} from "@/features/map";
import { AUTH_ENABLED, saveAccountProfile, saveRide, startAccount } from "../lib/account";
import type { SavedRoute } from "../lib/account-sync";
import { listenerOf, planRoute, routeStops } from "../lib/api-data";
import { useDemoDrive } from "../lib/demo-drive";
import { SPRING, useIsDesktop, useIsWide } from "../lib/device";
import { shortestStopFor, useFastestRoute } from "../lib/fastest-route";
import { forgetAll, useMemory } from "../lib/memory";
import type { MockStop } from "../lib/mock-data";
import { EMPTY_PROFILE, loadProfile, type Profile, saveProfile } from "../lib/onboarding";
import { isAt, isNearRoute, useRideClock } from "../lib/ride-clock";
import {
  CUSTOM_DESTINATION_NAME,
  CUSTOM_DESTINATION_NAME_EN,
  type RideEnd,
  type RideEndType,
} from "../lib/ride-end";
import { musicDucked, musicPlays } from "../lib/ride-music";
import { useMusicOn, useRideMusic } from "../lib/ride-music-player";
import { useGpsClockSync } from "../lib/ride-sync";
import { useRouteChoices } from "../lib/route-choices";
import { pointAtM, routeAlongOf, simulatedAlongM } from "../lib/route-progress";
import { screenCamera } from "../lib/screen-camera";
import { type StartStatus, startLabel, useStartPoint } from "../lib/start-point";
import { afterStory, useAutoAdvance } from "../lib/story-advance";
import { useStoryPlayer } from "../lib/story-player";
import { claimVoice, isAside, ROUTE_VOICE, useVoiceOwner } from "../lib/voice";
import {
  moveStopover,
  type Stopover,
  toggleStopover as toggleStopoverIn,
  toWaypoints,
} from "../lib/waypoints";
import { AccountModal } from "./account-modal";
import { DrivingCard } from "./driving-card";
import { HomePanel } from "./home-panel";
import { OnboardingFlow } from "./onboarding-flow";
import type { PlaceSelection } from "./place-card-host";
import { ProfileModal, type ProfileStep } from "./profile-modal";
import { RidesPanel } from "./rides-panel";
import { RouteChoices } from "./route-choices";
import { DESKTOP_ITINERARY_PX, RouteSheet } from "./route-sheet";
import { type SawaMenuActions, SawaMenuProvider } from "./sawa-menu";
import { SawaSpeaking } from "./sawa-speaking";
import { SawaTab } from "./sawa-tab";
import { StopoverList } from "./stopover-list";
import { TopBar } from "./top-bar";

// Ekrany nad mapą. Paska zakładek nie ma: Przejażdżki i Sawa są w menu pod logo,
// a gdy Sawa mówi poza trasą, do jej ekranu prowadzi pigułka w rogu (SawaSpeaking).
type Tab = "map" | "rides" | "sawa";

// Mapa Antka (features/map). MapLibre potrzebuje window i WebGL, więc tylko w przeglądarce.
const SawaMap = dynamic(() => import("@/features/map").then((mod) => mod.SawaMap), {
  ssr: false,
  loading: MapChunkLoading,
});

/** Póki kod mapy się ściąga: ta sama zasłona, którą potem pokazuje sama mapa, więc nic nie skacze. */
function MapChunkLoading() {
  const t = useT();
  return <LoadingCover show label={t("Wczytuję mapę Warszawy…", "Loading the map of Warsaw…")} />;
}

// Karta miejsca czyta wybór z URL-a (`?p=`) i dane mapy, więc też tylko w przeglądarce.
const PlaceCardHost = dynamic(() => import("./place-card-host").then((mod) => mod.PlaceCardHost), {
  ssr: false,
});

type Stage = "onboarding" | "map" | "route";

// Lista „co już opowiedziałam” zaznacza miejsce w URL-u (`?p=`), więc też tylko w przeglądarce.
const ToldModal = dynamic(() => import("./told-modal").then((mod) => mod.ToldModal), {
  ssr: false,
});

// Szerokość panelu (md: 360, lg: 400) i margines wokół niego, jak w route-sheet.tsx i home-panel.tsx
const PANEL_PX = { tablet: 360, laptop: 400 };
const DESKTOP_GAP_PX = 24;

// Podstrona /demo na scenę: bez onboardingu, start zawsze spod 42 Warsaw, trasa układa się sama.
const DEMO_PROFILE: Profile = {
  familiarity: "first_time",
  interests: ["historical"],
  storyStyle: "fun",
  audience: "adult",
};
const DEMO_DURATION_MIN = 90;

export function DemoApp({ scenario }: { scenario?: "stage" } = {}) {
  const isStage = scenario === "stage";
  const lang = useLang();
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();
  const [stage, setStage] = useState<Stage>(isStage ? "map" : "onboarding");
  const [profile, setProfile] = useState<Profile>(isStage ? DEMO_PROFILE : EMPTY_PROFILE);
  // Edycja jednego pola profilu idzie przez modal, nigdy przez onboarding.
  const [editing, setEditing] = useState<ProfileStep | null>(null);
  const [toldOpen, setToldOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("map");
  const [durationMin, setDurationMin] = useState(isStage ? DEMO_DURATION_MIN : 90);
  const [endType, setEndType] = useState<RideEndType>("loop");
  const [travel, setTravel] = useState<Travel>("transit");
  // Celu nie podsuwamy: do wyboru użytkownika. Wybrany wraca po przełączeniu „Wracam tu” → „Do celu”
  const [chosenDestination, setChosenDestination] = useState<Extract<
    RideEnd,
    { type: "destination" }
  > | null>(null);
  // „Do celu” bez wybranego celu: trasy jeszcze nie liczymy, przycisk czeka na cel
  const rideEnd: RideEnd = useMemo(
    () => (endType === "destination" && chosenDestination ? chosenDestination : { type: "loop" }),
    [endType, chosenDestination],
  );
  const needsDestination = endType === "destination" && chosenDestination === null;
  // Przystanki po drodze (#195), dodane z karty miejsca; trasa mija je w tej kolejności
  const [stopovers, setStopovers] = useState<Stopover[]>([]);
  const waypoints = useMemo(() => toWaypoints(stopovers), [stopovers]);
  const toggleStopover = useCallback(
    (stop: Stopover) => setStopovers((list) => toggleStopoverIn(list, stop)),
    [],
  );
  const [route, setRoute] = useState<MockStop[]>([]);
  const [planned, setPlanned] = useState<Route | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  // Autem tylko głos (#190): arkusz trasy wraca dopiero, gdy kierowca powie, że stoi
  const [isParked, setIsParked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // Odcinki wybrane w „Dojeździe” (linia albo spacer) albo na mapie (przesiadka: obie linie):
  // podświetlone i pokazane na mapie w całości
  const [pickedLegs, setPickedLegs] = useState<number[] | null>(null);
  const [sheetCoverPx, setSheetCoverPx] = useState(360);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSelection | null>(null);
  const [placeCoverPx, setPlaceCoverPx] = useState(360);
  // Karta na dole (plan przejazdu, Sawa): przycisk lokalizacji staje nad nią
  const [panelCoverPx, setPanelCoverPx] = useState(380);
  // O zgodę na lokalizację pytamy dopiero po onboardingu
  // Na scenie nie pytamy o lokalizację: stała pozycja pod 42 Warsaw
  const start = useStartPoint(!isStage && stage !== "onboarding");
  const origin = isStage ? HACKATHON_VENUE : start.point;
  const fastest = useFastestRoute(origin, profile, rideEnd, travel, waypoints);
  // Suwak nie schodzi poniżej najszybszej drogi do celu (#43)
  const minDurationMin =
    fastest.status === "ready" ? shortestStopFor(fastest.route.totalMin) : null;

  const fastestRoute = fastest.status === "ready" ? fastest.route : null;

  // Każdy nowy cel (i zmiana startu albo sposobu jazdy): suwak sam staje na najszybszej drodze.
  // Użytkownik może go potem przesunąć dalej, dłuższy czas to trasa krajoznawcza.
  useEffect(() => {
    if (fastestRoute) setDurationMin(shortestStopFor(fastestRoute.totalMin));
  }, [fastestRoute]);

  const pickRoute = useCallback((next: Route) => {
    setPlanned(next);
    setIsParked(false);
    setRoute(routeStops(next));
    setActiveIndex(0);
    setPickedLegs(null);
  }, []);
  // Kilka propozycji trasy i „Losuj inną” (#197); opowieści rozgrzewa tylko wybrana
  const routeChoices = useRouteChoices();
  const { offer: offerRoutes, choose: chooseRoute, shuffle: shuffleRoutes } = routeChoices;
  // Pasek propozycji znika, gdy jazda ruszy (pierwsza opowieść albo kolejne miejsce)
  const [rideStarted, setRideStarted] = useState(false);
  const showRoute = useCallback(
    (next: Route) => {
      pickRoute(offerRoutes(next));
      setRideStarted(false);
      setStage("route");
    },
    [pickRoute, offerRoutes],
  );
  const pickChoice = useCallback(
    (next: Route) => {
      pickRoute(next);
      chooseRoute(next);
    },
    [pickRoute, chooseRoute],
  );
  const shuffleRoute = useCallback(async () => {
    const next = await shuffleRoutes((shuffle) =>
      planRoute(origin, durationMin, profile, rideEnd, travel, waypoints, shuffle),
    );
    if (next) pickRoute(next);
  }, [shuffleRoutes, origin, durationMin, profile, rideEnd, travel, waypoints, pickRoute]);

  const generateRoute = useCallback(async () => {
    setPlanning(true);
    setPlanError(null);
    try {
      // Na najkrótszym kroku to po prostu najszybsza droga, już pobrana
      if (fastest.status === "ready" && durationMin === minDurationMin) {
        showRoute(fastest.route);
        if (!isStage) saveRide(fastest.route, { origin, durationMin, rideEnd, travel, waypoints });
        return;
      }
      const next = await planRoute(origin, durationMin, profile, rideEnd, travel, waypoints);
      showRoute(next);
      if (!isStage) saveRide(next, { origin, durationMin, rideEnd, travel, waypoints });
    } catch {
      setPlanError(
        start.status === "located"
          ? pick(
              lang,
              "Nie udało się ułożyć trasy stąd. Może w pobliżu nie ma przystanku? Spróbuj startu spod 42 Warsaw w menu Sawy.",
              "Couldn't plan a route from here. Maybe there's no stop nearby? Try starting from 42 Warsaw in the Sawa menu.",
            )
          : pick(
              lang,
              "Nie udało się ułożyć trasy. Spróbuj jeszcze raz.",
              "Couldn't plan a route. Please try again.",
            ),
      );
    } finally {
      setPlanning(false);
    }
  }, [
    isStage,
    lang,
    origin,
    start.status,
    durationMin,
    profile,
    rideEnd,
    travel,
    waypoints,
    fastest,
    minDurationMin,
    showRoute,
  ]);

  const changeRideEnd = useCallback((next: RideEnd | null) => {
    if (next?.type === "destination") setChosenDestination(next);
    else if (next === null) setChosenDestination(null);
    setEndType(next?.type ?? "destination");
  }, []);

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

  // Kto już przeszedł onboarding na tym urządzeniu, wraca od razu na mapę.
  // Do sprawdzenia localStorage onboarding się nie pokazuje, żeby nie mignął.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const saved = isStage ? null : loadProfile();
    if (saved) {
      setProfile(saved);
      setStage("map");
    }
    setRestored(true);
  }, [isStage]);

  // Na scenie trasa układa się sama raz, zaraz po wejściu (bez zapisu profilu w przeglądarce).
  const autoPlanned = useRef(false);
  useEffect(() => {
    if (!isStage || autoPlanned.current) return;
    autoPlanned.current = true;
    generateRoute();
  }, [isStage, generateRoute]);

  // Konto (lib/account.ts): tylko z NEXT_PUBLIC_AUTH_ENABLED i nie na scenie. Po zalogowaniu
  // profil z konta wygrywa z lokalnym, a kto go już ma, pomija onboarding.
  useEffect(() => {
    if (isStage || !AUTH_ENABLED) return;
    return startAccount({
      localProfile: loadProfile,
      onProfile: (remote) => {
        setProfile(remote);
        saveProfile(remote);
        setStage((current) => (current === "onboarding" ? "map" : current));
      },
    });
  }, [isStage]);

  const finishOnboarding = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next);
    saveAccountProfile(next);
    setStage("map");
  }, []);

  const editProfile = useCallback((step: ProfileStep) => setEditing(step), []);

  const closeEditing = useCallback(() => setEditing(null), []);

  // Zapis z modalu zmienia tylko profil, bez wracania do ekranów wstępu.
  const saveEditing = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next);
    saveAccountProfile(next);
    setEditing(null);
  }, []);

  // Tryb dla dzieci (#65) przełącza się jednym stuknięciem w menu i zostaje w profilu.
  const changeAudience = useCallback(
    (audience: Audience) => {
      const next = { ...profile, audience };
      setProfile(next);
      saveProfile(next);
      saveAccountProfile(next);
    },
    [profile],
  );

  // „Powtórz” z „Moje trasy”: te same ustawienia na ekranie i trasa liczona od nowa ze świeżymi
  // odjazdami (zapisane odjazdy są już nieaktualne). Nowego wpisu nie dodaje.
  const repeatRoute = useCallback(
    async ({ request }: SavedRoute) => {
      setDurationMin(request.durationMin);
      setTravel(request.travel);
      changeRideEnd(request.rideEnd);
      // Przystanki (#195) wracają na listę, o ile mają miejsce z karty (nazwa i id)
      setStopovers(
        (request.waypoints ?? []).flatMap(({ lat, lng, placeId, name }) =>
          placeId && name ? [{ lat, lng, placeId, name }] : [],
        ),
      );
      setTab("map");
      setStage("map");
      setPanelCollapsed(false);
      setPlanning(true);
      setPlanError(null);
      try {
        showRoute(
          await planRoute(
            request.origin,
            request.durationMin,
            profile,
            request.rideEnd,
            request.travel,
            request.waypoints,
          ),
        );
      } catch {
        setPlanError(
          pick(
            lang,
            "Nie udało się powtórzyć tej trasy. Spróbuj jeszcze raz.",
            "Couldn't repeat this ride. Please try again.",
          ),
        );
      } finally {
        setPlanning(false);
      }
    },
    [profile, lang, changeRideEnd, showRoute],
  );

  const restart = useCallback(() => {
    saveProfile(null);
    forgetAll();
    setProfile(EMPTY_PROFILE);
    setRoute([]);
    setPlanned(null);
    setTab("map");
    setEditing(null);
    setStage("onboarding");
  }, []);

  // Mapa jest jedna pod wszystkimi ekranami. Ekrany zmieniają tylko kamerę i to, co na niej leży.
  const isRoute = stage === "route" && planned !== null && route.length > 0;
  // W aucie, w czasie jazdy: bez listy miejsc, kart i przycisków, Sawa mówi sama
  const isDriving = isRoute && !isParked && planned.legs.some((leg) => leg.mode === "car");
  const activeStop = route[activeIndex];
  const isHome = stage === "map" && tab === "map";
  const destination = rideEnd.type === "destination" ? rideEnd : null;
  const isPickingEnd = endType === "destination";
  // Karta miejsca działa też na trasie: klik w pinezkę spoza trasy pokazuje to miejsce.
  const isPlaceOpen = (isHome || isRoute) && selectedPlace !== null;
  // Po zamknięciu karty kamera stoi, dopóki nie zmieni się przystanek, cel albo ekran.
  const [placeClosed, setPlaceClosed] = useState(false);
  useEffect(() => {
    if (isPlaceOpen) setPlaceClosed(true);
  }, [isPlaceOpen]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on screen, stop or destination change
  useEffect(() => {
    setPlaceClosed(false);
  }, [stage, tab, activeIndex, destination]);

  const padding: MapPadding = useMemo(() => {
    if (isDesktop) {
      return {
        top: 96,
        // Na trasie po prawej stoi karta z dojazdem: trasa nie chowa się pod nią
        right: isRoute ? DESKTOP_ITINERARY_PX + DESKTOP_GAP_PX : DESKTOP_GAP_PX,
        bottom: DESKTOP_GAP_PX,
        left: (isWide ? PANEL_PX.laptop : PANEL_PX.tablet) + DESKTOP_GAP_PX * 2,
      };
    }
    if (isPlaceOpen) return { top: isRoute ? 88 : 120, right: 0, bottom: placeCoverPx, left: 0 };
    if (isRoute) return { top: 88, right: 0, bottom: sheetCoverPx, left: 0 };
    return { top: 88, right: 0, bottom: panelCollapsed ? 96 : isPickingEnd ? 470 : 380, left: 0 };
  }, [
    isDesktop,
    isWide,
    isRoute,
    isPlaceOpen,
    sheetCoverPx,
    placeCoverPx,
    panelCollapsed,
    isPickingEnd,
  ]);

  const camera: MapCamera = useMemo(() => {
    // Linia, spacer albo przesiadka wybrane przed chwilą: mapa pokazuje je w całości, także przy
    // otwartej karcie miejsca (wybór miejsca kasuje ten wybór, efekt niżej)
    if (isRoute && planned && pickedLegs) {
      const points = pickedLegs.flatMap((i) =>
        (planned.legs[i]?.lngLats ?? []).map(([lng, lat]) => ({ lat, lng })),
      );
      if (points.length > 0) return { type: "fit", points };
    }
    const stop =
      isRoute && activeStop ? { lat: activeStop.coord[1], lng: activeStop.coord[0] } : null;
    return screenCamera({
      place: isPlaceOpen ? { position: selectedPlace.position } : null,
      placeClosed,
      activeStop: stop,
      destination: isHome && destination ? destination.point : null,
      origin,
      isDesktop,
    });
  }, [
    isRoute,
    planned,
    pickedLegs,
    activeStop,
    isDesktop,
    isHome,
    destination,
    isPlaceOpen,
    selectedPlace,
    placeClosed,
    origin,
  ]);

  const listener = useMemo(() => listenerOf(profile, lang), [profile, lang]);
  const memory = useMemory();
  // Odtwarzacz jest tu, a nie w arkuszu trasy: zakładka Sawa steruje tą samą opowieścią.
  const player = useStoryPlayer(route, activeIndex, listener);
  const { setIsPlaying, rewind } = player;
  // Prowadzenie (menu Sawy): automatycznie z zegarem jazdy i GPS albo tylko ręcznie
  const autoAdvance = useAutoAdvance();
  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;
  // Kolejne opowieści ruszają z zegarem jazdy; wybór punktu ręcznie znaczy „jestem tutaj”.
  // Pauza i stop Sawy zatrzymują też zegar (suwak i odliczanie), także przed pierwszym miejscem.
  // Z GPS przy trasie zegar sam nie wychodzi poza bieżący punkt: dalej prowadzi lokalizacja.
  const clock = useRideClock(
    route,
    player.isPlaying,
    autoAdvance && isNearRoute(route, start.position),
  );
  const { syncTo, held, setHeld } = clock;
  const heldRef = useRef(held);
  heldRef.current = held;
  const musicOn = useMusicOn();
  const voiceOwner = useVoiceOwner();
  // Trasa w metrach i miejsca na niej: z GPS kolejny temat jest na rzeczy ok. 200 m przed
  // punktem (także gdy miejsce stoi z boku linii), bez GPS kropka jedzie po linii z zegarem.
  const along = useMemo(
    () => (planned ? routeAlongOf(planned.legs, planned.places) : null),
    [planned],
  );
  // Z lokalizacją zegar staje przy punkcie, do którego naprawdę dojechaliśmy.
  // Ręcznie lokalizacja nie zmienia miejsca.
  useGpsClockSync(route, autoAdvance ? start.position : null, clock, along);
  const pickStop = useCallback(
    (index: number) => {
      syncTo(index);
      setActiveIndex(index);
    },
    [syncTo],
  );
  // Punkt wybrany ręcznie kończy śledzenie kropki (przycisk lokalizacji); ten z zegara jazdy nie
  const [stopPicks, setStopPicks] = useState(0);
  const userPickStop = useCallback(
    (index: number) => {
      setStopPicks((n) => n + 1);
      pickStop(index);
    },
    [pickStop],
  );
  // Na scenie autobus jedzie sam: aktywny punkt idzie po trasie w ok. 1,5 min (T-36)
  const [driveProgress, setDriveProgress] = useState<number | null>(null);
  useDemoDrive(isStage && isRoute, route, pickStop, setDriveProgress);
  // Kropka „tu jesteś”: GPS na żywo. Przy starcie spod 42 Warsaw (scena, menu) w trakcie jazdy
  // pozycja symulowana wzdłuż linii (na scenie z jazdy demo, poza nią z zegara jazdy), przed
  // jazdą 42 Warsaw. Bez lokalizacji kropki nie ma, bo wyglądałaby jak zamrożony GPS.
  const isSimulated = isStage || start.mode === "venue";
  const totalSec = planned ? planned.totalMin * 60 : 0;
  const rideSec = isStage && driveProgress !== null ? driveProgress * totalSec : clock.rideSec;
  const simulatedDot = useMemo(
    () =>
      isSimulated && isRoute && along
        ? pointAtM(along.path, simulatedAlongM(along, route, rideSec, totalSec))
        : null,
    [isSimulated, isRoute, along, route, rideSec, totalSec],
  );
  const userDot = isSimulated ? (simulatedDot ?? HACKATHON_VENUE) : (start.position ?? undefined);
  // Sawa nie zaczyna zaraz po wyznaczeniu trasy: czeka, aż dojedziesz do pierwszego miejsca
  // (zegar jazdy albo GPS). Po wyjściu z trasy pauza, a po wejściu wznowienie.
  const waiting = clock.waitSec !== null;
  // Po starcie jazdy najjaśniejszy jest odcinek, którym jedziesz teraz (z miejsca, o którym mówi
  // Sawa: cała linia albo spacer); stuknięty w „Dojeździe” ma pierwszeństwo, aż stukniesz go znowu
  const currentLeg =
    planned && isRoute && !waiting ? (planned.places[activeIndex]?.legIndex ?? null) : null;
  const currentLegs = useMemo(
    () => (planned && currentLeg !== null ? highlightedLegs(planned.legs, currentLeg) : null),
    [planned, currentLeg],
  );
  const mapHighlight = pickedLegs ?? currentLegs;
  // Wybór z listy: linia (z jej wszystkimi odcinkami) albo spacer; null gasi
  const pickLeg = useCallback(
    (legIndex: number | null) =>
      setPickedLegs(legIndex === null || !planned ? null : highlightedLegs(planned.legs, legIndex)),
    [planned],
  );
  // Przesiadka na mapie: obie linie, których dotyczy; drugie stuknięcie gasi
  const pickBoarding = useCallback(
    (legIndex: number, fromLegIndex: number) => {
      if (!planned) return;
      const legs = [
        ...(fromLegIndex >= 0 ? highlightedLegs(planned.legs, fromLegIndex) : []),
        ...highlightedLegs(planned.legs, legIndex),
      ];
      setPickedLegs((prev) => (prev && prev.join() === legs.join() ? null : legs));
    },
    [planned],
  );
  // Wybrane miejsce ma pierwszeństwo przed wybraną linią (kamera pokazuje miejsce)
  useEffect(() => {
    if (selectedPlace) setPickedLegs(null);
  }, [selectedPlace]);
  // Muzyka w tle przez całą jazdę, także w oczekiwaniu na pierwsze miejsce; pauza Sawy zatrzymuje też ją.
  useRideMusic(
    musicOn && musicPlays({ onRoute: isRoute, held, waiting, isPlaying: player.isPlaying }),
    musicDucked(player, isAside(voiceOwner)),
  );
  const wasWaiting = useRef(false);
  useEffect(() => {
    const arrived = wasWaiting.current && !waiting;
    wasWaiting.current = waiting;
    // Start z zakładki Sawa (poza ekranem trasy) zostaje, nie pauzujemy go od razu
    if (arrived && !isRoute) return;
    // Zatrzymana przez użytkownika Sawa nie rusza sama po powrocie na trasę. Ręcznie nie rusza
    // też po dojeździe do pierwszego miejsca, tylko na stuknięcie (zmiana trybu w trakcie nie pauzuje).
    setIsPlaying(isRoute && !waiting && !heldRef.current && autoAdvanceRef.current);
  }, [isRoute, waiting, setIsPlaying]);
  const firstStop = route[0];
  useEffect(() => {
    if (held || !waiting || !firstStop || start.status !== "located") return;
    if (isAt(origin, firstStop)) syncTo(0);
  }, [held, waiting, firstStop, start.status, origin, syncTo]);
  // Sterowanie użytkownika: stop i pauza zatrzymują zegar, odtwarzanie go wznawia.
  // Stuknięcie w odtwarzanie przed pierwszym miejscem znaczy „opowiadaj już teraz”,
  // a po stopie w tym czasie: zegar rusza od miejsca, w którym stanął.
  const ridePlayer = useMemo(() => {
    const toggle = () => {
      if (player.isPlaying) {
        setHeld(true);
        player.toggle();
        return;
      }
      setHeld(false);
      if (!waiting) player.toggle();
      else if (!held) {
        syncTo(0);
        player.toggle();
      }
    };
    const restart = (keepPlaying: boolean) => {
      setHeld(!keepPlaying);
      player.restart(keepPlaying);
    };
    const setPlaying = (action: SetStateAction<boolean>) => {
      const playing = typeof action === "function" ? action(player.isPlaying) : action;
      setHeld(!playing);
      player.setIsPlaying(playing);
    };
    return { ...player, toggle, restart, setIsPlaying: setPlaying };
  }, [waiting, held, player, syncTo, setHeld]);
  // Po końcu opowieści: automatycznie Sawa czeka, aż zbliżysz się do następnego punktu (zegar
  // jazdy, GPS), a gdy opowieść się przeciągnęła, od razu bierze punkt, przy którym już jesteś.
  // Ręcznie czeka na Następne (muzyka gra dalej). Po ostatnim miejscu Sawa staje. Tu, a nie
  // w arkuszu trasy, żeby działało też z zakładki Sawa.
  const { progress } = player;
  const { dueIndex } = clock;
  useEffect(() => {
    if (player.isPlaying || activeIndex > 0) setRideStarted(true);
  }, [player.isPlaying, activeIndex]);
  useEffect(() => {
    if (progress < 100) return;
    const next = afterStory({
      activeIndex,
      dueIndex,
      stopCount: route.length,
      auto: autoAdvance,
    });
    if (next === "wait") return;
    // Koniec trasy jak stop użytkownika: zegar jazdy i muzyka stają
    if (next === "stop") {
      setHeld(true);
      setIsPlaying(false);
      return;
    }
    rewind();
    setHeld(false);
    setIsPlaying(true);
    // Z zegara jazdy, nie wybór użytkownika: kropka dalej jest śledzona
    setActiveIndex(next);
  }, [progress, activeIndex, dueIndex, route.length, autoAdvance, setHeld, setIsPlaying, rewind]);
  const playStop = useCallback(
    (index: number) => {
      if (index < 0 || index >= route.length) return;
      // Wybór punktu to „opowiadaj o trasie”, więc ucisza dygresję z karty miejsca.
      claimVoice(ROUTE_VOICE);
      rewind();
      setHeld(false);
      setIsPlaying(true);
      userPickStop(index);
    },
    [route.length, rewind, setHeld, setIsPlaying, userPickStop],
  );
  const menu: SawaMenuActions = useMemo(
    () => ({
      profile,
      onEditProfile: editProfile,
      onAudienceChange: changeAudience,
      lastRouteStops: planned && route.length > 0 ? route.length : null,
      onOpenLastRoute: () => {
        setTab("map");
        setStage("route");
      },
      onOpenRides: () => {
        setStage("map");
        setTab("rides");
      },
      onOpenSawa: () => {
        setStage("map");
        setPanelCollapsed(false);
        setTab("sawa");
      },
      onRestart: restart,
      rememberedPlaces: Object.keys(memory.places).length,
      onOpenTold: () => setToldOpen(true),
      startMode: start.mode,
      startLabel: startLabel(start.status, lang),
      onStartModeChange: start.setMode,
      onOpenAccount: AUTH_ENABLED && !isStage ? () => setAccountOpen(true) : undefined,
    }),
    [
      profile,
      editProfile,
      changeAudience,
      planned,
      route.length,
      restart,
      memory,
      start.mode,
      start.status,
      start.setMode,
      lang,
      isStage,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <SawaMenuProvider value={menu}>
        <div className="fixed inset-0 overflow-hidden bg-mapa">
          <div className="absolute inset-0">
            <SawaMap
              route={
                isRoute ? (planned ?? undefined) : isHome ? (fastestRoute ?? undefined) : undefined
              }
              camera={camera}
              padding={padding}
              user={userDot}
              userHeading={start.heading}
              // Po starcie trasy kamera idzie za kropką GPS (#193); na scenie i bez GPS stoi przy punktach
              navigate={isRoute && !isStage && start.position !== null}
              destination={isRoute || isHome ? destination?.point : undefined}
              waypoints={isRoute || isHome ? stopovers : undefined}
              onMapClick={
                isHome && isPickingEnd
                  ? (point) =>
                      changeRideEnd({
                        type: "destination",
                        name: pick(lang, CUSTOM_DESTINATION_NAME, CUSTOM_DESTINATION_NAME_EN),
                        point,
                      })
                  : undefined
              }
              activeStopId={isRoute ? activeStop?.id : undefined}
              highlightLegs={isRoute ? mapHighlight : null}
              fadePlaces={isRoute && pickedLegs !== null}
              // Drogi rowerowe przy planowaniu rowerem i na trasie z odcinkiem rowerowym
              showBikePaths={
                isRoute
                  ? (planned?.legs.some((leg) => leg.mode === "bike") ?? false)
                  : travel === "bike"
              }
              interests={profile.interests}
              onBoardingClick={isRoute ? pickBoarding : undefined}
              onStopClick={(id) => {
                if (isDriving) return;
                const index = route.findIndex((stop) => stop.id === id);
                if (index >= 0) userPickStop(index);
              }}
              // Ekrany mają własne karty nad mapą; wbudowana karta miejsca wjechałaby pod nie
              hasPlaceSheet={false}
              locate={
                isStage || stage === "onboarding" || (stage === "map" && tab === "rides")
                  ? undefined
                  : {
                      status: locateStatus(start.status),
                      onRetry: start.retry,
                      // Na telefonie nad tym, co naprawdę zasłania dół mapy
                      bottomPx: isDesktop
                        ? undefined
                        : isPlaceOpen
                          ? placeCoverPx
                          : isRoute
                            ? sheetCoverPx
                            : panelCoverPx,
                      // Wybór na ekranie (miejsce, punkt, linia w „Dojeździe”) kończy śledzenie kropki
                      followResetKey: `${stage}|${tab}|${selectedPlace?.id ?? ""}|${stopPicks}|${pickedLegs?.join() ?? ""}`,
                    }
              }
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
                durationMin={durationMin}
                onDurationChange={setDurationMin}
                fastestMin={fastestRoute?.totalMin ?? null}
                isFindingFastest={fastest.status === "loading"}
                minDurationMin={minDurationMin}
                travel={travel}
                onTravelChange={setTravel}
                rideEnd={rideEnd}
                endType={endType}
                onRideEndTypeChange={setEndType}
                onRideEndChange={changeRideEnd}
                collapsed={panelCollapsed}
                onCollapsedChange={setPanelCollapsed}
                onGenerate={generateRoute}
                canGenerate={!needsDestination}
                planning={planning}
                planError={planError}
                locating={!isStage && start.status === "locating"}
                onCoverChange={setPanelCoverPx}
                stopovers={
                  <StopoverList
                    stops={stopovers}
                    onMove={(index, by) => setStopovers((list) => moveStopover(list, index, by))}
                    onRemove={(placeId) =>
                      setStopovers((list) => list.filter((s) => s.placeId !== placeId))
                    }
                  />
                }
              />
            )}
            {stage === "map" && tab === "rides" && (
              <RidesPanel
                key="rides"
                profile={profile}
                origin={origin}
                originLabel={startLabel(start.status, lang)}
                durationMin={durationMin}
                onDurationChange={setDurationMin}
                rideEnd={rideEnd}
                travel={travel}
                lastRoute={route}
                onClose={() => setTab("map")}
                onOpenLastRoute={() => {
                  setTab("map");
                  setStage("route");
                }}
                onStart={(preview) => {
                  setTab("map");
                  if (!preview) {
                    generateRoute();
                    return;
                  }
                  showRoute(preview);
                  saveRide(preview, { origin, durationMin, rideEnd, travel });
                }}
              />
            )}
            {stage === "map" && tab === "sawa" && (
              <SawaTab
                key="sawa"
                collapsed={panelCollapsed}
                onCollapsedChange={setPanelCollapsed}
                stops={route}
                activeIndex={activeIndex}
                player={ridePlayer}
                places={memory.places}
                onPrev={() => playStop(activeIndex - 1)}
                onNext={() => playStop(activeIndex + 1)}
                onClose={() => setTab("map")}
                onCoverChange={setPanelCoverPx}
              />
            )}
            {isRoute && !isStage && !rideStarted && planned && (
              <RouteChoices
                key="route-choices"
                choices={routeChoices.choices}
                selectedId={planned.id}
                onSelect={pickChoice}
                onShuffle={shuffleRoute}
                shuffling={routeChoices.shuffling}
                shuffleFailed={routeChoices.shuffleFailed}
              />
            )}
            {isDriving && (
              <DrivingCard
                key="jazda"
                place={player.isPlaying ? (activeStop?.name ?? null) : null}
                waitMin={clock.waitSec === null ? null : Math.round(clock.waitSec / 60)}
                onParked={() => setIsParked(true)}
                onCoverChange={setSheetCoverPx}
              />
            )}
            {isRoute && !isDriving && (
              <RouteSheet
                key="route"
                listener={listener}
                durationMin={durationMin}
                end={planned ? routeEnd(planned, rideEnd, lang) : null}
                legs={planned?.legs ?? []}
                attribution={planned?.attribution ?? []}
                stops={route}
                player={ridePlayer}
                activeIndex={activeIndex}
                onPlayStop={playStop}
                highlightLegs={mapHighlight}
                onHighlightLeg={pickLeg}
                clock={clock}
                totalSec={(planned?.totalMin ?? 0) * 60}
                onBack={() => setStage("map")}
                isDesktop={isDesktop}
                onCoverChange={setSheetCoverPx}
              />
            )}
          </AnimatePresence>

          {stage !== "onboarding" && (
            <PlaceCardHost
              isActive={isHome || (isRoute && !isDriving)}
              listener={listener}
              onSelectionChange={setSelectedPlace}
              onCoverChange={setPlaceCoverPx}
              onRideTo={(name, point) => {
                changeRideEnd({ type: "destination", name, point });
                // Z trasy wracamy na ekran główny, żeby wyznaczyć przejazd do nowego celu
                setStage("map");
                setTab("map");
                setPanelCollapsed(false);
              }}
              stopovers={stopovers}
              onToggleStopover={toggleStopover}
            />
          )}

          <AnimatePresence>
            {stage === "map" && tab !== "sawa" && player.isPlaying && player.text !== null && (
              <SawaSpeaking
                key="mowi"
                place={activeStop?.name ?? null}
                onOpen={() => {
                  setPanelCollapsed(false);
                  setTab("sawa");
                }}
              />
            )}
          </AnimatePresence>

          {/* Onboarding to warstwa nad mapą. Po wyjściu mapa „wyjeżdża” spod spodu. */}
          <AnimatePresence>
            {stage === "onboarding" && restored && (
              <motion.div
                key="onboarding"
                className="fixed inset-0 z-40"
                exit={{ opacity: 0, scale: 1.02 }}
                transition={SPRING}
              >
                <OnboardingFlow onDone={finishOnboarding} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal edycji nad wszystkim: zmienia jedno pole i wraca na to, co było pod spodem */}
          <ProfileModal
            step={editing}
            profile={profile}
            onSave={saveEditing}
            onClose={closeEditing}
          />
          {AUTH_ENABLED && (
            <AccountModal
              open={accountOpen}
              onClose={() => setAccountOpen(false)}
              onRepeat={repeatRoute}
            />
          )}
          <ToldModal
            open={toldOpen}
            onClose={() => setToldOpen(false)}
            onShowPlace={() => {
              setStage("map");
              setTab("map");
            }}
          />
        </div>
      </SawaMenuProvider>
    </MotionConfig>
  );
}

/** Podpis końca trasy w arkuszu; gdy planer nie dojechał do celu albo nie zamknął pętli, mówi to wprost. */
function routeEnd(route: Route, end: RideEnd, lang: Lang): { label: string; reached: boolean } {
  switch (end.type) {
    case "loop":
      return route.endsAtStart
        ? { label: pick(lang, "Wracasz na start", "Back to the start"), reached: true }
        : {
            label: pick(
              lang,
              "Nie udało się wrócić na start w tym czasie",
              "Couldn't get back to the start in this time",
            ),
            reached: false,
          };
    case "destination":
      return route.endsAtDestination
        ? { label: pick(lang, `Do celu: ${end.name}`, `To: ${end.name}`), reached: true }
        : {
            label: pick(
              lang,
              `Nie udało się dojechać do celu (${end.name}) w tym czasie`,
              `Couldn't reach ${end.name} in this time`,
            ),
            reached: false,
          };
  }
}

/** Stan przycisku lokalizacji: start spod 42 Warsaw (pokaz, poza Warszawą) też ma kropkę, do której wraca. */
function locateStatus(status: StartStatus): LocateStatus {
  switch (status) {
    case "located":
    case "venue":
    case "outside":
      return "found";
    case "locating":
      return "locating";
    case "denied":
    case "unavailable":
      return status;
  }
}
