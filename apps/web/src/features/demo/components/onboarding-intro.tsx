"use client";

// Wstęp onboardingu dla kogoś, kto nic o Sawie nie wie (np. jury bez landing page'a):
// skąd imię, po co jest Sawa i jak działa. Fakty o legendzie z docs/pitch, problem z docs/10-prd.md.

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
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
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>Skąd moje imię?</Heading>

      <div className="flex flex-col items-center gap-3 md:items-start">
        <p className="sr-only">Wars plus Sawa to Warszawa.</p>
        <div aria-hidden="true" className="flex w-full items-center gap-2.5 md:gap-3">
          <motion.div {...rise(0)} className="flex-1 rounded-3xl bg-white p-4 md:p-5">
            <p className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">Wars</p>
            <p className="text-sm text-tekst-2">rybak</p>
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
            <p className="text-sm text-tekst-2">syrena, czyli ja</p>
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
        Według legendy rybak Wars i syrena Sawa dali miastu imię. Syrena obiecała też bronić miasta,
        dlatego w herbie Warszawy trzyma miecz i tarczę. Ja jestem tą samą syreną, tylko w
        telefonie.
      </motion.p>

      <div className="mt-auto md:mt-0">
        <PrimaryButton onClick={onNext} className="md:w-auto md:px-12">
          Dalej
        </PrimaryButton>
      </div>
    </div>
  );
}

const KNOWN = ["Dom", "Praca", "Siłownia"];

export function Why({ onNext }: IntroProps) {
  const rise = useRise();
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading sub="Warszawa rośnie dzięki ludziom, którzy przyjechali tu za pracą albo na studia.">
        Mieszkasz tu, ale znasz trzy miejsca?
      </Heading>

      <ul className="flex flex-wrap gap-2" aria-label="Miasto, które znasz">
        {KNOWN.map((place, i) => (
          <motion.li
            key={place}
            {...rise(i)}
            className="flex items-center gap-1.5 rounded-full bg-white py-2 pl-2.5 pr-4 text-[15px] font-bold"
          >
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
            {place}
          </motion.li>
        ))}
        <motion.li
          {...rise(3)}
          className="rounded-full border-2 border-dashed border-koral/60 px-4 py-1.5 text-[15px] font-bold text-koral"
        >
          reszta miasta?
        </motion.li>
      </ul>

      <motion.div {...rise(4)} className="flex flex-col gap-3 rounded-3xl bg-white p-4 md:p-5">
        <p className="text-[15px] leading-relaxed md:text-lg">
          Codziennie jedziesz tramwajem obok kamienic, murali i miejsc, gdzie działa się historia.
          Nikt Ci o nich nie mówi, więc ich nie widzisz.
        </p>
        <p className="text-[15px] font-semibold leading-relaxed text-glebia md:text-lg">
          Sawa zamienia zwykły przejazd w opowieść o mieście, w którym mieszkasz. Żeby było trochę
          bardziej Twoje.
        </p>
      </motion.div>

      <div className="mt-auto md:mt-0">
        <PrimaryButton onClick={onNext} className="md:w-auto md:px-12">
          Jak to działa?
        </PrimaryButton>
      </div>
    </div>
  );
}

const HOW = [
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

export function How({ onNext }: IntroProps) {
  const rise = useRise();
  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-8">
      <Heading>Jak to działa</Heading>

      <ol className="flex flex-col gap-2.5 md:gap-3">
        {HOW.map((item, i) => (
          <motion.li
            key={item.title}
            {...rise(i)}
            className="flex items-center gap-3.5 rounded-3xl bg-white p-3 pr-4 md:gap-4 md:p-4"
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
        Miejsca i fakty biorę z otwartych danych Warszawy (dane.um.warszawa.pl) i OpenStreetMap.
        Opowieść układa z nich model językowy, a czyta ją syntezator mowy.
      </motion.p>

      <div className="mt-auto flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:gap-5">
        <PrimaryButton onClick={onNext} className="md:w-auto md:px-12">
          Dopasujmy trasę do Ciebie
        </PrimaryButton>
        <p className="text-center text-sm text-tekst-3 md:text-left">3 pytania · ok. 15 sekund</p>
      </div>
    </div>
  );
}
