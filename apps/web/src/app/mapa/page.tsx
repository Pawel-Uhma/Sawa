import type { Metadata } from "next";
import { Suspense } from "react";
import { MapScreen } from "./map-screen";

export const metadata: Metadata = { title: "Mapa · Sawa" };

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-zinc-100" />}>
      <MapScreen />
    </Suspense>
  );
}
