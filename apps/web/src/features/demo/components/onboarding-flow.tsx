"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { haptic, SPRING } from "../lib/device";
import {
  type Choice,
  EMPTY_PROFILE,
  FAMILIARITY,
  INTERESTS,
  interestIcon,
  type Profile,
  STORY_STYLES,
} from "../lib/onboarding";
import { Logo } from "./logo";
import { Heading } from "./onboarding-heading";
import { How, Legend, Why } from "./onboarding-intro";
import { PrimaryButton } from "./primary-button";
import { ChoiceList, InterestPicker } from "./profile-choices";
import { SAWA_POSES, SawaGuide, type SawaPose, sawaSrc } from "./sawa-guide";

// Onboarding idzie tylko raz, przy pierwszym wejściu. Zmiany profilu robi modal (profile-modal.tsx).
export type OnboardingStep =
  | "welcome"
  | "legend"
  | "familiarity"
  | "why"
  | "how"
  | "interests"
  | "style";

// Rozmowa dla kogoś, kto widzi Sawę pierwszy raz: kim jest, kim jesteś Ty, co Ci da (zależy od
// odpowiedzi o znajomości miasta), jak działa, a potem już tylko wybory do trasy.
const ORDER: OnboardingStep[] = [
  "welcome",
  "legend",
  "familiarity",
  "why",
  "how",
  "interests",
  "style",
];
/** Strony bez pytania. Przy edycji z menu albo po „Znam Sawę” ich nie powtarzamy. */
const INTRO: OnboardingStep[] = ["legend", "why", "how"];
const QUESTIONS_ONLY = ORDER.filter((step) => !INTRO.includes(step));
// Przesunięcie albo rzut palcem, po którym wstęp przewija się na następną stronę.
const SWIPE_PX = 64;
const SWIPE_VELOCITY = 500;

// Po jednym tapnięciu przy wyborze jednokrotnym przechodzimy dalej, ale z chwilą na zobaczenie zaznaczenia.
const AUTO_ADVANCE_MS = 320;

const POSE: Record<OnboardingStep, SawaPose> = {
  welcome: "macha",
  legend: "sekret",
  familiarity: "mapa",
  why: "radosc",
  how: "mapa",
  interests: "mysli",
  style: "sekret",
};

type OnboardingFlowProps = {
  onDone: (profile: Profile) => void;
};

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [dir, setDir] = useState(1);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [skipIntro, setSkipIntro] = useState(false);
  const advanceTimer = useRef<number | undefined>(undefined);
  const steps = skipIntro ? QUESTIONS_ONLY : ORDER;
  /** Kroki z paskiem postępu i strzałką wstecz. */
  const paged = steps.slice(1);

  // Pozy i ikony ładujemy od razu, żeby zmiana kroku nie mrugała pustym obrazkiem.
  useEffect(() => {
    for (const pose of SAWA_POSES) new window.Image().src = sawaSrc(pose);
    for (const item of INTERESTS) new window.Image().src = interestIcon(item.key);
    return () => window.clearTimeout(advanceTimer.current);
  }, []);

  function go(next: OnboardingStep) {
    window.clearTimeout(advanceTimer.current);
    setDir(ORDER.indexOf(next) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  }

  const prevOf = (current: OnboardingStep) => steps[steps.indexOf(current) - 1] ?? current;

  // Po ostatnim pytaniu od razu mapa: trasę i tak układa planer dopiero po „Wyznacz trasę”.
  function advance(current: Profile = profile) {
    const next = steps[steps.indexOf(step) + 1];
    if (next) go(next);
    else onDone(current);
  }

  function pickSingle(field: "familiarity" | "storyStyle", key: string) {
    haptic();
    const next = { ...profile, [field]: key };
    setProfile(next);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => advance(next), AUTO_ADVANCE_MS);
  }

  function toggleInterest(key: string) {
    haptic();
    setProfile((current) => {
      const has = current.interests.includes(key);
      return {
        ...current,
        interests: has
          ? current.interests.filter((item) => item !== key)
          : [...current.interests, key],
      };
    });
  }

  const say = sawaLine(step, profile);
  const showChrome = paged.includes(step);
  const isIntro = INTRO.includes(step);

  // Wstęp przewija się palcem jak strony w iOS; pytania nie, żeby gest nie mylił się z wyborem.
  function onSwipe(offsetX: number, velocityX: number) {
    if (offsetX < -SWIPE_PX || velocityX < -SWIPE_VELOCITY) advance();
    else if (offsetX > SWIPE_PX || velocityX > SWIPE_VELOCITY) go(prevOf(step));
  }

  // Wejście z kierunku kroku, wyjście w przeciwną stronę: wstecz cofa się tą samą drogą.
  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: 48 * d }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: -48 * d }),
  };

  return (
    // Pełnoekranowa warstwa nad mapą: mapa prześwituje przez matowe szkło, więc onboarding i mapa to jedna przestrzeń.
    <div className="fixed inset-0 z-40 touch-pan-y overflow-y-auto overscroll-contain bg-mapa/95 backdrop-blur-2xl [@media(prefers-reduced-transparency:reduce)]:bg-mapa">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_20%_15%,rgba(142,209,181,0.35),transparent_70%),radial-gradient(50%_40%_at_90%_90%,rgba(242,117,95,0.10),transparent_70%)]"
      />
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:grid md:max-w-6xl md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-12 md:px-10 md:py-10 lg:gap-20 lg:px-16">
        {/* Lewa kolumna na desktopie, górny pas na telefonie: Sawa prowadzi rozmowę */}
        <div className="flex flex-col gap-4 md:h-full md:justify-center md:gap-10">
          <header className="flex h-11 items-center gap-3">
            {showChrome ? (
              <button
                type="button"
                onClick={() => go(prevOf(step))}
                aria-label="Wstecz"
                className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-tekst-2 transition-[background-color,transform] duration-100 hover:bg-powierzchnia active:scale-90 active:bg-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 5l-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <Logo className="text-2xl md:text-3xl" />
            )}
            {showChrome && <Progress segments={paged} index={paged.indexOf(step)} />}
          </header>

          <div className={step === "welcome" ? "pt-6 md:pt-0" : ""}>
            <SawaGuide pose={POSE[step]} say={say} hero={step === "welcome"} />
          </div>
        </div>

        {/* Prawa kolumna: treść kroku */}
        <div className="relative mt-5 flex flex-1 flex-col md:mt-0 md:min-h-[560px] md:justify-center">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.section
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING}
              drag={isIntro && !reduce ? "x" : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => onSwipe(info.offset.x, info.velocity.x)}
              className="flex flex-1 flex-col md:flex-none"
            >
              {step === "welcome" && (
                <Welcome
                  onStart={() => {
                    setSkipIntro(false);
                    go("legend");
                  }}
                  onSkipIntro={() => {
                    setSkipIntro(true);
                    go("familiarity");
                  }}
                />
              )}
              {step === "legend" && <Legend onNext={() => advance()} />}
              {step === "familiarity" && (
                <SingleChoice
                  title="Jak dobrze znasz Warszawę?"
                  options={FAMILIARITY}
                  value={profile.familiarity}
                  onPick={(key) => pickSingle("familiarity", key)}
                  onSkip={() => advance()}
                />
              )}
              {step === "why" && <Why familiarity={profile.familiarity} onNext={() => advance()} />}
              {step === "how" && <How onNext={() => advance()} />}
              {step === "interests" && (
                <Interests
                  picked={profile.interests}
                  onToggle={toggleInterest}
                  onNext={() => advance()}
                />
              )}
              {step === "style" && (
                <SingleChoice
                  title="Jak mam opowiadać?"
                  options={STORY_STYLES}
                  value={profile.storyStyle}
                  onPick={(key) => pickSingle("storyStyle", key)}
                  onSkip={() => advance()}
                />
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Sawa komentuje to, co właśnie wybrałeś (dymek zmienia się razem ze stanem, nie tylko z krokiem).
function sawaLine(step: OnboardingStep, profile: Profile): string {
  switch (step) {
    case "welcome":
      return "Cześć! Jestem Sawa, syrenka z herbu Warszawy.";
    case "legend":
      return "Mam imię po syrenie z legendy o Warszawie.";
    case "familiarity":
      return "A Ty? Powiedz, czy znamy się z Warszawą.";
    case "why":
      return WHY_LINE[profile.familiarity ?? ""] ?? "Pokażę Ci miasto, które mijasz codziennie.";
    case "how":
      return "To proste: trzy kroki i jedziemy.";
    case "interests": {
      const last = profile.interests.at(-1);
      if (!last) return "Co Cię ciekawi? Możesz wybrać kilka.";
      if (profile.interests.length === INTERESTS.length) return "Wszystko po trochu? Da się!";
      return INTEREST_LINE[last] ?? "Dobry wybór! Coś jeszcze?";
    }
    case "style":
      return "I ostatnie: jak mam opowiadać?";
  }
}

/** Sawa odpowiada na to, jak dobrze znasz miasto, zanim powie, co Ci da. */
const WHY_LINE: Record<string, string> = {
  first_time: "Witaj w Warszawie! Będę Twoją przewodniczką.",
  know_a_bit: "Trochę znasz? To dołożę resztę.",
  local: "Mieszkasz tu? To pokażę Ci Twoje miasto od nowa.",
};

/** Sawa reaguje na ostatnio wybraną kategorię. Przy sporcie i przyrodzie mówi wprost, że krótko. */
const INTEREST_LINE: Record<string, string> = {
  historical: "Historia to moja specjalność. Coś jeszcze?",
  cultural: "Murale, świątynie, dawne bazary. Coś jeszcze?",
  sports: "Boiska mam opisane krótko, ale po drodze ich nie brakuje.",
  nature: "Parki i skwery! O nich opowiem krótko.",
};

function Progress({ segments, index }: { segments: OnboardingStep[]; index: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Postęp"
      aria-valuemin={1}
      aria-valuemax={segments.length}
      aria-valuenow={index + 1}
      className="flex flex-1 gap-1.5"
    >
      {segments.map((segment, i) => (
        <div key={segment} className="h-1.5 flex-1 overflow-hidden rounded-full bg-tekst/10">
          <motion.div
            className="h-full origin-left rounded-full bg-glebia"
            initial={false}
            animate={{ scaleX: i <= index ? 1 : 0 }}
            transition={SPRING}
          />
        </div>
      ))}
    </div>
  );
}

function Welcome({ onStart, onSkipIntro }: { onStart: () => void; onSkipIntro: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-8 md:gap-10">
      <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
        <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-[-0.025em] md:text-[clamp(2.5rem,3.8vw,3.75rem)] md:leading-[1.04]">
          Opowiem Ci o mieście za oknem tramwaju.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-tekst-2 md:text-lg">
          Powiedz, co Cię ciekawi i ile masz czasu. Ułożę przejazd komunikacją miejską i opowiem o
          miejscach, które mijasz.
        </p>
      </div>

      <ul className="hidden gap-3 md:flex" aria-label="Co potrafi Sawa">
        {[
          { icon: "tram", text: "Tramwaje i autobusy ZTM" },
          { icon: "know_a_bit", text: "Historie miejsc z danych miasta" },
        ].map((item) => (
          <li
            key={item.icon}
            className="flex items-center gap-2.5 rounded-2xl bg-powierzchnia/70 py-2 pl-2 pr-4 text-sm font-semibold text-tekst-2"
          >
            <Image
              src={`/onboarding/${item.icon}.webp`}
              alt=""
              width={36}
              height={36}
              className="size-9"
            />
            {item.text}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:gap-5">
        <PrimaryButton onClick={onStart} className="md:w-auto md:px-12">
          Poznajmy się
        </PrimaryButton>
        <p className="text-center text-sm text-tekst-3 md:text-left">
          ok. minuty · bez logowania i instalacji
        </p>
      </div>
      <button
        type="button"
        onClick={onSkipIntro}
        className="-mt-4 mx-auto h-11 rounded-full px-4 text-sm font-semibold text-tekst-3 transition-colors hover:text-tekst-2 md:mx-0 md:-mt-6"
      >
        Znam Sawę, przejdź do pytań
      </button>
    </div>
  );
}

type SingleChoiceProps = {
  title: string;
  options: Choice[];
  value: string | null;
  onPick: (key: string) => void;
  onSkip: () => void;
};

function SingleChoice({ title, options, value, onPick, onSkip }: SingleChoiceProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>{title}</Heading>
      <ChoiceList label={title} options={options} value={value} onPick={onPick} />
      <button
        type="button"
        onClick={onSkip}
        className="mx-auto mt-auto h-11 rounded-full px-4 text-sm font-semibold text-tekst-3 transition-colors hover:text-tekst-2 md:mx-0 md:mt-0"
      >
        Pomiń
      </button>
    </div>
  );
}

type InterestsProps = {
  picked: string[];
  onToggle: (key: string) => void;
  onNext: () => void;
};

function Interests({ picked, onToggle, onNext }: InterestsProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading sub="Od tego zależy, które miejsca wybiorę i o czym opowiem.">
        Co Cię ciekawi?
      </Heading>

      <InterestPicker picked={picked} onToggle={onToggle} />

      <div className="mt-auto md:mt-0">
        <PrimaryButton
          disabled={picked.length === 0}
          onClick={onNext}
          className="md:w-auto md:px-12"
        >
          {picked.length === 0 ? "Wybierz co najmniej jedno" : "Dalej"}
        </PrimaryButton>
      </div>
    </div>
  );
}
