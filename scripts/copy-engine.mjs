// Copies the Stockfish WASM build from node_modules/stockfish into public/stockfish.
// Run: bun run engine:copy (needed after upgrading the `stockfish` package).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "stockfish");
const dest = join(root, "public", "stockfish");
const files = [
  ["bin/stockfish-19-lite-single.js", "stockfish-19-lite-single.js"],
  ["bin/stockfish-19-lite-single.wasm", "stockfish-19-lite-single.wasm"],
  ["Copying.txt", "COPYING.txt"],
];

mkdirSync(dest, { recursive: true });
for (const [from, to] of files) {
  copyFileSync(join(src, from), join(dest, to));
  console.log(`copied ${from} -> public/stockfish/${to}`);
}
