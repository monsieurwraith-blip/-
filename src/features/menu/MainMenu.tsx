import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  Compass,
  Cpu,
  Crown,
  Download,
  Flame,
  GraduationCap,
  Grid3X3,
  History,
  Palette,
  Play,
  Puzzle,
  Settings,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/images/chess_studio_hero_1795348937860.jpg";
import { ProChessLogo } from "@/components/brand/ProChessLogo";
import { CharacterCompanionCard } from "@/components/characters/CharacterCompanionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCoachPersonaMeta } from "@/features/coach/coachMood";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { STOCKFISH_BUILD_LABEL } from "@/lib/engine/config";
import { ALL_LOCAL_PUZZLES } from "@/lib/puzzles/puzzleLibrary";
import { cn } from "@/lib/utils";

interface MainMenuProps {
  onPlay: () => void;
  onCoach: () => void;
  onDaily?: () => void;
  onAnalysis: () => void;
  onPuzzles: () => void;
  onAcademy: () => void;
  onTrainers?: () => void;
  onEditor?: () => void;
  onArchive: () => void;
  onProfile: () => void;
  onCollection?: () => void;
  onCustomization: () => void;
  onOpenSettings: () => void;
  onInspectLastGame?: (pgn: string) => void;
}

/**
 * ProChess Command Center:
 * Luxury Chess Club meets Analytical Terminal with real Stockfish 19 telemetry,
 * Daily Chess Challenge, Living Characters, Club Rating & Rank, and 112 Tactical Puzzles.
 */
export function MainMenu({
  onPlay,
  onCoach,
  onDaily,
  onAnalysis,
  onPuzzles,
  onAcademy,
  onTrainers,
  onEditor,
  onArchive,
  onProfile,
  onCollection,
  onCustomization,
  onOpenSettings,
  onInspectLastGame,
}: MainMenuProps) {
  const { settings, update, preview } = useSettings();
  const { progression, rank, comboBadge } = useProgression();
  const [imageError, setImageError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.playerName);

  const clickAction = (fn?: () => void) => {
    if (!fn) return;
    preview("menu");
    fn();
  };

  const commitName = () => {
    const clean = nameDraft.trim().slice(0, 28) || "Гроссмейстер";
    setNameDraft(clean);
    update({ playerName: clean });
    setEditingName(false);
  };

  const lastGame = progression.archive[0] ?? null;
  const activeQuest =
    progression.dailyQuests.find((q) => !q.claimed) ?? progression.dailyQuests[0] ?? null;
  const personaMeta = getCoachPersonaMeta(settings.coachPersona);

  const coachRecommendation =
    progression.dailyPuzzlesSolvedToday === 0
      ? "Начните день с «DAILY CHESS CHALLENGE» — 10 свежих тактических позиций укрепят расчёт вариантов."
      : progression.gamesPlayed === 0
        ? "Сыграйте первую партию против Stockfish 19 или начните с урока в Академии для оценки вашего стиля."
        : progression.currentStreak >= 2
          ? `Отличная серия из ${progression.currentStreak} побед! Повысьте уровень сложности или проверьте силы в режиме Арена PRO.`
          : "Откройте «Тактические задачи» или разберите последнюю партию в Лаборатории анализа, чтобы укрепить расчёт вариантов.";

  const todaySolvedDisplay = Math.min(10, progression.dailyPuzzlesSolvedToday);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Studio atmospheric backdrop with metallic + emerald rim lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(960px 620px at 78% 46%, rgba(22, 199, 132, 0.14), transparent 64%), radial-gradient(740px 540px at 66% 30%, rgba(198, 205, 214, 0.08), transparent 60%), #0B0D10",
        }}
      >
        {!imageError && (
          <img
            src={heroImage}
            alt=""
            onError={() => setImageError(true)}
            className="h-full w-full animate-menu-hero object-cover object-right opacity-75 sm:object-center"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(95deg, rgba(11, 13, 16, 0.97) 0%, rgba(11, 13, 16, 0.92) 44%, rgba(11, 13, 16, 0.68) 72%, rgba(11, 13, 16, 0.42) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11, 13, 16, 0.72) 0%, transparent 18%, transparent 78%, rgba(11, 13, 16, 0.92) 100%)",
          }}
        />
      </div>

      {/* Top Command Center Bar */}
      <header className="relative z-10 border-b border-border/80 bg-background/65 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
          <ProChessLogo variant="menu" withWordmark subtitle="ШАХМАТНАЯ ПЛАТФОРМА" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 font-mono text-xs text-muted-foreground lg:flex">
              <Cpu className="size-3.5 text-primary" aria-hidden />
              <span>{STOCKFISH_BUILD_LABEL}</span>
            </div>

            <button
              type="button"
              onClick={() => clickAction(onProfile)}
              className="hidden cursor-pointer items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:border-primary/60 hover:bg-primary/15 active:translate-y-px sm:flex"
              title="Открыть статистику и достижения"
            >
              <Trophy className="size-3.5 text-primary" aria-hidden />
              <span className="font-mono font-semibold text-foreground">{progression.rating}</span>
              <span className="text-muted-foreground">· {rank.title}</span>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Задания и уведомления"
                  title="Ежедневные задания"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Bell className="size-[18px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 border-border bg-card p-3.5">
                <p className="eyebrow mb-2 text-primary">Ежедневные задания</p>
                <ul className="space-y-2 text-xs">
                  {progression.dailyQuests.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/75 bg-secondary/50 px-2.5 py-1.5"
                    >
                      <span className="truncate">{q.title}</span>
                      <span className="shrink-0 font-mono text-primary">
                        {q.progress}/{q.target}
                      </span>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitName();
                }}
                className="flex items-center gap-1.5"
              >
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  autoFocus
                  maxLength={28}
                  aria-label="Имя игрока"
                  className="h-8 w-36 bg-secondary/80 text-xs"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(settings.playerName);
                  setEditingName(true);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 bg-card/85 px-3 py-1.5 text-xs text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-150 hover:border-primary/50 hover:bg-accent/70 hover:text-foreground active:translate-y-px"
                title="Нажмите, чтобы изменить имя игрока"
              >
                <User className="size-3.5 text-primary" aria-hidden />
                <span className="max-w-[9rem] truncate font-semibold">{settings.playerName}</span>
              </button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => clickAction(onOpenSettings)}
              aria-label="Настройки приложения"
              title="Настройки (Ctrl + ,)"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Club Stage */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-8 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,35rem)_1fr] lg:gap-10">
        <div className="flex flex-col">
          <div className="animate-rise flex items-center gap-3">
            <span className="h-px w-8 bg-primary" aria-hidden />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
              АНАЛИТИЧЕСКИЙ ШАХМАТНЫЙ КЛУБ
            </span>
          </div>

          <h1 className="animate-rise mt-3 font-display text-5xl font-bold tracking-[0.06em] text-foreground sm:text-6xl">
            PRO<span className="text-primary">CHESS</span>
          </h1>

          <p className="animate-rise mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Элитная шахматная платформа со Stockfish 19, системой рисования на доске, 10 живыми
            персонажами, ежедневной тренировкой и {ALL_LOCAL_PUZZLES.length} проверенными задачами.
          </p>

          {/* Primary Club Action Deck */}
          <nav
            aria-label="Командный центр ProChess"
            className="animate-rise mt-5 flex flex-col gap-2.5"
          >
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => clickAction(onPlay)}
              className="group h-14 w-full justify-between rounded-2xl px-5 text-sm font-bold uppercase tracking-[0.08em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-black/15 shadow-inner">
                  <Play className="size-4 fill-current" aria-hidden />
                </span>
                Начать игру
              </span>
              <span className="flex items-center gap-2 text-xs font-medium normal-case tracking-normal opacity-90">
                Партия со Stockfish 19
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </Button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CommandTile
                icon={<GraduationCap className="size-4 text-primary" aria-hidden />}
                title="Играть с тренером"
                subtitle="Живой наставник и разбор ходов"
                onClick={() => clickAction(onCoach)}
              />
              {onDaily && (
                <CommandTile
                  icon={<CalendarDays className="size-4 text-primary" aria-hidden />}
                  title="Ежедневные задачи"
                  subtitle="DAILY CHESS CHALLENGE · 10 в день"
                  onClick={() => clickAction(onDaily)}
                />
              )}
              <CommandTile
                icon={<Puzzle className="size-4 text-primary" aria-hidden />}
                title="Тактические задачи"
                subtitle={`${ALL_LOCAL_PUZZLES.length} задач и режим выживания`}
                onClick={() => clickAction(onPuzzles)}
              />
              <CommandTile
                icon={<Sparkles className="size-4 text-primary" aria-hidden />}
                title="Академия"
                subtitle="Тактика, стратегия и дебюты"
                onClick={() => clickAction(onAcademy)}
              />
              {onTrainers && (
                <CommandTile
                  icon={<Compass className="size-4 text-primary" aria-hidden />}
                  title="Тренажёры"
                  subtitle="Координаты на время и эндшпили"
                  onClick={() => clickAction(onTrainers)}
                />
              )}
              {onEditor && (
                <CommandTile
                  icon={<Grid3X3 className="size-4 text-primary" aria-hidden />}
                  title="Редактор позиций"
                  subtitle="Своя расстановка, FEN и запуск"
                  onClick={() => clickAction(onEditor)}
                />
              )}
              <CommandTile
                icon={<BarChart3 className="size-4 text-primary" aria-hidden />}
                title="Анализ"
                subtitle="MultiPV 3, стрелки, WDL и PGN"
                onClick={() => clickAction(onAnalysis)}
              />
              <CommandTile
                icon={<History className="size-4 text-primary" aria-hidden />}
                title="История партий"
                subtitle={`Архив и загрузка PGN (${progression.archive.length})`}
                onClick={() => clickAction(onArchive)}
              />
              <CommandTile
                icon={<Award className="size-4 text-primary" aria-hidden />}
                title="Моя статистика"
                subtitle="Рейтинг, ранги и достижения"
                onClick={() => clickAction(onProfile)}
              />
              {onCollection && (
                <CommandTile
                  icon={<Crown className="size-4 text-primary" aria-hidden />}
                  title="Коллекция"
                  subtitle="10 персонажей, рамки и золото"
                  onClick={() => clickAction(onCollection)}
                />
              )}
              <CommandTile
                icon={<Palette className="size-4 text-primary" aria-hidden />}
                title="Кастомизация"
                subtitle="39 досок и GOLD MIRROR"
                onClick={() => clickAction(onCustomization)}
              />
              <CommandTile
                icon={<Settings className="size-4 text-primary" aria-hidden />}
                title="Настройки"
                subtitle="Звук, голос, плотность и движок"
                onClick={() => clickAction(onOpenSettings)}
              />
            </div>
          </nav>

          <div className="animate-rise mt-5 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] tracking-wider text-muted-foreground/75">
              STOCKFISH 19 WASM · РИСОВАНИЕ НА ДОСКЕ · CTRL + , НАСТРОЙКИ
            </p>
            {typeof window === "undefined" || window.location.protocol !== "app:" ? (
              <a
                href="/download/ProChess.exe"
                download="ProChess.exe"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/40 bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/20"
              >
                <Download className="size-3.5" aria-hidden />
                Скачать ProChess.exe (Windows)
              </a>
            ) : null}
          </div>
        </div>

        {/* Right Club Telemetry, Living Character & Summary Cards */}
        <div className="animate-rise flex flex-col gap-3.5">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="panel p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ТВОЯ СЕРИЯ
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xl font-semibold text-foreground tabular-nums">
                <Flame className="size-4 text-warning" /> {progression.dailyStreak} дн.
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Побед подряд: {progression.currentStreak}
              </p>
            </div>

            <button
              type="button"
              onClick={() => clickAction(onDaily ?? onPuzzles)}
              className="panel p-3.5 text-left transition-colors hover:border-primary/50"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ЗАДАЧИ СЕГОДНЯ
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-primary tabular-nums">
                {todaySolvedDisplay}/10
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {comboBadge.label || `Комбо: ${progression.comboCount}`}
              </p>
            </button>

            <div className="panel p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ТВОЙ РЕЙТИНГ
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-primary tabular-nums">
                {progression.rating}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Тактика {progression.tacticsRating} · {rank.title}
              </p>
            </div>

            <div className="panel p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ЛУЧШИЙ РЕЗУЛЬТАТ
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
                {progression.bestCombo > 0
                  ? `Комбо ${progression.bestCombo}`
                  : `${progression.peakRating} Эло`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Побед: {progression.bestStreak} · День: {progression.bestDailyScore}/10
              </p>
            </div>
          </div>

          {/* Interactive Living Character + Coach Recommendation Card */}
          <CharacterCompanionCard
            mood={progression.currentStreak >= 2 ? "approval" : "interest"}
            message={coachRecommendation}
            allowHide={false}
          />
          <p className="sr-only">РЕКОМЕНДАЦИЯ ТРЕНЕРА · {personaMeta.name}</p>

          <div className="panel flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
              РЕКОМЕНДАЦИЯ ТРЕНЕРА · {personaMeta.name}
            </span>
            {onCollection && (
              <button
                type="button"
                onClick={() => clickAction(onCollection)}
                className="font-medium text-primary hover:underline"
              >
                Выбрать персонажа или рамку →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Last Game Card */}
            <div className="panel flex flex-col justify-between p-4">
              <div>
                <p className="eyebrow text-primary">Последняя партия</p>
                {lastGame ? (
                  <>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {lastGame.result === "win"
                        ? "Победа"
                        : lastGame.result === "loss"
                          ? "Поражение"
                          : "Ничья"}{" "}
                      · {lastGame.movesCount} ходов
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lastGame.opponent} · точность {lastGame.accuracy}%
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Партий пока нет. Сыграйте первую партию, и она сохранится в архиве.
                  </p>
                )}
              </div>
              {lastGame && onInspectLastGame && (
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  className="mt-3 w-fit text-xs"
                  onClick={() => onInspectLastGame(lastGame.pgn || lastGame.finalFen)}
                >
                  Открыть в анализе
                </Button>
              )}
            </div>

            {/* Active Daily Quest Card */}
            <div className="panel flex flex-col justify-between p-4">
              <div>
                <p className="eyebrow text-primary">Ежедневная задача</p>
                {activeQuest ? (
                  <>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">
                      {activeQuest.title}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Прогресс: {activeQuest.progress}/{activeQuest.target} · награда +
                      {activeQuest.xpReward} XP
                    </p>
                  </>
                ) : null}
              </div>
              <Button
                type="button"
                variant="panel"
                size="sm"
                className="mt-3 w-fit text-xs"
                onClick={() => clickAction(onDaily ?? onPuzzles)}
              >
                Перейти к задачам
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CommandTile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="panel"
      onClick={onClick}
      className={cn(
        "group h-auto items-center justify-start gap-3 rounded-xl border-white/10 bg-card/85 px-3.5 py-2.5 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 active:translate-y-0",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 group-hover:border-primary/45 group-hover:bg-primary/20">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="font-sans text-[13px] font-semibold tracking-[0.01em] text-foreground">
          {title}
        </span>
        <span className="w-full truncate text-[11px] font-normal text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Button>
  );
}
