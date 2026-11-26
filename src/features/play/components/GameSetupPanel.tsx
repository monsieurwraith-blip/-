import {
  Bot,
  Clock,
  Crown,
  EyeOff,
  Flame,
  GraduationCap,
  Loader2,
  Play,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { useSettings } from "@/features/settings/SettingsProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getBotById, NAMED_BOTS, type BotId } from "@/lib/chess/bots";

import { PieceImage } from "@/components/chess/PieceImage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_LEVELS } from "@/lib/chess/difficulty";
import { TIME_CONTROLS } from "@/lib/chess/timeControls";
import type { SideChoice } from "@/lib/chess/types";
import {
  HISTORICAL_STYLES,
  PLAY_STYLES,
  type EngineSettings,
  type GameMode,
  type HistoricalStyleId,
  type PlayStyleId,
} from "@/lib/settings/settings";
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
    label: "Классическая",
    description: "Чистая партия против Stockfish 19",
    icon: <Swords className="size-3.5 text-muted-foreground" aria-hidden />,
  },
  {
    id: "coach",
    label: "Chess Coach",
    description: "Оценка ходов, подсказки и 3D-наставник",
    icon: <GraduationCap className="size-3.5 text-primary" aria-hidden />,
  },
  {
    id: "blitz",
    label: "Блиц",
    description: "Динамичная игра 3+2 / 5+0",
    icon: <Zap className="size-3.5 text-warning" aria-hidden />,
  },
  {
    id: "rapid",
    label: "Рапид",
    description: "Турнирный контроль 10+0 / 15+10",
    icon: <Clock className="size-3.5 text-primary" aria-hidden />,
  },
  {
    id: "bullet",
    label: "Пуля",
    description: "Сверхбыстрая реакция 1+0",
    icon: <Flame className="size-3.5 text-destructive" aria-hidden />,
  },
  {
    id: "arena",
    label: "Арена PRO",
    description: "Соревновательная партия с телеметрией",
    icon: <Crown className="size-3.5 text-primary" aria-hidden />,
  },
  {
    id: "blindfold",
    label: "Игра вслепую",
    description: "Доска со скрытыми фигурами для памяти",
    icon: <EyeOff className="size-3.5 text-muted-foreground" aria-hidden />,
  },
  {
    id: "no-mistakes",
    label: "Без ошибок",
    description: "Строгая дисциплина и точность",
    icon: <ShieldCheck className="size-3.5 text-primary" aria-hidden />,
  },
  {
    id: "survival",
    label: "Выживание",
    description: "Максимум серий побед без сдачи",
    icon: <Sparkles className="size-3.5 text-primary" aria-hidden />,
  },
  {
    id: "pass-and-play",
    label: "Вдвоём",
    description: "Два игрока за одним экраном",
    icon: <Users className="size-3.5 text-primary" aria-hidden />,
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
  const { settings: allSettings, updateBoard } = useSettings();
  const isCoach = settings.mode === "coach";
  const isPassAndPlay = settings.mode === "pass-and-play";
  const selectedBot = getBotById(settings.botId);

  return (
    <section className="panel animate-rise p-5" aria-label="Настройки партии">
      <p className="eyebrow text-primary">Настройка арены</p>
      <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">
        {isPassAndPlay
          ? "Партия вдвоём на одном экране"
          : isCoach
            ? "Игра с тренером"
            : selectedBot
              ? `Матч против: ${selectedBot.name}`
              : "Игра против Stockfish 19"}
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
              className="items-start justify-start gap-0.5 px-3 py-2 text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
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

      {isPassAndPlay ? (
        <div className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="auto-flip-pass" className="text-xs font-semibold text-foreground">
                Автопереворот доски после хода
              </Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Доска плавно поворачивается к игроку, чья очередь хода
              </p>
            </div>
            <Switch
              id="auto-flip-pass"
              checked={allSettings.board.autoFlipPassAndPlay}
              onCheckedChange={(autoFlipPassAndPlay) => updateBoard({ autoFlipPassAndPlay })}
            />
          </div>
        </div>
      ) : (
        <>
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

          <Field label="Именной соперник (400–2800 Эло)">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => onChange({ botId: null })}
                  className={cn(
                    "flex flex-col items-start justify-center rounded-xl border px-2.5 py-2 text-left text-xs transition-all",
                    settings.botId === null
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-white/10 bg-secondary/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Bot className="size-3.5 text-primary" /> Свободный
                  </span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">Уровень ниже</span>
                </button>
                {NAMED_BOTS.map((bot) => {
                  const chosen = settings.botId === bot.id;
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() =>
                        onChange({ botId: bot.id as BotId, difficulty: bot.difficulty })
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs transition-all",
                        chosen
                          ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
                          : "border-white/10 bg-secondary/70 text-foreground/85 hover:border-primary/40",
                      )}
                    >
                      <img
                        src={bot.portrait}
                        alt={bot.name}
                        className="size-8 shrink-0 rounded-lg object-cover object-top"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{bot.name}</span>
                        <span className="block font-mono text-[10px] text-primary tabular-nums">
                          {bot.elo} Эло
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedBot && (
                <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/8 p-2.5 text-xs">
                  <img
                    src={selectedBot.portrait}
                    alt={selectedBot.name}
                    className="size-10 shrink-0 rounded-lg object-cover object-top"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">
                        {selectedBot.name} · {selectedBot.title}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {selectedBot.elo} Эло · {selectedBot.styleTag}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Любимый дебют: {selectedBot.favoriteOpening}
                    </p>
                    <p className="mt-1 italic text-[11px] text-foreground/85">
                      «{selectedBot.quotes.start}»
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Field>

          <Field label="Уровень сложности">
            <div role="radiogroup" aria-label="Сложность" className="space-y-1.5">
              {DIFFICULTY_LEVELS.map((level, i) => (
                <Option
                  key={level.id}
                  checked={settings.difficulty === level.id}
                  onSelect={() => onChange({ difficulty: level.id, botId: null })}
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

          <Field label="Характер и эпоха соперника">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                value={engineSettings.playStyle}
                onValueChange={(v) => onEngineChange({ playStyle: v as PlayStyleId })}
              >
                <SelectTrigger aria-label="Стиль игры бота" className="h-9 bg-secondary/70 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAY_STYLES.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={engineSettings.historicalStyle}
                onValueChange={(v) => onEngineChange({ historicalStyle: v as HistoricalStyleId })}
              >
                <SelectTrigger
                  aria-label="Историческая школа"
                  className="h-9 bg-secondary/70 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HISTORICAL_STYLES.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        </>
      )}

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
        disabled={!isPassAndPlay && engineFailed}
      >
        {!isPassAndPlay && engineLoading ? <Loader2 className="animate-spin" /> : <Play />}
        {!isPassAndPlay && engineLoading
          ? "Начать (движок загружается…)"
          : isPassAndPlay
            ? "Начать игру вдвоём"
            : isCoach
              ? "Начать с тренером"
              : "Начать партию"}
      </Button>
      {!isPassAndPlay && engineFailed && (
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
        "flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-primary bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_18%,var(--secondary))_0%,color-mix(in_oklab,var(--primary)_8%,var(--secondary))_100%)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_0_1px_var(--color-primary),0_8px_18px_-10px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
          : "border-white/10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_110%,#fff)_0%,var(--secondary)_100%)] text-foreground/85 hover:border-primary/35 hover:bg-accent/85 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
