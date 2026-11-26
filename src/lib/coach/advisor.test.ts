import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { ACADEMY_LESSONS } from "@/lib/academy/curriculum";
import {
  analyzePositionStructure,
  estimateWdl,
  findTurningPoint,
  formatDecimalEval,
} from "@/lib/coach/advisor";
import { playUci } from "@/lib/coach/tactics";
import {
  computeEloDelta,
  defaultProgression,
  rankForXp,
  recordFinishedGame,
} from "@/lib/progression/storage";

describe("ProChess Advisor, Curriculum & Progression", () => {
  it("validates every Academy lesson FEN and full UCI solution sequence in chess.js", () => {
    expect(ACADEMY_LESSONS.length).toBe(27);
    for (const lesson of ACADEMY_LESSONS) {
      const chess = new Chess(lesson.fen);
      expect(lesson.solutionUci.length).toBeGreaterThanOrEqual(1);
      for (const uci of lesson.solutionUci) {
        const played = playUci(chess, uci);
        expect(played, `Invalid move ${uci} in lesson ${lesson.id}`).not.toBeNull();
      }
    }
  });

  it("analyzes structural position metrics, WDL probabilities, and turning point", () => {
    const startFen = new Chess().fen();
    const metrics = analyzePositionStructure(startFen, { kind: "cp", value: 35 });
    expect(metrics.materialDelta).toBe(0);
    expect(metrics.wdl.whiteWin + metrics.wdl.draw + metrics.wdl.blackWin).toBe(100);
    expect(formatDecimalEval({ kind: "cp", value: 45 })).toBe("+0.45");
    expect(estimateWdl({ kind: "mate", value: 2 }).whiteWin).toBe(99);

    const tp = findTurningPoint(
      [
        { ply: 0, pawns: 0.2 },
        { ply: 1, pawns: 0.3 },
        { ply: 2, pawns: -2.8 },
      ],
      ["e4", "Qh5??"],
    );
    expect(tp?.ply).toBe(2);
    expect(tp?.swingPawns).toBe(3.1);
  });

  it("records finished games, computes ELO delta, unlocks achievements, and promotes ranks", () => {
    const base = defaultProgression();
    expect(computeEloDelta(1200, 1400, "win")).toBeGreaterThan(15);
    expect(rankForXp(0).title).toBe("Новичок");
    expect(rankForXp(3700).title).toBe("Гроссмейстер");

    const res = recordFinishedGame(base, {
      id: "g1",
      playedAt: new Date().toISOString(),
      opponent: "Stockfish 19 (Эксперт)",
      difficulty: "expert",
      styleLabel: "Сбалансированный",
      mode: "normal",
      playerColor: "w",
      result: "win",
      outcomeReason: "Мат — белые победили",
      durationSec: 180,
      movesCount: 42,
      accuracy: 94,
      bestCount: 14,
      mistakesCount: 0,
      blundersCount: 0,
      pgn: "1. e4 e5",
      finalFen: new Chess().fen(),
      openingHint: "e4 e5",
    });

    expect(res.next.wins).toBe(1);
    expect(res.next.rating).toBeGreaterThan(1200);
    expect(res.next.archive).toHaveLength(1);
    expect(res.newlyUnlocked.map((a) => a.id)).toContain("first-win");
    expect(res.newlyUnlocked.map((a) => a.id)).toContain("clean-win");
    expect(res.newlyUnlocked.map((a) => a.id)).toContain("giant-killer");
  });
});
