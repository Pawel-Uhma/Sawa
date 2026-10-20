import type { NextConfig } from "next";
import { buildVersion } from "./build-version";

const { version, commit } = buildVersion();

const nextConfig: NextConfig = {
  // Wersja w menu Sawy (src/lib/app-version.ts), ta sama co tag wydania z CI
  env: { NEXT_PUBLIC_APP_VERSION: version, NEXT_PUBLIC_APP_COMMIT: commit },
  transpilePackages: ["@sawa/shared"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
