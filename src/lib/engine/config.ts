/**
 * Stockfish 19 "lite, single-threaded" WASM build from the `stockfish` npm package
 * (nmrugg/stockfish.js). The files are copied into /public/stockfish by
 * `bun run engine:copy`; the worker script loads the .wasm sitting next to it.
 * The single-threaded build needs no cross-origin isolation (no SharedArrayBuffer),
 * so the same files run unchanged inside the Windows desktop app (served from app://).
 */
export const STOCKFISH_WORKER_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;
export const STOCKFISH_BUILD_LABEL = "Stockfish 19 · lite WASM";
