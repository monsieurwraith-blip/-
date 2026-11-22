import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ChessBoard, type BoardArrow } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { coachMood } from "@/features/coach/coachMood";
import { useIdeaPlayback } from "@/features/coach/useIdeaPlayback";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { Color, Square } from "@/lib/chess/types";
import { parseUciMove } from "@/lib/chess/uci";
import { formatEval } from "@/lib/coach/evaluation";
import { TAG_LABEL } from "@/lib/coach/explain";
import type { CoachRecord } from "@/lib/coach/report";
import { playUci } from "@/lib/coach/tactics";
import { cn } from "@/lib/utils";

import { CoachAvatar } from "./CoachAvatar";
import { MoveClassBadge } from "./MoveClassBadge";

interface MistakeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moments: readonly CoachRecord[];
  initialIndex: number;
  orientation: Color;
  onBackToReport: () => void;
}

type ViewStep = "before" | "played" | "best";

function boardSnapshot(
  fen: string,
  uci?: string,
): {
  fen: string;
  cells: BoardCell[];
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
} {
  const chess = new Chess(fen);
  let lastMove: { from: Square; to: Square } | null = null;
  if (uci) {
    const m = playUci(chess, uci);
    if (m) lastMove = { from: m.from, to: m.to };
  }
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      cells.push({ square: p.square, type: p.type, color: p.color });
      if (chess.inCheck() && p.type === "k" && p.color === turn) checkSquare = p.square;
    }
  }
  return { fen: chess.fen(), cells, lastMove, checkSquare };
}

export function MistakeReviewDialog({
  open,
  onOpenChange,
  moments,
  initialIndex,
  orientation,
  onBackToReport,
}: MistakeReviewDialogProps) {
  const [index, setIndex] = useState(initialIndex);
  const [viewStep, setViewStep] = useState<ViewStep>("before");
  const idea = useIdeaPlayback();

  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, Math.min(moments.length - 1, initialIndex)));
      setViewStep("before");
      idea.stop();
    } else {
      idea.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open/initialIndex change
  }, [open, initialIndex]);

  const moment = moments[index] ?? null;

  useEffect(() => {
    idea.stop();
    setViewStep("before");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stop idea when switching moments
  }, [index]);

  const snapshot = useMemo(() => {
    if (!moment) return null;
    if (viewStep === "played") return boardSnapshot(moment.fenBefore, moment.uci);
    if (viewStep === "best" && moment.verdict.best) {
      return boardSnapshot(moment.fenBefore, moment.verdict.best.uci);
    }
    return boardSnapshot(moment.fenBefore);
  }, [moment, viewStep]);

  const arrows = useMemo<BoardArrow[]>(() => {
    if (!moment) return [];
    if (idea.active) {
      if (idea.frame?.move) {
        return [{ from: idea.frame.move.from, to: idea.frame.move.to, kind: "idea" }];
      }
      const first = idea.request?.pv[0] ? parseUciMove(idea.request.pv[0]) : null;
      return first ? [{ from: first.from, to: first.to, kind: "idea" }] : [];
    }
    const list: BoardArrow[] = [];
    if (viewStep === "before") {
      if (moment.verdict.best) {
        list.push({
          from: moment.verdict.best.from,
          to: moment.verdict.best.to,
          kind: "best",
        });
      }
      const playedMove = parseUciMove(moment.uci);
      if (playedMove) {
        list.push({ from: playedMove.from, to: playedMove.to, kind: "played" });
      }
    } else if (viewStep === "played" && moment.verdict.threat) {
      list.push({
        from: moment.verdict.threat.from,
        to: moment.verdict.threat.to,
        kind: "threat",
      });
    }
    return list;
  }, [moment, viewStep, idea.active, idea.frame, idea.request]);

  if (!moment || !snapshot) return null;

  const v = moment.verdict;
  const activeFrame = idea.active && idea.frame ? idea.frame : null;
  const mood = coachMood("review", v.classification, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] max-w-5xl flex-col gap-0 overflow-hidden border-border bg-card p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <p className="eyebrow text-primary">Разбор ошибок</p>
            <DialogTitle className="mt-0.5 font-display text-2xl font-normal">
              Критический момент {index + 1} из {moments.length}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Пошаговый разбор ошибок партии с рекомендациями Chess Coach
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="panel" size="sm" onClick={onBackToReport}>
              <BarChart3 /> К отчёту
            </Button>
          </div>
        </div>

        <div className="scrollbar-thin grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="space-y-3">
            <ChessBoard
              cells={activeFrame ? activeFrame.cells : snapshot.cells}
              positionKey={activeFrame ? activeFrame.fen : snapshot.fen}
              orientation={orientation}
              movableColor={null}
              legalMoves={[]}
              showLegalMoves={false}
              lastMove={activeFrame ? activeFrame.move : snapshot.lastMove}
              checkSquare={activeFrame ? activeFrame.checkSquare : snapshot.checkSquare}
              hint={null}
              arrows={arrows}
              dangerSquares={idea.active || viewStep === "best" ? [] : v.danger}
              onMove={() => false}
            />

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "before", label: "До хода" },
                  { id: "played", label: `Ваш: ${moment.san}` },
                  { id: "best", label: v.best ? `Лучший: ${v.best.san}` : "Лучший" },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  variant={viewStep === tab.id && !idea.active ? "ivory" : "panel"}
                  size="sm"
                  className="font-mono text-xs"
                  disabled={tab.id === "best" && !v.best}
                  onClick={() => {
                    idea.stop();
                    setViewStep(tab.id);
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CoachAvatar
                  mood={mood}
                  reactionKey={`rev-${moment.ply}-${index}`}
                  className="size-16 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">
                      Ход {moment.moveNumber}
                    </span>
                    <MoveClassBadge value={v.classification} />
                    {moment.corrected && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        <CheckCircle2 className="size-3" aria-hidden />
                        Исправлено в партии
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono">
                      Сыграно: <strong>{moment.san}</strong> ({formatEval(v.scoreAfter)})
                    </span>
                    {v.best && (
                      <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-primary">
                        Рекомендовано: <strong>{v.best.san}</strong> ({formatEval(v.scoreBefore)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {v.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {v.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {TAG_LABEL[tag]}
                    </span>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-border bg-secondary/35 p-4 space-y-2">
                <p className="text-sm leading-relaxed text-foreground">{v.text}</p>
                {v.details.map((d, i) => (
                  <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                    {d}
                  </p>
                ))}
                {v.bestLine && (
                  <p className="pt-1 font-mono text-xs text-primary">
                    Лучший вариант: {v.bestLine}
                  </p>
                )}
              </div>

              {v.bestLineUci.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={idea.active ? "ivory" : "panel"}
                    size="sm"
                    onClick={() =>
                      idea.active
                        ? idea.stop()
                        : idea.start({
                            fen: moment.fenBefore,
                            pv: v.bestLineUci,
                            text: v.idea,
                          })
                    }
                  >
                    {idea.active ? <EyeOff /> : <Eye />}
                    {idea.active ? "Остановить показ" : "Показать идею на доске"}
                  </Button>
                  {idea.active && (
                    <Button variant="panel" size="sm" onClick={idea.replay}>
                      <RotateCcw /> Повторить
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex flex-wrap gap-1.5">
                {moments.map((m, i) => (
                  <button
                    key={`${m.ply}-${i}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                      i === index
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.moveNumber}. {m.san}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="panel"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  <ArrowLeft /> Предыдущая
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  {index + 1} / {moments.length}
                </span>
                <Button
                  variant="panel"
                  size="sm"
                  disabled={index >= moments.length - 1}
                  onClick={() => setIndex((i) => Math.min(moments.length - 1, i + 1))}
                >
                  Следующая <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
