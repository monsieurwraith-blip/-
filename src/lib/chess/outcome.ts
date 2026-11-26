import type { Chess } from "chess.js";

import { opposite, type Color } from "./types";

export type GameOutcome =
  | { type: "checkmate"; winner: Color }
  | { type: "timeout"; winner: Color }
  | { type: "resign"; winner: Color }
  | { type: "timeout-draw"; flagged: Color }
  | { type: "stalemate" }
  | { type: "insufficient-material" }
  | { type: "threefold-repetition" }
  | { type: "fifty-move-rule" }
  | { type: "agreement" };

/** Endings that follow from the position itself (everything chess.js can detect). */
export function detectBoardOutcome(chess: Chess): GameOutcome | null {
  if (chess.isCheckmate()) return { type: "checkmate", winner: opposite(chess.turn()) };
  if (chess.isStalemate()) return { type: "stalemate" };
  if (chess.isInsufficientMaterial()) return { type: "insufficient-material" };
  if (chess.isThreefoldRepetition()) return { type: "threefold-repetition" };
  if (chess.isDrawByFiftyMoves()) return { type: "fifty-move-rule" };
  return null;
}

/**
 * Whether `color` still has material that could ever deliver mate.
 * A lone king, or king + a single bishop/knight, cannot.
 */
export function hasMatingMaterial(chess: Chess, color: Color): boolean {
  const pieces = chess
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null && p.color === color && p.type !== "k");
  if (pieces.length === 0) return false;
  if (pieces.length === 1) {
    const only = pieces[0];
    if (only && (only.type === "b" || only.type === "n")) return false;
  }
  return true;
}

/** Flag fall loses, unless the opponent has no mating material — then it is a draw. */
export function resolveTimeout(chess: Chess, flagged: Color): GameOutcome {
  const winner = opposite(flagged);
  return hasMatingMaterial(chess, winner)
    ? { type: "timeout", winner }
    : { type: "timeout-draw", flagged };
}

export function outcomeWinner(outcome: GameOutcome): Color | null {
  switch (outcome.type) {
    case "checkmate":
    case "timeout":
    case "resign":
      return outcome.winner;
    default:
      return null;
  }
}

export function outcomeScore(outcome: GameOutcome): "1-0" | "0-1" | "½-½" {
  const winner = outcomeWinner(outcome);
  if (winner === "w") return "1-0";
  if (winner === "b") return "0-1";
  return "½-½";
}

export function outcomeReason(outcome: GameOutcome): string {
  switch (outcome.type) {
    case "checkmate":
      return outcome.winner === "w" ? "Мат — белые победили" : "Мат — чёрные победили";
    case "timeout":
      return outcome.winner === "w" ? "У чёрных закончилось время" : "У белых закончилось время";
    case "resign":
      return outcome.winner === "w" ? "Чёрные сдались" : "Белые сдались";
    case "timeout-draw":
      return "Время истекло, но у соперника недостаточно материала для мата";
    case "stalemate":
      return "Пат — у стороны, которой ходить, нет легальных ходов";
    case "insufficient-material":
      return "Недостаточно материала для мата";
    case "threefold-repetition":
      return "Троекратное повторение позиции";
    case "fifty-move-rule":
      return "Правило 50 ходов";
    case "agreement":
      return "Ничья по соглашению сторон";
  }
}

export type OutcomeTone = "win" | "loss" | "draw";

export function outcomeTone(outcome: GameOutcome, perspective: Color): OutcomeTone {
  const winner = outcomeWinner(outcome);
  if (winner === null) return "draw";
  return winner === perspective ? "win" : "loss";
}

export function outcomeHeadline(outcome: GameOutcome, perspective: Color): string {
  const tone = outcomeTone(outcome, perspective);
  if (tone === "win") return "Победа";
  if (tone === "loss") return "Поражение";
  return "Ничья";
}
