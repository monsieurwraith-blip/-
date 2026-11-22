import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useChessGame } from "./useChessGame";

function setup(sanMoves: string[]) {
  const hook = renderHook(() => useChessGame());
  for (const san of sanMoves) {
    act(() => {
      const move = hook.result.current.legalMoves.find((m) => m.san === san);
      if (!move) throw new Error(`illegal in setup: ${san}`);
      hook.result.current.move({
        from: move.from,
        to: move.to,
        ...(move.promotion ? { promotion: move.promotion as "q" } : {}),
      });
    });
  }
  return hook;
}

describe("useChessGame rules", () => {
  it("rejects illegal moves", () => {
    const { result } = setup([]);
    let played: unknown;
    act(() => {
      played = result.current.move({ from: "e2", to: "e5" });
    });
    expect(played).toBeNull();
    expect(result.current.history).toHaveLength(0);
  });

  it("allows kingside castling", () => {
    const { result } = setup(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
    act(() => {
      result.current.move({ from: "e1", to: "g1" });
    });
    expect(result.current.history.at(-1)?.san).toBe("O-O");
    expect(result.current.cells).toContainEqual({ square: "f1", type: "r", color: "w" });
  });

  it("allows queenside castling", () => {
    const { result } = setup(["d4", "d5", "Nc3", "Nc6", "Bf4", "Bf5", "Qd2", "Qd7"]);
    act(() => {
      result.current.move({ from: "e1", to: "c1" });
    });
    expect(result.current.history.at(-1)?.san).toBe("O-O-O");
    expect(result.current.cells).toContainEqual({ square: "d1", type: "r", color: "w" });
  });

  it("supports en passant and removes the captured pawn", () => {
    const { result } = setup(["e4", "a6", "e5", "d5"]);
    act(() => {
      result.current.move({ from: "e5", to: "d6" });
    });
    expect(result.current.history.at(-1)?.isEnPassant()).toBe(true);
    expect(result.current.cells.find((c) => c.square === "d5")).toBeUndefined();
  });

  it("promotes to the chosen piece (no auto-queen)", () => {
    const { result } = setup(["h4", "g5", "hxg5", "Nf6", "g6", "Rg8", "gxh7", "Ne4"]);
    const promos = result.current.legalMoves.filter((m) => m.from === "h7" && m.to === "g8");
    expect(promos.map((m) => m.promotion).sort()).toEqual(["b", "n", "q", "r"]);
    act(() => {
      result.current.move({ from: "h7", to: "g8", promotion: "n" });
    });
    expect(result.current.cells).toContainEqual({ square: "g8", type: "n", color: "w" });
  });

  it("detects checkmate and blocks further moves", () => {
    const { result } = setup(["f3", "e5", "g4", "Qh4#"]);
    expect(result.current.outcome).toEqual({ type: "checkmate", winner: "b" });
    expect(result.current.checkSquare).toBe("e1");
    let played: unknown;
    act(() => {
      played = result.current.move({ from: "a2", to: "a3" });
    });
    expect(played).toBeNull();
  });

  it("undo restores the earlier position and clears the result", () => {
    const { result } = setup(["f3", "e5", "g4", "Qh4#"]);
    act(() => result.current.undo(2));
    expect(result.current.history.map((m) => m.san)).toEqual(["f3", "e5"]);
    expect(result.current.isOver).toBe(false);
  });

  it("a declared result (time/resign) blocks moves", () => {
    const { result } = setup(["e4"]);
    act(() => result.current.declareOutcome({ type: "resign", winner: "w" }));
    let played: unknown;
    act(() => {
      played = result.current.move({ from: "e7", to: "e5" });
    });
    expect(played).toBeNull();
    expect(result.current.isOver).toBe(true);
  });
});
