"use client";

// Wstęp onboardingu dla kogoś, kto nic o Sawie nie wie (np. jury bez landing page'a):
// skąd imię, po co jest Sawa i jak działa. Fakty o legendzie z docs/pitch, problem z docs/10-prd.md.

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { type Lang, useLang, useT } from "@/features/i18n";
import { SPRING } from "../lib/device";
import { Heading } from "./onboarding-heading";
import { PrimaryButton } from "./primary-button";

type IntroProps = { onNext: () => void };

/** Kolejne elementy wchodzą po sobie, przy ograniczonym ruchu tylko się pojawiają. */
function useRise() {
  const reduce = useReducedMotion();
  return (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING, delay: 0.08 + i * 0.09 },
  });
}

export function Legend({ onNext }: IntroProps) {
  const rise = useRise();
  const t = useT();
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>{t("Skąd moje imię?", "Where does my name come from?")}</Heading>

      <div className="flex flex-col items-center gap-3 md:items-start">
        <p className="sr-only">
          {t("Wars plus Sawa to Warszawa.", "Wars plus Sawa makes Warszawa.")}
        </p>
        <div aria-hidden="true" className="flex w-full items-center gap-2.5 md:gap-3">
          <motion.div {...rise(0)} className="flex-1 rounded-3xl bg-powierzchnia p-4 md:p-5">
            <p className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">Wars</p>
            <p className="text-sm text-tekst-2">{t("rybak", "a fisherman")}</p>
          </motion.div>
          <motion.span {...rise(1)} className="text-2xl font-extrabold text-tekst-3">
            +
          </motion.span>
          <motion.div
            {...rise(2)}
            className="flex-1 rounded-3xl border-2 border-glebia bg-mieta-jasna p-4 md:p-5"
          >
            <p className="text-2xl font-extrabold tracking-[-0.02em] text-glebia md:text-3xl">
              Sawa
            </p>
            <p className="text-sm text-tekst-2">{t("syrena, czyli ja", "a mermaid, that's me")}</p>
          </motion.div>
        </div>
        <motion.p
          {...rise(3)}
          aria-hidden="true"
          className="text-[40px] font-extrabold leading-none tracking-[-0.03em] md:text-6xl"
        >
          <span className="text-tekst-3">= </span>
          Warszawa
        </motion.p>
      </div>

      <motion.p {...rise(4)} className="text-[15px] leading-relaxed text-tekst-2 md:text-lg">
        {t(
          "Według legendy rybak Wars i syrena Sawa dali miastu imię. Syrena obiecała też bronić miasta, dlatego w herbie Warszawy trzyma miecz i tarczę. Ja jestem tą samą syreną, tylko w telefonie.",
          "Legend has it that Wars the fisherman and Sawa the mermaid gave the city its name. The mermaid also promised to defend the city, which is why she holds a sword and shield in the Warsaw coat of arms. I'm that same mermaid, just in your phone.",
        )}
      </motion.p>

      <div className="mt-auto md:mt-0">
        <PrimaryButton onClick={onNext} className="md:w-auto md:px-12">
          {t("Dalej", "Next")}
        </PrimaryButton>
      </div>
    </div>
  );
}

type WhyCopy = {
  title: string;
  sub?: string;
  /** Co już znasz (odhaczone) i czego jeszcze nie (koralowe, przerywane). */
  chips: { label: string; known: boolean }[];
  problem: string;
  promise: string;
};

// Ten sam ekran „co Ci da Sawa”, ale mówi do osoby, którą właśnie poznała (odpowiedź o znajomości miasta).
const WHY_PL: Record<string, WhyCopy> = {
  first_time: {
    title: "Pierwszy raz w Warszawie? Wsiadaj do tramwaju.",
    sub: "Bez planu zwiedzania i bez przewodnika w ręku.",
    chips: [
      { label: "Gdzie jestem?", known: false },
      { label: "Co tu się wydarzyło?", known: false },
      { label: "Co dalej?", known: false },
    ],
    problem: "Z okna tramwaju łatwo zobaczyć miasto, ale trudno zrozumieć, co się właśnie mija.",
    promise:
      "Sawa opowiada o najważniejszych miejscach na trasie i o tym, co się w nich wydarzyło. Najpierw tło, potem szczegóły.",
  },
  know_a_bit: {
    title: "Znasz kilka miejsc. Reszta czeka za oknem.",
    sub: "Miejsca z przewodników to dopiero początek.",
    chips: [
      { label: "Stare Miasto", known: true },
      { label: "Pałac Kultury", known: true },
      { label: "ulice pomiędzy?", known: false },
    ],
    problem:
      "Między znanymi miejscami jest całe miasto: kamienice, murale, ślady fabryk i ludzi, którzy tu żyli.",
    promise:
      "Sawa przeplata to, co znasz, z tym, o czym nikt Ci nie powiedział. Opowiada w drodze, więc niczego nie musisz szukać.",
  },
  local: {
    title: "Mieszkasz tu, ale znasz trzy miejsca?",
    sub: "Warszawa rośnie dzięki ludziom, którzy przyjechali tu za pracą albo na studia.",
    chips: [
      { label: "Dom", known: true },
      { label: "Praca", known: true },
      { label: "Siłownia", known: true },
      { label: "reszta miasta?", known: false },
    ],
    problem:
      "Codziennie jedziesz tramwajem obok kamienic, murali i miejsc, gdzie działa się historia. Nikt Ci o nich nie mówi, więc ich nie widzisz.",
    promise:
      "Sawa zamienia zwykły przejazd w opowieść o mieście, w którym mieszkasz. Żeby było trochę bardziej Twoje.",
  },
};

const WHY_EN: Record<string, WhyCopy> = {
  first_time: {
    title: "First time in Warsaw? Hop on a tram.",
    sub: "No sightseeing plan, no guidebook in hand.",
    chips: [
      { label: "Where am I?", known: false },
      { label: "What happened here?", known: false },
      { label: "What's next?", known: false },
    ],
    problem:
      "From a tram window it's easy to see the city, but hard to understand what you're passing.",
    promise:
      "Sawa tells you about the key places on your route and what happened there. Background first, then the details.",
  },
  know_a_bit: {
    title: "You know a few places. The rest is outside the window.",
    sub: "The guidebook sights are just the beginning.",
    chips: [
      { label: "Old Town", known: true },
      { label: "Palace of Culture", known: true },
      { label: "the streets between?", known: false },
    ],
    problem:
      "Between the famous places lies a whole city: tenements, murals, traces of factories and of the people who lived here.",
    promise:
      "Sawa mixes what you know with what nobody has told you. She talks on the way, so there's nothing to look for.",
  },
  local: {
    title: "You live here, but know three places?",
    sub: "Warsaw grows thanks to people who came here for work or to study.",
    chips: [
      { label: "Home", known: true },
      { label: "Work", known: true },
      { label: "Gym", known: true },
      { label: "the rest of the city?", known: false },
    ],
    problem:
      "Every day your tram passes tenements, murals and places where history happened. Nobody tells you about them, so you don't see them.",
    promise:
      "Sawa turns an ordinary ride into a story about the city you live in. To make it a little more yours.",
  },
};

const WHY: Record<Lang, Record<string, WhyCopy>> = { pl: WHY_PL, en: WHY_EN };

/** Gdy ktoś pominął pytanie o znajomość miasta. */
const WHY_DEFAULT_EN: WhyCopy = {
  title: "You pass history every day.",
  chips: [],
  problem:
    "Outside the tram window there are tenements, murals and places where history happened. Nobody talks about them, so they go unseen.",
  promise: "Sawa turns an ordinary ride into a story about the city you're passing.",
};

const WHY_DEFAULT_PL: WhyCopy = {
  title: "Mijasz historię każdego dnia.",
  chips: [],
  problem:
    "Za oknem tramwaju są kamienice, murale i miejsca, gdzie działa się historia. Nikt o nich nie mówi, więc ich nie widać.",
  promise: "Sawa zamienia zwykły przejazd w opowieść o mieście, które mijasz.",
};

export function Why({ familiarity, onNext }: IntroProps & { familiarity: string | null }) {
  const rise = useRise();
  const t = useT();
  const lang = useLang();
  const copy = WHY[lang][familiarity ?? ""] ?? t(WHY_DEFAULT_PL, WHY_DEFAULT_EN);
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading sub={copy.sub}>{copy.title}</Heading>

      {copy.chips.length > 0 && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label={t("Co znasz, a czego jeszcze nie", "What you know and what you don't yet")}
        >
          {copy.chips.map((chip, i) => (
            <motion.li
              key={chip.label}
              {...rise(i)}
              className={
                chip.known
                  ? "flex items-center gap-1.5 rounded-full bg-powierzchnia py-2 pl-2.5 pr-4 text-[15px] font-bold"
                  : "rounded-full border-2 border-dashed border-koral/60 px-4 py-1.5 text-[15px] font-bold text-koral"
              }
            >
              {chip.known && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-glebia"
                  />
                </svg>
              )}
              {chip.label}
            </motion.li>
          ))}
        </ul>
      )}

      <motion.div
        {...rise(copy.chips.length)}
        className="flex flex-col gap-3 rounded-3xl bg-powierzchnia p-4 md:p-5"
      >
        <p className="text-[15px] leading-relaxed md:text-lg">{copy.problem}</p>
        <p className="text-[15px] font-semibold leading-relaxed text-glebia md:text-lg">
          {copy.promise}
        </p>
      </motion.div>

      <div className="mt-auto md:mt-0">
        <PrimaryButton onClick={onNext} className="md:w-auto md:px-12">
          {t("Jak to działa?", "How does it work?")}
        </PrimaryButton>
      </div>
    </div>
  );
}

const HOW_PL = [
  {
    icon: "/onboarding/know_a_bit.webp",
    title: "Mówisz, ile masz czasu",
    text: "Od kilku minut do 4 godzin. Wracasz w to samo miejsce albo jedziesz do celu.",
  },
  {
    icon: "/onboarding/tram.webp",
    title: "Układam przejazd",
    text: "Tramwajami i autobusami z rozkładu ZTM, z przesiadkami. Nie musisz wysiadać.",
  },
  {
    icon: "/onboarding/sawa-sekret.webp",
    title: "Opowiadam, co mijasz",
    text: "Na głos, jak podcast. Każda historia trwa mniej więcej tyle, ile jazda do następnego miejsca.",
  },
];

const HOW_EN: typeof HOW_PL = [
  {
    icon: "/onboarding/know_a_bit.webp",
    title: "You tell me how much time you have",
    text: "From a few minutes to 4 hours. Come back to the same spot or ride to a destination.",
  },
  {
    icon: "/onboarding/tram.webp",
    title: "I plan the ride",
    text: "Trams and buses from the ZTM timetable, with changes. You don't have to get off.",
  },
  {
    icon: "/onboarding/sawa-sekret.webp",
    title: "I tell you about what you pass",
    text: "Out loud, like a podcast. Each story lasts about as long as the ride to the next place.",
  },
];

export function How({ onNext }: IntroProps) {
  const rise = useRise();
  const t = useT();
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>{t("Jak to działa", "How it works")}</Heading>

      <ol className="flex flex-col gap-2.5 md:gap-3">
        {t(HOW_PL, HOW_EN).map((item, i) => (
          <motion.li
            key={item.title}
            {...rise(i)}
            className="flex items-center gap-3.5 rounded-3xl bg-powierzchnia p-3 pr-4 md:gap-4 md:p-4"
          >
            <span className="relative shrink-0">
              <Image src={item.icon} alt="" width={64} height={64} className="size-12 md:size-14" />
              <span className="absolute -left-1 -top-1 flex size-6 items-center justify-center rounded-full bg-glebia text-xs font-bold text-white tabular-nums">
                {i + 1}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-bold md:text-lg">{item.title}</span>
              <span className="text-sm leading-snug text-tekst-2">{item.text}</span>
            </span>
          </motion.li>
        ))}
      </ol>

      <motion.p {...rise(3)} className="text-sm leading-relaxed text-tekst-3">
        {t(
          "Miejsca i fakty biorę z otwartych danych Warszawy (dane.um.warszawa.pl) i OpenStreetMap. Opowieść układa z nich model językowy, a czyta ją syntezator mowy.",
          "I take places and facts from Warsaw's open data (dane.um.warszawa.pl) and OpenStreetMap. A language model turns them into a story, and a speech synthesiser reads it out.",
        )}
      </motion.p>

      <div className="mt-auto flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:gap-5">
        <PrimaryButton onClick={onNext} className="md:w-auto md:shrink-0 md:px-10">
          {t("Wybierzmy, o czym opowiem", "Let's pick what I'll talk about")}
        </PrimaryButton>
        <p className="text-center text-sm text-tekst-3 md:whitespace-nowrap md:text-left">
          {t("jeszcze 2 pytania", "2 more questions")}
        </p>
      </div>
    </div>
  );
}
