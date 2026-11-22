import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/chess/timeControls";
import type { Color, PieceSymbol } from "@/lib/chess/types";
import { formatSeconds } from "@/lib/engine/thinkTime";

interface PlayerBarProps {
  color: Color;
  name: string;
  detail: string;
  /** Pieces this side has captured (they are of the opposite color). */
  captured: PieceSymbol[];
  advantage: number;
  clock: { enabled: boolean; ms: number; running: boolean } | null;
  isTurn: boolean;
  thinking?: boolean;
  thinkingStartedAt?: number | null;
}

export function PlayerBar({
  color,
  name,
  detail,
  captured,
  advantage,
  clock,
  isTurn,
  thinking,
  thinkingStartedAt,
}: PlayerBarProps) {
  const victim: Color = color === "w" ? "b" : "w";
  const low = clock?.enabled && clock.ms < 20_000;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!thinking || !thinkingStartedAt) {
      setElapsedMs(0);
      return;
    }
    setElapsedMs(Math.max(0, Date.now() - thinkingStartedAt));
    const id = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - thinkingStartedAt));
    }, 100);
    return () => clearInterval(id);
  }, [thinking, thinkingStartedAt]);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={cn(
          "relative grid size-9 shrink-0 place-items-center rounded-lg border border-border",
          color === "w" ? "bg-ivory" : "bg-board-frame",
        )}
        aria-hidden
      >
        <PieceImage color={color} type="k" className="size-7" />
        {isTurn && (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {thinking && (
            <span
              className="flex items-center gap-1.5 text-xs font-medium text-primary"
              aria-live="polite"
            >
              <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
              <span>Бот думает…</span>
              {thinkingStartedAt ? (
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatSeconds(elapsedMs)}
                </span>
              ) : null}
            </span>
          )}
        </div>
        <div className="flex h-5 items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{detail}</span>
          {captured.length > 0 && (
            <span className="flex items-center" aria-label={`Взято фигур: ${captured.length}`}>
              {captured.map((type, i) => (
                <PieceImage
                  key={`${type}${i}`}
                  color={victim}
                  type={type}
                  className="-ml-1.5 size-4 first:ml-0"
                />
              ))}
              {advantage > 0 && (
                <span className="ml-1 font-mono text-[11px] text-foreground/80">+{advantage}</span>
              )}
            </span>
          )}
        </div>
      </div>
      {clock && (
        <div
          role="timer"
          aria-label={`Часы: ${clock.enabled ? formatClock(clock.ms) : "без ограничения"}`}
          className={cn(
            "min-w-[5.75rem] rounded-lg border border-border px-3 py-1.5 text-right font-mono text-xl tabular-nums tracking-tight transition-colors duration-300",
            clock.running && !low && "clock-active border-transparent",
            clock.running && low && "clock-low border-transparent",
            !clock.running && "bg-secondary text-muted-foreground",
            !clock.running && low && "text-destructive",
          )}
        >
          {clock.enabled ? formatClock(clock.ms) : "∞"}
        </div>
      )}
    </div>
  );
}
