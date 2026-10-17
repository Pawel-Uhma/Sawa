import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same alias as tsconfig "paths", so tests can import features through their index.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
