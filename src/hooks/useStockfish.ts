import { useCallback, useEffect, useRef, useState } from "react";

import type { EngineInfo } from "@/lib/chess/uci";
import { STOCKFISH_WORKER_URL } from "@/lib/engine/config";
import {
  EngineError,
  StockfishEngine,
  type SearchRequest,
  type SearchResult,
} from "@/lib/engine/stockfishEngine";

export type EngineStatus = "loading" | "ready" | "thinking" | "moving" | "error";
export type SearchPurpose = "move" | "hint" | "analysis";

export interface EngineSearchOptions extends Omit<SearchRequest, "onInfo"> {
  purpose: SearchPurpose;
  /**
   * Report the result no earlier than this many ms after the search started, so a
   * depth-capped search still "thinks" for the user's chosen time. Cancellable by stop().
   */
  minDurationMs?: number;
}

/** Timing of the running search, for progress indicators. */
export interface SearchTiming {
  startedAt: number;
  budgetMs: number;
}

export interface StockfishHandle {
  status: EngineStatus;
  /** Ready to accept work (not loading, not failed). */
  available: boolean;
  error: string | null;
  engineName: string | null;
  info: EngineInfo | null;
  purpose: SearchPurpose | null;
  timing: SearchTiming | null;
  search: (options: EngineSearchOptions) => Promise<SearchResult>;
  stop: () => void;
  newGame: () => Promise<void>;
  restart: () => void;
}

const MOVING_DISPLAY_MS = 350;

/** Owns one Stockfish Web Worker for the lifetime of the component. Client-only (runs in effects). */
export function useStockfish(): StockfishHandle {
  const engineRef = useRef<StockfishEngine | null>(null);
  const pendingRef = useRef(0);
  const movingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<EngineStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [engineName, setEngineName] = useState<string | null>(null);
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [purpose, setPurpose] = useState<SearchPurpose | null>(null);
  const [timing, setTiming] = useState<SearchTiming | null>(null);
  const stopGen = useRef(0);

  useEffect(() => {
    let disposed = false;
    const engine = new StockfishEngine(STOCKFISH_WORKER_URL);
    engineRef.current = engine;
    pendingRef.current = 0;
    setStatus("loading");
    setError(null);
    engine.onFatal = (err) => {
      if (disposed) return;
      setError(err.message);
      setStatus("error");
    };
    engine
      .init()
      .then(() => {
        if (disposed) return;
        setEngineName(engine.name);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (disposed) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
    return () => {
      disposed = true;
      if (movingTimer.current) clearTimeout(movingTimer.current);
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [attempt]);

  const search = useCallback(
    async ({ purpose: p, minDurationMs, ...request }: EngineSearchOptions) => {
      const engine = engineRef.current;
      if (!engine) throw new EngineError("destroyed", "Движок не запущен.");
      pendingRef.current += 1;
      if (movingTimer.current) clearTimeout(movingTimer.current);
      const gen = stopGen.current;
      const startedAt = Date.now();
      setStatus("thinking");
      setPurpose(p);
      setInfo(null);
      setTiming({ startedAt, budgetMs: Math.max(minDurationMs ?? 0, request.movetimeMs) });
      try {
        let result = await engine.search({ ...request, onInfo: setInfo });
        const wait = (minDurationMs ?? 0) - (Date.now() - startedAt);
        if (!result.cancelled && wait > 0) {
          await new Promise((r) => setTimeout(r, wait));
          if (stopGen.current !== gen) result = { ...result, cancelled: true };
        }
        pendingRef.current -= 1;
        if (pendingRef.current === 0) {
          if (!result.cancelled && result.bestMove && p === "move") {
            setStatus("moving");
            movingTimer.current = setTimeout(() => {
              if (pendingRef.current === 0) setStatus((s) => (s === "moving" ? "ready" : s));
            }, MOVING_DISPLAY_MS);
          } else {
            setStatus((s) => (s === "error" ? s : "ready"));
          }
          setPurpose(null);
          setTiming(null);
        }
        return result;
      } catch (err) {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        throw err;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    stopGen.current += 1;
    engineRef.current?.stop();
  }, []);

  const newGame = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setInfo(null);
    try {
      await engine.newGame();
    } catch {
      // Fatal errors are surfaced through onFatal.
    }
  }, []);

  const restart = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    status,
    available: status !== "loading" && status !== "error",
    error,
    engineName,
    info,
    purpose,
    timing,
    search,
    stop,
    newGame,
    restart,
  };
}
