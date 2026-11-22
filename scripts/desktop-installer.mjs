/**
 * Builds "Chess Studio Setup <version>.exe" with NSIS from release/win-unpacked.
 * Works on Linux/macOS too (no Wine needed), unlike electron-builder's NSIS target.
 * makensis is taken from $MAKENSIS, the PATH, or electron-builder's download cache.
 *
 * Usage: npm run desktop:installer   (runs electron-builder --win dir first)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version ?? "1.0.0";
const source = join(root, "release", "win-unpacked");
if (!existsSync(join(source, "ProChess.exe"))) {
  throw new Error("release/win-unpacked is missing — run `electron-builder --win dir` first.");
}

function findMakensis() {
  if (process.env.MAKENSIS) return { bin: process.env.MAKENSIS, nsisDir: process.env.NSISDIR };
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const bin = execFileSync(cmd, ["makensis"], { encoding: "utf8" }).split(/\r?\n/)[0];
    if (bin) return { bin, nsisDir: process.env.NSISDIR };
  } catch {
    // not on PATH
  }
  const cacheRoots = [
    process.env.ELECTRON_BUILDER_CACHE,
    join(homedir(), ".cache", "electron-builder"),
    join(process.env.LOCALAPPDATA ?? "", "electron-builder", "Cache"),
    join(homedir(), "Library", "Caches", "electron-builder"),
  ].filter(Boolean);
  for (const cache of cacheRoots) {
    const base = join(cache, "nsis-3.0.4.1");
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      const nsisDir = join(base, dir);
      const sub =
        process.platform === "win32"
          ? "makensis.exe"
          : join(process.platform === "darwin" ? "mac" : "linux", "makensis");
      if (existsSync(join(nsisDir, sub))) return { bin: join(nsisDir, sub), nsisDir };
    }
  }
  throw new Error(
    "makensis not found. Install NSIS or run `npm run desktop:dist` once to download it.",
  );
}

const { bin, nsisDir } = findMakensis();
const out = join(root, "release", `ProChess Setup ${version}.exe`);
execFileSync(
  bin,
  [
    "-INPUTCHARSET",
    "UTF8",
    `-DVERSION=${version}`,
    `-DSOURCE_DIR=${source}`,
    `-DOUT_FILE=${out}`,
    `-DICON_FILE=${join(root, "desktop", "build", "icon.ico")}`,
    join(root, "desktop", "installer", "chess-studio.nsi"),
  ],
  { stdio: "inherit", env: { ...process.env, ...(nsisDir ? { NSISDIR: nsisDir } : {}) } },
);
console.log(`Installer written to ${out}`);
