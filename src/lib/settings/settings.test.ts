import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  LEGACY_APPEARANCE_KEY,
  LEGACY_STUDIO_SETTINGS_KEY,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  parseSettings,
  saveSettings,
  soundAllowed,
} from "./settings";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("settings persistence", () => {
  it("restores every saved ProChess setting after a restart", () => {
    const storage = memoryStorage();
    const saved = parseSettings({
      uiTheme: "titanium",
      layoutDensity: "pro",
      coachPersona: "analyst",
      coachDockSide: "left",
      hotkeysEnabled: false,
      playerName: "Гарри",
      pieceSet: "gold-mirror",
      whitePieceSet: "champagne-gold",
      blackPieceSet: "black-gold",
      boardTheme: "walnut",
      sound: {
        enabled: false,
        soundPack: "premium",
        masterVolume: 80,
        volume: 35,
        uiVolume: 40,
        notificationVolume: 50,
        events: { capture: false, menu: false },
      },
      voice: {
        enabled: false,
        voiceURI: "Microsoft Dmitry Online (Natural) - Russian (Russia)",
        volume: 65,
        rate: 1.2,
        mode: "full",
      },
      board: {
        showCoordinates: false,
        frameStyle: "gold",
        highlightLastMove: false,
        showLegalMoves: false,
        highlightCheck: false,
        animations: false,
        animationSpeed: "slow",
        animationLevel: "maximum",
      },
      engine: {
        thinkTime: "15",
        customSeconds: 12,
        depthLimit: 14,
        playStyle: "aggressive",
        historicalStyle: "romantic",
        analysisDepth: 20,
      },
    });
    saveSettings(storage, saved);
    expect(loadSettings(storage)).toEqual(parseSettings(saved));
  });

  it("migrates legacy CHESS STUDIO and appearance keys", () => {
    const storageA = memoryStorage({
      [LEGACY_APPEARANCE_KEY]: JSON.stringify({ boardTheme: "ice", pieceSet: "merida" }),
    });
    const a = loadSettings(storageA);
    expect(a.boardTheme).toBe("ice");
    expect(a.pieceSet).toBe("merida");
    expect(a.sound).toEqual(DEFAULT_SETTINGS.sound);
    expect(a.voice).toEqual(DEFAULT_SETTINGS.voice);

    const storageB = memoryStorage({
      [LEGACY_STUDIO_SETTINGS_KEY]: JSON.stringify({
        boardTheme: "walnut",
        pieceSet: "glass",
        engine: { thinkTime: "10" },
      }),
    });
    const b = loadSettings(storageB);
    expect(b.boardTheme).toBe("walnut");
    expect(b.pieceSet).toBe("glass");
    expect(b.engine.thinkTime).toBe("10");
  });

  it("falls back per field on broken values", () => {
    const s = parseSettings({
      uiTheme: "invalid-theme",
      layoutDensity: "huge",
      pieceSet: "broken-piece-set",
      boardTheme: 3,
      customBoard: { light: "red", dark: "#123456" },
      sound: { masterVolume: 200, volume: 250, soundPack: "lasers" },
      voice: { volume: -10, rate: 5, mode: "unknown", voiceURI: 42 },
      board: { animationSpeed: "warp", showCoordinates: false },
    });
    expect(s.uiTheme).toBe(DEFAULT_SETTINGS.uiTheme);
    expect(s.layoutDensity).toBe("standard");
    expect(s.pieceSet).toBe(DEFAULT_SETTINGS.pieceSet);
    expect(s.boardTheme).toBe(DEFAULT_SETTINGS.boardTheme);
    expect(s.customBoard).toEqual({ light: DEFAULT_SETTINGS.customBoard.light, dark: "#123456" });
    expect(s.sound.soundPack).toBe("wood");
    expect(s.sound.masterVolume).toBe(100);
    expect(s.sound.volume).toBe(100);
    expect(s.voice.volume).toBe(0);
    expect(s.voice.rate).toBe(1.6);
    expect(s.voice.mode).toBe(DEFAULT_SETTINGS.voice.mode);
    expect(s.voice.voiceURI).toBe("");
    expect(s.board.animationSpeed).toBe("normal");
    expect(s.board.showCoordinates).toBe(false);
  });

  it("returns defaults for corrupt JSON", () => {
    expect(loadSettings(memoryStorage({ [SETTINGS_STORAGE_KEY]: "{oops" }))).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});

describe("soundAllowed", () => {
  it("plays nothing when sound effects are off, whatever the per-event toggles", () => {
    const sound = { ...DEFAULT_SETTINGS.sound, enabled: false };
    for (const e of ["move", "capture", "check", "gameEnd", "result", "menu"] as const) {
      expect(soundAllowed(sound, e)).toBe(false);
    }
  });

  it("respects a disabled event, zero volume, and zero masterVolume", () => {
    const sound = {
      ...DEFAULT_SETTINGS.sound,
      events: { ...DEFAULT_SETTINGS.sound.events, capture: false },
    };
    expect(soundAllowed(sound, "capture")).toBe(false);
    expect(soundAllowed(sound, "move")).toBe(true);
    expect(soundAllowed({ ...DEFAULT_SETTINGS.sound, volume: 0 }, "move")).toBe(false);
    expect(soundAllowed({ ...DEFAULT_SETTINGS.sound, masterVolume: 0 }, "move")).toBe(false);
  });
});

describe("game setup and engine settings", () => {
  it("defaults to normal mode, adaptive 3-7s think time, and full voice commentary", () => {
    const s = parseSettings({});
    expect(s.game.mode).toBe("normal");
    expect(s.engine.thinkTime).toBe("auto");
    expect(s.engine.depthLimit).toBeNull();
    expect(s.engine.playStyle).toBe("balanced");
    expect(s.engine.historicalStyle).toBe("modern");
    expect(s.engine.analysisDepth).toBe(16);
    expect(s.voice.enabled).toBe(true);
    expect(s.voice.mode).toBe("all");
  });

  it("keeps saved coach mode, blitz mode, depth limit, play style, and custom seconds", () => {
    const s = parseSettings({
      game: { mode: "blitz", side: "b", difficulty: "expert", timeControl: "3+2" },
      engine: {
        thinkTime: "custom",
        customSeconds: 12,
        depthLimit: 18,
        playStyle: "solid",
        historicalStyle: "iron",
        analysisDepth: 20,
      },
    });
    expect(s.game).toEqual({
      mode: "blitz",
      side: "b",
      difficulty: "expert",
      timeControl: "3+2",
      botId: null,
    });
    expect(s.engine).toEqual({
      thinkTime: "custom",
      customSeconds: 12,
      depthLimit: 18,
      playStyle: "solid",
      historicalStyle: "iron",
      analysisDepth: 20,
    });
  });

  it("drops invalid values field by field", () => {
    const s = parseSettings({
      game: { mode: "unknown-mode", difficulty: "god" },
      engine: { thinkTime: "4", depthLimit: 99, playStyle: "chaotic", analysisDepth: 99 },
    });
    expect(s.game.mode).toBe("normal");
    expect(s.game.difficulty).toBe("medium");
    expect(s.engine.thinkTime).toBe("auto");
    expect(s.engine.depthLimit).toBeNull();
    expect(s.engine.playStyle).toBe("balanced");
    expect(s.engine.analysisDepth).toBe(16);
  });
});
