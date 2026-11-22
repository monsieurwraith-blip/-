import { describe, expect, it } from "vitest";

import { parseBestMove, parseInfo, parseUciMove, toUciMove } from "./uci";

describe("UCI parsing", () => {
  it("parses bestmove with ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toEqual({ move: "e2e4", ponder: "e7e5" });
  });

  it("parses bestmove (none)", () => {
    expect(parseBestMove("bestmove (none)")).toEqual({ move: null, ponder: null });
  });

  it("parses promotion moves", () => {
    expect(parseUciMove("e7e8q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
    expect(parseUciMove("xx")).toBeNull();
    expect(toUciMove({ from: "a2", to: "a1", promotion: "n" })).toBe("a2a1n");
  });

  it("parses info lines", () => {
    const info = parseInfo(
      "info depth 12 seldepth 18 multipv 1 score cp -35 nodes 123456 nps 800000 time 154 pv e7e5 g1f3",
    );
    expect(info).toMatchObject({
      depth: 12,
      seldepth: 18,
      score: { kind: "cp", value: -35 },
      nodes: 123456,
    });
    expect(info?.pv).toEqual(["e7e5", "g1f3"]);
    expect(parseInfo("info depth 5 currmove e2e4 currmovenumber 1")).toBeNull();
  });
});
