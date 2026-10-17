import type { MetadataRoute } from "next";

// Manifest PWA: po dodaniu do ekranu głównego Sawa otwiera się pełnoekranowo, z własną ikoną
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sawa",
    short_name: "Sawa",
    description: "Sawa opowiada o miejscach, które mijasz komunikacją miejską.",
    lang: "pl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EEF3F0",
    theme_color: "#EEF3F0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
