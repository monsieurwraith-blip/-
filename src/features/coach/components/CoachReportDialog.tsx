import { AlertTriangle, Award, Plus, RotateCcw, SearchCheck, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { outcomeHeadline, outcomeReason, outcomeTone, type GameOutcome } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { MOVE_CLASSES, MOVE_CLASS_INFO, formatEval } from "@/lib/coach/evaluation";
import { buildReport, reviewMoments, type CoachRecord } from "@/lib/coach/report";
import { cn } from "@/lib/utils";

import { CoachAvatar } from "./CoachAvatar";
import { EvalGraph } from "./EvalGraph";
import { CLASS_TEXT, MoveClassBadge } from "./MoveClassBadge";

interface CoachReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: readonly CoachRecord[];
  outcome: GameOutcome | null;
  playerColor: Color;
  onReviewMistakes: (startIndex?: number) => void;
  onRematch: () => void;
  onNewGame: () => void;
}

export function CoachReportDialog({
  open,
  onOpenChange,
  records,
  outcome,
  playerColor,
  onReviewMistakes,
  onRematch,
  onNewGame,
}: CoachReportDialogProps) {
  const report = useMemo(() => buildReport(records), [records]);
  const moments = useMemo(() => reviewMoments(records), [records]);
  const tone = outcome ? outcomeTone(outcome, playerColor) : null;
  const avatarMood = tone === "win" ? "joy" : tone === "loss" ? "disappointment" : "calm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] max-w-3xl flex-col gap-0 overflow-hidden border-border bg-card p-0">
        <div className="flex items-center gap-4 border-b border-border px-6 py-5">
          <CoachAvatar
            mood={avatarMood}
            reactionKey={open ? "open" : "closed"}
            className="size-16 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-primary">Итоговый разбор партии</p>
            <DialogTitle className="mt-0.5 font-display text-3xl font-normal tracking-tight">
              {report.grade}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
              {outcome
                ? `${outcomeHeadline(outcome, playerColor)} · ${outcomeReason(outcome)}`
                : "Статистика по проанализированным ходам"}
            </DialogDescription>
          </div>
          <div className="shrink-0 rounded-xl border border-primary/35 bg-primary/10 px-4 py-2.5 text-center">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Accuracy
            </p>
            <p className="font-mono text-2xl font-semibold text-primary">
              {Math.round(report.accuracy)}%
            </p>
          </div>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MetricCard label="Оценено ходов" value={String(report.moves)} />
            <MetricCard label="Ср. потеря (cp)" value={String(Math.round(report.averageCpLoss))} />
            <MetricCard label="Потеря материала" value={`${report.materialLost} п.`} />
            <MetricCard
              label="Пропущено тактик"
              value={String(report.missedTactics)}
              note={report.corrected > 0 ? `исправлено: ${report.corrected}` : undefined}
            />
          </div>

          <section aria-label="Качество ходов">
            <p className="eyebrow mb-2">Классификация ходов</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {MOVE_CLASSES.map((cls) => {
                const info = MOVE_CLASS_INFO[cls];
                return (
                  <div
                    key={cls}
                    className="rounded-lg border border-border bg-secondary/50 px-2.5 py-2 text-center"
                  >
                    <p className={cn("font-mono text-base font-semibold", CLASS_TEXT[cls])}>
                      {report.counts[cls]}
                    </p>
                    <p className="text-[11px] font-medium text-foreground/90">{info.en}</p>
                    <p className="text-[10px] text-muted-foreground">{info.ru}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <EvalGraph points={report.evalGraph} />

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-secondary/35 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" aria-hidden />
                Лучшие ходы
              </h3>
              {report.bestMoves.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ярких лучших ходов пока не зафиксировано.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {report.bestMoves.map((m) => (
                    <li key={m.ply} className="rounded-lg border border-border/80 bg-card/70 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium">
                          {m.moveNumber}. {m.san}
                        </span>
                        <MoveClassBadge value={m.verdict.classification} />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {m.verdict.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-secondary/35 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="size-4 text-warning" aria-hidden />
                Критические ошибки
              </h3>
              {report.criticalMistakes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Критических ошибок в партии не допущено!
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {report.criticalMistakes.map((m) => {
                    const momentIdx = moments.findIndex((x) => x.ply === m.ply && !x.corrected);
                    return (
                      <li
                        key={m.ply}
                        className="rounded-lg border border-border/80 bg-card/70 p-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-mono text-sm font-medium">
                            {m.moveNumber}. {m.san}
                            {m.verdict.best && (
                              <span className="ml-1.5 text-xs font-normal text-primary">
                                → лучше {m.verdict.best.san}
                              </span>
                            )}
                          </span>
                          <MoveClassBadge value={m.verdict.classification} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {m.verdict.text}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            {formatEval(m.verdict.scoreBefore)} → {formatEval(m.verdict.scoreAfter)}
                          </span>
                          {momentIdx >= 0 && (
                            <button
                              type="button"
                              onClick={() => onReviewMistakes(momentIdx)}
                              className="text-primary hover:underline"
                            >
                              Показать на доске →
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border bg-secondary/35 p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Target className="size-4 text-primary" aria-hidden />
              Над чем работать дальше
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-sm text-foreground/90">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Award className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-3.5">
          <div className="flex flex-wrap gap-2">
            {moments.length > 0 && (
              <Button variant="ivory" onClick={() => onReviewMistakes(0)}>
                <SearchCheck /> Разобрать ошибки ({moments.length})
              </Button>
            )}
            <Button variant="panel" onClick={onRematch}>
              <RotateCcw /> Реванш
            </Button>
            <Button variant="panel" onClick={onNewGame}>
              <Plus /> Новая партия
            </Button>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">{value}</p>
      {note && <p className="text-[10px] text-primary">{note}</p>}
    </div>
  );
}
