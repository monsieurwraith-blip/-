import { ArrowUpRight, Lightbulb, Loader2 } from "lucide-react";

import { pieceName } from "@/components/chess/PieceImage";
import { Button } from "@/components/ui/button";
import type { HintLevel } from "@/lib/coach/hints";

import type { HintMove } from "../types";

interface HintBannerProps {
  hint: HintMove | null;
  pending: boolean;
  onRequestLevel?: (level: HintLevel) => void;
}

const LEVEL_TITLES: Record<HintLevel, string> = {
  1: "Уровень 1 · Стратегический ориентир",
  2: "Уровень 2 · Тактическая подсказка",
  3: "Уровень 3 · Лучший ход",
};

/** Displays progressive 3-level hints from subtle clue to full Stockfish best move. */
export function HintBanner({ hint, pending, onRequestLevel }: HintBannerProps) {
  if (pending || !hint) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin text-primary" /> Stockfish ищет сильнейший план…
      </div>
    );
  }

  const piece = pieceName(hint.piece);
  const text =
    hint.level === 1 ? hint.level1Text : hint.level === 2 ? hint.level2Text : hint.level3Text;

  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5"
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-primary">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
              {LEVEL_TITLES[hint.level]}
            </p>
            {hint.level === 3 && (
              <span className="font-mono text-sm font-semibold text-foreground">{hint.san}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground/95">{text}</p>
          {hint.level === 2 && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Фигура: <span className="capitalize text-foreground">{piece}</span> на {hint.from}
            </p>
          )}
        </div>
      </div>

      {onRequestLevel && hint.level < 3 && (
        <div className="flex items-center justify-end gap-1.5 border-t border-border/60 pt-2">
          <Button
            type="button"
            variant="panel"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onRequestLevel((hint.level + 1) as HintLevel)}
          >
            <ArrowUpRight className="size-3.5" aria-hidden />
            {hint.level === 1 ? "Тактическая подсказка (Ур. 2)" : "Показать лучший ход (Ур. 3)"}
          </Button>
        </div>
      )}
    </div>
  );
}
