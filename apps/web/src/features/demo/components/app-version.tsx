"use client";

import { HealthSchema } from "@sawa/shared";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/features/i18n";
import { API_TIMEOUT_MS, api } from "@/lib/api";
import { APP_COMMIT, APP_VERSION } from "@/lib/app-version";

/** Wersja API (`GET /health`): krótki commit z Railway, „dev” lokalnie. */
function useApiVersion(): string | null {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await api.health.$get(undefined, {
        init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) },
      });
      if (!res.ok) throw new Error(`GET /health: ${res.status}`);
      return HealthSchema.parse(await res.json());
    },
    staleTime: 60_000,
  });
  return health.data?.version ?? null;
}

/**
 * Stopka menu Sawy: wersja aplikacji (nazwa wydania z CI, np. „2026.10.20-0903”) z commitem i
 * wersja API, żeby przy zgłoszeniu było wiadomo, co działało, i że web i API się zgadzają.
 */
export function AppVersion() {
  const t = useT();
  const apiVersion = useApiVersion();
  const web = [APP_VERSION, APP_COMMIT].filter(Boolean).join(" · ");
  return (
    <p className="select-text px-4 text-center text-[11.5px] leading-relaxed text-tekst-3">
      {t("Wersja", "Version")} {web}
      {apiVersion && (
        <>
          <br />
          API {apiVersion}
        </>
      )}
    </p>
  );
}
