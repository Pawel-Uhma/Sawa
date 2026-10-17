// Dane onboardingu (docs/ui/onboarding.md). Pytania o znajomość miasta i styl to propozycja R3,
// planer ich jeszcze nie czyta. Grafiki w public/onboarding/ (fal.ai, styl obrazu 32).

export const MAX_INTERESTS = 3;

export const interestIcon = (key: string) => `/onboarding/${key}.webp`;

export type Choice = { key: string; label: string; hint: string; icon: string };

export const FAMILIARITY: Choice[] = [
  {
    key: "first_time",
    label: "Jestem tu pierwszy raz",
    hint: "Zacznę od tego, co najważniejsze",
    icon: "first_time",
  },
  { key: "know_a_bit", label: "Trochę znam", hint: "Pominę oczywistości", icon: "know_a_bit" },
  { key: "local", label: "Mieszkam tu", hint: "Pokażę to, czego nie widać", icon: "local" },
];

export const STORY_STYLES: Choice[] = [
  { key: "fun", label: "Krótko i z humorem", hint: "Jak znajoma z miasta", icon: "style_fun" },
  { key: "deep", label: "Z detalami", hint: "Daty, ludzie, tło", icon: "style_deep" },
  {
    key: "trivia",
    label: "Same ciekawostki",
    hint: "Jedno zdanie, jedno „wow”",
    icon: "style_trivia",
  },
];

export type Profile = {
  familiarity: string | null;
  interests: string[];
  storyStyle: string | null;
};

export const EMPTY_PROFILE: Profile = { familiarity: null, interests: [], storyStyle: null };
