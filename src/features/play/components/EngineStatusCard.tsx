import { Chess } from "chess.js";
import { AlertTriangle, Cpu, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { EngineStatus, SearchPurpose, SearchTiming } from "@/hooks/useStockfish";
import type { DifficultyLevel } from "@/lib/chess/difficulty";
import type { Color } from "@/lib/chess/types";
import type { EngineInfo } from "@/lib/chess/uci";
import { formatEval, toWhitePov } from "@/lib/coach/evaluation";
import { playUci } from "@/lib/coach/tactics";
import { STOCKFISH_BUILD_LABEL, STOCKFISH_WORKER_URL } from "@/lib/engine/config";
import { formatSeconds, type ThinkTimeId } from "@/lib/engine/thinkTime";
import {
  PLAY_STYLES,
  type DepthLimit,
  type EngineSettings,
  type PlayStyleId,
} from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

import { ThinkTimeSelector } from "./ThinkTimeSelector";

interface EngineStatusCardProps {
  status: EngineStatus;
  purpose: SearchPurpose | null;
  timing: SearchTiming | null;
  engineName: string | null;
  error: string | null;
  moveError: string | null;
  info: EngineInfo | null;
  level: DifficultyLevel;
  fen: string;
  turn: Color;
  thinkTime: ThinkTimeId;
  customSeconds: number;
  depthLimit?: DepthLimit;
  playStyle?: PlayStyleId;
  onThinkTimeChange: (patch: Partial<EngineSettings>) => void;
  onRestart: () => void;
}

const LABEL: Record<EngineStatus, string> = {
  loading: "Загрузка…",
  ready: "Готов",
  thinking: "Stockfish is calculating...",
  moving: "Ходит",
  error: "Ошибка",
};

function formatNodes(nodes: number): string {
  if (nodes >= 1_000_000) return `${(nodes / 1_000_000).toFixed(1).replace(".", ",")} млн`;
  if (nodes >= 1000) return `${Math.round(nodes / 1000)} тыс.`;
  return String(nodes);
}

function sanFromUci(fen: string, uci: string | undefined): string | null {
  if (!uci) return null;
  try {
    const board = new Chess(fen);
    return playUci(board, uci)?.san ?? uci;
  } catch {
    return uci;
  }
}

export function EngineStatusCard({
  status,
  purpose,
  timing,
  engineName,
  error,
  moveError,
  info,
  level,
  fen,
  turn,
  thinkTime,
  customSeconds,
  depthLimit = null,
  playStyle = "balanced",
  onThinkTimeChange,
  onRestart,
}: EngineStatusCardProps) {
  const busy = status === "thinking" || status === "moving";
  const label =
    status === "thinking" && purpose === "hint"
      ? "Подбор подсказки…"
      : status === "thinking" && purpose === "analysis"
        ? "Анализ тренера…"
        : LABEL[status];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status !== "thinking" || !timing) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60);
    return () => clearInterval(id);
  }, [status, timing]);

  const elapsedMs = timing ? Math.max(0, now - timing.startedAt) : 0;
  const timeProgress =
    timing && timing.budgetMs > 0 ? Math.min(100, (elapsedMs / timing.budgetMs) * 100) : 0;
  const targetDepth = depthLimit ?? level.depth ?? 20;
  const depthProgress = Math.min(
    100,
    ((info?.depth ?? 0) / (purpose === "hint" ? 16 : purpose === "analysis" ? 18 : targetDepth)) *
      100,
  );
  const progressPct =
    purpose === "move" && timing ? timeProgress : Math.max(timeProgress, depthProgress);

  const showBoardCandidate = status === "thinking" && purpose !== "analysis";
  const evalText = useMemo(() => {
    if (!showBoardCandidate || !info?.score) return null;
    return formatEval(toWhitePov(info.score, turn));
  }, [showBoardCandidate, info?.score, turn]);

  const bestMoveSan = useMemo(() => {
    if (!showBoardCandidate || !info?.pv[0]) return null;
    return sanFromUci(fen, info.pv[0]);
  }, [showBoardCandidate, fen, info?.pv]);

  const styleLabel = PLAY_STYLES.find((s) => s.id === playStyle)?.label ?? "Сбалансированный";

  return (
    <section className="panel p-4" aria-label="Состояние движка">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Cpu className="size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{engineName ?? "Stockfish 19"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {STOCKFISH_BUILD_LABEL} · Web Worker
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-xs font-mono",
            status === "error"
              ? "text-destructive"
              : busy
                ? "text-primary"
                : "text-muted-foreground",
          )}
          role="status"
          aria-live="polite"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              status === "ready" && "bg-primary",
              busy && "animate-breathe bg-primary",
              status === "loading" && "animate-breathe bg-warning",
              status === "error" && "bg-destructive",
            )}
          />
          {label}
        </span>
      </div>

      {status === "thinking" && (
        <div className="mt-3 space-y-2">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>
              {info
                ? `Depth ${info.depth}${info.seldepth ? `/${info.seldepth}` : ""}${info.nodes ? ` · ${formatNodes(info.nodes)}` : ""}`
                : "Stockfish is calculating..."}
            </span>
            {timing && (
              <span>
                {formatSeconds(Math.min(elapsedMs, timing.budgetMs))} /{" "}
                {formatSeconds(timing.budgetMs)}
              </span>
            )}
          </div>
          {showBoardCandidate && (evalText || bestMoveSan) && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1.5 text-xs">
              {evalText && (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Оценка:</span>
                  <span className="font-mono font-medium text-foreground">{evalText}</span>
                </span>
              )}
              {evalText && bestMoveSan && <span className="text-border">·</span>}
              {bestMoveSan && (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Лучший ход:</span>
                  <span className="font-mono font-medium text-primary">{bestMoveSan}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {status !== "error" && (
        <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3">
          {status !== "thinking" && (
            <p className="text-xs text-muted-foreground">
              {level.label} (Skill {level.skillLevel}) · {styleLabel} ·{" "}
              {depthLimit
                ? `Глубина ${depthLimit}`
                : level.depth
                  ? `Глубина ${level.depth}`
                  : "Без лимита"}
            </p>
          )}
          <ThinkTimeSelector
            thinkTime={thinkTime}
            customSeconds={customSeconds}
            onChange={onThinkTimeChange}
            variant="compact"
          />
        </div>
      )}

      {moveError && status !== "error" && (
        <p className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          {moveError}
        </p>
      )}

      {status === "error" && (
        <div className="mt-3 space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <p className="flex gap-2 text-destructive">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error ?? "Движок не запустился."}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            <li>Нужен браузер с поддержкой WebAssembly и Web Worker.</li>
            <li>
              Файлы движка должны открываться по адресу{" "}
              <code className="font-mono">{STOCKFISH_WORKER_URL}</code> и рядом лежащему{" "}
              <code className="font-mono">.wasm</code>.
            </li>
            <li>
              В проекте их копирует команда <code className="font-mono">npm run engine:copy</code>.
            </li>
          </ul>
          <Button variant="panel" size="sm" onClick={onRestart}>
            <RotateCw /> Перезапустить движок
          </Button>
        </div>
      )}
    </section>
  );
}
