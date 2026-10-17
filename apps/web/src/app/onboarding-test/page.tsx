"use client";
// TYMCZASOWE: podgląd onboardingu do testów, usunąć przed commitem.
import { OnboardingFlow } from "@/features/demo/components/onboarding-flow";
import { EMPTY_PROFILE } from "@/features/demo/lib/onboarding";

export default function Page() {
  return <OnboardingFlow initialProfile={EMPTY_PROFILE} onDone={(p) => console.log("[onb] done", JSON.stringify(p))} />;
}
