import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { BoardCell } from "@/lib/chess/pieceIds";
import type { Square, SquarePair } from "@/lib/chess/types";
import { playUci } from "@/lib/coach/tactics";

export interface IdeaRequest {
  /** Position the idea starts from. */
  fen: string;
  /** Engine line in UCI; the first move is the recommended one. */
  pv: string[];
  /** Explanation shown next to the board. */
  text: string;
}

export interface IdeaFrame {
  fen: string;
  cells: BoardCell[];
  move: (SquarePair & { san: string }) | null;
  checkSquare: Square | null;
}

const FIRST_STEP_MS = 650;
const STEP_MS = 1150;
const MAX_PLIES = 4;

function frameOf(chess: Chess, move: IdeaFrame["move"]): IdeaFrame {
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      cells.push({ square: p.square, type: p.type, color: p.color });
      if (chess.inCheck() && p.type === "k" && p.color === turn) checkSquare = p.square;
    }
  }
  return { fen: chess.fen(), cells, move, checkSquare };
}

export function buildIdeaFrames(fen: string, pv: readonly string[]): IdeaFrame[] {
  const chess = new Chess(fen);
  const frames = [frameOf(chess, null)];
  for (const uci of pv.slice(0, MAX_PLIES)) {
    const m = playUci(chess, uci);
    if (!m) break;
    frames.push(frameOf(chess, { from: m.from, to: m.to, san: m.san }));
  }
  return frames;
}

/** Plays the coach's recommended line on a preview board without touching the real game. */
export function useIdeaPlayback() {
  const [request, setRequest] = useState<IdeaRequest | null>(null);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const frames = useMemo(() => (request ? buildIdeaFrames(request.fen, request.pv) : []), [request]);

  useEffect(() => {
    if (!request || step >= frames.length - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? FIRST_STEP_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [request, step, frames.length, run]);

  const start = useCallback((next: IdeaRequest) => {
    setRequest(next);
    setStep(0);
    setRun((r) => r + 1);
  }, []);
  const stop = useCallback(() => setRequest(null), []);
  const replay = useCallback(() => {
    setStep(0);
    setRun((r) => r + 1);
  }, []);

  return {
    active: request !== null,
    request,
    frame: frames[step] ?? null,
    step,
    frames,
    playing: request !== null && step < frames.length - 1,
    start,
    stop,
    replay,
  };
}

export type IdeaPlayback = ReturnType<typeof useIdeaPlayback>;
