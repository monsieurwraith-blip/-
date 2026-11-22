/**
 * Stages the Windows desktop app in desktop-dist/app:
 *   renderer/  — client bundle (vite.desktop.config.ts), incl. Stockfish WASM and piece SVGs
 *   main.cjs   — Electron main process
 *   icon.png   — window icon
 *   package.json — minimal manifest with no dependencies (everything is bundled)
 * electron-builder and @electron/packager both package this folder.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, "desktop-dist", "app");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

await build({ configFile: join(root, "vite.desktop.config.ts"), logLevel: "warn" });

for (const required of [
  "index.html",
  "stockfish/stockfish-19-lite-single.js",
  "stockfish/stockfish-19-lite-single.wasm",
]) {
  if (!existsSync(join(stage, "renderer", required))) {
    throw new Error(`Desktop build is missing renderer/${required}`);
  }
}

cpSync(join(root, "desktop", "electron", "main.cjs"), join(stage, "main.cjs"));
cpSync(join(root, "desktop", "build", "icon.png"), join(stage, "icon.png"));

writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "chess-studio",
      productName: "CHESS STUDIO",
      version: rootPkg.version ?? "1.0.0",
      description: "CHESS STUDIO — шахматы против Stockfish",
      author: "CHESS STUDIO",
      license: "GPL-3.0-or-later",
      main: "main.cjs",
    },
    null,
    2,
  ),
);

console.log(`Desktop app staged in ${stage}`);
