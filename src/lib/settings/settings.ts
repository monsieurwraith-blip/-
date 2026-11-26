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
import { PROCHESS_CHARACTERS, isCharacterId, type CharacterId } from "@/lib/characters/characters";
import { isBotId, type BotId } from "@/lib/chess/bots";
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

export const SOUND_PACKS = [
  { id: "wood", label: "Классический деревянный", description: "Тёплый стук турнирных фигур" },
  { id: "metal", label: "Металлический", description: "Чёткий стальной звон" },
  { id: "premium", label: "Премиальный клубный", description: "Глубокое резонансное звучание" },
  { id: "soft", label: "Мягкий", description: "Приглушённый бархатный отклик" },
  { id: "minimal", label: "Минималистичный", description: "Короткие тихие сигналы" },
] as const;
export type SoundPackId = (typeof SOUND_PACKS)[number]["id"];

export const LAYOUT_DENSITIES = [
  { id: "compact", label: "Компактный", description: "Максимум внимания на доске" },
  { id: "standard", label: "Стандартный", description: "Сбалансированный рабочий экран" },
  { id: "pro", label: "Расширенный ПРО", description: "Полная телеметрия и быстрые панели" },
] as const;
export type LayoutDensity = (typeof LAYOUT_DENSITIES)[number]["id"];

export const ANIMATION_LEVELS = [
  { id: "off", label: "Выключены", description: "Мгновенная перерисовка без задержек" },
  { id: "minimal", label: "Минимальные", description: "Только базовые переходы" },
  { id: "standard", label: "Стандартные", description: "Плавное движение фигур и панелей" },
  { id: "maximum", label: "Максимальные", description: "Блики золота, ауры и кинематографичность" },
] as const;
export type AnimationLevel = (typeof ANIMATION_LEVELS)[number]["id"];

export const COACH_PERSONAS = PROCHESS_CHARACTERS.map((c) => ({
  id: c.id,
  name: c.name,
  role: c.title,
  subtitle: c.subtitle,
}));
export type CoachPersonaId = CharacterId;

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
  {
    id: "balanced",
    label: "Сбалансированный",
    description: "Объективная турнирная игра",
    contempt: 0,
  },
  {
    id: "aggressive",
    label: "Агрессивный атакующий",
    description: "Ищет инициативу, жертвы и атаку на короля",
    contempt: 28,
  },
  {
    id: "solid",
    label: "Позиционный стратег",
    description: "Надёжная структура, профилактика и маневрирование",
    contempt: -12,
  },
  {
    id: "tactician",
    label: "Тактик",
    description: "Острые комбинации, связки и двойные удары",
    contempt: 20,
  },
  {
    id: "defender",
    label: "Защитник",
    description: "Крепкая оборона и нейтрализация угроз",
    contempt: -20,
  },
  {
    id: "counter",
    label: "Контратакующий",
    description: "Ждёт перегиба и наносит резкий встречный удар",
    contempt: 10,
  },
  {
    id: "cautious",
    label: "Осторожный",
    description: "Минимум риска и прочный контроль полей",
    contempt: -16,
  },
  {
    id: "grandmaster",
    label: "Стиль гроссмейстера",
    description: "Универсальный баланс давления и техники",
    contempt: 6,
  },
  {
    id: "random",
    label: "Случайный стиль",
    description: "Непредсказуемый характер соперника",
    contempt: 0,
  },
] as const;
export type PlayStyleId = (typeof PLAY_STYLES)[number]["id"];

export const HISTORICAL_STYLES = [
  {
    id: "modern",
    label: "Современный универсал",
    style: "grandmaster" as PlayStyleId,
    bonusSkill: 0,
  },
  {
    id: "romantic",
    label: "Романтическая атака XIX в.",
    style: "aggressive" as PlayStyleId,
    bonusSkill: 0,
  },
  { id: "classical", label: "Классическая школа", style: "solid" as PlayStyleId, bonusSkill: 0 },
  { id: "hypermodern", label: "Гипермодернизм", style: "counter" as PlayStyleId, bonusSkill: 0 },
  { id: "iron", label: "Железная защита", style: "defender" as PlayStyleId, bonusSkill: 1 },
] as const;
export type HistoricalStyleId = (typeof HISTORICAL_STYLES)[number]["id"];

export const DEPTH_LIMITS = [null, 6, 10, 14, 18] as const;
export type DepthLimit = (typeof DEPTH_LIMITS)[number];

export const ANALYSIS_DEPTHS = [12, 16, 20] as const;
export type AnalysisDepth = (typeof ANALYSIS_DEPTHS)[number];

export const BOARD_FRAME_STYLES = [
  { id: "obsidian", label: "Обсидиан" },
  { id: "minimal", label: "Минимал" },
  { id: "gold", label: "Золотая рама" },
  { id: "emerald", label: "Изумрудная" },
] as const;
export type BoardFrameStyle = (typeof BOARD_FRAME_STYLES)[number]["id"];

export const ARROW_STYLES = [
  { id: "classic", label: "Классические" },
  { id: "sharp", label: "Строгие терминал" },
  { id: "glow", label: "Свечение" },
] as const;
export type ArrowStyle = (typeof ARROW_STYLES)[number]["id"];

export const BOARD_SCALES = [
  { id: "compact", label: "Компактная (90%)" },
  { id: "medium", label: "Стандарт (100%)" },
  { id: "large", label: "Крупная (108%)" },
] as const;
export type BoardScale = (typeof BOARD_SCALES)[number]["id"];

export const ANIMATION_SPEEDS = [
  { id: "fast", label: "Быстро", ms: 110 },
  { id: "normal", label: "Обычно", ms: 190 },
  { id: "slow", label: "Плавно", ms: 320 },
] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number]["id"];

export interface SoundSettings {
  enabled: boolean;
  soundPack: SoundPackId;
  /** 0–100 global master volume across sound effects and voice coach. */
  masterVolume: number;
  /** 0–100 piece sound volume. */
  volume: number;
  /** 0–100 interface click volume. */
  uiVolume: number;
  /** 0–100 notification & achievement chime volume. */
  notificationVolume: number;
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
  coordinateColor: string;
  frameStyle: BoardFrameStyle;
  highlightLastMove: boolean;
  showLegalMoves: boolean;
  legalMoveColor: string;
  highlightCheck: boolean;
  checkColor: string;
  selectedColor: string;
  arrowStyle: ArrowStyle;
  boardScale: BoardScale;
  animations: boolean;
  animationSpeed: AnimationSpeed;
  animationLevel: AnimationLevel;
  autoClearDrawings: boolean;
  showCharacterInGame: boolean;
  showThreatOverlay: boolean;
  showComboOverlay: boolean;
  premovesEnabled: boolean;
  autoFlipPassAndPlay: boolean;
}

export type GameMode =
  | "normal"
  | "coach"
  | "blitz"
  | "rapid"
  | "bullet"
  | "arena"
  | "blindfold"
  | "no-mistakes"
  | "survival"
  | "pass-and-play";

/** Setup of the next game; remembered between launches. */
export interface GameSetupSettings {
  mode: GameMode;
  side: SideChoice;
  difficulty: DifficultyId;
  timeControl: TimeControlId;
  botId: BotId | null;
}

export interface EngineSettings {
  thinkTime: ThinkTimeId;
  /** Used when thinkTime is "custom". */
  customSeconds: number;
  /** Optional depth cap override (null = controlled by difficulty & think time). */
  depthLimit: DepthLimit;
  playStyle: PlayStyleId;
  historicalStyle: HistoricalStyleId;
  analysisDepth: AnalysisDepth;
}

export interface AppSettings {
  uiTheme: UiThemeId;
  layoutDensity: LayoutDensity;
  coachPersona: CoachPersonaId;
  coachDockSide: "right" | "left";
  hotkeysEnabled: boolean;
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
  layoutDensity: "standard",
  coachPersona: "grandmaster",
  coachDockSide: "right",
  hotkeysEnabled: true,
  playerName: "Гроссмейстер",
  pieceSet: DEFAULT_PIECE_SET,
  whitePieceSet: null,
  blackPieceSet: null,
  boardTheme: DEFAULT_BOARD_THEME,
  customBoard: { light: "#DCE6E0", dark: "#0F6E4A" },
  sound: {
    enabled: true,
    soundPack: "wood",
    masterVolume: 90,
    volume: 70,
    uiVolume: 60,
    notificationVolume: 75,
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
    coordinateColor: "auto",
    frameStyle: "obsidian",
    highlightLastMove: true,
    showLegalMoves: true,
    legalMoveColor: "#16c784",
    highlightCheck: true,
    checkColor: "#ef4444",
    selectedColor: "#16c784",
    arrowStyle: "classic",
    boardScale: "medium",
    animations: true,
    animationSpeed: "normal",
    animationLevel: "standard",
    autoClearDrawings: true,
    showCharacterInGame: true,
    showThreatOverlay: false,
    showComboOverlay: false,
    premovesEnabled: true,
    autoFlipPassAndPlay: true,
  },
  game: {
    mode: "normal",
    side: "w",
    difficulty: DEFAULT_DIFFICULTY,
    timeControl: DEFAULT_TIME_CONTROL,
    botId: null,
  },
  engine: {
    thinkTime: DEFAULT_THINK_TIME,
    customSeconds: DEFAULT_CUSTOM_THINK_S,
    depthLimit: null,
    playStyle: "balanced",
    historicalStyle: "modern",
    analysisDepth: 16,
  },
};

export function animationMs(speed: AnimationSpeed): number {
  return ANIMATION_SPEEDS.find((s) => s.id === speed)?.ms ?? 190;
}

const HEX = /^#[0-9a-f]{6}$/i;
const VALID_MODES: readonly GameMode[] = [
  "normal",
  "coach",
  "blitz",
  "rapid",
  "bullet",
  "arena",
  "blindfold",
  "no-mistakes",
  "survival",
  "pass-and-play",
];

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

function hexOrAuto(value: unknown, fallback: string): string {
  if (value === "auto") return "auto";
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

export function isCoachModeLike(mode: GameMode): boolean {
  return mode === "coach";
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

  const playerNameRaw =
    typeof o["playerName"] === "string" ? o["playerName"].trim().slice(0, 28) : "";

  return {
    uiTheme: isUiThemeId(o["uiTheme"]) ? o["uiTheme"] : d.uiTheme,
    layoutDensity: LAYOUT_DENSITIES.some((x) => x.id === o["layoutDensity"])
      ? (o["layoutDensity"] as LayoutDensity)
      : d.layoutDensity,
    coachPersona:
      o["coachPersona"] === "strict"
        ? "dark_gm"
        : isCharacterId(o["coachPersona"])
          ? o["coachPersona"]
          : d.coachPersona,
    coachDockSide: o["coachDockSide"] === "left" ? "left" : "right",
    hotkeysEnabled: bool(o["hotkeysEnabled"], d.hotkeysEnabled),
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
      soundPack: SOUND_PACKS.some((p) => p.id === sound["soundPack"])
        ? (sound["soundPack"] as SoundPackId)
        : d.sound.soundPack,
      masterVolume: clampVolume(sound["masterVolume"], d.sound.masterVolume),
      volume: clampVolume(sound["volume"], d.sound.volume),
      uiVolume: clampVolume(sound["uiVolume"], d.sound.uiVolume),
      notificationVolume: clampVolume(sound["notificationVolume"], d.sound.notificationVolume),
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
      coordinateColor: hexOrAuto(board["coordinateColor"], d.board.coordinateColor),
      frameStyle: BOARD_FRAME_STYLES.some((f) => f.id === board["frameStyle"])
        ? (board["frameStyle"] as BoardFrameStyle)
        : d.board.frameStyle,
      highlightLastMove: bool(board["highlightLastMove"], d.board.highlightLastMove),
      showLegalMoves: bool(board["showLegalMoves"], d.board.showLegalMoves),
      legalMoveColor: hex(board["legalMoveColor"], d.board.legalMoveColor),
      highlightCheck: bool(board["highlightCheck"], d.board.highlightCheck),
      checkColor: hex(board["checkColor"], d.board.checkColor),
      selectedColor: hex(board["selectedColor"], d.board.selectedColor),
      arrowStyle: ARROW_STYLES.some((a) => a.id === board["arrowStyle"])
        ? (board["arrowStyle"] as ArrowStyle)
        : d.board.arrowStyle,
      boardScale: BOARD_SCALES.some((s) => s.id === board["boardScale"])
        ? (board["boardScale"] as BoardScale)
        : d.board.boardScale,
      animations: bool(board["animations"], d.board.animations),
      animationSpeed: ANIMATION_SPEEDS.some((s) => s.id === speed)
        ? (speed as AnimationSpeed)
        : d.board.animationSpeed,
      animationLevel: ANIMATION_LEVELS.some((a) => a.id === board["animationLevel"])
        ? (board["animationLevel"] as AnimationLevel)
        : d.board.animationLevel,
      autoClearDrawings: bool(board["autoClearDrawings"], d.board.autoClearDrawings),
      showCharacterInGame: bool(board["showCharacterInGame"], d.board.showCharacterInGame),
      showThreatOverlay: bool(board["showThreatOverlay"], d.board.showThreatOverlay),
      showComboOverlay: bool(board["showComboOverlay"], d.board.showComboOverlay),
      premovesEnabled: bool(board["premovesEnabled"], d.board.premovesEnabled),
      autoFlipPassAndPlay: bool(board["autoFlipPassAndPlay"], d.board.autoFlipPassAndPlay),
    },
    game: {
      mode: VALID_MODES.includes(game["mode"] as GameMode)
        ? (game["mode"] as GameMode)
        : d.game.mode,
      side: side === "w" || side === "b" || side === "random" ? side : d.game.side,
      difficulty: DIFFICULTY_LEVELS.some((l) => l.id === difficulty)
        ? (difficulty as DifficultyId)
        : d.game.difficulty,
      timeControl: TIME_CONTROLS.some((t) => t.id === timeControl)
        ? (timeControl as TimeControlId)
        : d.game.timeControl,
      botId: game["botId"] === null ? null : isBotId(game["botId"]) ? game["botId"] : d.game.botId,
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
      historicalStyle: HISTORICAL_STYLES.some((s) => s.id === engine["historicalStyle"])
        ? (engine["historicalStyle"] as HistoricalStyleId)
        : d.engine.historicalStyle,
      analysisDepth: ANALYSIS_DEPTHS.includes(engine["analysisDepth"] as AnalysisDepth)
        ? (engine["analysisDepth"] as AnalysisDepth)
        : d.engine.analysisDepth,
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
  if (!sound.enabled || sound.masterVolume <= 0 || !sound.events[event]) return false;
  if (event === "menu") return sound.uiVolume > 0;
  if (event === "gameEnd" || event === "result")
    return sound.notificationVolume > 0 || sound.volume > 0;
  return sound.volume > 0;
}

export function effectiveSoundVolume(
  sound: SoundSettings,
  channel: "piece" | "ui" | "notification" = "piece",
): number {
  const ch =
    channel === "ui"
      ? sound.uiVolume
      : channel === "notification"
        ? sound.notificationVolume
        : sound.volume;
  return Math.round((ch * sound.masterVolume) / 100);
}
