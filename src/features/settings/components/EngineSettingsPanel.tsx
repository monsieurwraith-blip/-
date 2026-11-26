import { Layers, Sparkles, Swords } from "lucide-react";

import { ThinkTimeSelector } from "@/features/play/components/ThinkTimeSelector";
import {
  ANALYSIS_DEPTHS,
  DEPTH_LIMITS,
  HISTORICAL_STYLES,
  PLAY_STYLES,
  type AnalysisDepth,
  type DepthLimit,
  type HistoricalStyleId,
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
        <SectionTitle hint="Ограничение глубины расчёта Stockfish (полуходы) в игре.">
          Глубина игры бота (Depth Limit)
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
        <SectionTitle hint="Целевая глубина расчёта в Лаборатории анализа.">
          Глубина анализа (MultiPV 3)
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {ANALYSIS_DEPTHS.map((d) => {
            const selected = engine.analysisDepth === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => update({ engine: { analysisDepth: d as AnalysisDepth } })}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-2 font-mono text-xs font-medium transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Depth {d}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="Персонализированный характер игры движка (9 стилей).">
          Стиль игры Stockfish
        </SectionTitle>
        <div
          role="radiogroup"
          aria-label="Стиль игры движка"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
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
                  "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-foreground"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                <Swords className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-medium">{style.label}</span>
                  <span className="block text-xs text-muted-foreground">{style.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="Классические шахматные школы для спарринга.">
          Историческая школа
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HISTORICAL_STYLES.map((st) => {
            const selected = engine.historicalStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => update({ engine: { historicalStyle: st.id as HistoricalStyleId } })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                  selected
                    ? "border-primary/70 bg-primary/15 text-primary"
                    : "border-border bg-secondary/60 text-foreground/85 hover:bg-accent",
                )}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
