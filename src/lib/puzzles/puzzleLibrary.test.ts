import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { playUci } from "@/lib/coach/tactics";
import { ALL_LOCAL_PUZZLES } from "@/lib/puzzles/puzzleLibrary";

describe("ProChess 100+ Puzzle Library Integrity", () => {
  it("contains at least 100 unique puzzles with valid FENs and 100% legal chess.js solutions", () => {
    expect(ALL_LOCAL_PUZZLES.length).toBeGreaterThanOrEqual(100);

    const seenIds = new Set<string>();
    const seenFens = new Set<string>();
    const issues: string[] = [];

    for (const puzzle of ALL_LOCAL_PUZZLES) {
      if (seenIds.has(puzzle.id)) issues.push(`${puzzle.id}: duplicate id`);
      seenIds.add(puzzle.id);

      if (seenFens.has(puzzle.fen)) issues.push(`${puzzle.id}: duplicate FEN ${puzzle.fen}`);
      seenFens.add(puzzle.fen);

      let chess: Chess;
      try {
        chess = new Chess(puzzle.fen);
      } catch (err) {
        issues.push(`${puzzle.id}: invalid FEN (${String(err)})`);
        continue;
      }

      if (puzzle.solutionUci.length === 0) {
        issues.push(`${puzzle.id}: empty solutionUci`);
        continue;
      }

      for (const uci of puzzle.solutionUci) {
        const m = playUci(chess, uci);
        if (!m) {
          issues.push(`${puzzle.id}: illegal move ${uci} at fen ${chess.fen()}`);
          break;
        }
      }

      if (
        puzzle.category === "Мат в 1 ход" ||
        puzzle.category === "Мат в 2 хода" ||
        puzzle.category === "Мат в 3 хода" ||
        puzzle.category === "Мат в 4 хода"
      ) {
        if (!chess.isCheckmate()) {
          issues.push(
            `${puzzle.id} (${puzzle.category}): expected checkmate at end, got fen=${chess.fen()}`,
          );
        }
      }
    }

    expect(issues).toEqual([]);
  });
});
