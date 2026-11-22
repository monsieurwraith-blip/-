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
      playerName: "Гарри",
      pieceSet: "marble",
      whitePieceSet: "gold",
      blackPieceSet: "titanium",
      boardTheme: "walnut",
      sound: { enabled: false, masterVolume: 80, volume: 35, events: { capture: false, menu: false } },
      voice: {
        enabled: false,
        voiceURI: "Microsoft Dmitry Online (Natural) - Russian (Russia)",
        volume: 65,
        rate: 1.2,
        mode: "full",
      },
      board: {
        showCoordinates: false,
        highlightLastMove: false,
        showLegalMoves: false,
        highlightCheck: false,
        animations: false,
        animationSpeed: "slow",
      },
      engine: {
        thinkTime: "15",
        customSeconds: 12,
        depthLimit: 14,
        playStyle: "aggressive",
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
      pieceSet: "broken-piece-set",
      boardTheme: 3,
      customBoard: { light: "red", dark: "#123456" },
      sound: { masterVolume: 200, volume: 250 },
      voice: { volume: -10, rate: 5, mode: "unknown", voiceURI: 42 },
      board: { animationSpeed: "warp", showCoordinates: false },
    });
    expect(s.uiTheme).toBe(DEFAULT_SETTINGS.uiTheme);
    expect(s.pieceSet).toBe(DEFAULT_SETTINGS.pieceSet);
    expect(s.boardTheme).toBe(DEFAULT_SETTINGS.boardTheme);
    expect(s.customBoard).toEqual({ light: DEFAULT_SETTINGS.customBoard.light, dark: "#123456" });
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
    expect(s.voice.enabled).toBe(true);
    expect(s.voice.mode).toBe("all");
  });

  it("keeps saved coach mode, depth limit, play style, and custom seconds", () => {
    const s = parseSettings({
      game: { mode: "coach", side: "b", difficulty: "expert", timeControl: "untimed" },
      engine: { thinkTime: "custom", customSeconds: 12, depthLimit: 18, playStyle: "solid" },
    });
    expect(s.game).toEqual({
      mode: "coach",
      side: "b",
      difficulty: "expert",
      timeControl: "untimed",
    });
    expect(s.engine).toEqual({
      thinkTime: "custom",
      customSeconds: 12,
      depthLimit: 18,
      playStyle: "solid",
    });
  });

  it("drops invalid values field by field", () => {
    const s = parseSettings({
      game: { mode: "blitz", difficulty: "god" },
      engine: { thinkTime: "4", depthLimit: 99, playStyle: "chaotic" },
    });
    expect(s.game.mode).toBe("normal");
    expect(s.game.difficulty).toBe("medium");
    expect(s.engine.thinkTime).toBe("auto");
    expect(s.engine.depthLimit).toBeNull();
    expect(s.engine.playStyle).toBe("balanced");
  });
});
