import type { Metadata } from "next";
import { DemoApp } from "@/features/demo";

export const metadata: Metadata = { title: "Demo" };

// Scena: stała pozycja pod 42 Warsaw, trasa układa się sama, jazda ok. 1,5 min.
export default function DemoPage() {
  return <DemoApp scenario="stage" />;
}
