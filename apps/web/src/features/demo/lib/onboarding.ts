// Dane onboardingu (docs/ui/onboarding.md). Znajomość miasta wybiera trasy i tło opowieści,
// styl ton i długość (planer R1 i /v1/stories). Grafiki w public/onboarding/ (fal.ai, styl obrazu 32).

import { type Interest, interestsOfTags } from "@sawa/shared";

/** `en` is the English version of label and hint (features/i18n). */
export type Choice = {
  key: string;
  label: string;
  hint: string;
  icon: string;
  en: { label: string; hint: string };
};

/**
 * Cztery kategorie, które zna planer i opowieści (decyzja 17.10, R1 #25). Podpowiedzi mówią,
 * co w nich jest według danych (485 miejsc): sport i przyroda mają mało faktów, więc krótko.
 */
export const INTERESTS: (Choice & { key: Interest })[] = [
  {
    key: "historical",
    label: "Historia",
    hint: "Powstanie, kamienice, fabryki, ludzie",
    icon: "war_uprising",
    en: { label: "History", hint: "The Uprising, tenements, factories, people" },
  },
  {
    key: "cultural",
    label: "Kultura",
    hint: "Murale, świątynie, życie codzienne",
    icon: "street_art",
    en: { label: "Culture", hint: "Murals, churches, everyday life" },
  },
  {
    key: "sports",
    label: "Sport",
    hint: "Boiska i obiekty, krótko",
    icon: "sport",
    en: { label: "Sport", hint: "Pitches and venues, briefly" },
  },
  {
    key: "nature",
    label: "Przyroda",
    hint: "Parki i skwery, krótko",
    icon: "nature",
    en: { label: "Nature", hint: "Parks and squares, briefly" },
  },
];

export const interestIcon = (key: string) =>
  `/onboarding/${INTERESTS.find((item) => item.key === key)?.icon ?? key}.webp`;

export const FAMILIARITY: Choice[] = [
  {
    key: "first_time",
    label: "Jestem tu pierwszy raz",
    hint: "Najważniejsze miejsca i tło wydarzeń",
    icon: "first_time",
    en: { label: "It's my first time here", hint: "The key places and the story behind them" },
  },
  {
    key: "know_a_bit",
    label: "Trochę znam",
    hint: "Znane miejsca na przemian z mniej znanymi",
    icon: "know_a_bit",
    en: { label: "I know it a bit", hint: "Famous places mixed with lesser-known ones" },
  },
  {
    key: "local",
    label: "Mieszkam tu",
    hint: "Więcej mniej oczywistych miejsc",
    icon: "local",
    en: { label: "I live here", hint: "More of the less obvious places" },
  },
];

export const STORY_STYLES: Choice[] = [
  {
    key: "fun",
    label: "Krótko i z humorem",
    hint: "Jak znajoma z miasta",
    icon: "style_fun",
    en: { label: "Short and funny", hint: "Like a friend who lives in town" },
  },
  {
    key: "deep",
    label: "Z detalami",
    hint: "Daty, ludzie, tło. Rzadziej, ale dłużej",
    icon: "style_deep",
    en: { label: "In detail", hint: "Dates, people, background. Less often, but longer" },
  },
  {
    key: "trivia",
    label: "Same ciekawostki",
    hint: "Jedno zdanie, jedno „wow”, częściej",
    icon: "style_trivia",
    en: { label: "Just fun facts", hint: "One sentence, one “wow”, more often" },
  },
];

/** Kto słucha (#65). Dziecku Sawa opowiada prościej i krócej, niezależnie od stylu. */
export const AUDIENCES: Choice[] = [
  {
    key: "adult",
    label: "Dorośli",
    hint: "Opowiadam jak znajoma przy kawie",
    icon: "everyday_life",
    en: { label: "Adults", hint: "I talk like a friend over coffee" },
  },
  {
    key: "kids",
    label: "Jadę z dzieckiem",
    hint: "Prościej, krócej i z zagadką na koniec, dla 6–12 lat",
    icon: "sawa-radosc",
    en: {
      label: "With a child",
      hint: "Simpler, shorter, with a riddle at the end, for ages 6–12",
    },
  },
];

export type Profile = {
  familiarity: string | null;
  interests: string[];
  storyStyle: string | null;
  audience: string | null;
};

export const EMPTY_PROFILE: Profile = {
  familiarity: null,
  interests: [],
  storyStyle: null,
  audience: null,
};

const PROFILE_KEY = "sawa.profile.v1";

/** Odpowiedzi z poprzedniej wizyty: kto wraca, od razu widzi mapę. */
export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (!Array.isArray(parsed.interests) || parsed.interests.length === 0) return null;
    // Starsze profile trzymały szczegółowe tagi (np. `jewish_warsaw`): zamieniamy je na kategorie.
    const interests = interestsOfTags(
      parsed.interests.filter((key): key is string => typeof key === "string"),
    );
    if (interests.length === 0) return null;
    return {
      familiarity: parsed.familiarity ?? null,
      interests,
      storyStyle: parsed.storyStyle ?? null,
      audience: parsed.audience ?? null,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile | null) {
  try {
    if (profile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Bez localStorage onboarding po prostu wróci przy następnej wizycie.
  }
}
