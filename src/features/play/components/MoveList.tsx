import type { Move } from "chess.js";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { CLASS_TEXT } from "@/features/coach/components/MoveClassBadge";
import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/coach/evaluation";
import type { CoachRecord } from "@/lib/coach/report";
import { cn } from "@/lib/utils";

interface MoveListProps {
  history: readonly Move[];
  coachRecords?: readonly CoachRecord[];
  viewPly?: number | null;
  onInspectPly?: (ply: number | null) => void;
  onStepHistory?: (delta: number) => void;
}

export function MoveList({
  history,
  coachRecords,
  viewPly = null,
  onInspectPly,
  onStepHistory,
}: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows: { number: number; white: Move | undefined; black: Move | undefined }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: history[i], black: history[i + 1] });
  }
  const activePly = viewPly ?? history.length;

  const classByPly = useMemo(() => {
    const map = new Map<number, MoveClass>();
    if (!coachRecords) return map;
    for (const r of coachRecords) {
      if (!r.corrected) map.set(r.ply, r.verdict.classification);
    }
    return map;
  }, [coachRecords]);

  useEffect(() => {
    if (viewPly !== null) return;
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [history.length, viewPly]);

  return (
    <section className="panel flex min-h-0 flex-col" aria-label="История ходов">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow">Ходы</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {plyLabel(history.length)}
          </span>
        </div>
        {onInspectPly && history.length > 0 && (
          <div className="flex items-center gap-0.5" aria-label="Навигация по истории">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={activePly <= 0}
              onClick={() => onInspectPly(0)}
              title="К началу партии"
              aria-label="К началу партии"
            >
              <ChevronFirst className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={activePly <= 0}
              onClick={() => onStepHistory?.(-1)}
              title="Предыдущий ход"
              aria-label="Предыдущий ход"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={activePly >= history.length}
              onClick={() => onStepHistory?.(1)}
              title="Следующий ход"
              aria-label="Следующий ход"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={activePly >= history.length}
              onClick={() => onInspectPly(null)}
              title="К текущей позиции"
              aria-label="К текущей позиции"
            >
              <ChevronLast className="size-3.5" />
            </Button>
          </div>
        )}
      </header>
      <div className="grid grid-cols-[2.75rem_1fr_1fr] border-b border-border px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="pl-2">#</span>
        <span className="px-2">Белые</span>
        <span className="px-2">Чёрные</span>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-thin max-h-56 min-h-28 overflow-y-auto px-2 py-1.5 lg:max-h-72"
      >
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Ходов пока нет</p>
        ) : (
          <ol>
            {rows.map((row, r) => (
              <li
                key={row.number}
                className={cn(
                  "grid grid-cols-[2.75rem_1fr_1fr] rounded-md font-mono text-sm",
                  r % 2 === 1 && "bg-muted/50",
                )}
              >
                <span className="py-1 pl-2 text-muted-foreground">{row.number}.</span>
                <MoveCell
                  move={row.white}
                  ply={r * 2 + 1}
                  current={r * 2 + 1 === activePly}
                  moveClass={classByPly.get(r * 2)}
                  onSelect={onInspectPly}
                />
                <MoveCell
                  move={row.black}
                  ply={r * 2 + 2}
                  current={r * 2 + 2 === activePly}
                  moveClass={classByPly.get(r * 2 + 1)}
                  onSelect={onInspectPly}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function MoveCell({
  move,
  ply,
  current,
  moveClass,
  onSelect,
}: {
  move: Move | undefined;
  ply: number;
  current: boolean;
  moveClass: MoveClass | undefined;
  onSelect?: ((ply: number | null) => void) | undefined;
}) {
  if (!move) return <span />;
  const info = moveClass ? MOVE_CLASS_INFO[moveClass] : null;
  const content = (
    <>
      <span>{move.san}</span>
      {info && moveClass && (
        <span className={cn("text-[11px] font-semibold", CLASS_TEXT[moveClass])}>
          {info.symbol}
        </span>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(ply)}
        className={cn(
          "my-0.5 flex items-center justify-between gap-1 rounded px-2 py-0.5 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          current ? "bg-primary/18 font-semibold text-primary" : "text-foreground/90",
        )}
        aria-current={current ? "step" : undefined}
        title={info ? `${info.en} · ${info.ru}` : `Просмотреть позицию после ${move.san}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "my-0.5 flex items-center justify-between gap-1 rounded px-2 py-0.5 transition-colors",
        current ? "bg-primary/15 text-primary" : "text-foreground/90",
      )}
      aria-current={current ? "step" : undefined}
      title={info ? `${info.en} · ${info.ru}` : undefined}
    >
      {content}
    </span>
  );
}

function plyLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} полуход`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} полухода`;
  return `${n} полуходов`;
}
