import { Layers, Swords } from "lucide-react";

import { ThinkTimeSelector } from "@/features/play/components/ThinkTimeSelector";
import {
  DEPTH_LIMITS,
  PLAY_STYLES,
  type DepthLimit,
  type PlayStyleId,
} from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

import { useSettings } from "../SettingsProvider";
import { SectionTitle } from "./SettingRow";

export function EngineSettingsPanel() {
  const { settings, update } = useSettings();
  const { engine } = settings;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Сколько времени Stockfish анализирует позицию перед каждым ходом. Применяется к следующим ходам и сохраняется между запусками.">
          Время мышления бота
        </SectionTitle>
        <div className="panel p-4">
          <ThinkTimeSelector
            thinkTime={engine.thinkTime}
            customSeconds={engine.customSeconds}
            onChange={(patch) => update({ engine: patch })}
            variant="grid"
          />
        </div>
      </section>

      <section>
        <SectionTitle hint="Ограничение глубины расчёта Stockfish (полуходы).">
          Глубина анализа (Depth Limit)
        </SectionTitle>
        <div
          role="radiogroup"
          aria-label="Ограничение глубины анализа"
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {DEPTH_LIMITS.map((depth) => {
            const selected = engine.depthLimit === depth;
            return (
              <button
                key={String(depth)}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ engine: { depthLimit: depth as DepthLimit } })}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border px-2.5 py-2.5 text-center transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <Layers className="mb-1 size-3.5 text-primary" aria-hidden />
                <span className="font-mono text-xs font-medium">
                  {depth === null ? "Авто" : `Depth ${depth}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="Выбор характера игры при равноценных продолжениях (MultiPV).">
          Стиль игры Stockfish
        </SectionTitle>
        <div role="radiogroup" aria-label="Стиль игры движка" className="space-y-2">
          {PLAY_STYLES.map((style) => {
            const selected = engine.playStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ engine: { playStyle: style.id as PlayStyleId } })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <Swords className="size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-medium">{style.label}</span>
                  <span className="block text-xs text-muted-foreground">{style.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
