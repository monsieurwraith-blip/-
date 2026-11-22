import { Chess, type Move } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";

import { detectBoardOutcome, type GameOutcome } from "@/lib/chess/outcome";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square } from "@/lib/chess/types";

export interface GameSnapshot {
  fen: string;
  turn: Color;
  inCheck: boolean;
  /** Full-move number of the side to move. */
  moveNumber: number;
  history: Move[];
  cells: BoardCell[];
  legalMoves: Move[];
  checkSquare: Square | null;
  boardOutcome: GameOutcome | null;
}

function takeSnapshot(chess: Chess): GameSnapshot {
  const turn = chess.turn();
  const inCheck = chess.inCheck();
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      cells.push({ square: piece.square, type: piece.type, color: piece.color });
      if (inCheck && piece.type === "k" && piece.color === turn) checkSquare = piece.square;
    }
  }
  return {
    fen: chess.fen(),
    turn,
    inCheck,
    moveNumber: chess.moveNumber(),
    history: chess.history({ verbose: true }),
    cells,
    legalMoves: chess.moves({ verbose: true }),
    checkSquare,
    boardOutcome: detectBoardOutcome(chess),
  };
}

export interface ChessGameHandle extends GameSnapshot {
  /** Board result or an externally declared one (time, resignation). */
  outcome: GameOutcome | null;
  isOver: boolean;
  /** Plays a move if legal; returns the chess.js move or null when illegal / game over. */
  move: (move: BoardMove) => Move | null;
  undo: (plies: number) => void;
  reset: (fen?: string) => void;
  declareOutcome: (outcome: GameOutcome) => void;
  /** Direct read access for rule checks (e.g. mating material on time-out). */
  chess: () => Chess;
}

/** chess.js is the single source of truth for rules and game state. */
export function useChessGame(): ChessGameHandle {
  const chessRef = useRef<Chess | null>(null);
  if (chessRef.current === null) chessRef.current = new Chess();
  const chess = chessRef.current;
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => takeSnapshot(chess));
  const [declared, setDeclared] = useState<GameOutcome | null>(null);
  const declaredRef = useRef<GameOutcome | null>(null);

  const move = useCallback(
    (m: BoardMove) => {
      if (declaredRef.current || chess.isGameOver()) return null;
      try {
        const played = chess.move(m);
        setSnapshot(takeSnapshot(chess));
        return played;
      } catch {
        return null;
      }
    },
    [chess],
  );

  const undo = useCallback(
    (plies: number) => {
      for (let i = 0; i < plies; i++) {
        if (!chess.undo()) break;
      }
      declaredRef.current = null;
      setDeclared(null);
      setSnapshot(takeSnapshot(chess));
    },
    [chess],
  );

  const reset = useCallback(
    (fen?: string) => {
      if (fen) chess.load(fen);
      else chess.reset();
      declaredRef.current = null;
      setDeclared(null);
      setSnapshot(takeSnapshot(chess));
    },
    [chess],
  );

  const declareOutcome = useCallback((outcome: GameOutcome) => {
    if (declaredRef.current) return;
    declaredRef.current = outcome;
    setDeclared(outcome);
  }, []);

  const getChess = useCallback(() => chess, [chess]);

  return useMemo(() => {
    const outcome = declared ?? snapshot.boardOutcome;
    return {
      ...snapshot,
      outcome,
      isOver: outcome !== null,
      move,
      undo,
      reset,
      declareOutcome,
      chess: getChess,
    };
  }, [snapshot, declared, move, undo, reset, declareOutcome, getChess]);
}
