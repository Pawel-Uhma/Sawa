import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPlayground } from "@/features/map-playground";

export const metadata: Metadata = { title: "Playground mapy · Sawa" };

export default function MapPlaygroundPage() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-mapa" />}>
      <MapPlayground />
    </Suspense>
  );
}
