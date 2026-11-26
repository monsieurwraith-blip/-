import { Chess } from "chess.js";
import { CheckCircle2, Compass, Crown, Play, RotateCcw, Timer, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Button } from "@/components/ui/button";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { resolveBoardColors } from "@/lib/appearance/themes";
import { ENDGAME_DRILLS, type EndgameDrill } from "@/lib/chess/endgameDrills";
import type { Color, Square } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const ALL_SQUARES: Square[] = RANKS.flatMap((r) => FILES.map((f) => `${f}${r}` as Square));
const START_GRID = new Chess().board();

function pickNextSquare(prev: Square | null): Square {
  let candidate = ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)]!;
  if (candidate === prev) {
    candidate = ALL_SQUARES[(ALL_SQUARES.indexOf(candidate) + 7) % ALL_SQUARES.length]!;
  }
  return candidate;
}

function formatSec(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface TrainersScreenProps {
  onStartDrill: (fen: string, title: string) => void;
}

export function TrainersScreen({ onStartDrill }: TrainersScreenProps) {
  const { settings, play, preview } = useSettings();
  const { progression, recordCoordsScore } = useProgression();
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);

  const [tab, setTab] = useState<"coords" | "endgame">("coords");

  // Coordinates Drill state
  const [coordDuration, setCoordDuration] = useState<30 | 60>(30);
  const [coordSideMode, setCoordSideMode] = useState<"w" | "b" | "random">("w");
  const [orientation, setOrientation] = useState<Color>("w");
  const [showPieces, setShowPieces] = useState(false);
  const [coordPhase, setCoordPhase] = useState<"ready" | "running" | "finished">("ready");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [targetSq, setTargetSq] = useState<Square>("e4");
  const [coordHits, setCoordHits] = useState(0);
  const [coordMisses, setCoordMisses] = useState(0);
  const [flash, setFlash] = useState<{ sq: Square; ok: boolean } | null>(null);
  const coordScoreRef = useRef(0);
  const coordRecordedRef = useRef(false);

  // Endgame category filter
  const [endgameCat, setEndgameCat] = useState<"all" | EndgameDrill["category"]>("all");

  const boardStyle = {
    "--board-light": colors.light,
    "--board-dark": colors.dark,
  } as CSSProperties;

  const finishCoords = useCallback(() => {
    setCoordPhase("finished");
    if (!coordRecordedRef.current) {
      coordRecordedRef.current = true;
      recordCoordsScore(coordScoreRef.current);
      play("win");
    }
  }, [play, recordCoordsScore]);

  useEffect(() => {
    if (coordPhase !== "running") return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          finishCoords();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [coordPhase, finishCoords]);

  const startCoords = () => {
    preview("menu");
    coordScoreRef.current = 0;
    coordRecordedRef.current = false;
    setCoordHits(0);
    setCoordMisses(0);
    setFlash(null);
    setSecondsLeft(coordDuration);
    const side: Color =
      coordSideMode === "random" ? (Math.random() < 0.5 ? "w" : "b") : coordSideMode;
    setOrientation(side);
    setTargetSq(pickNextSquare(null));
    setCoordPhase("running");
  };

  const handleSquareClick = (sq: Square) => {
    if (coordPhase !== "running") return;
    const ok = sq === targetSq;
    setFlash({ sq, ok });
    window.setTimeout(() => setFlash(null), 220);

    if (ok) {
      play("move");
      coordScoreRef.current += 1;
      setCoordHits((h) => h + 1);
      setTargetSq((prev) => pickNextSquare(prev));
      if (coordSideMode === "random") {
        setOrientation((o) => (o === "w" ? "b" : "w"));
      }
    } else {
      play("mistake");
      setCoordMisses((m) => m + 1);
    }
  };

  const displayRanks =
    orientation === "w" ? RANKS : ([...RANKS].reverse() as unknown as typeof RANKS);
  const displayFiles =
    orientation === "w" ? FILES : ([...FILES].reverse() as unknown as typeof FILES);

  const visibleDrills = useMemo(
    () =>
      endgameCat === "all"
        ? ENDGAME_DRILLS
        : ENDGAME_DRILLS.filter((d) => d.category === endgameCat),
    [endgameCat],
  );

  const coordAccuracy =
    coordHits + coordMisses > 0 ? Math.round((coordHits / (coordHits + coordMisses)) * 100) : 100;

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Навыки доски и техники</p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">Тренажёры PROCHESS</h1>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-secondary p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("coords")}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
              tab === "coords"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Compass className="size-3.5" />
            Тренажёр координат
          </button>
          <button
            type="button"
            onClick={() => setTab("endgame")}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
              tab === "endgame"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Crown className="size-3.5" />
            Тренажёр эндшпиля ({ENDGAME_DRILLS.length})
          </button>
        </div>
      </div>

      {tab === "coords" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
          {/* Coordinate Board without rank/file labels! */}
          <section className="mx-auto w-full max-w-[min(100%,calc(100svh-10rem))]">
            <div className="relative">
              <div
                className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border border-border shadow-2xl"
                style={boardStyle}
                role="group"
                aria-label="Тренажёр координат шахматной доски"
              >
                {displayRanks.map((rank) =>
                  displayFiles.map((file) => {
                    const sq = `${file}${rank}` as Square;
                    const fIdx = FILES.indexOf(file);
                    const rIdx = 8 - rank;
                    const isLight = (fIdx + rank) % 2 === 1;
                    const startPiece = showPieces ? START_GRID[rIdx]?.[fIdx] : null;
                    const isFlashed = flash?.sq === sq;
                    return (
                      <button
                        key={sq}
                        type="button"
                        disabled={coordPhase !== "running"}
                        onClick={() => handleSquareClick(sq)}
                        className={cn(
                          "relative flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isLight ? "sq-light" : "sq-dark",
                        )}
                        aria-label={`Клетка ${sq}`}
                      >
                        {startPiece && (
                          <PieceImage
                            color={startPiece.color}
                            type={startPiece.type}
                            className="size-[80%] opacity-65"
                          />
                        )}
                        {isFlashed && (
                          <span
                            className={cn(
                              "pointer-events-none absolute inset-0",
                              flash.ok ? "bg-emerald-500/55" : "bg-destructive/55",
                            )}
                          />
                        )}
                      </button>
                    );
                  }),
                )}
              </div>

              {coordPhase === "running" && (
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                  <span className="rounded-xl border border-white/15 bg-black/75 px-5 py-2 font-mono text-4xl font-bold tracking-wider text-white shadow-xl backdrop-blur-sm">
                    {targetSq}
                  </span>
                </div>
              )}
            </div>
          </section>

          <aside className="panel space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                <p className="text-[11px] text-muted-foreground">Таймер</p>
                <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-primary tabular-nums">
                  <Timer className="size-3.5" /> {formatSec(secondsLeft)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                <p className="text-[11px] text-muted-foreground">Счёт / Точность</p>
                <p className="mt-1 font-mono text-base font-semibold text-foreground tabular-nums">
                  {coordHits} · {coordAccuracy}%
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
                <p className="text-[11px] text-muted-foreground">Рекорд</p>
                <p className="mt-1 flex items-center gap-1 font-mono text-base font-semibold text-primary tabular-nums">
                  <Trophy className="size-3.5" /> {Math.max(progression.coordsBestScore, coordHits)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-border/70 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сторона доски</span>
                <div className="flex gap-1 rounded-lg border border-border bg-secondary p-0.5">
                  {(
                    [
                      { id: "w", label: "Белые" },
                      { id: "b", label: "Чёрные" },
                      { id: "random", label: "Смешано" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={coordPhase === "running"}
                      onClick={() => {
                        setCoordSideMode(m.id);
                        if (m.id !== "random") setOrientation(m.id);
                      }}
                      className={cn(
                        "rounded px-2 py-1 font-medium transition-colors",
                        coordSideMode === m.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Длительность</span>
                <div className="flex gap-1 rounded-lg border border-border bg-secondary p-0.5">
                  {([30, 60] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      disabled={coordPhase === "running"}
                      onClick={() => {
                        setCoordDuration(sec);
                        setSecondsLeft(sec);
                      }}
                      className={cn(
                        "rounded px-2.5 py-1 font-mono font-medium transition-colors",
                        coordDuration === sec
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {sec}с
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between pt-1">
                <span className="text-muted-foreground">Показывать начальные фигуры</span>
                <input
                  type="checkbox"
                  checked={showPieces}
                  onChange={(e) => setShowPieces(e.target.checked)}
                  className="accent-primary"
                />
              </label>
            </div>

            {coordPhase === "finished" && (
              <div className="space-y-1.5 rounded-xl border border-primary/45 bg-primary/10 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-semibold text-primary">
                  <CheckCircle2 className="size-4" /> Раунд завершён!
                </p>
                <p className="text-foreground">
                  Найдено клеток: <strong>{coordHits}</strong> · Ошибок: {coordMisses} · Точность:{" "}
                  {coordAccuracy}%
                </p>
              </div>
            )}

            <Button
              type="button"
              variant="ivory"
              className="w-full"
              onClick={coordPhase === "running" ? finishCoords : startCoords}
            >
              {coordPhase === "running" ? (
                <>
                  <RotateCcw className="size-4" /> Остановить раунд
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />{" "}
                  {coordPhase === "finished" ? "Повторить раунд" : "Начать тренировку"}
                </>
              )}
            </Button>
          </aside>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="panel flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "Матование", "Пешечные", "Ладейные", "Фигурные"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEndgameCat(cat)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-medium transition-colors",
                    endgameCat === cat
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat === "all" ? "Все эндшпили" : cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 font-mono text-muted-foreground">
              <span>Пройдено: {progression.endgameDrillsCompleted}</span>
              <span className="text-primary">Рейтинг эндшпиля: {progression.endgameRating}</span>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleDrills.map((drill) => (
              <EndgameDrillCard
                key={drill.id}
                drill={drill}
                boardStyle={boardStyle}
                onStart={() => {
                  preview("menu");
                  onStartDrill(drill.fen, drill.title);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function EndgameDrillCard({
  drill,
  boardStyle,
  onStart,
}: {
  drill: EndgameDrill;
  boardStyle: CSSProperties;
  onStart: () => void;
}) {
  const board = useMemo(() => new Chess(drill.fen).board(), [drill.fen]);

  return (
    <article className="panel flex flex-col justify-between gap-3 p-4">
      <div className="space-y-2.5">
        <div
          className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border border-border/80"
          style={boardStyle}
          aria-hidden
        >
          {board.map((row, r) =>
            row.map((piece, c) => (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "flex items-center justify-center",
                  (r + c) % 2 === 0 ? "sq-light" : "sq-dark",
                )}
              >
                {piece && (
                  <PieceImage color={piece.color} type={piece.type} className="size-[84%]" />
                )}
              </div>
            )),
          )}
        </div>

        <p className="text-[11px] font-medium text-primary">
          {drill.category} · {drill.difficulty}
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">{drill.title}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{drill.goalText}</p>
        <p className="rounded-lg border border-border/70 bg-secondary/40 px-2.5 py-2 text-[11px] leading-snug text-foreground/85">
          {drill.keyIdea}
        </p>
      </div>

      <Button type="button" variant="ivory" size="sm" className="w-full" onClick={onStart}>
        <Play className="size-3.5 fill-current" />
        Играть против Stockfish 19
      </Button>
    </article>
  );
}
