/**
 * User settings: one versioned object stored locally (browser localStorage /
 * desktop app profile). Parsing is defensive: every field falls back to its
 * default on its own, so a broken or older value never resets everything.
 */
import {
  DEFAULT_BOARD_THEME,
  DEFAULT_PIECE_SET,
  isBoardThemeId,
  isPieceSetId,
  type BoardColors,
  type BoardThemeId,
  type PieceSetId,
} from "@/lib/appearance/themes";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, type DifficultyId } from "@/lib/chess/difficulty";
import { DEFAULT_TIME_CONTROL, TIME_CONTROLS, type TimeControlId } from "@/lib/chess/timeControls";
import type { SideChoice } from "@/lib/chess/types";
import {
  DEFAULT_CUSTOM_THINK_S,
  DEFAULT_THINK_TIME,
  clampCustomSeconds,
  isThinkTimeId,
  type ThinkTimeId,
} from "@/lib/engine/thinkTime";

export const SETTINGS_STORAGE_KEY = "chess-studio:settings";
/** Stage-1 key that only held board theme + piece set. Read once for migration. */
export const LEGACY_APPEARANCE_KEY = "chess-studio:appearance";

export const SOUND_EVENTS = ["move", "capture", "check", "gameEnd", "result"] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];

export const ANIMATION_SPEEDS = [
  { id: "fast", label: "Быстро", ms: 110 },
  { id: "normal", label: "Обычно", ms: 190 },
  { id: "slow", label: "Плавно", ms: 320 },
] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number]["id"];

export interface SoundSettings {
  enabled: boolean;
  /** 0–100. */
  volume: number;
  events: Record<SoundEvent, boolean>;
}

export interface BoardDisplaySettings {
  showCoordinates: boolean;
  highlightLastMove: boolean;
  showLegalMoves: boolean;
  highlightCheck: boolean;
  animations: boolean;
  animationSpeed: AnimationSpeed;
}

export type GameMode = "normal" | "coach";

/** Setup of the next game; remembered between launches. */
export interface GameSetupSettings {
  mode: GameMode;
  side: SideChoice;
  difficulty: DifficultyId;
  timeControl: TimeControlId;
}

export interface EngineSettings {
  thinkTime: ThinkTimeId;
  /** Used when thinkTime is "custom". */
  customSeconds: number;
}

export interface AppSettings {
  pieceSet: PieceSetId;
  boardTheme: BoardThemeId;
  customBoard: BoardColors;
  sound: SoundSettings;
  board: BoardDisplaySettings;
  game: GameSetupSettings;
  engine: EngineSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  pieceSet: DEFAULT_PIECE_SET,
  boardTheme: DEFAULT_BOARD_THEME,
  customBoard: { light: "#e8dcc4", dark: "#7a6a58" },
  sound: {
    enabled: true,
    volume: 70,
    events: { move: true, capture: true, check: true, gameEnd: true, result: true },
  },
  board: {
    showCoordinates: true,
    highlightLastMove: true,
    showLegalMoves: true,
    highlightCheck: true,
    animations: true,
    animationSpeed: "normal",
  },
  game: {
    mode: "normal",
    side: "w",
    difficulty: DEFAULT_DIFFICULTY,
    timeControl: DEFAULT_TIME_CONTROL,
  },
  engine: { thinkTime: DEFAULT_THINK_TIME, customSeconds: DEFAULT_CUSTOM_THINK_S },
};

export function animationMs(speed: AnimationSpeed): number {
  return ANIMATION_SPEEDS.find((s) => s.id === speed)?.ms ?? 190;
}

const HEX = /^#[0-9a-f]{6}$/i;

function obj(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
}

export function clampVolume(value: unknown, fallback = DEFAULT_SETTINGS.sound.volume): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parseSettings(raw: unknown): AppSettings {
  const o = obj(raw);
  const d = DEFAULT_SETTINGS;
  const custom = obj(o["customBoard"]);
  const sound = obj(o["sound"]);
  const events = obj(sound["events"]);
  const board = obj(o["board"]);
  const speed = board["animationSpeed"];
  const game = obj(o["game"]);
  const engine = obj(o["engine"]);
  const side = game["side"];
  const difficulty = game["difficulty"];
  const timeControl = game["timeControl"];

  const parsedEvents = {} as Record<SoundEvent, boolean>;
  for (const e of SOUND_EVENTS) parsedEvents[e] = bool(events[e], d.sound.events[e]);

  return {
    pieceSet: isPieceSetId(o["pieceSet"]) ? o["pieceSet"] : d.pieceSet,
    boardTheme: isBoardThemeId(o["boardTheme"]) ? o["boardTheme"] : d.boardTheme,
    customBoard: {
      light: hex(custom["light"], d.customBoard.light),
      dark: hex(custom["dark"], d.customBoard.dark),
    },
    sound: {
      enabled: bool(sound["enabled"], d.sound.enabled),
      volume: clampVolume(sound["volume"]),
      events: parsedEvents,
    },
    board: {
      showCoordinates: bool(board["showCoordinates"], d.board.showCoordinates),
      highlightLastMove: bool(board["highlightLastMove"], d.board.highlightLastMove),
      showLegalMoves: bool(board["showLegalMoves"], d.board.showLegalMoves),
      highlightCheck: bool(board["highlightCheck"], d.board.highlightCheck),
      animations: bool(board["animations"], d.board.animations),
      animationSpeed: ANIMATION_SPEEDS.some((s) => s.id === speed)
        ? (speed as AnimationSpeed)
        : d.board.animationSpeed,
    },
    game: {
      mode: game["mode"] === "coach" || game["mode"] === "normal" ? game["mode"] : d.game.mode,
      side: side === "w" || side === "b" || side === "random" ? side : d.game.side,
      difficulty: DIFFICULTY_LEVELS.some((l) => l.id === difficulty)
        ? (difficulty as DifficultyId)
        : d.game.difficulty,
      timeControl: TIME_CONTROLS.some((t) => t.id === timeControl)
        ? (timeControl as TimeControlId)
        : d.game.timeControl,
    },
    engine: {
      thinkTime: isThinkTimeId(engine["thinkTime"]) ? engine["thinkTime"] : d.engine.thinkTime,
      customSeconds: clampCustomSeconds(engine["customSeconds"], d.engine.customSeconds),
    },
  };
}

/** Reads stored settings, migrating the stage-1 appearance key when no new value exists. */
export function loadSettings(storage: Pick<Storage, "getItem">): AppSettings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return parseSettings(JSON.parse(raw));
    const legacy = storage.getItem(LEGACY_APPEARANCE_KEY);
    if (legacy) {
      const l = obj(JSON.parse(legacy));
      return parseSettings({ boardTheme: l["boardTheme"], pieceSet: l["pieceSet"] });
    }
  } catch {
    // Corrupt JSON: fall through to defaults.
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(storage: Pick<Storage, "setItem">, settings: AppSettings): void {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
}

/** Whether a sound may play — the master switch overrides every per-event toggle. */
export function soundAllowed(sound: SoundSettings, event: SoundEvent): boolean {
  return sound.enabled && sound.volume > 0 && sound.events[event];
}
