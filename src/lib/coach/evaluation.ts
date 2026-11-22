/**
 * Move quality from real engine evaluations. Scores are converted to "win %"
 * (Lichess model), so a move is judged by how much it changes the practical
 * chances — not by whether it equals Stockfish's first line.
 */
import type { Color } from "@/lib/chess/types";
import type { EngineScore } from "@/lib/chess/uci";

export type MoveClass =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export const MOVE_CLASSES: readonly MoveClass[] = [
  "brilliant",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

export const MOVE_CLASS_INFO: Record<MoveClass, { en: string; ru: string; symbol: string }> = {
  brilliant: { en: "Brilliant", ru: "Блестящий ход", symbol: "!!" },
  best: { en: "Best", ru: "Лучший ход", symbol: "★" },
  excellent: { en: "Excellent", ru: "Отличный ход", symbol: "!" },
  good: { en: "Good", ru: "Хороший ход", symbol: "✓" },
  inaccuracy: { en: "Inaccuracy", ru: "Неточность", symbol: "?!" },
  mistake: { en: "Mistake", ru: "Ошибка", symbol: "?" },
  blunder: { en: "Blunder", ru: "Грубая ошибка", symbol: "??" },
};

export function isMistakeClass(c: MoveClass): boolean {
  return c === "inaccuracy" || c === "mistake" || c === "blunder";
}

/** Thresholds on the drop of the mover's win % (0–100). */
export const WIN_DROP = { best: 0.8, excellent: 2.5, good: 6, inaccuracy: 6, mistake: 11, blunder: 18 };

const CP_CAP = 1000;

/** Score from White's point of view. UCI scores are from the side to move. */
export function toWhitePov(score: EngineScore, sideToMove: Color): EngineScore {
  return sideToMove === "w" ? score : { kind: score.kind, value: -score.value };
}

/** Centipawns for one side, mates mapped beyond the cap. */
export function povCp(whiteScore: EngineScore, color: Color): number {
  const sign = color === "w" ? 1 : -1;
  if (whiteScore.kind === "mate") {
    const v = whiteScore.value;
    if (v === 0) return 0;
    const mateCp = (CP_CAP + 1000 - Math.min(99, Math.abs(v)) * 5) * Math.sign(v);
    return mateCp * sign;
  }
  return whiteScore.value * sign;
}

/** Win chance (0–100) for `color` given a White-POV score. */
export function winPercent(whiteScore: EngineScore, color: Color): number {
  const cp = Math.max(-CP_CAP, Math.min(CP_CAP, povCp(whiteScore, color)));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export interface ClassifyInput {
  /** Mover's win % before and after the move. */
  winBefore: number;
  winAfter: number;
  /** The move is the engine's first line. */
  isTopMove: boolean;
  /** Gives up material that the opponent can win, yet stays sound. */
  sacrifice: boolean;
}

export function classifyMove({ winBefore, winAfter, isTopMove, sacrifice }: ClassifyInput): MoveClass {
  const drop = Math.max(0, winBefore - winAfter);
  const nearBest = isTopMove || drop < WIN_DROP.best;
  if (nearBest && sacrifice && winAfter >= 45 && winBefore < 92) return "brilliant";
  if (nearBest) return "best";
  if (drop < WIN_DROP.excellent) return "excellent";
  if (drop < WIN_DROP.good) return "good";
  if (drop < WIN_DROP.mistake) return "inaccuracy";
  if (drop < WIN_DROP.blunder) return "mistake";
  return "blunder";
}

/** Per-move accuracy (Lichess formula), 0–100. */
export function moveAccuracy(winDrop: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, winDrop)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

/** Centipawn loss for the mover, capped so mates don't dominate averages. */
export function centipawnLoss(before: EngineScore, after: EngineScore, color: Color): number {
  const clamp = (v: number) => Math.max(-CP_CAP, Math.min(CP_CAP, v));
  return Math.max(0, clamp(povCp(before, color)) - clamp(povCp(after, color)));
}

/** "+1,3", "−0,4", "M3", "−M2" — White's point of view. */
export function formatEval(score: EngineScore | null): string {
  if (!score) return "—";
  if (score.kind === "mate") {
    if (score.value === 0) return "#";
    return `${score.value < 0 ? "−" : ""}M${Math.abs(score.value)}`;
  }
  const pawns = score.value / 100;
  const text = Math.abs(pawns).toFixed(1).replace(".", ",");
  if (Math.abs(pawns) < 0.05) return "0,0";
  return `${pawns > 0 ? "+" : "−"}${text}`;
}

/** Clamped pawns for charts (White POV). */
export function chartPawns(score: EngineScore): number {
  if (score.kind === "mate") return score.value === 0 ? 0 : score.value > 0 ? 10 : -10;
  return Math.max(-10, Math.min(10, score.value / 100));
}
