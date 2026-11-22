import type { GameOutcome } from "@/lib/chess/outcome";
import { outcomeHeadline, outcomeReason, outcomeScore } from "@/lib/chess/outcome";
import type { Color } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

interface GameStatusCardProps {
  turn: Color;
  moveNumber: number;
  inCheck: boolean;
  outcome: GameOutcome | null;
  playerColor: Color;
  engineThinking: boolean;
  clockWaiting: boolean;
}

export function GameStatusCard({
  turn,
  moveNumber,
  inCheck,
  outcome,
  playerColor,
  engineThinking,
  clockWaiting,
}: GameStatusCardProps) {
  if (outcome) {
    return (
      <section className="panel p-4" aria-live="polite">
        <p className="eyebrow">Партия окончена</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl leading-tight">
            {outcomeHeadline(outcome, playerColor)}
          </h2>
          <span className="font-mono text-lg text-muted-foreground">{outcomeScore(outcome)}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{outcomeReason(outcome)}</p>
      </section>
    );
  }

  const yourTurn = turn === playerColor;
  return (
    <section className="panel p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Ход {moveNumber}</p>
        {inCheck && (
          <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
            Шах
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2.5">
        <span
          className={cn(
            "size-3 rounded-full border border-input",
            turn === "w" ? "bg-ivory" : "bg-board-frame",
          )}
          aria-hidden
        />
        <h2 className="text-lg font-medium">{turn === "w" ? "Ход белых" : "Ход чёрных"}</h2>
        <span className="text-sm text-muted-foreground">
          · {yourTurn ? "ваш ход" : engineThinking ? "Stockfish думает" : "ход Stockfish"}
        </span>
      </div>
      {clockWaiting && (
        <p className="mt-2 text-xs text-muted-foreground">
          Часы запустятся после первого хода белых.
        </p>
      )}
    </section>
  );
}
