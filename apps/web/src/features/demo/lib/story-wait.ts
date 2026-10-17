"use client";

import { useWaitMessage } from "@/components/waiting";
import { useT } from "@/features/i18n";
import { voiceOn } from "./story-player";

/**
 * Co mówić, póki opowieść się ładuje: najpierw fakty z bazy, potem tekst od modelu,
 * a z głosem jeszcze nagranie. Po dłuższej chwili uczciwie, że to trwa.
 */
export function useStoryWaitMessage(loading: boolean): string | null {
  const t = useT();
  const voice = voiceOn();
  return useWaitMessage(loading, [
    {
      afterSec: 0,
      text: t("Sawa przegląda, co wie o tym miejscu…", "Sawa is looking up what she knows here…"),
    },
    { afterSec: 4, text: t("Sawa układa opowieść…", "Sawa is putting the story together…") },
    ...(voice
      ? [{ afterSec: 9, text: t("Sawa nagrywa głos…", "Sawa is recording her voice…") }]
      : []),
    {
      afterSec: voice ? 18 : 12,
      text: t("Jeszcze chwila, to dłuższa historia…", "Just a moment, it's a longer story…"),
    },
  ]);
}
