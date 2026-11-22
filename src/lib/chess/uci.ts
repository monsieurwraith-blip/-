import type { BoardMove, PromotionPiece, Square } from "./types";

export interface EngineScore {
  kind: "cp" | "mate";
  value: number;
}

export interface EngineInfo {
  depth: number;
  seldepth?: number;
  /** 1-based line number when the engine runs with MultiPV > 1. */
  multipv?: number;
  score?: EngineScore;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv: string[];
}

export interface BestMoveLine {
  /** null when the engine reports `bestmove (none)` (no legal moves). */
  move: string | null;
  ponder: string | null;
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

export function parseUciMove(uci: string): BoardMove | null {
  const m = UCI_MOVE.exec(uci.trim());
  if (!m) return null;
  const move: BoardMove = { from: m[1] as Square, to: m[2] as Square };
  if (m[3]) move.promotion = m[3] as PromotionPiece;
  return move;
}

export function toUciMove(move: {
  from: string;
  to: string;
  promotion?: string | undefined;
}): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function parseBestMove(line: string): BestMoveLine | null {
  const parts = line.trim().split(/\s+/);
  if (parts[0] !== "bestmove") return null;
  const move = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
  const ponderIdx = parts.indexOf("ponder");
  const ponder = ponderIdx > 0 ? (parts[ponderIdx + 1] ?? null) : null;
  return { move, ponder };
}

/** Parses a UCI `info` line with search progress. Ignores `info string` / `currmove` lines. */
export function parseInfo(line: string): EngineInfo | null {
  const parts = line.trim().split(/\s+/);
  if (parts[0] !== "info" || !parts.includes("depth") || parts.includes("currmove")) return null;
  const info: EngineInfo = { depth: 0, pv: [] };
  for (let i = 1; i < parts.length; i++) {
    const key = parts[i];
    const next = parts[i + 1];
    switch (key) {
      case "depth":
        info.depth = Number(next);
        i++;
        break;
      case "seldepth":
        info.seldepth = Number(next);
        i++;
        break;
      case "multipv":
        info.multipv = Number(next);
        i++;
        break;
      case "nodes":
        info.nodes = Number(next);
        i++;
        break;
      case "nps":
        info.nps = Number(next);
        i++;
        break;
      case "time":
        info.timeMs = Number(next);
        i++;
        break;
      case "score": {
        const kind = next;
        const value = Number(parts[i + 2]);
        if ((kind === "cp" || kind === "mate") && Number.isFinite(value)) {
          info.score = { kind, value };
        }
        i += 2;
        break;
      }
      case "pv":
        info.pv = parts.slice(i + 1);
        i = parts.length;
        break;
      default:
        break;
    }
  }
  return Number.isFinite(info.depth) ? info : null;
}
