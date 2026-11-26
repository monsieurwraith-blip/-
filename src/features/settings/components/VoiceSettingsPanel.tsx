import { Check, Gauge, Play, RotateCcw, Square, Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getCoachPortrait } from "@/features/coach/coachMood";
import {
  COACH_PERSONAS,
  VOICE_MODES,
  type CoachPersonaId,
  type VoiceMode,
} from "@/lib/settings/settings";
import {
  DEFAULT_VOICE_DISPLAY,
  getLastSpokenPhrase,
  isSpeechSupported,
  listSpeechVoices,
  previewCoachVoice,
  repeatLastCoachPhrase,
  stopSpeaking,
} from "@/lib/sound/speech";
import { cn } from "@/lib/utils";

import { useSettings } from "../SettingsProvider";
import { SectionTitle, SettingRow } from "./SettingRow";

const AUTO_VOICE_VALUE = "__auto__";

export function VoiceSettingsPanel() {
  const { settings, update } = useSettings();
  const { voice, sound } = settings;
  const off = !voice.enabled;
  const supported = isSpeechSupported();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listSpeechVoices());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoices(listSpeechVoices());
    refresh();
    const synth = window.speechSynthesis;
    synth.addEventListener?.("voiceschanged", refresh);
    return () => {
      synth.removeEventListener?.("voiceschanged", refresh);
    };
  }, [supported]);

  useEffect(() => {
    if (!testing) return;
    const timer = setTimeout(() => setTesting(false), 5500);
    return () => clearTimeout(timer);
  }, [testing]);

  const VolumeIcon = off || voice.volume === 0 ? VolumeX : voice.volume < 50 ? Volume1 : Volume2;

  const selectedValue =
    voice.voiceURI && voices.some((v) => v.voiceURI === voice.voiceURI)
      ? voice.voiceURI
      : AUTO_VOICE_VALUE;

  const handleTest = () => {
    if (testing) {
      stopSpeaking();
      setTesting(false);
      return;
    }
    const started = previewCoachVoice(voice, sound.masterVolume);
    setTesting(started);
  };

  const hasLastPhrase = Boolean(getLastSpokenPhrase());

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Выберите 3D-образ и манеру наставника в панели AI Coach.">
          Персонаж тренера
        </SectionTitle>
        <div
          role="radiogroup"
          aria-label="Персонаж тренера"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {COACH_PERSONAS.map((persona) => {
            const selected = settings.coachPersona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-selected={selected}
                onClick={() => update({ coachPersona: persona.id as CoachPersonaId })}
                className="choice-card flex-row items-center gap-3 p-2.5"
              >
                <img
                  src={getCoachPortrait(persona.id)}
                  alt={persona.name}
                  className="size-12 shrink-0 rounded-xl border border-border object-cover object-top"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{persona.name}</span>
                  <span className="block truncate text-xs text-primary">{persona.role}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {persona.subtitle}
                  </span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-4">
        <SettingRow
          id="voice-enabled"
          label="Голосовой тренер ProChess"
          description="Автоматически озвучивает ошибки, тактические угрозы, подсказки и хорошие ходы на русском языке без наложения фраз."
        >
          <span className="w-8 text-right font-mono text-xs text-muted-foreground" aria-hidden>
            {voice.enabled ? "ВКЛ" : "ВЫКЛ"}
          </span>
          <Switch
            id="voice-enabled"
            checked={voice.enabled}
            onCheckedChange={(enabled) => {
              if (!enabled) stopSpeaking();
              update({ voice: { enabled } });
            }}
          />
        </SettingRow>

        <div className="setting-row" data-disabled={off}>
          <div className="min-w-0 flex-1">
            <label htmlFor="voice-select" className="text-sm font-medium">
              Выбор голоса
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              По умолчанию приоритет у {DEFAULT_VOICE_DISPLAY} (русский).
            </p>
          </div>
          <Select
            value={selectedValue}
            disabled={off || !supported}
            onValueChange={(val) =>
              update({ voice: { voiceURI: val === AUTO_VOICE_VALUE ? "" : val } })
            }
          >
            <SelectTrigger
              id="voice-select"
              aria-label="Выбор голоса"
              className="w-[14.5rem] shrink-0 border-border bg-secondary/70 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_VOICE_VALUE}>Автовыбор ({DEFAULT_VOICE_DISPLAY})</SelectItem>
              {voices.map((v) => (
                <SelectItem key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="setting-row" data-disabled={off}>
          <VolumeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-[6.5rem] text-xs text-muted-foreground">Громкость тренера</div>
          <Slider
            aria-label="Громкость тренера"
            value={[voice.volume]}
            min={0}
            max={100}
            step={1}
            disabled={off}
            onValueChange={([v]) => update({ voice: { volume: v ?? voice.volume } })}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {voice.volume}%
          </span>
        </div>

        <div className="setting-row" data-disabled={off}>
          <Gauge className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-[6.5rem] text-xs text-muted-foreground">Скорость речи</div>
          <Slider
            aria-label="Скорость речи"
            value={[Math.round(voice.rate * 10)]}
            min={6}
            max={16}
            step={1}
            disabled={off}
            onValueChange={([v]) =>
              update({ voice: { rate: Math.round(((v ?? 10) / 10) * 10) / 10 } })
            }
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {voice.rate.toLocaleString("ru-RU", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            ×
          </span>
        </div>

        <div className="setting-row flex-wrap">
          <p className="min-w-[12rem] flex-1 text-xs text-muted-foreground">
            {supported
              ? "Проверьте звучание или повторите последнюю реплику тренера."
              : "Синтез речи недоступен в текущей среде запуска."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasLastPhrase && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 whitespace-nowrap"
                disabled={!supported}
                onClick={() => repeatLastCoachPhrase(voice, sound.masterVolume)}
              >
                <RotateCcw className="size-3.5" />
                Повторить последнюю фразу
              </Button>
            )}
            <Button
              type="button"
              variant="panel"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              disabled={!supported}
              onClick={handleTest}
            >
              {testing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
              {testing ? "Остановить" : "Прослушать голос"}
            </Button>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle hint="Выберите, как часто тренер озвучивает события партии.">
          Режим комментариев
        </SectionTitle>
        <div
          role="radiogroup"
          aria-label="Режим комментариев голосового тренера"
          className="space-y-2"
        >
          {VOICE_MODES.map((m) => {
            const checked = voice.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={off}
                onClick={() => update({ voice: { mode: m.id as VoiceMode } })}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                  checked
                    ? "border-primary/70 bg-primary/10 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:border-input hover:bg-accent",
                )}
              >
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
