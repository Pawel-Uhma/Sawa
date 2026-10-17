"use client";

import { useState } from "react";
import { INTERESTS, SIMILAR_INTERESTS } from "../lib/mock-data";
import { Logo } from "./logo";
import { PrimaryButton } from "./primary-button";

const MAX_PICKS = 3;

type OnboardingScreenProps = {
  initial: string[];
  onBack: () => void;
  onDone: (interests: string[]) => void;
};

export function OnboardingScreen({ initial, onBack, onDone }: OnboardingScreenProps) {
  const [picked, setPicked] = useState<string[]>(initial);

  const labelOf = (key: string) => INTERESTS.find((item) => item.key === key)?.label ?? key;

  // Podobne pojawiają się po wyborze pierwszego zainteresowania (PRD, onboarding).
  const lastPick = picked.at(-1);
  const similar = lastPick
    ? (SIMILAR_INTERESTS[lastPick] ?? []).filter((key) => !picked.includes(key))
    : [];

  function toggle(key: string) {
    setPicked((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_PICKS) return current;
      return [...current, key];
    });
  }

  const isFull = picked.length >= MAX_PICKS;

  return (
    <main className="wejdz mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-xl md:px-8">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center rounded-full px-3 text-sm font-semibold text-tekst-2 transition-opacity active:opacity-60"
        >
          Wstecz
        </button>
        <Logo />
      </header>

      <section className="mt-8 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Co Cię interesuje?</h1>
        <p className="text-tekst-2">
          Wybierz do {MAX_PICKS}. Od tego zależy, o czym opowiem po drodze.
        </p>
      </section>

      <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Zainteresowania">
        {INTERESTS.map((item) => {
          const isOn = picked.includes(item.key);
          const isDisabled = !isOn && isFull;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={isOn}
                disabled={isDisabled}
                onClick={() => toggle(item.key)}
                className={`min-h-11 rounded-full border px-4 py-2.5 text-[15px] font-semibold transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] disabled:opacity-40 ${
                  isOn
                    ? "border-glebia bg-glebia text-white"
                    : "border-black/10 bg-white text-tekst"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {similar.length > 0 && (
        <section
          className="wejdz mt-6 rounded-3xl bg-mieta-jasna p-4"
          aria-label="Podobne zainteresowania"
        >
          <p className="text-sm font-semibold text-glebia-ciemna">
            Podobne do: {labelOf(lastPick ?? "")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {similar.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  disabled={isFull}
                  onClick={() => toggle(key)}
                  className="min-h-10 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-glebia-ciemna transition-transform active:scale-[0.97] disabled:opacity-40"
                >
                  + {labelOf(key)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <p className="text-center text-sm text-tekst-3">
          Wybrano {picked.length} z {MAX_PICKS}
        </p>
        <PrimaryButton disabled={picked.length === 0} onClick={() => onDone(picked)}>
          Dalej
        </PrimaryButton>
      </div>
    </main>
  );
}
