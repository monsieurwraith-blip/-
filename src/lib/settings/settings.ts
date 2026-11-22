/**
 * User settings: one versioned object stored locally (browser localStorage /
 * desktop app profile). Parsing is defensive: every field falls back to its
 * default on its own, so a broken or older value never resets everything.
 */
import {
  DEFAULT_BOARD_THEME,
  DEFAULT_PIECE_SET,
  normalizeBoardThemeId,
  normalizePieceSetId,
  type BoardColors,
  type BoardThemeId,
  type PieceSetId,
} from "@/lib/appearance/themes";
import { DEFAULT_UI_THEME, isUiThemeId, type UiThemeId } from "@/lib/appearance/uiThemes";
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

export const SETTINGS_STORAGE_KEY = "prochess:settings";
export const LEGACY_STUDIO_SETTINGS_KEY = "chess-studio:settings";
export const LEGACY_APPEARANCE_KEY = "chess-studio:appearance";

export const SOUND_EVENTS = ["move", "capture", "check", "gameEnd", "result", "menu"] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];

export const VOICE_MODES = [
  {
    id: "all",
    label: "Озвучивать каждую фразу",
    description: "Тренер озвучивает оценку каждого хода, подсказки и угрозы",
  },
  {
    id: "full",
    label: "Полный анализ",
    description: "Подробное объяснение, тактика соперника и лучший вариант",
  },
  {
    id: "important",
    label: "Только важные моменты",
    description: "Ошибки, зевки, блестящие ходы, угрозы, шахи и итог партии",
  },
  {
    id: "errors",
    label: "Только ошибки и угрозы",
    description: "Предупреждения об ошибках, висячих фигурах и шахах",
  },
] as const;
export type VoiceMode = (typeof VOICE_MODES)[number]["id"];

export const PLAY_STYLES = [
  { id: "balanced", label: "Сбалансированный", description: "Объективная турнирная игра", contempt: 0 },
  { id: "aggressive", label: "Агрессивный", description: "Ищет инициативу и острые осложнения", contempt: 24 },
  { id: "solid", label: "Позиционный", description: "Надёжная структура и профилактика", contempt: -12 },
] as const;
export type PlayStyleId = (typeof PLAY_STYLES)[number]["id"];

export const DEPTH_LIMITS = [null, 6, 10, 14, 18] as const;
export type DepthLimit = (typeof DEPTH_LIMITS)[number];

export const ANIMATION_SPEEDS = [
  { id: "fast", label: "Быстро", ms: 110 },
  { id: "normal", label: "Обычно", ms: 190 },
  { id: "slow", label: "Плавно", ms: 320 },
] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number]["id"];

export interface SoundSettings {
  enabled: boolean;
  /** 0–100 global master volume across sound effects and voice coach. */
  masterVolume: number;
  /** 0–100 sound effects volume. */
  volume: number;
  events: Record<SoundEvent, boolean>;
}

export interface VoiceCoachSettings {
  enabled: boolean;
  /** SpeechSynthesisVoice.voiceURI or empty string for automatic (prefers Microsoft Dmitry Online Natural). */
  voiceURI: string;
  /** 0–100 coach voice volume. */
  volume: number;
  /** 0.6–1.6 speech rate multiplier. */
  rate: number;
  mode: VoiceMode;
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
  /** Optional depth cap override (null = controlled by difficulty & think time). */
  depthLimit: DepthLimit;
  playStyle: PlayStyleId;
}

export interface AppSettings {
  uiTheme: UiThemeId;
  playerName: string;
  pieceSet: PieceSetId;
  whitePieceSet: PieceSetId | null;
  blackPieceSet: PieceSetId | null;
  boardTheme: BoardThemeId;
  customBoard: BoardColors;
  sound: SoundSettings;
  voice: VoiceCoachSettings;
  board: BoardDisplaySettings;
  game: GameSetupSettings;
  engine: EngineSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  uiTheme: DEFAULT_UI_THEME,
  playerName: "Гроссмейстер",
  pieceSet: DEFAULT_PIECE_SET,
  whitePieceSet: null,
  blackPieceSet: null,
  boardTheme: DEFAULT_BOARD_THEME,
  customBoard: { light: "#DCE6E0", dark: "#0F6E4A" },
  sound: {
    enabled: true,
    masterVolume: 90,
    volume: 70,
    events: { move: true, capture: true, check: true, gameEnd: true, result: true, menu: true },
  },
  voice: {
    enabled: true,
    voiceURI: "",
    volume: 85,
    rate: 1.0,
    mode: "all",
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
  engine: {
    thinkTime: DEFAULT_THINK_TIME,
    customSeconds: DEFAULT_CUSTOM_THINK_S,
    depthLimit: null,
    playStyle: "balanced",
  },
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

export function clampSpeechRate(value: unknown, fallback = DEFAULT_SETTINGS.voice.rate): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value * 10) / 10;
  return Math.max(0.6, Math.min(1.6, rounded));
}

export function isVoiceMode(value: unknown): value is VoiceMode {
  return VOICE_MODES.some((m) => m.id === value);
}

export function parseSettings(raw: unknown): AppSettings {
  const o = obj(raw);
  const d = DEFAULT_SETTINGS;
  const custom = obj(o["customBoard"]);
  const sound = obj(o["sound"]);
  const events = obj(sound["events"]);
  const voice = obj(o["voice"]);
  const board = obj(o["board"]);
  const speed = board["animationSpeed"];
  const game = obj(o["game"]);
  const engine = obj(o["engine"]);
  const side = game["side"];
  const difficulty = game["difficulty"];
  const timeControl = game["timeControl"];
  const depthLimit = engine["depthLimit"];
  const playStyle = engine["playStyle"];

  const parsedEvents = {} as Record<SoundEvent, boolean>;
  for (const e of SOUND_EVENTS) parsedEvents[e] = bool(events[e], d.sound.events[e]);

  const playerNameRaw = typeof o["playerName"] === "string" ? o["playerName"].trim().slice(0, 28) : "";

  return {
    uiTheme: isUiThemeId(o["uiTheme"]) ? o["uiTheme"] : d.uiTheme,
    playerName: playerNameRaw || d.playerName,
    pieceSet: normalizePieceSetId(o["pieceSet"]) ?? d.pieceSet,
    whitePieceSet: o["whitePieceSet"] === null ? null : normalizePieceSetId(o["whitePieceSet"]),
    blackPieceSet: o["blackPieceSet"] === null ? null : normalizePieceSetId(o["blackPieceSet"]),
    boardTheme: normalizeBoardThemeId(o["boardTheme"]) ?? d.boardTheme,
    customBoard: {
      light: hex(custom["light"], d.customBoard.light),
      dark: hex(custom["dark"], d.customBoard.dark),
    },
    sound: {
      enabled: bool(sound["enabled"], d.sound.enabled),
      masterVolume: clampVolume(sound["masterVolume"], d.sound.masterVolume),
      volume: clampVolume(sound["volume"], d.sound.volume),
      events: parsedEvents,
    },
    voice: {
      enabled: bool(voice["enabled"], d.voice.enabled),
      voiceURI: typeof voice["voiceURI"] === "string" ? voice["voiceURI"] : d.voice.voiceURI,
      volume: clampVolume(voice["volume"], d.voice.volume),
      rate: clampSpeechRate(voice["rate"], d.voice.rate),
      mode: isVoiceMode(voice["mode"]) ? voice["mode"] : d.voice.mode,
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
      depthLimit: DEPTH_LIMITS.includes(depthLimit as DepthLimit)
        ? (depthLimit as DepthLimit)
        : d.engine.depthLimit,
      playStyle: PLAY_STYLES.some((s) => s.id === playStyle)
        ? (playStyle as PlayStyleId)
        : d.engine.playStyle,
    },
  };
}

/** Reads stored settings, migrating older CHESS STUDIO keys when present. */
export function loadSettings(storage: Pick<Storage, "getItem">): AppSettings {
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return parseSettings(JSON.parse(raw));
    const legacyStudio = storage.getItem(LEGACY_STUDIO_SETTINGS_KEY);
    if (legacyStudio) return parseSettings(JSON.parse(legacyStudio));
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

/** Whether a sound may play — master switch & master volume override per-event toggles. */
export function soundAllowed(sound: SoundSettings, event: SoundEvent): boolean {
  return sound.enabled && sound.masterVolume > 0 && sound.volume > 0 && sound.events[event];
}

export function effectiveSoundVolume(sound: SoundSettings): number {
  return Math.round((sound.volume * sound.masterVolume) / 100);
}
