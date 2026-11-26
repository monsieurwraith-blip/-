import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_SETTINGS,
  effectiveSoundVolume,
  loadSettings,
  parseSettings,
  saveSettings,
  soundAllowed,
  type AppSettings,
  type BoardDisplaySettings,
  type EngineSettings,
  type GameSetupSettings,
  type SoundSettings,
  type VoiceCoachSettings,
} from "@/lib/settings/settings";
import { eventForClip, type SoundClip } from "@/lib/sound/gameSounds";
import { playClip } from "@/lib/sound/synth";

export interface SettingsPatch {
  uiTheme?: AppSettings["uiTheme"];
  layoutDensity?: AppSettings["layoutDensity"];
  coachPersona?: AppSettings["coachPersona"];
  coachDockSide?: AppSettings["coachDockSide"];
  hotkeysEnabled?: AppSettings["hotkeysEnabled"];
  playerName?: AppSettings["playerName"];
  pieceSet?: AppSettings["pieceSet"];
  whitePieceSet?: AppSettings["whitePieceSet"];
  blackPieceSet?: AppSettings["blackPieceSet"];
  boardTheme?: AppSettings["boardTheme"];
  customBoard?: Partial<AppSettings["customBoard"]>;
  sound?: Partial<Omit<SoundSettings, "events">> & { events?: Partial<SoundSettings["events"]> };
  voice?: Partial<VoiceCoachSettings>;
  board?: Partial<BoardDisplaySettings>;
  game?: Partial<GameSetupSettings>;
  engine?: Partial<EngineSettings>;
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: SettingsPatch) => void;
  updateBoard: (patch: Partial<BoardDisplaySettings>) => void;
  replaceSettings: (next: AppSettings) => void;
  reset: () => void;
  /** Plays a clip if the sound settings allow it. */
  play: (clip: SoundClip) => void;
  /** Plays a clip for previews in the settings, ignoring per-event toggles but not the master switch. */
  preview: (clip: SoundClip) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
  updateBoard: () => undefined,
  replaceSettings: () => undefined,
  reset: () => undefined,
  play: () => undefined,
  preview: () => undefined,
});

export function mergeSettings(current: AppSettings, patch: SettingsPatch): AppSettings {
  return parseSettings({
    ...current,
    ...(patch.uiTheme !== undefined ? { uiTheme: patch.uiTheme } : {}),
    ...(patch.layoutDensity !== undefined ? { layoutDensity: patch.layoutDensity } : {}),
    ...(patch.coachPersona !== undefined ? { coachPersona: patch.coachPersona } : {}),
    ...(patch.coachDockSide !== undefined ? { coachDockSide: patch.coachDockSide } : {}),
    ...(patch.hotkeysEnabled !== undefined ? { hotkeysEnabled: patch.hotkeysEnabled } : {}),
    ...(patch.playerName !== undefined ? { playerName: patch.playerName } : {}),
    ...(patch.pieceSet !== undefined ? { pieceSet: patch.pieceSet } : {}),
    ...(patch.whitePieceSet !== undefined ? { whitePieceSet: patch.whitePieceSet } : {}),
    ...(patch.blackPieceSet !== undefined ? { blackPieceSet: patch.blackPieceSet } : {}),
    ...(patch.boardTheme !== undefined ? { boardTheme: patch.boardTheme } : {}),
    customBoard: { ...current.customBoard, ...patch.customBoard },
    sound: {
      ...current.sound,
      ...patch.sound,
      events: { ...current.sound.events, ...patch.sound?.events },
    },
    voice: { ...current.voice, ...patch.voice },
    board: { ...current.board, ...patch.board },
    game: { ...current.game, ...patch.game },
    engine: { ...current.engine, ...patch.engine },
  });
}

function channelForClip(clip: SoundClip): "piece" | "ui" | "notification" {
  if (clip === "menu") return "ui";
  if (clip === "gameEnd" || clip === "win" || clip === "loss" || clip === "achievement") {
    return "notification";
  }
  return "piece";
}

interface SettingsProviderProps {
  children: ReactNode;
  loadImmediately?: boolean;
}

/** All user settings, saved locally and restored on the next launch. */
export function SettingsProvider({ children, loadImmediately = false }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadImmediately ? loadSettings(window.localStorage) : DEFAULT_SETTINGS,
  );

  useEffect(() => {
    if (loadImmediately) return;
    setSettings(loadSettings(window.localStorage));
  }, [loadImmediately]);

  useEffect(() => {
    document.documentElement.dataset["uiTheme"] = settings.uiTheme;
    document.documentElement.dataset["animationLevel"] = settings.board.animationLevel;
    document.documentElement.dataset["layoutDensity"] = settings.layoutDensity;
  }, [settings.uiTheme, settings.board.animationLevel, settings.layoutDensity]);

  const commit = useCallback((next: AppSettings) => {
    saveSettings(window.localStorage, next);
    return next;
  }, []);

  const update = useCallback(
    (patch: SettingsPatch) => setSettings((current) => commit(mergeSettings(current, patch))),
    [commit],
  );

  const updateBoard = useCallback(
    (patch: Partial<BoardDisplaySettings>) => update({ board: patch }),
    [update],
  );

  const replaceSettings = useCallback(
    (next: AppSettings) => setSettings(commit(parseSettings(next))),
    [commit],
  );

  const reset = useCallback(() => setSettings(commit(DEFAULT_SETTINGS)), [commit]);

  const play = useCallback(
    (clip: SoundClip) => {
      if (clip === "mistake" || clip === "achievement") {
        if (!settings.sound.enabled || settings.sound.masterVolume <= 0) return;
        const vol = effectiveSoundVolume(settings.sound, "notification");
        if (vol > 0) playClip(clip, vol, settings.sound.soundPack);
        return;
      }
      if (soundAllowed(settings.sound, eventForClip(clip))) {
        playClip(
          clip,
          effectiveSoundVolume(settings.sound, channelForClip(clip)),
          settings.sound.soundPack,
        );
      }
    },
    [settings.sound],
  );

  const preview = useCallback(
    (clip: SoundClip) => {
      if (!settings.sound.enabled || settings.sound.masterVolume <= 0) return;
      const vol = effectiveSoundVolume(settings.sound, channelForClip(clip));
      if (vol > 0) playClip(clip, vol, settings.sound.soundPack);
    },
    [settings.sound],
  );

  const value = useMemo(
    () => ({ settings, update, updateBoard, replaceSettings, reset, play, preview }),
    [settings, update, updateBoard, replaceSettings, reset, play, preview],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
