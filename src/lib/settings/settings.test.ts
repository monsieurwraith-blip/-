import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  LEGACY_APPEARANCE_KEY,
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
  it("restores every saved setting after a restart", () => {
    const storage = memoryStorage();
    const saved = parseSettings({
      pieceSet: "marble",
      boardTheme: "walnut",
      sound: { enabled: false, volume: 35, events: { capture: false } },
      board: {
        showCoordinates: false,
        highlightLastMove: false,
        showLegalMoves: false,
        highlightCheck: false,
        animations: false,
        animationSpeed: "slow",
      },
    });
    saveSettings(storage, saved);
    expect(loadSettings(storage)).toEqual(saved);
  });

  it("migrates the old appearance key", () => {
    const storage = memoryStorage({
      [LEGACY_APPEARANCE_KEY]: JSON.stringify({ boardTheme: "ice", pieceSet: "merida" }),
    });
    const s = loadSettings(storage);
    expect(s.boardTheme).toBe("ice");
    expect(s.pieceSet).toBe("merida");
    expect(s.sound).toEqual(DEFAULT_SETTINGS.sound);
  });

  it("falls back per field on broken values", () => {
    const s = parseSettings({
      pieceSet: "neon",
      boardTheme: 3,
      customBoard: { light: "red", dark: "#123456" },
      sound: { volume: 250 },
      board: { animationSpeed: "warp", showCoordinates: false },
    });
    expect(s.pieceSet).toBe(DEFAULT_SETTINGS.pieceSet);
    expect(s.boardTheme).toBe(DEFAULT_SETTINGS.boardTheme);
    expect(s.customBoard).toEqual({ light: DEFAULT_SETTINGS.customBoard.light, dark: "#123456" });
    expect(s.sound.volume).toBe(100);
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
    for (const e of ["move", "capture", "check", "gameEnd", "result"] as const) {
      expect(soundAllowed(sound, e)).toBe(false);
    }
  });

  it("respects a disabled event and zero volume", () => {
    const sound = {
      ...DEFAULT_SETTINGS.sound,
      events: { ...DEFAULT_SETTINGS.sound.events, capture: false },
    };
    expect(soundAllowed(sound, "capture")).toBe(false);
    expect(soundAllowed(sound, "move")).toBe(true);
    expect(soundAllowed({ ...DEFAULT_SETTINGS.sound, volume: 0 }, "move")).toBe(false);
  });
});

describe("game setup and engine settings", () => {
  it("defaults to normal mode and 2 s think time", () => {
    const s = parseSettings({});
    expect(s.game.mode).toBe("normal");
    expect(s.engine.thinkTime).toBe("2");
  });

  it("keeps a saved coach mode, think time and custom seconds", () => {
    const s = parseSettings({
      game: { mode: "coach", side: "b", difficulty: "expert", timeControl: "untimed" },
      engine: { thinkTime: "custom", customSeconds: 12 },
    });
    expect(s.game).toEqual({ mode: "coach", side: "b", difficulty: "expert", timeControl: "untimed" });
    expect(s.engine).toEqual({ thinkTime: "custom", customSeconds: 12 });
  });

  it("drops invalid values field by field", () => {
    const s = parseSettings({ game: { mode: "blitz", difficulty: "god" }, engine: { thinkTime: "4" } });
    expect(s.game.mode).toBe("normal");
    expect(s.game.difficulty).toBe("medium");
    expect(s.engine.thinkTime).toBe("2");
  });
});
