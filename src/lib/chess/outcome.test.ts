import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { detectBoardOutcome, hasMatingMaterial, outcomeScore, resolveTimeout } from "./outcome";

function play(moves: string[]): Chess {
  const chess = new Chess();
  for (const m of moves) chess.move(m);
  return chess;
}

describe("detectBoardOutcome", () => {
  it("detects checkmate (fool's mate) with black as winner", () => {
    const chess = play(["f3", "e5", "g4", "Qh4#"]);
    expect(detectBoardOutcome(chess)).toEqual({ type: "checkmate", winner: "b" });
  });

  it("detects stalemate", () => {
    const chess = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(detectBoardOutcome(chess)).toEqual({ type: "stalemate" });
  });

  it("detects insufficient material (K+B vs K)", () => {
    const chess = new Chess("8/8/8/4k3/8/8/2B5/4K3 w - - 0 1");
    expect(detectBoardOutcome(chess)).toEqual({ type: "insufficient-material" });
  });

  it("detects threefold repetition", () => {
    const chess = play(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
    expect(detectBoardOutcome(chess)).toEqual({ type: "threefold-repetition" });
  });

  it("detects the fifty-move rule", () => {
    const chess = new Chess("8/8/8/4k3/8/8/1R6/4K3 w - - 100 80");
    expect(detectBoardOutcome(chess)).toEqual({ type: "fifty-move-rule" });
  });

  it("returns null for an ongoing game", () => {
    expect(detectBoardOutcome(play(["e4", "e5"]))).toBeNull();
  });
});

describe("timeout", () => {
  it("flag fall loses when the opponent can still mate", () => {
    const chess = new Chess();
    expect(resolveTimeout(chess, "w")).toEqual({ type: "timeout", winner: "b" });
    expect(outcomeScore(resolveTimeout(chess, "w"))).toBe("0-1");
  });

  it("flag fall is a draw when the opponent has only king + knight", () => {
    const chess = new Chess("8/8/8/4k3/8/8/2N5/4K2R b - - 0 1");
    // Black flags; white has K+N+R → can mate → white wins.
    expect(resolveTimeout(chess, "b")).toEqual({ type: "timeout", winner: "w" });
    const lone = new Chess("8/8/8/4k3/8/8/2N5/4K3 b - - 0 1");
    expect(hasMatingMaterial(lone, "w")).toBe(false);
    expect(resolveTimeout(lone, "b")).toEqual({ type: "timeout-draw", flagged: "b" });
  });
});
