import { useId, useState } from "react";

import type { EvalPoint } from "@/lib/coach/report";

interface EvalGraphProps {
  points: readonly EvalPoint[];
}

function formatPawns(pawns: number): string {
  if (Math.abs(pawns) >= 9.95) return pawns > 0 ? "+M" : "−M";
  if (Math.abs(pawns) < 0.05) return "0,0";
  return `${pawns > 0 ? "+" : "−"}${Math.abs(pawns).toFixed(1).replace(".", ",")}`;
}

export function EvalGraph({ points }: EvalGraphProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="grid h-36 place-items-center rounded-lg border border-border bg-secondary/40 text-xs text-muted-foreground">
        Недостаточно данных для графика оценки
      </div>
    );
  }

  const W = 560;
  const H = 148;
  const padX = 10;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const midY = padY + innerH / 2;

  const coords = points.map((pt, i) => {
    const x = padX + (i / (points.length - 1)) * innerW;
    const clamped = Math.max(-10, Math.min(10, pt.pawns));
    const y = midY - (clamped / 10) * (innerH / 2);
    return { x, y, pt };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${midY} L ${coords[0]!.x.toFixed(1)} ${midY} Z`;
  const hovered = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Оценка позиции по ходам (белые ↑ / чёрные ↓)</span>
        {hovered ? (
          <span className="font-mono text-foreground">
            Ход {Math.floor(hovered.pt.ply / 2) + 1}: {formatPawns(hovered.pt.pawns)}
          </span>
        ) : (
          <span className="font-mono text-[11px]">Наведите на график</span>
        )}
      </div>
      <div className="relative rounded-lg border border-border bg-secondary/40 p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-36 w-full overflow-visible"
          role="img"
          aria-label="График оценки позиции по ходу партии"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ivory)" stopOpacity="0.35" />
              <stop offset="50%" stopColor="var(--ivory)" stopOpacity="0.06" />
              <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <line
            x1={padX}
            y1={midY}
            x2={W - padX}
            y2={midY}
            stroke="var(--border)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((c, i) => (
            <g key={c.pt.ply}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hoverIdx === i ? 4.5 : 2.2}
                fill={hoverIdx === i ? "var(--ivory)" : "var(--primary)"}
                className="transition-all"
              />
              <rect
                x={c.x - innerW / points.length / 2}
                y={0}
                width={Math.max(10, innerW / points.length)}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
