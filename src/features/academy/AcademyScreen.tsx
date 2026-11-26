import { Chess } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { useSettings } from "@/features/settings/SettingsProvider";
import { ACADEMY_LESSONS, type AcademyLesson, type AcademySection } from "@/lib/academy/curriculum";
import type { BoardCell } from "@/lib/chess/pieceIds";
import type { BoardMove, Color, Square, SquarePair } from "@/lib/chess/types";
import { parseUciMove, toUciMove } from "@/lib/chess/uci";
import { playUci } from "@/lib/coach/tactics";
import { cn } from "@/lib/utils";

const SECTIONS: { id: AcademySection; label: string }[] = [
  { id: "tactics", label: "Тактика" },
  { id: "strategy", label: "Стратегия" },
  { id: "openings", label: "Дебюты" },
];

function extractBoard(chess: Chess) {
  const inCheck = chess.inCheck();
  const turn = chess.turn();
  const cells: BoardCell[] = [];
  let checkSquare: Square | null = null;
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      cells.push({ square: p.square, type: p.type, color: p.color });
      if (inCheck && p.type === "k" && p.color === turn) checkSquare = p.square;
    }
  }
  const hist = chess.history({ verbose: true });
  const tail = hist[hist.length - 1];
  return {
    fen: chess.fen(),
    turn,
    cells,
    legalMoves: chess.moves({ verbose: true }),
    checkSquare,
    lastMove: tail ? ({ from: tail.from, to: tail.to } as SquarePair) : null,
  };
}

export function AcademyScreen() {
  const { settings, play } = useSettings();
  const { completeLesson, progression } = useProgression();
  const [section, setSection] = useState<AcademySection>("tactics");
  const filtered = useMemo(() => ACADEMY_LESSONS.filter((l) => l.section === section), [section]);
  const [lessonId, setLessonId] = useState<string>(filtered[0]?.id ?? ACADEMY_LESSONS[0]!.id);
  const lesson: AcademyLesson = useMemo(
    () => filtered.find((l) => l.id === lessonId) ?? filtered[0] ?? ACADEMY_LESSONS[0]!,
    [filtered, lessonId],
  );

  const chessRef = useRef(new Chess(lesson.fen));
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<"playing" | "wrong" | "solved">("playing");
  const [showHint, setShowHint] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const loadLesson = useCallback((target: AcademyLesson) => {
    chessRef.current = new Chess(target.fen);
    setStep(0);
    setStatus("playing");
    setShowHint(false);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    loadLesson(lesson);
  }, [lesson, loadLesson]);

  const board = useMemo(() => {
    void version;
    return extractBoard(chessRef.current);
  }, [version]);

  const playerColor: Color = useMemo(() => new Chess(lesson.fen).turn(), [lesson.fen]);

  const handleMove = useCallback(
    (move: BoardMove): boolean => {
      if (status === "solved") return false;
      const expectedUci = lesson.solutionUci[step];
      if (!expectedUci) return false;

      const clone = new Chess(chessRef.current.fen());
      const attempted = clone.move(move);
      if (!attempted) return false;
      const playedUci = toUciMove(attempted);

      if (playedUci !== expectedUci) {
        play("mistake");
        setStatus("wrong");
        return false;
      }

      chessRef.current.move(move);
      play(attempted.isCapture() ? "capture" : chessRef.current.inCheck() ? "check" : "move");
      setShowHint(false);
      const nextStep = step + 1;

      if (nextStep >= lesson.solutionUci.length) {
        setStep(nextStep);
        setStatus("solved");
        setVersion((v) => v + 1);
        play("win");
        if (!completedIds.includes(lesson.id)) {
          setCompletedIds((prev) => [...prev, lesson.id]);
          completeLesson();
        }
        return true;
      }

      // Auto-play scripted opponent reply in multi-move lessons.
      setStep(nextStep);
      setVersion((v) => v + 1);
      const replyUci = lesson.solutionUci[nextStep];
      if (replyUci) {
        window.setTimeout(() => {
          playUci(chessRef.current, replyUci);
          setStep(nextStep + 1);
          setVersion((v) => v + 1);
        }, 320);
      }
      return true;
    },
    [completeLesson, completedIds, lesson.id, lesson.solutionUci, play, status, step],
  );

  const hintPair = useMemo(() => {
    if (!showHint || status === "solved") return null;
    const uci = lesson.solutionUci[step];
    const parsed = uci ? parseUciMove(uci) : null;
    return parsed ? { from: parsed.from, to: parsed.to } : null;
  }, [lesson.solutionUci, showHint, status, step]);

  const nextLesson = () => {
    const idx = filtered.findIndex((l) => l.id === lesson.id);
    const next = filtered[(idx + 1) % filtered.length];
    if (next) setLessonId(next.id);
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-12 pt-4 sm:px-6 lg:pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Обучение и мастерство</p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">Академия PROCHESS</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Пройдено уроков:{" "}
            <strong className="font-mono text-foreground">{progression.lessonsCompleted}</strong>
          </span>
          <div className="flex gap-1 rounded-lg border border-border bg-secondary p-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSection(sec.id);
                  const first = ACADEMY_LESSONS.find((l) => l.section === sec.id);
                  if (first) setLessonId(first.id);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  section === sec.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        {/* Topics list */}
        <aside className="panel max-h-[72vh] space-y-1.5 overflow-y-auto p-3">
          <p className="eyebrow px-1 pb-1">Темы курса ({filtered.length})</p>
          {filtered.map((item) => {
            const active = item.id === lesson.id;
            const done = completedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLessonId(item.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-primary/70 bg-primary/10 text-foreground"
                    : "border-border/70 bg-secondary/45 text-foreground/85 hover:bg-accent",
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">{item.topic}</p>
                  <p className="truncate text-xs text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.difficulty}</p>
                </div>
                {done && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </aside>

        {/* Interactive Board */}
        <section className="mx-auto w-full max-w-[min(100%,calc(100svh-11rem))]">
          <ChessBoard
            cells={board.cells}
            positionKey={`${lesson.id}-${board.fen}-${step}`}
            orientation={playerColor}
            movableColor={status === "solved" ? null : board.turn}
            legalMoves={board.legalMoves}
            showLegalMoves={settings.board.showLegalMoves}
            lastMove={board.lastMove}
            checkSquare={board.checkSquare}
            hint={hintPair}
            onMove={handleMove}
          />
        </section>

        {/* Lesson Guidance & Feedback */}
        <aside className="panel space-y-4 p-4">
          <div className="flex items-start gap-2.5">
            <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="eyebrow text-primary">{lesson.topic}</p>
              <h2 className="font-display text-xl">{lesson.title}</h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-foreground/90">{lesson.summary}</p>

          <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <BookOpen className="size-3.5 text-primary" /> Ключевой принцип
            </p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{lesson.keyTakeaway}</p>
          </div>

          {status === "wrong" && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Этот ход не решает задачу урока. Подумайте о форсированном продолжении или возьмите
              подсказку.
            </p>
          )}

          {status === "solved" && (
            <div className="rounded-lg border border-primary/45 bg-primary/10 p-3 text-xs">
              <p className="font-semibold text-primary">Отлично! Позиция решена (+30 XP)</p>
              <p className="mt-1 text-foreground/90">Вы нашли точный путь реализации идеи урока.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="panel" size="sm" onClick={() => loadLesson(lesson)}>
              <RotateCcw className="size-3.5" /> Заново
            </Button>
            <Button
              type="button"
              variant="panel"
              size="sm"
              onClick={() => setShowHint(true)}
              disabled={status === "solved"}
            >
              <Lightbulb className="size-3.5 text-primary" /> Подсказка
            </Button>
            <Button
              type="button"
              variant="ivory"
              size="sm"
              className="ml-auto"
              onClick={nextLesson}
            >
              Следующий <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
