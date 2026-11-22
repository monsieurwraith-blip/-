import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  SearchCheck,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { coachMood, type OutcomeTone } from "@/features/coach/coachMood";
import type { IdeaPlayback } from "@/features/coach/useIdeaPlayback";
import type { CoachPhase } from "@/features/play/usePlayController";
import { formatEval } from "@/lib/coach/evaluation";
import { TAG_LABEL } from "@/lib/coach/explain";
import { buildReport, reviewMoments, type CoachRecord } from "@/lib/coach/report";
import { outcomeTone, type GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

import { CoachAvatar } from "./CoachAvatar";
import { MoveClassBadge } from "./MoveClassBadge";

interface CoachPanelProps {
  phase: CoachPhase;
  records: readonly CoachRecord[];
  latest: CoachRecord | null;
  error: string | null;
  outcome: GameOutcome | null;
  playerColor: Color;
  idea: IdeaPlayback;
  onFixMove: () => void;
  onContinue: () => void;
  onShowIdea: () => void;
  onStopIdea: () => void;
  onOpenReport: () => void;
  onOpenReview: () => void;
}

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
  idea,
  onFixMove,
  onContinue,
  onShowIdea,
  onStopIdea,
  onOpenReport,
  onOpenReview,
}: CoachPanelProps) {
  const tone: OutcomeTone | null = outcome ? outcomeTone(outcome, playerColor) : null;
  const latestClass = latest?.verdict.classification ?? null;
  const mood = coachMood(phase, latestClass, tone);
  const report = useMemo(() => buildReport(records), [records]);
  const mistakes = useMemo(() => reviewMoments(records), [records]);
  const goodCount =
    report.counts.brilliant + report.counts.best + report.counts.excellent + report.counts.good;
  const reactionKey = `${phase}-${latest?.ply ?? "start"}-${latest?.corrected ? "fix" : "raw"}-${tone ?? ""}`;

  const showReviewBox = phase === "review" && latest !== null && !outcome;
  const v = latest?.verdict ?? null;

  return (
    <section
      className={cn(
        "panel animate-rise overflow-hidden p-4 transition-colors",
        showReviewBox &&
          (latest.verdict.classification === "blunder"
            ? "border-move-blunder/40"
            : latest.verdict.classification === "mistake"
              ? "border-move-mistake/40"
              : "border-move-inaccuracy/40"),
      )}
      aria-label="Chess Coach"
    >
      <div className="flex items-start gap-3">
        <CoachAvatar mood={mood} reactionKey={reactionKey} className="size-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="eyebrow text-primary">Chess Coach</span>
            {v && phase !== "analyzing" && !outcome && <MoveClassBadge value={v.classification} />}
            {phase === "analyzing" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Анализ…
              </span>
            )}
          </div>

          {outcome ? (
            <div className="mt-1.5 space-y-2">
              <p className="text-sm leading-relaxed text-foreground/95">{outcomeMessage(tone!)}</p>
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
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Оцениваю ход и сравниваю альтернативы (MultiPV)…
            </p>
          ) : phase === "fixing" ? (
            <div className="mt-1.5 space-y-1">
              <p className="text-sm font-medium text-foreground">Попробуйте лучший ход</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {v?.best
                  ? `Сыграйте ${v.best.san} на доске — стрелка подсказывает направление. Можно выбрать и другой ход.`
                  : "Сделайте новый ход на доске."}
              </p>
            </div>
          ) : showReviewBox && v ? (
            <div className="mt-1.5 space-y-2">
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
                      <ArrowRight className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : v && latest ? (
            <div className="mt-1.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{latest.san}</span>
                <span>·</span>
                <span className="font-mono">
                  {formatEval(v.scoreBefore)} → {formatEval(v.scoreAfter)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{v.text}</p>
              {v.details[0] && (
                <p className="text-xs leading-relaxed text-muted-foreground">{v.details[0]}</p>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Я слежу за партией и оценю каждый ваш ход с помощью Stockfish. Сделайте первый ход!
            </p>
          )}
        </div>
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
            <Button variant="panel" size="sm" className="h-7 px-2.5 text-xs" onClick={idea.replay}>
              <RotateCcw className="size-3" /> Повторить
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onStopIdea}>
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
              onClick={idea.active ? onStopIdea : onShowIdea}
            >
              {idea.active ? <EyeOff /> : <Eye />}
              {idea.active ? "Вернуться к позиции" : "Показать идею"}
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
            <strong className="font-mono text-foreground">{Math.round(report.accuracy)}%</strong>
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
    </section>
  );
}
