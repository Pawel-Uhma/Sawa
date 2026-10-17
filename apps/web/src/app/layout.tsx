import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
// CSS MapLibre przed naszym, żeby nasze reguły mapy go nadpisywały
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { LANG_INIT_SCRIPT } from "@/features/i18n";
import { THEME_INIT_SCRIPT } from "@/features/theme";
import { Providers } from "./providers";

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
  title: { default: "Sawa · Warszawa za oknem", template: "%s · Sawa" },
  description: "Sawa opowiada o miejscach, które mijasz komunikacją miejską.",
  // Po dodaniu do ekranu głównego działa jak aplikacja, bez paska przeglądarki
  appleWebApp: { capable: true, title: "Sawa", statusBarStyle: "default" },
  // Ikonka w karcie przeglądarki idzie za motywem systemu (iOS ekranu głównego sam przyciemnia apple-icon)
  icons: {
    icon: [
      { url: "/icons/icon-192.png", media: "(prefers-color-scheme: light)" },
      { url: "/icons/icon-192-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Interfejs nie powiększa się palcami; tekst i tak ma co najmniej 11 px, a duże czcionki z systemu działają
  maximumScale: 1,
  userScalable: false,
  // Treść pod wcięciem i paskiem home; marginesy bierzemy z env(safe-area-inset-*)
  viewportFit: "cover",
  // Kolor paska przeglądarki jak tło (--mapa); przy ręcznym wyborze motywu idzie za systemem, nie za wyborem
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF3F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1615" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme ustawia skrypt przed Reactem, więc atrybut różni się od HTML z serwera
    <html
      lang="pl"
      className={`${sans.variable} ${logo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="motyw min-h-full">
        {/* Motyw przed pierwszym malowaniem, bez mignięcia jasnej mapy (features/theme) */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="lang-init" strategy="beforeInteractive">
          {LANG_INIT_SCRIPT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
