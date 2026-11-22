/**
 * Build of the desktop (Electron) renderer: a plain client-only bundle of the same
 * screens, written into the staged Electron app. The web app keeps using vite.config.ts.
 */
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: root("./desktop/renderer"),
  base: "/",
  publicDir: root("./public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": root("./src") } },
  build: {
    outDir: root("./desktop-dist/app/renderer"),
    emptyOutDir: true,
    target: "chrome130",
    chunkSizeWarningLimit: 2000,
  },
});
