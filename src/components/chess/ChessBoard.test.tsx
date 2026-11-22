import { Chess } from "chess.js";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BoardCell } from "@/lib/chess/pieceIds";

import { ChessBoard } from "./ChessBoard";

function cellsOf(chess: Chess): BoardCell[] {
  return chess
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ square: p.square, type: p.type, color: p.color }));
}

function renderBoard(fen: string, onMove = vi.fn(() => true)) {
  const chess = new Chess(fen);
  render(
    <ChessBoard
      cells={cellsOf(chess)}
      positionKey={chess.fen()}
      orientation="w"
      movableColor={chess.turn()}
      legalMoves={chess.moves({ verbose: true })}
      showLegalMoves
      lastMove={null}
      checkSquare={null}
      hint={null}
      onMove={onMove}
    />,
  );
  return onMove;
}

const square = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("ChessBoard", () => {
  it("asks which piece to promote to instead of auto-queening", () => {
    const onMove = renderBoard("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
    fireEvent.keyDown(square("e7"), { key: "Enter" });
    fireEvent.keyDown(square("e8"), { key: "Enter" });
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /превращения/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "конь" }));
    expect(onMove).toHaveBeenCalledWith({ from: "e7", to: "e8", promotion: "n" });
  });

  it("ignores illegal target squares", () => {
    const onMove = renderBoard("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    fireEvent.keyDown(square("e2"), { key: "Enter" });
    expect(square("e4")).toHaveAccessibleName(/доступный ход/);
    fireEvent.keyDown(square("e5"), { key: "Enter" });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does not let the user pick the opponent's pieces", () => {
    const onMove = renderBoard("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    fireEvent.keyDown(square("e7"), { key: "Enter" });
    fireEvent.keyDown(square("e5"), { key: "Enter" });
    expect(onMove).not.toHaveBeenCalled();
  });
});
