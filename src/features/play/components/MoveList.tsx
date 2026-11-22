import type { Move } from "chess.js";
import { useEffect, useMemo, useRef } from "react";

import { CLASS_TEXT } from "@/features/coach/components/MoveClassBadge";
import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/coach/evaluation";
import type { CoachRecord } from "@/lib/coach/report";
import { cn } from "@/lib/utils";

interface MoveListProps {
  history: readonly Move[];
  coachRecords?: readonly CoachRecord[];
}

export function MoveList({ history, coachRecords }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows: { number: number; white: Move | undefined; black: Move | undefined }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: history[i], black: history[i + 1] });
  }
  const lastIndex = history.length - 1;

  const classByPly = useMemo(() => {
    const map = new Map<number, MoveClass>();
    if (!coachRecords) return map;
    for (const r of coachRecords) {
      if (!r.corrected) map.set(r.ply, r.verdict.classification);
    }
    return map;
  }, [coachRecords]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history.length]);

  return (
    <section className="panel flex min-h-0 flex-col" aria-label="История ходов">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="eyebrow">Ходы</h2>
        <span className="font-mono text-xs text-muted-foreground">{plyLabel(history.length)}</span>
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
                  current={r * 2 === lastIndex}
                  moveClass={classByPly.get(r * 2)}
                />
                <MoveCell
                  move={row.black}
                  current={r * 2 + 1 === lastIndex}
                  moveClass={classByPly.get(r * 2 + 1)}
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
  current,
  moveClass,
}: {
  move: Move | undefined;
  current: boolean;
  moveClass: MoveClass | undefined;
}) {
  if (!move) return <span />;
  const info = moveClass ? MOVE_CLASS_INFO[moveClass] : null;
  return (
    <span
      className={cn(
        "my-0.5 flex items-center justify-between gap-1 rounded px-2 py-0.5 transition-colors",
        current ? "bg-primary/15 text-primary" : "text-foreground/90",
      )}
      aria-current={current ? "step" : undefined}
      title={info ? `${info.en} · ${info.ru}` : undefined}
    >
      <span>{move.san}</span>
      {info && moveClass && (
        <span className={cn("text-[11px] font-semibold", CLASS_TEXT[moveClass])}>
          {info.symbol}
        </span>
      )}
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
