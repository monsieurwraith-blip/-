import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { parseProfileBackup, serializeProfileBackup } from "@/lib/progression/backup";
import { defaultProgression, recordFinishedGame } from "@/lib/progression/storage";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";

import { NAMED_BOTS, pickBotBookMove } from "./bots";
import { ENDGAME_DRILLS } from "./endgameDrills";
import { detectOpening } from "./openings";
import { isPremovePromotion, premoveTargetsForSquare, validateQueuedPremove } from "./premove";

describe("ECO opening detector", () => {
  it("recognizes deepest specific ECO line and strips check annotations", () => {
    const berlin = detectOpening(["e4", "e5", "Nf3", "Nc6", "Bb5+", "Nf6"]);
    expect(berlin?.code).toBe("C65");
    expect(berlin?.label).toContain("Берлинская защита");

    const najdorf = detectOpening([
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
    ]);
    expect(najdorf?.code).toBe("B90");
    expect(najdorf?.label).toContain("Найдорфа");

    const london = detectOpening(["d4", "d5", "Nf3", "Nf6", "Bf4"]);
    expect(london?.code).toBe("D02");
  });

  it("returns null for empty history or custom non-standard FEN", () => {
    expect(detectOpening([])).toBeNull();
    expect(detectOpening(["Kf7"], "4k3/8/8/8/8/8/8/4K2Q w - - 0 1")).toBeNull();
  });
});

describe("Premove rules", () => {
  it("computes pseudo-legal targets and validates queued premove after opponent move", () => {
    const startFen = new Chess().fen();
    const targets = premoveTargetsForSquare(startFen, "e2", "w");
    expect(targets).toContain("e4");
    expect(targets).toContain("d3");
    expect(isPremovePromotion(startFen, "e2", "e8", "w")).toBe(false);

    const promoFen = "4k3/4P3/8/8/8/8/8/4K3 w - - 0 1";
    expect(isPremovePromotion(promoFen, "e7", "e8", "w")).toBe(true);

    // Legal after opponent replies
    const afterBlack = new Chess();
    afterBlack.move("e4");
    afterBlack.move("c5");
    expect(validateQueuedPremove(afterBlack.fen(), { from: "g1", to: "f3" }, "w")).toEqual({
      from: "g1",
      to: "f3",
    });

    // Illegal if opponent captured/blocked invalidly
    expect(validateQueuedPremove(afterBlack.fen(), { from: "c2", to: "c5" }, "w")).toBeNull();
  });
});

describe("Named Bots & Endgame Drills", () => {
  it("provides 8 unique named bots spanning 400..2800 Elo with legal book moves", () => {
    expect(NAMED_BOTS).toHaveLength(8);
    expect(NAMED_BOTS[0]!.elo).toBe(400);
    expect(NAMED_BOTS[NAMED_BOTS.length - 1]!.elo).toBe(2800);

    const startFen = new Chess().fen();
    for (const bot of NAMED_BOTS) {
      const move = pickBotBookMove(bot, startFen);
      if (move) {
        const probe = new Chess(startFen);
        expect(() => probe.move(move)).not.toThrow();
      }
    }
  });

  it("ships 8 valid endgame drill FENs parseable by chess.js", () => {
    expect(ENDGAME_DRILLS).toHaveLength(8);
    for (const drill of ENDGAME_DRILLS) {
      expect(() => new Chess(drill.fen)).not.toThrow();
    }
  });
});

describe("Profile JSON backup & unranked pass-and-play ELO", () => {
  it("roundtrips full settings and progression cleanly and rejects invalid JSON", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      playerName: "Алёхин",
      board: { ...DEFAULT_SETTINGS.board, premovesEnabled: false },
    };
    const customProg = {
      ...defaultProgression(),
      rating: 1640,
      puzzleRushBest: 23,
      coordsBestScore: 41,
      endgameDrillsCompleted: 4,
    };

    const json = serializeProfileBackup(customSettings, customProg);
    const restored = parseProfileBackup(json);

    expect(restored.settings.playerName).toBe("Алёхин");
    expect(restored.settings.board.premovesEnabled).toBe(false);
    expect(restored.progression.rating).toBe(1640);
    expect(restored.progression.puzzleRushBest).toBe(23);
    expect(restored.progression.coordsBestScore).toBe(41);
    expect(restored.progression.endgameDrillsCompleted).toBe(4);

    expect(() => parseProfileBackup("{broken")).toThrow();
    expect(() => parseProfileBackup('{"app":"Other"}')).toThrow();
  });

  it("does not mutate club rating or win counters for unranked pass-and-play games", () => {
    const base = defaultProgression();
    const res = recordFinishedGame(base, {
      id: "pnp-1",
      playedAt: new Date().toISOString(),
      opponent: "Локальная партия (2 игрока)",
      difficulty: "medium",
      styleLabel: "Вдвоём",
      mode: "pass-and-play",
      playerColor: "w",
      result: "win",
      outcomeReason: "Мат",
      durationSec: 120,
      movesCount: 24,
      accuracy: 88,
      bestCount: 5,
      mistakesCount: 1,
      blundersCount: 0,
      pgn: "1. e4 e5",
      finalFen: new Chess().fen(),
      openingHint: "C20 · Открытый дебют",
      ranked: false,
    });

    expect(res.ratingDelta).toBe(0);
    expect(res.next.rating).toBe(base.rating);
    expect(res.next.gamesPlayed).toBe(1);
    expect(res.next.archive).toHaveLength(1);
    expect(res.next.archive[0]?.ratingDelta).toBe(0);
  });
});
