import { Lightbulb, Loader2 } from "lucide-react";

import { PieceImage, pieceName } from "@/components/chess/PieceImage";

import type { HintMove } from "../types";

interface HintBannerProps {
  hint: HintMove | null;
  pending: boolean;
}

/** Spells out the suggested move: which piece, from where, to where. */
export function HintBanner({ hint, pending }: HintBannerProps) {
  if (pending || !hint) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" /> Stockfish ищет лучший ход…
      </div>
    );
  }

  const piece = pieceName(hint.piece);
  const extra = [
    hint.captured ? `берёт ${pieceName(hint.captured)}` : null,
    hint.promotion ? `превращение в ${promotionName(hint.promotion)}` : null,
  ].filter(Boolean);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5"
    >
      <span className="relative grid size-9 shrink-0 place-items-center rounded-md bg-secondary">
        <PieceImage
          color={hint.piece === hint.piece ? "w" : "w"}
          type={hint.piece}
          className="hidden"
        />
        <Lightbulb className="size-4 text-warning" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Подсказка</p>
        <p className="text-sm">
          <span className="capitalize">{piece}</span>{" "}
          <span className="font-mono">
            {hint.from} → {hint.to}
          </span>
          {extra.length > 0 && <span className="text-muted-foreground"> · {extra.join(", ")}</span>}
        </p>
      </div>
      <span className="font-mono text-base text-warning">{hint.san}</span>
    </div>
  );
}

function promotionName(piece: string): string {
  switch (piece) {
    case "q":
      return "ферзя";
    case "r":
      return "ладью";
    case "b":
      return "слона";
    default:
      return "коня";
  }
}
