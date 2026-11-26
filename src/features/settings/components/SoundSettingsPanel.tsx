import { Bell, Music, Play, Sliders, Volume1, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SOUND_PACKS, type SoundEvent, type SoundPackId } from "@/lib/settings/settings";
import type { SoundClip } from "@/lib/sound/gameSounds";
import { cn } from "@/lib/utils";

import { useSettings } from "../SettingsProvider";
import { SectionTitle, SettingRow, SwitchRow } from "./SettingRow";

const EVENTS: { id: SoundEvent; label: string; description: string; clips: SoundClip[] }[] = [
  {
    id: "move",
    label: "Перемещение фигуры",
    description: "Мягкий щелчок обычного хода",
    clips: ["move"],
  },
  {
    id: "capture",
    label: "Взятие фигуры",
    description: "Акцентный удар при взятии",
    clips: ["capture"],
  },
  {
    id: "check",
    label: "Шах и мат",
    description: "Предупреждающий и финальный аккорды",
    clips: ["check", "checkmate"],
  },
  {
    id: "gameEnd",
    label: "Ничья и пауза",
    description: "Пат, повторение или правило 50 ходов",
    clips: ["gameEnd"],
  },
  {
    id: "result",
    label: "Победа и поражение",
    description: "Мелодия результата партии",
    clips: ["win", "loss"],
  },
  {
    id: "menu",
    label: "Интерфейс и меню",
    description: "Деликатный клик при нажатии командных кнопок",
    clips: ["menu"],
  },
];

export function SoundSettingsPanel() {
  const { settings, update, preview } = useSettings();
  const { sound } = settings;
  const off = !sound.enabled;
  const VolumeIcon = off || sound.volume === 0 ? VolumeX : sound.volume < 50 ? Volume1 : Volume2;

  return (
    <div className="space-y-6">
      <section className="panel p-4">
        <SettingRow
          id="sound-enabled"
          label="Звуковые эффекты (Master)"
          description="Общий выключатель акустики ходов, интерфейса и уведомлений."
        >
          <span className="w-8 text-right font-mono text-xs text-muted-foreground" aria-hidden>
            {sound.enabled ? "ВКЛ" : "ВЫКЛ"}
          </span>
          <Switch
            id="sound-enabled"
            checked={sound.enabled}
            onCheckedChange={(enabled) => update({ sound: { enabled } })}
          />
        </SettingRow>

        <div className="setting-row">
          <Sliders className="size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-[8.5rem] text-xs text-foreground">Общая громкость</div>
          <Slider
            aria-label="Общая громкость"
            value={[sound.masterVolume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => update({ sound: { masterVolume: v ?? sound.masterVolume } })}
            onValueCommit={() => preview("move")}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {sound.masterVolume}%
          </span>
        </div>

        <div className="setting-row" data-disabled={off}>
          <VolumeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-[8.5rem] text-xs text-muted-foreground">Громкость фигур</div>
          <Slider
            aria-label="Громкость фигур"
            value={[sound.volume]}
            min={0}
            max={100}
            step={1}
            disabled={off}
            onValueChange={([v]) => update({ sound: { volume: v ?? sound.volume } })}
            onValueCommit={() => preview("move")}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {sound.volume}%
          </span>
        </div>

        <div className="setting-row" data-disabled={off}>
          <Music className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-[8.5rem] text-xs text-muted-foreground">Громкость интерфейса</div>
          <Slider
            aria-label="Громкость интерфейса"
            value={[sound.uiVolume]}
            min={0}
            max={100}
            step={1}
            disabled={off}
            onValueChange={([v]) => update({ sound: { uiVolume: v ?? sound.uiVolume } })}
            onValueCommit={() => preview("menu")}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {sound.uiVolume}%
          </span>
        </div>

        <div className="setting-row" data-disabled={off}>
          <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-[8.5rem] text-xs text-muted-foreground">Уведомления</div>
          <Slider
            aria-label="Громкость уведомлений"
            value={[sound.notificationVolume]}
            min={0}
            max={100}
            step={1}
            disabled={off}
            onValueChange={([v]) =>
              update({ sound: { notificationVolume: v ?? sound.notificationVolume } })
            }
            onValueCommit={() => preview("achievement")}
            className="flex-1"
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {sound.notificationVolume}%
          </span>
        </div>
      </section>

      <section>
        <SectionTitle hint="5 синтезированных звуковых наборов для ходов и интерфейса.">
          Звуковые наборы
        </SectionTitle>
        <div
          role="radiogroup"
          aria-label="Звуковой набор"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {SOUND_PACKS.map((pack) => {
            const selected = sound.soundPack === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={off}
                onClick={() => {
                  update({ sound: { soundPack: pack.id as SoundPackId } });
                  window.setTimeout(() => preview("move"), 20);
                }}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <span className="text-sm font-medium">{pack.label}</span>
                <span className="text-xs text-muted-foreground">{pack.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="Нажмите ▶, чтобы прослушать эффект.">События</SectionTitle>
        <div className="panel px-4">
          {EVENTS.map((e) => (
            <SwitchRow
              key={e.id}
              id={`sound-${e.id}`}
              label={e.label}
              description={e.description}
              checked={sound.events[e.id]}
              disabled={off}
              onChange={(value) => update({ sound: { events: { [e.id]: value } } })}
              extra={e.clips.map((clip) => {
                const name =
                  clip === "win"
                    ? "Победа"
                    : clip === "loss"
                      ? "Поражение"
                      : clip === "checkmate"
                        ? "Мат"
                        : null;
                return (
                  <Button
                    key={clip}
                    variant="ghost"
                    size={name ? "sm" : "icon"}
                    className={name ? "h-8 gap-1 px-2 text-xs" : "size-8"}
                    disabled={off}
                    onClick={() => preview(clip)}
                    aria-label={`Прослушать: ${(name ?? e.label).toLowerCase()}`}
                    title={`Прослушать: ${(name ?? e.label).toLowerCase()}`}
                  >
                    <Play /> {name}
                  </Button>
                );
              })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
