import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
// CSS MapLibre przed naszym, żeby nasze reguły mapy go nadpisywały
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-plus",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const logo = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Sawa",
  description: "Sawa opowiada o miejscach, które mijasz komunikacją miejską.",
  // Po dodaniu do ekranu głównego działa jak aplikacja, bez paska przeglądarki
  appleWebApp: { capable: true, title: "Sawa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Treść pod wcięciem i paskiem home; marginesy bierzemy z env(safe-area-inset-*)
  viewportFit: "cover",
  themeColor: "#EEF3F0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
