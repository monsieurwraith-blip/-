import { Chess } from "chess.js";

/** How long Stockfish analyses before each of its moves. Chosen by the user, saved in settings. */
export const THINK_TIME_PRESETS = [
  { id: "1", seconds: 1, label: "1 с", description: "Мгновенная игра" },
  { id: "2", seconds: 2, label: "2 с", description: "Быстрый режим" },
  { id: "3", seconds: 3, label: "3 с", description: "Стандартный режим" },
  { id: "5", seconds: 5, label: "5 с", description: "Вдумчивый режим" },
  { id: "10", seconds: 10, label: "10 с", description: "Глубокий анализ" },
  { id: "15", seconds: 15, label: "15 с", description: "Экспертный режим" },
  { id: "30", seconds: 30, label: "30 с", description: "Максимальное обдумывание" },
] as const;

export type ThinkTimePresetId = (typeof THINK_TIME_PRESETS)[number]["id"];
export type ThinkTimeId = "auto" | ThinkTimePresetId | "custom";

export const AUTO_THINK_MIN_MS = 3000;
export const AUTO_THINK_MAX_MS = 7000;
export const DEFAULT_THINK_TIME: ThinkTimeId = "auto";
export const CUSTOM_THINK_MIN_S = 0.5;
export const CUSTOM_THINK_MAX_S = 120;
export const DEFAULT_CUSTOM_THINK_S = 7;

export function isThinkTimeId(value: unknown): value is ThinkTimeId {
  return value === "auto" || value === "custom" || THINK_TIME_PRESETS.some((p) => p.id === value);
}

/** Clamps a user-entered number of seconds to the allowed range (rounded to 0.5 s). */
export function clampCustomSeconds(value: unknown, fallback = DEFAULT_CUSTOM_THINK_S): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n * 2) / 2;
  return Math.max(CUSTOM_THINK_MIN_S, Math.min(CUSTOM_THINK_MAX_S, rounded));
}

function fenHash(fen: string): number {
  let h = 2166136261;
  for (let i = 0; i < fen.length; i++) {
    h ^= fen.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Estimates a natural 3–7 second Stockfish think budget from position complexity:
 * sharp tactical positions with many legal moves, checks, captures, and heavy pieces
 * receive up to ~7 s, while simple/forced positions finish closer to 3–3.8 s.
 */
export function estimatePositionComplexityThinkMs(fen?: string): number {
  if (!fen) return 4200;
  try {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length <= 1) return AUTO_THINK_MIN_MS;

    let heavyPieces = 0;
    let queens = 0;
    for (const row of chess.board()) {
      for (const piece of row) {
        if (!piece || piece.type === "p" || piece.type === "k") continue;
        heavyPieces += 1;
        if (piece.type === "q") queens += 1;
      }
    }

    let tacticalMoves = 0;
    for (const m of legalMoves) {
      if (m.captured || m.promotion || m.san.includes("+") || m.san.includes("#")) {
        tacticalMoves += 1;
      }
    }

    const mobilityFactor = Math.min(1, legalMoves.length / 44);
    const tacticalFactor = Math.min(1, tacticalMoves / 10);
    const materialFactor = Math.min(1, (heavyPieces + queens * 1.5) / 14);
    const checkBonus = chess.inCheck() ? 0.18 : 0;

    const complexity = Math.min(
      1,
      mobilityFactor * 0.42 + tacticalFactor * 0.34 + materialFactor * 0.24 + checkBonus,
    );

    // Subtle organic variation (-250..+350 ms) derived deterministically from FEN.
    const jitter = (fenHash(fen) % 601) - 250;
    const rawMs = AUTO_THINK_MIN_MS + complexity * (AUTO_THINK_MAX_MS - AUTO_THINK_MIN_MS) + jitter;

    return Math.round(Math.max(AUTO_THINK_MIN_MS, Math.min(AUTO_THINK_MAX_MS, rawMs)) / 50) * 50;
  } catch {
    return 4200;
  }
}

/** Think time in milliseconds for the chosen option. */
export function thinkTimeMs(id: ThinkTimeId, customSeconds: number, fen?: string): number {
  if (id === "auto") return estimatePositionComplexityThinkMs(fen);
  if (id === "custom") return Math.round(clampCustomSeconds(customSeconds) * 1000);
  const preset = THINK_TIME_PRESETS.find((p) => p.id === id);
  return (preset?.seconds ?? 4) * 1000;
}

export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  return `${s.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} с`;
}
