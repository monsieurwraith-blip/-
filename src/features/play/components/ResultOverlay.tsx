import { BarChart3, Eye, Plus, RotateCcw, SearchCheck } from "lucide-react";

import { ProChessLogo } from "@/components/brand/ProChessLogo";
import { Button } from "@/components/ui/button";
import {
  outcomeHeadline,
  outcomeReason,
  outcomeScore,
  outcomeTone,
  type GameOutcome,
} from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

interface CoachSummaryProps {
  accuracy: number;
  grade: string;
  mistakesCount: number;
  onOpenReport: () => void;
  onOpenReview: () => void;
}

interface ResultOverlayProps {
  outcome: GameOutcome;
  playerColor: Color;
  coach?: CoachSummaryProps | undefined;
  onRematch: () => void;
  onNewGame: () => void;
  onDismiss: () => void;
}

export function ResultOverlay({
  outcome,
  playerColor,
  coach,
  onRematch,
  onNewGame,
  onDismiss,
}: ResultOverlayProps) {
  const tone = outcomeTone(outcome, playerColor);
  const isWin = tone === "win";

  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center bg-overlay p-4 backdrop-blur-[4px] animate-in fade-in duration-300"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className={cn(
          "panel relative w-[min(100%,23.5rem)] overflow-hidden p-6 text-center shadow-[var(--shadow-float)] animate-rise",
          isWin && "border-primary/50 shadow-[0_0_50px_-14px_rgba(22,199,132,0.45)]",
        )}
      >
        {isWin && (
          <div className="mb-3 flex flex-col items-center">
            <ProChessLogo
              variant="emblem"
              className="drop-shadow-[0_0_18px_rgba(22,199,132,0.35)]"
            />
            <span className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              VICTORY
            </span>
          </div>
        )}
        {!isWin && <p className="eyebrow">Партия окончена</p>}

        <h2
          id="result-title"
          className={cn(
            "mt-1 font-display text-4xl leading-none sm:text-5xl",
            isWin && "text-primary",
            tone === "loss" && "text-foreground",
            tone === "draw" && "text-warning",
          )}
        >
          {outcomeHeadline(outcome, playerColor)}
        </h2>
        <p className="mt-3 font-mono text-lg text-foreground/85">{outcomeScore(outcome)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{outcomeReason(outcome)}</p>

        {coach && (
          <div className="mt-4 space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{coach.grade}</span>
              <span className="font-mono font-semibold text-primary">
                Accuracy {Math.round(coach.accuracy)}%
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <Button variant="ivory" size="sm" onClick={coach.onOpenReport}>
                <BarChart3 /> Анализ партии
              </Button>
              {coach.mistakesCount > 0 && (
                <Button variant="panel" size="sm" onClick={coach.onOpenReview}>
                  <SearchCheck /> Ошибки ({coach.mistakesCount})
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant={coach ? "panel" : "ivory"} onClick={onRematch} autoFocus={!coach}>
            <RotateCcw /> Реванш
          </Button>
          <Button variant="panel" onClick={onNewGame}>
            <Plus /> Новая
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-muted-foreground"
          onClick={onDismiss}
        >
          <Eye /> Посмотреть позицию
        </Button>
      </div>
    </div>
  );
}
