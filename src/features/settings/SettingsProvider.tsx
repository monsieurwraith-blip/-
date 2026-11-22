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
  loadSettings,
  parseSettings,
  saveSettings,
  soundAllowed,
  type AppSettings,
  type BoardDisplaySettings,
  type EngineSettings,
  type GameSetupSettings,
  type SoundSettings,
} from "@/lib/settings/settings";
import { eventForClip, type SoundClip } from "@/lib/sound/gameSounds";
import { playClip } from "@/lib/sound/synth";

export interface SettingsPatch {
  pieceSet?: AppSettings["pieceSet"];
  boardTheme?: AppSettings["boardTheme"];
  customBoard?: Partial<AppSettings["customBoard"]>;
  sound?: Partial<Omit<SoundSettings, "events">> & { events?: Partial<SoundSettings["events"]> };
  board?: Partial<BoardDisplaySettings>;
  game?: Partial<GameSetupSettings>;
  engine?: Partial<EngineSettings>;
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: SettingsPatch) => void;
  reset: () => void;
  /** Plays a clip if the sound settings allow it. */
  play: (clip: SoundClip) => void;
  /** Plays a clip for previews in the settings, ignoring per-event toggles but not the master switch. */
  preview: (clip: SoundClip) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
  reset: () => undefined,
  play: () => undefined,
  preview: () => undefined,
});

export function mergeSettings(current: AppSettings, patch: SettingsPatch): AppSettings {
  return parseSettings({
    ...current,
    ...(patch.pieceSet ? { pieceSet: patch.pieceSet } : {}),
    ...(patch.boardTheme ? { boardTheme: patch.boardTheme } : {}),
    customBoard: { ...current.customBoard, ...patch.customBoard },
    sound: {
      ...current.sound,
      ...patch.sound,
      events: { ...current.sound.events, ...patch.sound?.events },
    },
    board: { ...current.board, ...patch.board },
    game: { ...current.game, ...patch.game },
    engine: { ...current.engine, ...patch.engine },
  });
}

interface SettingsProviderProps {
  children: ReactNode;
  /**
   * Read storage during the first render. Only for client-only renderers (desktop app);
   * the SSR web app reads after hydration to avoid a mismatch.
   */
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

  const commit = useCallback((next: AppSettings) => {
    saveSettings(window.localStorage, next);
    return next;
  }, []);

  const update = useCallback(
    (patch: SettingsPatch) => setSettings((current) => commit(mergeSettings(current, patch))),
    [commit],
  );

  const reset = useCallback(() => setSettings(commit(DEFAULT_SETTINGS)), [commit]);

  const play = useCallback(
    (clip: SoundClip) => {
      if (soundAllowed(settings.sound, eventForClip(clip))) playClip(clip, settings.sound.volume);
    },
    [settings.sound],
  );

  const preview = useCallback(
    (clip: SoundClip) => {
      if (settings.sound.enabled) playClip(clip, settings.sound.volume);
    },
    [settings.sound],
  );

  const value = useMemo(
    () => ({ settings, update, reset, play, preview }),
    [settings, update, reset, play, preview],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
