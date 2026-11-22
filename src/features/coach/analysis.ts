import type { Move } from "chess.js";

import type { EngineSearchOptions } from "@/hooks/useStockfish";
import type { Color } from "@/lib/chess/types";
import { opposite } from "@/lib/chess/types";
import { toUciMove } from "@/lib/chess/uci";
import { isMistakeClass, toWhitePov } from "@/lib/coach/evaluation";
import { analyzeMove, type AnalysisLine, type CoachVerdict } from "@/lib/coach/explain";
import type { SearchResult } from "@/lib/engine/stockfishEngine";

/** Full-strength analysis budget per position for the coach. */
export const COACH_SEARCH = { skillLevel: 20, depth: 18, movetimeMs: 1000 } as const;
export const COACH_MULTI_PV = 3;

type Search = (options: EngineSearchOptions) => Promise<SearchResult>;

function toLines(result: SearchResult, sideToMove: Color): AnalysisLine[] {
  const source = result.lines.length ? result.lines : result.info ? [result.info] : [];
  return source
    .filter((l) => l.score && l.pv.length > 0)
    .map((l) => ({ pv: l.pv, score: toWhitePov(l.score!, sideToMove) }));
}

export interface PendingAnalysis {
  ply: number;
  fenBefore: string;
  movesBefore: string[];
  move: Move;
  playerColor: Color;
  /** The position after the move ended the game (mate/stalemate/draw). */
  gameOverAfter: boolean;
}

/**
 * Analyses one player move with Stockfish (MultiPV before the move, best reply after it)
 * and turns the real scores into the coach's verdict. Returns null when cancelled.
 */
export async function analyzePlayerMove(
  search: Search,
  p: PendingAnalysis,
): Promise<CoachVerdict | null> {
  const before = await search({
    purpose: "analysis",
    moves: p.movesBefore,
    multiPv: COACH_MULTI_PV,
    ...COACH_SEARCH,
  });
  if (before.cancelled) return null;
  const linesBefore = toLines(before, p.playerColor);
  const uci = toUciMove(p.move);
  const input = { fenBefore: p.fenBefore, played: p.move, playerColor: p.playerColor, linesBefore };

  if (p.gameOverAfter) return analyzeMove({ ...input, lineAfter: null });

  // The move is one of the engine's lines and is fine: no need for a second search.
  if (linesBefore.some((l) => l.pv[0] === uci)) {
    const quick = analyzeMove({ ...input, lineAfter: null });
    if (!isMistakeClass(quick.classification)) {
      const reply = linesBefore.find((l) => l.pv[0] === uci)!;
      return analyzeMove({ ...input, lineAfter: { pv: reply.pv.slice(1), score: reply.score } });
    }
  }

  const after = await search({
    purpose: "analysis",
    moves: [...p.movesBefore, uci],
    multiPv: 1,
    ...COACH_SEARCH,
  });
  if (after.cancelled) return null;
  const lineAfter = toLines(after, opposite(p.playerColor))[0] ?? null;
  return analyzeMove({ ...input, lineAfter });
}
