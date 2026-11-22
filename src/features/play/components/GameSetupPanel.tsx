import { GraduationCap, Loader2, Play, Shuffle, Swords } from "lucide-react";
import type { ReactNode } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_LEVELS } from "@/lib/chess/difficulty";
import { TIME_CONTROLS } from "@/lib/chess/timeControls";
import type { SideChoice } from "@/lib/chess/types";
import type { EngineSettings, GameMode } from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

import type { GameSettings } from "../types";
import { ThinkTimeSelector } from "./ThinkTimeSelector";

interface GameSetupPanelProps {
  settings: GameSettings;
  engineSettings: EngineSettings;
  engineLoading: boolean;
  engineFailed: boolean;
  onChange: (patch: Partial<GameSettings>) => void;
  onEngineChange: (patch: Partial<EngineSettings>) => void;
  onStart: () => void;
}

const MODES: { id: GameMode; label: string; description: string; icon: ReactNode }[] = [
  {
    id: "normal",
    label: "Обычная игра",
    description: "Чистая партия против Stockfish без подсказок",
    icon: <Swords className="size-4 text-muted-foreground" aria-hidden />,
  },
  {
    id: "coach",
    label: "Chess Coach",
    description: "Анализ каждого хода, объяснение ошибок и разбор",
    icon: <GraduationCap className="size-4 text-primary" aria-hidden />,
  },
];

const SIDES: { id: SideChoice; label: string; icon: ReactNode }[] = [
  { id: "w", label: "Белые", icon: <PieceImage color="w" type="k" className="size-8" /> },
  { id: "b", label: "Чёрные", icon: <PieceImage color="b" type="k" className="size-8" /> },
  { id: "random", label: "Случайно", icon: <Shuffle className="size-6 text-muted-foreground" /> },
];

export function GameSetupPanel({
  settings,
  engineSettings,
  engineLoading,
  engineFailed,
  onChange,
  onEngineChange,
  onStart,
}: GameSetupPanelProps) {
  const isCoach = settings.mode === "coach";

  return (
    <section className="panel animate-rise p-5" aria-label="Настройки партии">
      <p className="eyebrow">Новая партия</p>
      <h1 className="mt-1 font-display text-3xl leading-tight">
        {isCoach ? "Игра с тренером" : "Игра против Stockfish"}
      </h1>

      <Field label="Режим игры">
        <div
          role="radiogroup"
          aria-label="Режим игры"
          className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
        >
          {MODES.map((mode) => (
            <Option
              key={mode.id}
              checked={settings.mode === mode.id}
              onSelect={() => onChange({ mode: mode.id })}
              className="items-start justify-start gap-1.5 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {mode.icon}
                {mode.label}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {mode.description}
              </span>
            </Option>
          ))}
        </div>
      </Field>

      <Field label="Ваша сторона">
        <div role="radiogroup" aria-label="Ваша сторона" className="grid grid-cols-3 gap-2">
          {SIDES.map((side) => (
            <Option
              key={side.id}
              checked={settings.side === side.id}
              onSelect={() => onChange({ side: side.id })}
            >
              <span className="grid h-9 place-items-center">{side.icon}</span>
              <span className="text-xs font-medium">{side.label}</span>
            </Option>
          ))}
        </div>
      </Field>

      <Field label="Сложность">
        <div role="radiogroup" aria-label="Сложность" className="space-y-1.5">
          {DIFFICULTY_LEVELS.map((level, i) => (
            <Option
              key={level.id}
              checked={settings.difficulty === level.id}
              onSelect={() => onChange({ difficulty: level.id })}
              className="flex-row justify-start gap-3 px-3 py-2 text-left"
            >
              <span className="flex gap-0.5" aria-hidden>
                {DIFFICULTY_LEVELS.map((_, j) => (
                  <span
                    key={j}
                    className={cn("h-3 w-1 rounded-full", j <= i ? "bg-primary" : "bg-input")}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{level.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {level.description}
                </span>
              </span>
            </Option>
          ))}
        </div>
      </Field>

      <Field label="Время мышления бота">
        <ThinkTimeSelector
          thinkTime={engineSettings.thinkTime}
          customSeconds={engineSettings.customSeconds}
          onChange={onEngineChange}
          variant="grid"
        />
      </Field>

      <Field label="Контроль времени">
        {isCoach ? (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
            В режиме <span className="font-medium text-foreground">Chess Coach</span> партия идёт
            без часов (<span className="font-mono text-foreground">∞</span>), чтобы вы могли
            спокойно изучать объяснения и исправлять ходы.
          </div>
        ) : (
          <div role="radiogroup" aria-label="Контроль времени" className="grid grid-cols-3 gap-2">
            {TIME_CONTROLS.map((tc) => (
              <Option
                key={tc.id}
                checked={settings.timeControl === tc.id}
                onSelect={() => onChange({ timeControl: tc.id })}
              >
                <span className="font-mono text-base">{tc.label}</span>
                <span className="text-[11px] text-muted-foreground">{tc.category}</span>
              </Option>
            ))}
          </div>
        )}
      </Field>

      <Button
        variant="ivory"
        size="lg"
        className="mt-6 h-11 w-full"
        onClick={onStart}
        disabled={engineFailed}
      >
        {engineLoading ? <Loader2 className="animate-spin" /> : <Play />}
        {engineLoading
          ? "Начать (движок загружается…)"
          : isCoach
            ? "Начать с тренером"
            : "Начать партию"}
      </Button>
      {engineFailed && (
        <p className="mt-2 text-center text-xs text-destructive">
          Движок недоступен — см. ошибку ниже.
        </p>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="eyebrow mb-2">{label}</p>
      {children}
    </div>
  );
}

function Option({
  checked,
  onSelect,
  className,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-primary/70 bg-primary/10 text-foreground"
          : "border-border bg-secondary/60 text-foreground/85 hover:border-input hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
