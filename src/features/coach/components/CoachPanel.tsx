import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  RotateCcw,
  SearchCheck,
  Sparkles,
  Swords,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coachMood, getCoachPersonaMeta, type OutcomeTone } from "@/features/coach/coachMood";
import type { IdeaPlayback } from "@/features/coach/useIdeaPlayback";
import type { CoachPhase } from "@/features/play/usePlayController";
import { useSettings } from "@/features/settings/SettingsProvider";
import { outcomeTone, type GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import type { EngineInfo, EngineScore } from "@/lib/chess/uci";
import {
  analyzePositionStructure,
  explainPositionRich,
  findBestStrategicPlan,
  formatDecimalEval,
  whatWouldGrandmasterPlay,
} from "@/lib/coach/advisor";
import { formatEval, toWhitePov } from "@/lib/coach/evaluation";
import { TAG_LABEL } from "@/lib/coach/explain";
import { buildReport, reviewMoments, type CoachRecord } from "@/lib/coach/report";
import {
  getLastSpokenPhrase,
  repeatLastCoachPhrase,
  speakCoachText,
  stopSpeaking,
  subscribeSpeaking,
} from "@/lib/sound/speech";
import { cn } from "@/lib/utils";

import { CoachAvatar } from "./CoachAvatar";
import { MoveClassBadge } from "./MoveClassBadge";

export type CoachTabId =
  "dialogue" | "analysis" | "tips" | "mistakes" | "tactics" | "plan" | "review";

interface CoachPanelProps {
  phase: CoachPhase;
  records: readonly CoachRecord[];
  latest: CoachRecord | null;
  error: string | null;
  outcome: GameOutcome | null;
  playerColor: Color;
  fen?: string;
  turn?: Color;
  liveEval?: {
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null;
  idea: IdeaPlayback;
  onFixMove: () => void;
  onContinue: () => void;
  onShowIdea: () => void;
  onStopIdea: () => void;
  onShowBestMove?: () => void;
  onOpenReport: () => void;
  onOpenReview: () => void;
  onRequestHintMove?: () => void;
  onCloseCoach?: () => void;
}

const COACH_TABS: readonly { id: CoachTabId; label: string }[] = [
  { id: "dialogue", label: "Диалог" },
  { id: "analysis", label: "Анализ" },
  { id: "tips", label: "Советы" },
  { id: "mistakes", label: "Ошибки" },
  { id: "tactics", label: "Тактика" },
  { id: "plan", label: "План" },
  { id: "review", label: "Разбор" },
];

function outcomeMessage(tone: OutcomeTone): string {
  switch (tone) {
    case "win":
      return "Поздравляю с победой! Отличная работа — откройте анализ, чтобы увидеть лучшие находки партии.";
    case "loss":
      return "Не расстраивайтесь — каждая партия даёт материал для роста. Давайте спокойно разберём ключевые ошибки.";
    case "draw":
      return "Достойная ничья! Посмотрите отчёт, чтобы узнать, где можно было сыграть ещё сильнее.";
  }
}

export function CoachPanel({
  phase,
  records,
  latest,
  error,
  outcome,
  playerColor,
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  turn = playerColor,
  liveEval = null,
  idea,
  onFixMove,
  onContinue,
  onShowIdea,
  onStopIdea,
  onShowBestMove,
  onOpenReport,
  onOpenReview,
  onRequestHintMove,
  onCloseCoach,
}: CoachPanelProps) {
  const { settings, update } = useSettings();
  const [speaking, setSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<CoachTabId>("dialogue");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [advisorNote, setAdvisorNote] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => subscribeSpeaking(setSpeaking), []);

  const tone: OutcomeTone | null = outcome ? outcomeTone(outcome, playerColor) : null;
  const latestClass = latest?.verdict.classification ?? null;
  const mood = coachMood(phase, latestClass, tone, speaking);
  const personaMeta = getCoachPersonaMeta(settings.coachPersona);
  const report = useMemo(() => buildReport(records), [records]);
  const mistakes = useMemo(() => reviewMoments(records), [records]);
  const goodCount =
    report.counts.brilliant + report.counts.best + report.counts.excellent + report.counts.good;
  const reactionKey = `${phase}-${latest?.ply ?? "start"}-${latest?.corrected ? "fix" : "raw"}-${tone ?? ""}`;

  const whiteScore = liveEval?.score
    ? toWhitePov(liveEval.score, liveEval.turn)
    : (latest?.verdict.scoreAfter ?? null);
  const structure = useMemo(() => analyzePositionStructure(fen, whiteScore), [fen, whiteScore]);
  const engineLines = liveEval?.lines ?? [];

  const showReviewBox = phase === "review" && latest !== null && !outcome;
  const v = latest?.verdict ?? null;
  const hasLastPhrase = Boolean(getLastSpokenPhrase());

  const toggleVoiceMute = () => {
    const next = !settings.voice.enabled;
    if (!next) stopSpeaking();
    update({ voice: { enabled: next } });
  };

  const toggleDockSide = () => {
    update({ coachDockSide: settings.coachDockSide === "right" ? "left" : "right" });
  };

  const askCoach = (kind: "explain" | "whyBad" | "plan" | "gm") => {
    let title = "";
    let text = "";
    if (kind === "explain") {
      title = "Разбор текущей позиции";
      text = explainPositionRich(fen, engineLines, turn);
    } else if (kind === "whyBad") {
      title = "Почему последний ход неточен";
      if (
        latest &&
        latest.verdict.classification !== "best" &&
        latest.verdict.classification !== "brilliant"
      ) {
        const bestText = latest.verdict.best
          ? ` Сильнейшее продолжение — ${latest.verdict.best.san}.`
          : "";
        text =
          `${latest.san}: ${latest.verdict.text}${bestText} ${latest.verdict.details[0] ?? ""}`.trim();
      } else if (mistakes.length > 0) {
        const m = mistakes[mistakes.length - 1]!;
        text = `На ${m.moveNumber}-м ходу (${m.san}) была допущена неточность: ${m.verdict.text}`;
      } else {
        text =
          "Серьёзных ошибок пока не зафиксировано — игра ведётся точно. Следите за открытыми линиями и развитием лёгких фигур.";
      }
    } else if (kind === "plan") {
      title = "Стратегический план";
      text = findBestStrategicPlan(fen, engineLines, turn);
    } else {
      title = "Выбор гроссмейстера";
      text = whatWouldGrandmasterPlay(fen, engineLines, turn);
    }
    setAdvisorNote({ title, text });
    setActiveTab("dialogue");
    if (settings.voice.enabled) {
      speakCoachText(text, settings.voice, settings.sound.masterVolume);
    }
  };

  const renderBody = (insideDialog = false) => (
    <>
      <div className="flex items-start gap-3">
        <CoachAvatar
          mood={mood}
          persona={settings.coachPersona}
          speaking={speaking}
          reactionKey={reactionKey}
          className={insideDialog ? "w-24 shrink-0" : "w-16 shrink-0"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="eyebrow text-primary">AI Coach</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-6 rounded-md border",
                  settings.voice.enabled
                    ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
                )}
                onClick={toggleVoiceMute}
                aria-label={
                  settings.voice.enabled ? "Выключить звук тренера" : "Включить звук тренера"
                }
                aria-pressed={!settings.voice.enabled}
                title={
                  settings.voice.enabled ? "Выключить голос тренера" : "Включить голос тренера"
                }
              >
                {settings.voice.enabled ? (
                  <Volume2 className="size-3.5" aria-hidden />
                ) : (
                  <VolumeX className="size-3.5" aria-hidden />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {!insideDialog && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={toggleDockSide}
                    title={
                      settings.coachDockSide === "right"
                        ? "Переместить тренера влево"
                        : "Переместить тренера вправо"
                    }
                    aria-label="Сменить сторону панели тренера"
                  >
                    {settings.coachDockSide === "right" ? (
                      <PanelLeft className="size-3.5" />
                    ) : (
                      <PanelRight className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setCollapsed((c) => !c)}
                    title={collapsed ? "Развернуть тренера" : "Свернуть тренера"}
                    aria-label={collapsed ? "Развернуть панель тренера" : "Свернуть панель тренера"}
                  >
                    {collapsed ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronUp className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedOpen(true)}
                    title="Открыть тренера на весь экран"
                    aria-label="Расширить окно тренера"
                  >
                    <Maximize2 className="size-3.5" />
                  </Button>
                  {onCloseCoach && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      onClick={onCloseCoach}
                      title="Скрыть панель тренера"
                      aria-label="Скрыть панель тренера"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </>
              )}
              {v && phase !== "analyzing" && !outcome && (
                <MoveClassBadge value={v.classification} />
              )}
              {phase === "analyzing" && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  Анализ…
                </span>
              )}
            </div>
          </div>

          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {personaMeta.name} · {personaMeta.role}
          </p>

          {!collapsed && (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {hasLastPhrase && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                    onClick={() =>
                      repeatLastCoachPhrase(settings.voice, settings.sound.masterVolume)
                    }
                    title="Повторить последнюю фразу тренера"
                  >
                    <Volume2 className="size-3" aria-hidden />
                    Повторить
                  </Button>
                )}
                {onRequestHintMove && !outcome && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[11px] text-primary hover:bg-primary/10"
                    onClick={onRequestHintMove}
                  >
                    <Sparkles className="size-3" aria-hidden />
                    Подсказка хода
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* 7 Interactive Tabs */}
          <div
            role="tablist"
            aria-label="Разделы тренера"
            className="mt-3 flex flex-wrap gap-1 border-b border-border/70 pb-2"
          >
            {COACH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-2.5 space-y-2.5">
            {activeTab === "dialogue" && (
              <>
                {outcome ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-foreground/95">
                      {outcomeMessage(tone!)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="ivory" size="sm" onClick={onOpenReport}>
                        <BarChart3 /> Анализ партии
                      </Button>
                      {mistakes.length > 0 && (
                        <Button variant="panel" size="sm" onClick={onOpenReview}>
                          <SearchCheck /> Разобрать ошибки ({mistakes.length})
                        </Button>
                      )}
                    </div>
                  </div>
                ) : phase === "analyzing" ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Оцениваю ход и сравниваю альтернативы (MultiPV)…
                  </p>
                ) : phase === "fixing" ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Сыграйте сильнейший ход</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {v?.best
                        ? `Попробуйте ${v.best.san} на доске — стрелка подсказывает направление.`
                        : "Сделайте новый ход на доске."}
                    </p>
                  </div>
                ) : showReviewBox && v ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md border border-border bg-secondary/80 px-2 py-0.5 font-mono">
                        Ваш ход: <strong className="text-foreground">{latest.san}</strong>{" "}
                        <span className="text-muted-foreground">({formatEval(v.scoreAfter)})</span>
                      </span>
                      {v.best && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-primary">
                          Лучше: <strong>{v.best.san}</strong>{" "}
                          <span className="opacity-80">({formatEval(v.scoreBefore)})</span>
                        </span>
                      )}
                    </div>

                    {v.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {TAG_LABEL[tag]}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm leading-relaxed text-foreground/95">{v.text}</p>
                    {v.details.length > 0 && (
                      <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                        {v.details.map((d, i) => (
                          <li key={i} className="flex gap-1.5">
                            <ArrowRight
                              className="mt-0.5 size-3 shrink-0 text-primary"
                              aria-hidden
                            />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : v && latest ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">{latest.san}</span>
                      <span>·</span>
                      <span className="font-mono">
                        {formatEval(v.scoreBefore)} → {formatEval(v.scoreAfter)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{v.text}</p>
                    {v.details[0] && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {v.details[0]}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Наставник ProChess анализирует каждый ваш ход в реальном времени. Сделайте ход
                    или задайте вопрос кнопками ниже.
                  </p>
                )}

                {advisorNote && (
                  <div className="rounded-lg border border-primary/35 bg-primary/10 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-primary">{advisorNote.title}</span>
                      <button
                        type="button"
                        onClick={() => setAdvisorNote(null)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Закрыть ответ тренера"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 leading-relaxed text-foreground/95">{advisorNote.text}</p>
                  </div>
                )}

                {/* 4 Interactive Coach Advisor Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="panel"
                    size="sm"
                    className="h-auto justify-start px-2.5 py-1.5 text-left text-[11px]"
                    onClick={() => askCoach("explain")}
                  >
                    <BrainCircuit className="size-3.5 shrink-0 text-primary" />
                    Объясни эту позицию
                  </Button>
                  <Button
                    type="button"
                    variant="panel"
                    size="sm"
                    className="h-auto justify-start px-2.5 py-1.5 text-left text-[11px]"
                    onClick={() => askCoach("whyBad")}
                  >
                    <AlertCircle className="size-3.5 shrink-0 text-warning" />
                    Почему этот ход плохой?
                  </Button>
                  <Button
                    type="button"
                    variant="panel"
                    size="sm"
                    className="h-auto justify-start px-2.5 py-1.5 text-left text-[11px]"
                    onClick={() => askCoach("plan")}
                  >
                    <Compass className="size-3.5 shrink-0 text-primary" />
                    Найди лучший план
                  </Button>
                  <Button
                    type="button"
                    variant="panel"
                    size="sm"
                    className="h-auto justify-start px-2.5 py-1.5 text-left text-[11px]"
                    onClick={() => askCoach("gm")}
                  >
                    <Crown className="size-3.5 shrink-0 text-primary" />
                    Что бы сыграл ГМ?
                  </Button>
                </div>
              </>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-secondary/45 p-2">
                    <span className="text-muted-foreground">Оценка позиции</span>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                      {formatDecimalEval(whiteScore)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-secondary/45 p-2">
                    <span className="text-muted-foreground">Вероятность победы</span>
                    <p className="mt-0.5 font-mono text-xs text-foreground">
                      Б {structure.wdl.whiteWin}% · Н {structure.wdl.draw}% · Ч{" "}
                      {structure.wdl.blackWin}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-secondary/35 p-2 text-[11px]">
                  <span>
                    Центр: <strong>{structure.centerControl.w}</strong> :{" "}
                    <strong>{structure.centerControl.b}</strong>
                  </span>
                  <span>
                    Пространство: <strong>{structure.spaceControl.w}</strong> :{" "}
                    <strong>{structure.spaceControl.b}</strong>
                  </span>
                  <span>
                    Активность: <strong>{structure.mobility.w}</strong> /{" "}
                    <strong>{structure.mobility.b}</strong>
                  </span>
                  <span>
                    Открытые линии:{" "}
                    <strong>
                      {structure.openFiles.length > 0 ? structure.openFiles.join(",") : "нет"}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-1.5 text-xs leading-relaxed text-foreground/90">
                <p>
                  Безопасность короля белых: <strong>{structure.kingSafety.w}</strong> · чёрных:{" "}
                  <strong>{structure.kingSafety.b}</strong>.
                </p>
                <p className="text-muted-foreground">
                  {structure.openFiles.length > 0
                    ? `Откройте борьбу за вертикали ${structure.openFiles.join(", ")} тяжёлыми фигурами.`
                    : "Позиция носит закрытый характер — готовьте пешечный подрыв на фланге или в центре."}
                </p>
                <p className="text-muted-foreground">
                  {structure.weakSquares.b.length > 0
                    ? `Обратите внимание на ослабленные поля в лагере чёрных: ${structure.weakSquares.b.join(", ")}.`
                    : "Уплотните защиту собственных слабостей и переводите фигуры к центру."}
                </p>
              </div>
            )}

            {activeTab === "mistakes" && (
              <div className="space-y-1.5 text-xs">
                {mistakes.length === 0 ? (
                  <p className="text-muted-foreground">
                    Критических неточностей в этой партии пока нет.
                  </p>
                ) : (
                  <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
                    {mistakes.map((m, idx) => (
                      <li
                        key={`${m.ply}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/75 bg-secondary/50 px-2.5 py-1.5"
                      >
                        <span className="truncate">
                          <strong className="font-mono">
                            {m.moveNumber}. {m.san}
                          </strong>{" "}
                          — лучше {m.verdict.best?.san ?? "точнее"}
                        </span>
                        <MoveClassBadge value={m.verdict.classification} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "tactics" && (
              <div className="space-y-1.5 text-xs">
                {structure.threats.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Swords className="size-3.5 text-primary" aria-hidden />
                    Прямых угроз висячих фигур или шахов в текущей позиции не обнаружено.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {structure.threats.map((t, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-warning/35 bg-warning/10 px-2.5 py-1.5 text-foreground/95"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "plan" && (
              <p className="text-xs leading-relaxed text-foreground/95">
                {findBestStrategicPlan(fen, engineLines, turn)}
              </p>
            )}

            {activeTab === "review" && (
              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Точность партии:{" "}
                  <strong className="font-mono text-foreground">
                    {Math.round(report.accuracy)}%
                  </strong>{" "}
                  ({report.grade})
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ivory"
                    size="sm"
                    onClick={onOpenReport}
                    disabled={records.length === 0}
                  >
                    <BarChart3 /> Отчёт
                  </Button>
                  <Button
                    variant="panel"
                    size="sm"
                    onClick={onOpenReview}
                    disabled={mistakes.length === 0}
                  >
                    <SearchCheck /> Ошибки ({mistakes.length})
                  </Button>
                </div>
              </div>
            )}
          </div>

          {idea.active && idea.request && (
            <div className="mt-3 rounded-lg border border-primary/35 bg-primary/10 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-primary">
                  <Sparkles className="size-3.5" aria-hidden />
                  Показ идеи на доске
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  шаг {idea.step} из {Math.max(1, idea.frames.length - 1)}
                </span>
              </div>
              <p className="mt-1 text-foreground/90">{idea.request.text}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="panel"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={idea.replay}
                >
                  <RotateCcw className="size-3" /> Повторить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={onStopIdea}
                >
                  <EyeOff className="size-3" /> Скрыть
                </Button>
              </div>
            </div>
          )}

          {showReviewBox && v && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3">
              <Button variant="ivory" size="sm" className="flex-1" onClick={onFixMove}>
                <Undo2 /> Исправить ход
              </Button>
              <Button variant="panel" size="sm" className="flex-1" onClick={onContinue}>
                <Check /> Продолжить игру
              </Button>
              {v.bestLineUci.length > 0 && (
                <Button
                  variant="panel"
                  size="sm"
                  className="w-full"
                  onClick={idea.active ? onStopIdea : (onShowBestMove ?? onShowIdea)}
                >
                  {idea.active ? <EyeOff /> : <Eye />}
                  {idea.active ? "Вернуться к позиции" : "Показать лучший ход"}
                </Button>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {records.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[11px] text-muted-foreground">
              <span>
                Точность:{" "}
                <strong className="font-mono text-foreground">
                  {Math.round(report.accuracy)}%
                </strong>
              </span>
              <div className="flex items-center gap-2.5 font-mono">
                <span className="text-move-best" title="Хорошие, отличные и лучшие ходы">
                  ✓ {goodCount}
                </span>
                <span className="text-move-inaccuracy" title="Неточности">
                  ?! {report.counts.inaccuracy}
                </span>
                <span className="text-move-mistake" title="Ошибки">
                  ? {report.counts.mistake}
                </span>
                <span className="text-move-blunder" title="Грубые ошибки">
                  ?? {report.counts.blunder}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <section
        className={cn(
          "panel animate-rise overflow-hidden p-4 transition-colors",
          speaking && "border-primary/45 shadow-[0_0_24px_-10px_rgba(22,199,132,0.35)]",
          showReviewBox &&
            !speaking &&
            (latest.verdict.classification === "blunder"
              ? "border-move-blunder/40"
              : latest.verdict.classification === "mistake"
                ? "border-move-mistake/40"
                : "border-move-inaccuracy/40"),
        )}
        aria-label="Интеллектуальный тренер ProChess"
      >
        {renderBody(false)}
      </section>

      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-display text-xl">
              Персональный тренер PROCHESS — {personaMeta.name}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpandedOpen(false)}
              aria-label="Свернуть окно тренера"
            >
              <Minimize2 className="size-4" />
            </Button>
          </DialogHeader>
          {renderBody(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
