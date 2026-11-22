import { Play, Volume1, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SoundEvent } from "@/lib/settings/settings";
import type { SoundClip } from "@/lib/sound/gameSounds";

import { useSettings } from "../SettingsProvider";
import { SectionTitle, SettingRow, SwitchRow } from "./SettingRow";

const EVENTS: { id: SoundEvent; label: string; description: string; clips: SoundClip[] }[] = [
  { id: "move", label: "Перемещение фигуры", description: "Каждый обычный ход", clips: ["move"] },
  {
    id: "capture",
    label: "Взятие фигуры",
    description: "Когда фигура забирает другую",
    clips: ["capture"],
  },
  { id: "check", label: "Шах", description: "Ход, объявляющий шах или мат", clips: ["check"] },
  {
    id: "gameEnd",
    label: "Окончание партии",
    description: "Ничья: пат, повторение, правило 50 ходов",
    clips: ["gameEnd"],
  },
  {
    id: "result",
    label: "Победа и поражение",
    description: "Мелодия результата партии",
    clips: ["win", "loss"],
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
          label="Sound Effects"
          description="Все игровые звуки. Если выключено, не играет ни один эффект."
        >
          <span className="w-8 text-right font-mono text-xs text-muted-foreground" aria-hidden>
            {sound.enabled ? "ON" : "OFF"}
          </span>
          <Switch
            id="sound-enabled"
            checked={sound.enabled}
            onCheckedChange={(enabled) => update({ sound: { enabled } })}
          />
        </SettingRow>
        <div className="setting-row" data-disabled={off}>
          <VolumeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            aria-label="Громкость"
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
                const name = clip === "win" ? "Победа" : clip === "loss" ? "Поражение" : null;
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
