import type { Color } from "@/lib/chess/types";
import type { EngineScore } from "@/lib/chess/uci";
import { formatEval, povCp } from "@/lib/coach/evaluation";
import { cn } from "@/lib/utils";

interface EvalBarProps {
  /** White's point of view evaluation score. Null shows balanced 50/50. */
  score: EngineScore | null;
  orientation: Color;
  className?: string;
}

function whiteBarPercent(score: EngineScore | null): number {
  if (!score) return 50;
  if (score.kind === "mate") {
    return score.value > 0 ? 97 : score.value < 0 ? 3 : 50;
  }
  const cp = Math.max(-900, Math.min(900, povCp(score, "w")));
  // Smooth logistic curve mapped to 4%..96%.
  const pct = 50 + 46 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  return Math.max(4, Math.min(96, pct));
}

/**
 * Live vertical evaluation bar comparing White vs Black positional advantage
 * computed directly from Stockfish score.
 */
export function EvalBar({ score, orientation, className }: EvalBarProps) {
  const whitePct = whiteBarPercent(score);
  const label = score ? formatEval(score) : "0,0";
  const whiteAhead = score ? (score.kind === "mate" ? score.value > 0 : score.value >= 0) : true;

  // When board is flipped (Black on bottom), White bar sits on top.
  const whiteOnBottom = orientation === "w";

  return (
    <div
      className={cn(
        "relative flex h-full w-6 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-[#12161D] select-none sm:w-7",
        className,
      )}
      role="meter"
      aria-label={`Оценка позиции: ${label}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePct)}
      title={`Оценка Stockfish (за белых): ${label}`}
    >
      {whiteOnBottom ? (
        <>
          <div
            className="w-full bg-[#1C212B] transition-[height] duration-500 ease-out"
            style={{ height: `${100 - whitePct}%` }}
          />
          <div
            className="w-full bg-[#E8EEF4] transition-[height] duration-500 ease-out"
            style={{ height: `${whitePct}%` }}
          />
        </>
      ) : (
        <>
          <div
            className="w-full bg-[#E8EEF4] transition-[height] duration-500 ease-out"
            style={{ height: `${whitePct}%` }}
          />
          <div
            className="w-full bg-[#1C212B] transition-[height] duration-500 ease-out"
            style={{ height: `${100 - whitePct}%` }}
          />
        </>
      )}
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 text-center font-mono text-[9px] font-semibold leading-none tracking-tight",
          whiteAhead
            ? whiteOnBottom
              ? "bottom-1.5 text-[#0B0D10]"
              : "top-1.5 text-[#0B0D10]"
            : whiteOnBottom
              ? "top-1.5 text-[#F4F6F8]"
              : "bottom-1.5 text-[#F4F6F8]",
        )}
      >
        {label}
      </span>
    </div>
  );
}
