"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/features/i18n";
import { haptic, SPRING } from "../lib/device";
import { AUDIENCES, FAMILIARITY, type Profile, STORY_STYLES } from "../lib/onboarding";
import { PrimaryButton } from "./primary-button";
import { ChoiceList, InterestPicker } from "./profile-choices";

// Edycja jednego pola profilu z menu albo z panelu tras. Modal nie uruchamia onboardingu:
// zmienia tylko wskazane pole i zapisuje je, a reszta profilu zostaje taka, jaka była.

export type ProfileStep = "familiarity" | "interests" | "style" | "audience";

const TITLES: Record<ProfileStep, string> = {
  interests: "Zainteresowania",
  familiarity: "Znajomość miasta",
  style: "Styl opowieści",
  audience: "Kto słucha",
};

const HINTS: Record<ProfileStep, string> = {
  interests: "Od tego zależy, które miejsca wybiorę i o czym opowiem.",
  familiarity: "Od tego zależy, czy na trasie będą znane miejsca, czy mniej oczywiste.",
  style: "Jak długo i z jakim szczegółem opowiadam.",
  audience: "Dziecku opowiadam prościej i krócej, a o wojnie delikatnie.",
};

const TITLES_EN: Record<ProfileStep, string> = {
  interests: "Interests",
  familiarity: "Knowing the city",
  style: "Story style",
  audience: "Who's listening",
};

const HINTS_EN: Record<ProfileStep, string> = {
  interests: "This decides which places I pick and what I talk about.",
  familiarity: "This decides whether your route has famous places or less obvious ones.",
  style: "How long and how detailed my stories are.",
  audience: "For a child I keep it simpler and shorter, and gentle about the war.",
};

type ProfileModalProps = {
  /** Które pole edytujemy; null, gdy modal jest zamknięty. */
  step: ProfileStep | null;
  profile: Profile;
  onSave: (profile: Profile) => void;
  onClose: () => void;
};

export function ProfileModal({ step, profile, onSave, onClose }: ProfileModalProps) {
  return (
    <AnimatePresence>
      {step && (
        <ProfileDialog key={step} step={step} profile={profile} onSave={onSave} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

type ProfileDialogProps = Required<Omit<ProfileModalProps, "step">> & { step: ProfileStep };

function ProfileDialog({ step, profile, onSave, onClose }: ProfileDialogProps) {
  const reduce = useReducedMotion();
  const t = useT();
  const titles = t(TITLES, TITLES_EN);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Zmiany trzymamy w szkicu, dopiero „Zapisz” wpisuje je do profilu. Anulowanie niczego nie rusza.
  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = step !== "interests" || draft.interests.length > 0;

  function toggleInterest(key: string) {
    haptic();
    setDraft((current) => ({
      ...current,
      interests: current.interests.includes(key)
        ? current.interests.filter((item) => item !== key)
        : [...current.interests, key],
    }));
  }

  function pick(field: "familiarity" | "storyStyle" | "audience", key: string) {
    haptic();
    setDraft((current) => ({ ...current, [field]: key }));
  }

  function save() {
    if (!canSave) return;
    haptic();
    onSave(draft);
  }

  const fade = { opacity: 0 };
  const rise = reduce ? fade : { opacity: 0, y: 40 };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-2 md:items-center md:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[#102b2a]/35"
        initial={fade}
        animate={{ opacity: 1 }}
        exit={fade}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={rise}
        animate={{ opacity: 1, y: 0 }}
        exit={rise}
        transition={SPRING}
        className="karta relative flex max-h-[85dvh] w-full max-w-md flex-col gap-5 rounded-[34px] bg-powierzchnia! p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none md:p-6"
      >
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]"
            >
              {titles[step]}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-tekst-2">
              {t(HINTS, HINTS_EN)[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Zamknij", "Close")}
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-tekst-2 transition-[background-color,transform] duration-100 hover:bg-tlo-2 active:scale-90"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {step === "interests" && (
            <InterestPicker picked={draft.interests} onToggle={toggleInterest} />
          )}
          {step === "familiarity" && (
            <ChoiceList
              label={titles.familiarity}
              options={FAMILIARITY}
              value={draft.familiarity}
              onPick={(key) => pick("familiarity", key)}
            />
          )}
          {step === "style" && (
            <ChoiceList
              label={titles.style}
              options={STORY_STYLES}
              value={draft.storyStyle}
              onPick={(key) => pick("storyStyle", key)}
            />
          )}
          {step === "audience" && (
            <ChoiceList
              label={titles.audience}
              options={AUDIENCES}
              value={draft.audience}
              onPick={(key) => pick("audience", key)}
            />
          )}
        </div>

        <PrimaryButton onClick={save} disabled={!canSave}>
          {canSave ? t("Zapisz", "Save") : t("Wybierz co najmniej jedno", "Pick at least one")}
        </PrimaryButton>
      </motion.div>
    </div>
  );
}
