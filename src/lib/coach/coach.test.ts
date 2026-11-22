import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { classifyMove, formatEval, moveAccuracy, winPercent } from "./evaluation";
import { analyzeMove, type AnalysisLine } from "./explain";
import { buildLayeredHint } from "./hints";
import { buildReport, type CoachRecord } from "./report";
import { forkFrom, lineTactics, materialSwing } from "./tactics";

const cp = (value: number) => ({ kind: "cp" as const, value });

function played(fen: string, san: string) {
  return new Chess(fen).move(san);
}

const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const SCHOLAR = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";

describe("move classification", () => {
  it("an equal position is 50% for both sides", () => {
    expect(winPercent(cp(0), "w")).toBeCloseTo(50);
    expect(winPercent(cp(300), "b")).toBeLessThan(30);
  });

  it("the engine's top move is Best even with noisy scores", () => {
    expect(classifyMove({ winBefore: 60, winAfter: 57, isTopMove: true, sacrifice: false })).toBe(
      "best",
    );
  });

  it("does not punish a move just for differing from the first line", () => {
    expect(
      classifyMove({ winBefore: 60, winAfter: 59.5, isTopMove: false, sacrifice: false }),
    ).toBe("best");
    expect(classifyMove({ winBefore: 60, winAfter: 56, isTopMove: false, sacrifice: false })).toBe(
      "good",
    );
  });

  it("grades bigger drops as inaccuracy, mistake and blunder", () => {
    expect(classifyMove({ winBefore: 60, winAfter: 52, isTopMove: false, sacrifice: false })).toBe(
      "inaccuracy",
    );
    expect(classifyMove({ winBefore: 60, winAfter: 46, isTopMove: false, sacrifice: false })).toBe(
      "mistake",
    );
    expect(classifyMove({ winBefore: 60, winAfter: 30, isTopMove: false, sacrifice: false })).toBe(
      "blunder",
    );
  });

  it("a sound sacrifice that keeps the best evaluation is Brilliant", () => {
    expect(classifyMove({ winBefore: 55, winAfter: 56, isTopMove: true, sacrifice: true })).toBe(
      "brilliant",
    );
  });

  it("accuracy is ~100 for no loss and falls with the loss", () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0);
    expect(moveAccuracy(30)).toBeLessThan(30);
  });

  it("formats evaluations", () => {
    expect(formatEval(cp(130))).toBe("+1,3");
    expect(formatEval(cp(-40))).toBe("−0,4");
    expect(formatEval({ kind: "mate", value: -2 })).toBe("−M2");
  });
});

describe("tactics", () => {
  it("measures material lost along an engine line", () => {
    const fen = new Chess(AFTER_E4_E5);
    fen.move("Ba6");
    const swing = materialSwing(fen.fen(), ["b7a6", "g1f3"], "w");
    expect(swing.delta).toBe(-3);
    expect(swing.lost).toEqual(["b"]);
  });

  it("finds a knight fork of king and rook", () => {
    const chess = new Chess("r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1");
    chess.move("Nc7+");
    expect(forkFrom(chess, "c7")?.targets.sort()).toEqual(["a8", "e8"]);
  });

  it("detects a pin of a knight to the king", () => {
    const chess = new Chess("4k3/8/2n5/8/B7/8/8/4K3 w - - 0 1");
    const tactic = lineTactics(chess, "a4")[0];
    expect(tactic).toMatchObject({ kind: "pin", front: "c6", back: "e8" });
  });
});

describe("coach verdict", () => {
  it("explains a hanging bishop as a blunder with the punishing reply", () => {
    const move = played(AFTER_E4_E5, "Ba6");
    const v = analyzeMove({
      fenBefore: AFTER_E4_E5,
      played: move,
      playerColor: "w",
      linesBefore: [{ pv: ["g1f3", "b8c6"], score: cp(40) }],
      lineAfter: { pv: ["b7a6", "g1f3"], score: cp(-290) },
    });
    expect(v.classification).toBe("blunder");
    expect(v.tags).toContain("hanging");
    expect(v.text).toContain("Слон на a6");
    expect(v.text).toContain("bxa6");
    expect(v.best?.san).toBe("Nf3");
    expect(v.threat).toMatchObject({ from: "b7", to: "a6" });
  });

  it("points out a missed mate in one", () => {
    const move = played(SCHOLAR, "Qxe5+");
    const linesBefore: AnalysisLine[] = [{ pv: ["h5f7"], score: { kind: "mate", value: 1 } }];
    const v = analyzeMove({
      fenBefore: SCHOLAR,
      played: move,
      playerColor: "w",
      linesBefore,
      lineAfter: { pv: ["c6e5", "d2d3"], score: cp(-750) },
    });
    expect(v.classification).toBe("blunder");
    expect(v.tags).toContain("missed-mate");
    expect(v.details.join(" ")).toContain("Qxf7#");
  });

  it("praises the engine's top move", () => {
    const move = played(SCHOLAR, "Qxf7#");
    const v = analyzeMove({
      fenBefore: SCHOLAR,
      played: move,
      playerColor: "w",
      linesBefore: [{ pv: ["h5f7"], score: { kind: "mate", value: 1 } }],
      lineAfter: null,
    });
    expect(v.classification).toBe("best");
    expect(v.text).toContain("мат");
  });
});

describe("game report", () => {
  it("counts classes, skips corrected moves and lists critical mistakes", () => {
    const base = analyzeMove({
      fenBefore: AFTER_E4_E5,
      played: played(AFTER_E4_E5, "Nf3"),
      playerColor: "w",
      linesBefore: [{ pv: ["g1f3"], score: cp(40) }],
      lineAfter: { pv: ["b8c6"], score: cp(40) },
    });
    const bad = analyzeMove({
      fenBefore: AFTER_E4_E5,
      played: played(AFTER_E4_E5, "Ba6"),
      playerColor: "w",
      linesBefore: [{ pv: ["g1f3"], score: cp(40) }],
      lineAfter: { pv: ["b7a6"], score: cp(-290) },
    });
    const rec = (ply: number, verdict: typeof base, corrected = false): CoachRecord => ({
      ply,
      moveNumber: 2,
      san: "x",
      fenBefore: AFTER_E4_E5,
      uci: "x",
      verdict,
      corrected,
    });
    const report = buildReport([rec(2, base), rec(4, bad), rec(6, bad, true)]);
    expect(report.moves).toBe(2);
    expect(report.counts.best).toBe(1);
    expect(report.counts.blunder).toBe(1);
    expect(report.corrected).toBe(1);
    expect(report.criticalMistakes).toHaveLength(1);
    expect(report.materialLost).toBe(3);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("3-level progressive hints", () => {
  it("builds strategic focus, tactical clue, and best move text without spoiling level 1", () => {
    const hint = buildLayeredHint(SCHOLAR, "h5f7", 1);
    expect(hint).not.toBeNull();
    expect(hint!.level).toBe(1);
    expect(hint!.san).toBe("Qxf7#");
    expect(hint!.from).toBe("h5");
    expect(hint!.to).toBe("f7");
    expect(hint!.level1Text).not.toContain("Qxf7");
    expect(hint!.level2Text.length).toBeGreaterThan(10);
    expect(hint!.level3Text).toContain("Qxf7#");
  });

  it("returns null for illegal UCI moves", () => {
    expect(buildLayeredHint(AFTER_E4_E5, "e2e8", 1)).toBeNull();
  });
});
