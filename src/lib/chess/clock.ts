import { opposite, type Color } from "./types";

export interface ClockTimes {
  w: number;
  b: number;
}

export interface ClockState {
  remaining: ClockTimes;
  active: Color | null;
  flagged: Color | null;
}

/**
 * Framework-free chess clock. Time is measured against an injectable `now()`
 * so it is exact regardless of how often the UI re-renders.
 * The clock starts when the first move is pressed (white's first move starts black's clock).
 */
export class ChessClock {
  private remaining: ClockTimes;
  private active: Color | null = null;
  private flagged: Color | null = null;
  private lastTick = 0;

  constructor(
    private initialMs: number,
    private incrementMs: number,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.remaining = { w: initialMs, b: initialMs };
  }

  getState(): ClockState {
    return { remaining: { ...this.remaining }, active: this.active, flagged: this.flagged };
  }

  /** Advances the active side's time. Returns the color whose flag fell on this tick, if any. */
  tick(): Color | null {
    if (this.active === null || this.flagged !== null) return null;
    const t = this.now();
    const elapsed = t - this.lastTick;
    this.lastTick = t;
    const side = this.active;
    this.remaining[side] = Math.max(0, this.remaining[side] - elapsed);
    if (this.remaining[side] <= 0) {
      this.flagged = side;
      this.active = null;
      return side;
    }
    return null;
  }

  /** Called after `moved` completes a move. Adds the increment and starts the opponent's clock. */
  press(moved: Color): ClockTimes {
    if (this.flagged !== null) return { ...this.remaining };
    const wasRunning = this.active !== null;
    this.tick();
    if (this.flagged !== null) return { ...this.remaining };
    if (wasRunning) this.remaining[moved] += this.incrementMs;
    this.active = opposite(moved);
    this.lastTick = this.now();
    return { ...this.remaining };
  }

  pause(): void {
    this.tick();
    this.active = null;
  }

  /** Restores times (e.g. after undo) and optionally resumes a side. */
  restore(times: ClockTimes, active: Color | null): void {
    this.remaining = { ...times };
    this.flagged = null;
    this.active = active;
    this.lastTick = this.now();
  }

  reset(initialMs: number, incrementMs: number): void {
    this.initialMs = initialMs;
    this.incrementMs = incrementMs;
    this.remaining = { w: initialMs, b: initialMs };
    this.active = null;
    this.flagged = null;
  }

  get initial(): number {
    return this.initialMs;
  }
}
