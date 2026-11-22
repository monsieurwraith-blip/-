import { Chess } from "chess.js";
import { Activity, AlertTriangle, Layers, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

import { EvalGraph } from "@/features/coach/components/EvalGraph";
import type { BoardCell } from "@/lib/chess/pieceIds";
import { summarizeMaterial } from "@/lib/chess/material";
import type { Color } from "@/lib/chess/types";
import type { EngineInfo, EngineScore } from "@/lib/chess/uci";
import { formatEval, toWhitePov } from "@/lib/coach/evaluation";
import type { EvalPoint } from "@/lib/coach/report";
import { forkFrom, hangingPieces, lineTactics, pieceWord, pvToSan } from "@/lib/coach/tactics";
import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  fen: string;
  cells: readonly BoardCell[];
  turn: Color;
  liveEval: {
    score: EngineScore;
    depth: number;
    lines: EngineInfo[];
    turn: Color;
  } | null;
  evalHistory: readonly EvalPoint[];
}

function detectTacticalAlerts(fen: string, turn: Color): string[] {
  try {
    const chess = new Chess(fen);
    const alerts: string[] = [];
    if (chess.inCheck()) {
      alerts.push(`${turn === "w" ? "Белому" : "Чёрному"} королю объявлен шах`);
    }
    for (const color of ["w", "b"] as const) {
      const hanging = hangingPieces(chess, color);
      if (hanging.length > 0) {
        const sq = hanging[0]!;
        const p = chess.get(sq);
        if (p) {
          alerts.push(
            `Под боем ${color === "w" ? "белый" : "чёрный"} ${pieceWord(p.type)} на ${sq}`,
          );
        }
      }
    }
    for (const row of chess.board()) {
      for (const p of row) {
        if (!p) continue;
        const f = forkFrom(chess, p.square);
        if (f && alerts.length < 3) {
          alerts.push(`Вилка от ${pieceWord(p.type, "gen")} на ${p.square}`);
        }
        const pin = lineTactics(chess, p.square)[0];
        if (pin && alerts.length < 3) {
          alerts.push(
            pin.kind === "pin"
              ? `Связка через поле ${pin.front}`
              : `Сквозная атака через ${pin.front}`,
          );
        }
      }
    }
    return alerts.slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Live Stockfish Chess Analytics card: top MultiPV candidate moves, depth,
 * tactical threats detected via chess.js, material balance, and EvalGraph.
 */
export function AnalyticsPanel({ fen, cells, turn, liveEval, evalHistory }: AnalyticsPanelProps) {
  const material = useMemo(() => summarizeMaterial(cells), [cells]);
  const alerts = useMemo(() => detectTacticalAlerts(fen, turn), [fen, turn]);

  const topLines = useMemo(() => {
    if (!liveEval || liveEval.lines.length === 0) return [];
    return liveEval.lines.slice(0, 2).map((line, i) => ({
      rank: i + 1,
      score: line.score ? formatEval(toWhitePov(line.score, liveEval.turn)) : "—",
      sans: pvToSan(fen, line.pv, 5).join(" "),
      depth: line.depth,
    }));
  }, [fen, liveEval]);

  const netAdvantage =
    material.advantage.w > 0
      ? `Белые +${material.advantage.w}`
      : material.advantage.b > 0
        ? `Чёрные +${material.advantage.b}`
        : "Равенство";

  return (
    <section className="panel space-y-3 p-4" aria-label="Аналитика позиции">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-1.5 text-primary">
          <Activity className="size-3.5" aria-hidden />
          Телеметрия позиции
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {liveEval ? `Depth ${liveEval.depth}` : "Оценка по ходам"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-secondary/45 px-2.5 py-2">
          <p className="text-[11px] text-muted-foreground">Оценка движка</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {liveEval ? formatEval(liveEval.score) : "0,0"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/45 px-2.5 py-2">
          <p className="text-[11px] text-muted-foreground">Материал</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{netAdvantage}</p>
        </div>
      </div>

      {topLines.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Layers className="size-3" aria-hidden />
            Лучшие линии Stockfish
          </p>
          <div className="space-y-1">
            {topLines.map((line) => (
              <div
                key={line.rank}
                className="flex items-center gap-2 rounded-md border border-border/70 bg-secondary/35 px-2.5 py-1.5 font-mono text-xs"
              >
                <span
                  className={cn(
                    "w-11 shrink-0 font-semibold",
                    line.rank === 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {line.score}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground/90">
                  {line.sans || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-warning">
            <ShieldAlert className="size-3" aria-hidden />
            Тактические мотивы
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {alerts.map((a, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evalHistory.length >= 2 && <EvalGraph points={evalHistory} />}
    </section>
  );
}
