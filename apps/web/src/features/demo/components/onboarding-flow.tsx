"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { haptic, SPRING } from "../lib/device";
import { getMemory } from "../lib/memory";
import {
  type Choice,
  FAMILIARITY,
  INTERESTS,
  interestIcon,
  type Profile,
  STORY_STYLES,
} from "../lib/onboarding";
import { Logo } from "./logo";
import { PrimaryButton } from "./primary-button";
import { SAWA_POSES, SawaGuide, type SawaPose, sawaSrc } from "./sawa-guide";

export type OnboardingStep = "welcome" | "familiarity" | "interests" | "style" | "building";

const ORDER: OnboardingStep[] = ["welcome", "familiarity", "interests", "style", "building"];
const QUESTIONS: OnboardingStep[] = ["familiarity", "interests", "style"];

// Po jednym tapnięciu przy wyborze jednokrotnym przechodzimy dalej, ale z chwilą na zobaczenie zaznaczenia.
const AUTO_ADVANCE_MS = 320;
const BUILD_LINE_MS = 650;

const POSE: Record<OnboardingStep, SawaPose> = {
  welcome: "macha",
  familiarity: "mapa",
  interests: "mysli",
  style: "sekret",
  building: "radosc",
};

const labelOf = (key: string) => INTERESTS.find((item) => item.key === key)?.label ?? key;

type OnboardingFlowProps = {
  initialStep?: OnboardingStep;
  initialProfile: Profile;
  onDone: (profile: Profile) => void;
};

export function OnboardingFlow({
  initialStep = "welcome",
  initialProfile,
  onDone,
}: OnboardingFlowProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [dir, setDir] = useState(1);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const advanceTimer = useRef<number | undefined>(undefined);

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

  const nextOf = (current: OnboardingStep) => ORDER[ORDER.indexOf(current) + 1] ?? current;
  const prevOf = (current: OnboardingStep) => ORDER[ORDER.indexOf(current) - 1] ?? current;

  function pickSingle(field: "familiarity" | "storyStyle", key: string) {
    haptic();
    setProfile((current) => ({ ...current, [field]: key }));
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go(nextOf(step)), AUTO_ADVANCE_MS);
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
  const questionIndex = QUESTIONS.indexOf(step);
  const showChrome = step !== "welcome" && step !== "building";

  // Wejście z kierunku kroku, wyjście w przeciwną stronę: wstecz cofa się tą samą drogą.
  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: 48 * d }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: -48 * d }),
  };

  return (
    // Pełnoekranowa warstwa nad mapą: mapa prześwituje przez matowe szkło, więc onboarding i mapa to jedna przestrzeń.
    <div className="fixed inset-0 z-40 touch-pan-y overflow-y-auto overscroll-contain bg-[#eef3f0]/95 backdrop-blur-2xl [@media(prefers-reduced-transparency:reduce)]:bg-[#eef3f0]">
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
                className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-tekst-2 transition-[background-color,transform] duration-100 hover:bg-white active:scale-90 active:bg-white"
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
            {showChrome && <Progress index={questionIndex} total={QUESTIONS.length} />}
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
              className="flex flex-1 flex-col md:flex-none"
            >
              {step === "welcome" && <Welcome onStart={() => go("familiarity")} />}
              {step === "familiarity" && (
                <SingleChoice
                  title="Jak dobrze znasz Warszawę?"
                  options={FAMILIARITY}
                  value={profile.familiarity}
                  onPick={(key) => pickSingle("familiarity", key)}
                  onSkip={() => go("interests")}
                />
              )}
              {step === "interests" && (
                <Interests
                  picked={profile.interests}
                  onToggle={toggleInterest}
                  onNext={() => go("style")}
                />
              )}
              {step === "style" && (
                <SingleChoice
                  title="Jak mam opowiadać?"
                  options={STORY_STYLES}
                  value={profile.storyStyle}
                  onPick={(key) => pickSingle("storyStyle", key)}
                  onSkip={() => go("building")}
                />
              )}
              {step === "building" && <Building profile={profile} onDone={() => onDone(profile)} />}
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
      return "Cześć! Jestem Sawa, syrenka z herbu.";
    case "familiarity":
      return "Najpierw powiedz, czy znamy się z Warszawą.";
    case "interests": {
      const last = profile.interests.at(-1);
      if (!last) return "Co Cię ciekawi? Możesz wybrać kilka.";
      if (profile.interests.length === INTERESTS.length) return "Wszystko po trochu? Da się!";
      return INTEREST_LINE[last] ?? "Dobry wybór! Coś jeszcze?";
    }
    case "style":
      return "I ostatnie: jak mam opowiadać?";
    case "building":
      return "Mam to! Układam Twoją Warszawę.";
  }
}

/** Sawa reaguje na ostatnio wybraną kategorię. Przy sporcie i przyrodzie mówi wprost, że krótko. */
const INTEREST_LINE: Record<string, string> = {
  historical: "Historia to moja specjalność. Coś jeszcze?",
  cultural: "Murale, świątynie, dawne bazary. Coś jeszcze?",
  sports: "Boiska mam opisane krótko, ale po drodze ich nie brakuje.",
  nature: "Parki i skwery! O nich opowiem krótko.",
};

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Postęp"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      className="flex flex-1 gap-1.5"
    >
      {QUESTIONS.slice(0, total).map((segment, i) => (
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

function Heading({ children, sub }: { children: string; sub?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // Fokus na nagłówku nowego kroku: czytnik ekranu od razu czyta pytanie.
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <h1
        ref={ref}
        tabIndex={-1}
        className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] outline-none md:text-5xl md:leading-[1.05] md:tracking-[-0.025em]"
      >
        {children}
      </h1>
      {sub && <p className="text-[15px] leading-relaxed text-tekst-2 md:text-lg">{sub}</p>}
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
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
            className="flex items-center gap-2.5 rounded-2xl bg-white/70 py-2 pl-2 pr-4 text-sm font-semibold text-tekst-2"
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
          3 pytania · ok. 15 sekund · bez logowania
        </p>
      </div>
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
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-3">
        {options.map((option) => {
          const isOn = value === option.key;
          return (
            <motion.button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => onPick(option.key)}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
              className={`flex min-h-[72px] items-center gap-4 rounded-3xl border-2 bg-white p-3 pr-4 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-[0_6px_20px_rgba(16,43,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glebia md:min-h-20 md:p-4 ${
                isOn ? "border-glebia bg-mieta-jasna" : "border-transparent"
              }`}
            >
              <motion.span
                className="block shrink-0"
                animate={{ scale: isOn ? 1.08 : 1, rotate: isOn ? -4 : 0 }}
                transition={SPRING}
              >
                <Image
                  src={`/onboarding/${option.icon}.webp`}
                  alt=""
                  width={64}
                  height={64}
                  className="size-12 md:size-14"
                />
              </motion.span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-bold md:text-lg">{option.label}</span>
                <span className="text-sm text-tekst-2">{option.hint}</span>
              </span>
              <Check on={isOn} />
            </motion.button>
          );
        })}
      </div>
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

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
        on ? "border-glebia bg-glebia" : "border-tekst/15"
      }`}
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
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

      <ul className="grid grid-cols-2 gap-2.5 md:gap-3" aria-label="Zainteresowania">
        {INTERESTS.map((item) => {
          const isOn = picked.includes(item.key);
          return (
            <li key={item.key}>
              <motion.button
                type="button"
                aria-pressed={isOn}
                onClick={() => onToggle(item.key)}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                className={`flex h-full w-full flex-col items-start gap-2 rounded-3xl border-2 bg-white p-3 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:shadow-[0_6px_20px_rgba(16,43,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glebia md:gap-3 md:p-4 ${
                  isOn ? "border-glebia bg-mieta-jasna" : "border-transparent"
                }`}
              >
                <span className="flex w-full items-start justify-between">
                  <motion.span
                    className="block"
                    animate={{ scale: isOn ? 1.08 : 1, rotate: isOn ? -4 : 0 }}
                    transition={SPRING}
                  >
                    <Image
                      src={interestIcon(item.key)}
                      alt=""
                      width={64}
                      height={64}
                      className="size-14 md:size-16"
                    />
                  </motion.span>
                  <Check on={isOn} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-bold leading-tight md:text-lg">{item.label}</span>
                  <span className="text-[13px] leading-snug text-tekst-2 md:text-sm">
                    {item.hint}
                  </span>
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

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

/** Co znajomość miasta zmienia w trasie (planer R1: waga bogactwa miejsca, tło w opowieściach). */
const FAMILIARITY_LINE: Record<string, string> = {
  first_time: "Zaczynam od najważniejszych miejsc i tła",
  know_a_bit: "Mieszam znane miejsca z mniej znanymi",
  local: "Szukam mniej oczywistych miejsc",
};

function Building({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const style = STORY_STYLES.find((item) => item.key === profile.storyStyle);
  // Pamięć czytamy raz: ekran trwa 2–3 s, a w tym czasie nic jej nie zmienia.
  const [remembered] = useState(() => Object.keys(getMemory().places).length);
  const lines = [
    profile.interests.length
      ? `Szukam miejsc: ${profile.interests.map((key) => labelOf(key).toLowerCase()).join(", ")}`
      : "Szukam miejsc z historią na Twojej trasie",
    FAMILIARITY_LINE[profile.familiarity ?? "know_a_bit"] ?? FAMILIARITY_LINE.know_a_bit,
    remembered > 0
      ? "Pomijam to, co już Ci opowiedziałam"
      : style
        ? `Opowiadam: ${style.label.toLowerCase()}`
        : "Dobieram długość opowieści",
    "Sprawdzam tramwaje i autobusy",
  ];

  // Kolejne linie odhaczają się po sobie, a potem sami przechodzimy na mapę. Tapnięcie przycisku skraca czekanie.
  useEffect(() => {
    if (shown > lines.length) return;
    const timer = window.setTimeout(
      () => (shown === lines.length ? onDone() : setShown(shown + 1)),
      shown === lines.length ? 700 : BUILD_LINE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [shown, lines.length, onDone]);

  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>Układam Twoją Warszawę</Heading>
      <ul className="flex flex-col gap-3" aria-live="polite">
        {lines.map((line, i) => {
          const done = i < shown;
          return (
            <motion.li
              key={line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: i <= shown ? 1 : 0.35, y: 0 }}
              transition={{ ...SPRING, delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-3xl bg-white p-4 text-[15px] font-semibold md:text-base"
            >
              {done ? <Check on /> : <Spinner active={i === shown} />}
              <span className="min-w-0 flex-1">{line}</span>
            </motion.li>
          );
        })}
      </ul>
      <div className="mt-auto md:mt-0">
        <PrimaryButton onClick={onDone} className="md:w-auto md:px-12">
          Pokaż mapę
        </PrimaryButton>
      </div>
    </div>
  );
}

function Spinner({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`size-7 shrink-0 rounded-full border-[3px] border-tekst/10 ${
        active ? "animate-spin border-t-glebia motion-reduce:animate-none" : ""
      }`}
    />
  );
}
