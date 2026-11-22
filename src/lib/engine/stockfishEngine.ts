import { parseBestMove, parseInfo, type EngineInfo } from "@/lib/chess/uci";

export type EngineErrorCode = "unsupported" | "load-failed" | "timeout" | "crashed" | "destroyed";

export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export interface SearchRequest {
  /** FEN of the starting position; omit for the standard start position. */
  startFen?: string;
  /** Moves played from the start position, in UCI notation (e2e4, e7e8q…). */
  moves: readonly string[];
  skillLevel: number;
  /** Depth cap; null searches until movetime runs out. */
  depth: number | null;
  movetimeMs: number;
  /** Number of best lines to report (UCI MultiPV). Defaults to 1. */
  multiPv?: number;
  onInfo?: (info: EngineInfo) => void;
}

export interface SearchResult {
  bestMove: string | null;
  ponder: string | null;
  info: EngineInfo | null;
  /** Final info of every MultiPV line, best first (just `info` when MultiPV is 1). */
  lines: EngineInfo[];
  /** True when the search was stopped/superseded; its move must not be played. */
  cancelled: boolean;
}

const CANCELLED: SearchResult = { bestMove: null, ponder: null, info: null, lines: [], cancelled: true };

interface ActiveSearch {
  generation: number;
  lastInfo: EngineInfo | null;
  lines: Map<number, EngineInfo>;
  onInfo: ((info: EngineInfo) => void) | undefined;
  resolve: (result: SearchResult) => void;
  reject: (error: Error) => void;
}

type LineWaiter = {
  match: (line: string) => boolean;
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Thin UCI client for Stockfish running in a Web Worker.
 * - All engine work is serialized through one queue, so searches never overlap.
 * - `stop()` cancels the running search and every search queued before the call.
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private waiters = new Set<LineWaiter>();
  private active: ActiveSearch | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private fatal: EngineError | null = null;
  private multiPv = 1;

  /** Engine name reported by `id name`. */
  name: string | null = null;
  onFatal: ((error: EngineError) => void) | null = null;
  onLine: ((line: string) => void) | null = null;

  constructor(private readonly url: string) {}

  async init(timeoutMs = 25_000): Promise<void> {
    if (typeof Worker === "undefined") {
      throw new EngineError("unsupported", "Браузер не поддерживает Web Worker.");
    }
    if (typeof WebAssembly === "undefined") {
      throw new EngineError("unsupported", "Браузер не поддерживает WebAssembly.");
    }
    try {
      this.worker = new Worker(this.url);
    } catch (err) {
      throw new EngineError("load-failed", `Не удалось создать Web Worker: ${String(err)}`);
    }
    this.worker.onmessage = (event: MessageEvent) => {
      const text = typeof event.data === "string" ? event.data : String(event.data);
      for (const line of text.split("\n")) {
        if (line.trim()) this.handleLine(line.trim());
      }
    };
    this.worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.fail(
        new EngineError(
          "load-failed",
          event.message
            ? `Ошибка движка: ${event.message}`
            : `Не удалось загрузить файл движка ${this.url} или его .wasm.`,
        ),
      );
    };

    const handshake = this.waitFor((l) => l === "uciok", timeoutMs, "uci");
    this.send("uci");
    await handshake;
    this.send("setoption name Hash value 16");
    await this.isReady(timeoutMs);
  }

  /** Starts a fresh game: cancels pending work and resets the engine's internal state. */
  newGame(): Promise<void> {
    this.stop();
    return this.enqueue(async () => {
      this.send("ucinewgame");
      await this.isReady();
    });
  }

  search(request: SearchRequest): Promise<SearchResult> {
    const generation = this.generation;
    return this.enqueue(async () => {
      if (generation !== this.generation) return CANCELLED;
      const skill = Math.max(0, Math.min(20, Math.round(request.skillLevel)));
      this.send(`setoption name Skill Level value ${skill}`);
      const multiPv = Math.max(1, Math.min(5, Math.round(request.multiPv ?? 1)));
      if (multiPv !== this.multiPv) {
        this.send(`setoption name MultiPV value ${multiPv}`);
        this.multiPv = multiPv;
      }
      await this.isReady();
      if (generation !== this.generation) return CANCELLED;
      const base = request.startFen ? `position fen ${request.startFen}` : "position startpos";
      const position = request.moves.length > 0 ? `${base} moves ${request.moves.join(" ")}` : base;

      return new Promise<SearchResult>((resolve, reject) => {
        this.active = {
          generation,
          lastInfo: null,
          lines: new Map(),
          onInfo: request.onInfo,
          resolve,
          reject,
        };
        this.send(position);
        const depth = request.depth === null ? "" : ` depth ${Math.max(1, Math.round(request.depth))}`;
        this.send(`go movetime ${Math.max(10, Math.round(request.movetimeMs))}${depth}`);
      });
    });
  }

  /** Cancels the running search (its bestmove will be reported as cancelled) and queued ones. */
  stop(): void {
    this.generation++;
    if (this.active && this.worker) this.send("stop");
  }

  destroy(): void {
    this.stop();
    this.fail(new EngineError("destroyed", "Движок остановлен."), false);
    this.worker?.terminate();
    this.worker = null;
  }

  get isBusy(): boolean {
    return this.active !== null;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      if (this.fatal) throw this.fatal;
      return task();
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private isReady(timeoutMs = 15_000): Promise<void> {
    const ready = this.waitFor((l) => l === "readyok", timeoutMs, "isready");
    this.send("isready");
    return ready;
  }

  private send(command: string): void {
    if (this.fatal) return;
    this.worker?.postMessage(command);
  }

  private waitFor(
    match: (line: string) => boolean,
    timeoutMs: number,
    label: string,
  ): Promise<void> {
    if (this.fatal) return Promise.reject(this.fatal);
    return new Promise<void>((resolve, reject) => {
      const waiter: LineWaiter = {
        match,
        resolve: () => {
          clearTimeout(waiter.timer);
          this.waiters.delete(waiter);
          resolve();
        },
        reject: (error) => {
          clearTimeout(waiter.timer);
          this.waiters.delete(waiter);
          reject(error);
        },
        timer: setTimeout(() => {
          const err = new EngineError(
            "timeout",
            `Движок не ответил на команду «${label}» вовремя.`,
          );
          waiter.reject(err);
          this.fail(err);
        }, timeoutMs),
      };
      this.waiters.add(waiter);
    });
  }

  private handleLine(line: string): void {
    this.onLine?.(line);
    if (line.startsWith("id name ")) this.name = line.slice("id name ".length);

    const search = this.active;
    if (search && line.startsWith("info ")) {
      const info = parseInfo(line);
      if (info && info.pv.length > 0) {
        const index = info.multipv ?? 1;
        search.lines.set(index, info);
        if (index === 1) {
          search.lastInfo = info;
          if (search.generation === this.generation) search.onInfo?.(info);
        }
      }
    } else if (search && line.startsWith("bestmove")) {
      const best = parseBestMove(line);
      this.active = null;
      search.resolve({
        bestMove: best?.move ?? null,
        ponder: best?.ponder ?? null,
        info: search.lastInfo,
        lines: [...search.lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l),
        cancelled: search.generation !== this.generation,
      });
    }

    for (const waiter of [...this.waiters]) {
      if (waiter.match(line)) waiter.resolve();
    }
  }

  private fail(error: EngineError, notify = true): void {
    if (this.fatal) return;
    this.fatal = error;
    for (const waiter of [...this.waiters]) waiter.reject(error);
    if (this.active) {
      this.active.reject(error);
      this.active = null;
    }
    if (notify) this.onFatal?.(error);
  }
}
