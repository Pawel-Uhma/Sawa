"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useDemoRoute } from "@/features/planner";
import { parseInterestsParam } from "@/lib/interests-param";

// MapLibre needs window and WebGL, so the map renders only in the browser.
const SawaMap = dynamic(() => import("@/features/map").then((mod) => mod.SawaMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-zinc-100" />,
});

export function MapScreen() {
  const searchParams = useSearchParams();
  const interestsParam = searchParams.get("i");
  const interests = useMemo(() => parseInterestsParam(interestsParam), [interestsParam]);
  const route = useDemoRoute();

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SawaMap interests={interests} route={route.data} />
      {route.isError && (
        <p className="absolute inset-x-4 bottom-4 z-10 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700 shadow md:right-auto">
          Trasa chwilowo niedostępna, mapa pokazuje same miejsca.
        </p>
      )}
    </main>
  );
}
