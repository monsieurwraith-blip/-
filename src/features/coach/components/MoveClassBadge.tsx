import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/coach/evaluation";
import { cn } from "@/lib/utils";

export const CLASS_TONE: Record<MoveClass, string> = {
  brilliant: "text-move-brilliant border-move-brilliant/40 bg-move-brilliant/10",
  best: "text-move-best border-move-best/40 bg-move-best/10",
  excellent: "text-move-excellent border-move-excellent/40 bg-move-excellent/10",
  good: "text-move-good border-move-good/40 bg-move-good/10",
  inaccuracy: "text-move-inaccuracy border-move-inaccuracy/40 bg-move-inaccuracy/10",
  mistake: "text-move-mistake border-move-mistake/40 bg-move-mistake/10",
  blunder: "text-move-blunder border-move-blunder/40 bg-move-blunder/10",
};

export const CLASS_TEXT: Record<MoveClass, string> = {
  brilliant: "text-move-brilliant",
  best: "text-move-best",
  excellent: "text-move-excellent",
  good: "text-move-good",
  inaccuracy: "text-move-inaccuracy",
  mistake: "text-move-mistake",
  blunder: "text-move-blunder",
};

export function MoveClassBadge({ value, className }: { value: MoveClass; className?: string }) {
  const info = MOVE_CLASS_INFO[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        CLASS_TONE[value],
        className,
      )}
    >
      <span className="font-mono">{info.symbol}</span>
      {info.en}
      <span className="text-foreground/60">· {info.ru}</span>
    </span>
  );
}
