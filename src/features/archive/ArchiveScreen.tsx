import { BarChart3, Clock, Download, History, Play, Swords } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useProgression } from "@/features/progression/ProgressionProvider";
import { triggerFileDownload, type ArchivedGame } from "@/lib/progression/storage";
import { cn } from "@/lib/utils";

type ArchiveFilter = "all" | "win" | "loss" | "draw" | "long" | "best" | "blunders";

const FILTERS: { id: ArchiveFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "win", label: "Победы" },
  { id: "loss", label: "Поражения" },
  { id: "draw", label: "Ничьи" },
  { id: "long", label: "Самые длинные" },
  { id: "best", label: "Лучшие (85%+)" },
  { id: "blunders", label: "С ошибками" },
];

interface ArchiveScreenProps {
  onOpenInAnalysis: (pgn: string) => void;
  onStartGame: () => void;
}

export function ArchiveScreen({ onOpenInAnalysis, onStartGame }: ArchiveScreenProps) {
  const { progression } = useProgression();
  const [filter, setFilter] = useState<ArchiveFilter>("all");

  const items = useMemo(() => {
    const list = progression.archive;
    switch (filter) {
      case "win":
        return list.filter((g) => g.result === "win");
      case "loss":
        return list.filter((g) => g.result === "loss");
      case "draw":
        return list.filter((g) => g.result === "draw");
      case "long":
        return [...list].sort((a, b) => b.movesCount - a.movesCount);
      case "best":
        return list.filter((g) => g.accuracy >= 85);
      case "blunders":
        return list.filter((g) => g.blundersCount > 0 || g.mistakesCount > 0);
      default:
        return list;
    }
  }, [filter, progression.archive]);

  const resultLabel = (g: ArchivedGame) =>
    g.result === "win" ? "Победа" : g.result === "loss" ? "Поражение" : "Ничья";

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-12 pt-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Летопись клуба</p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl">История партий</h1>
        </div>
        <Button type="button" variant="ivory" size="sm" onClick={onStartGame}>
          <Swords className="size-4" /> Сыграть новую партию
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <section className="panel flex flex-col items-center justify-center gap-3 p-10 text-center">
          <History className="size-10 text-primary/70" aria-hidden />
          <h2 className="font-display text-xl">
            {progression.archive.length === 0
              ? "Пока нет завершённых партий"
              : "По выбранному фильтру партий нет"}
          </h2>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            После завершения каждой партии против Stockfish 19 результат, ходы, точность и рейтинг
            автоматически сохраняются здесь. Вы также можете загрузить свой PGN в Лаборатории
            анализа.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="ivory" size="sm" onClick={onStartGame}>
              <Play className="size-3.5" /> Начать партию
            </Button>
            <Button type="button" variant="panel" size="sm" onClick={() => onOpenInAnalysis("")}>
              <BarChart3 className="size-3.5" /> Открыть анализ
            </Button>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <article
              key={g.id}
              className="panel flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-semibold",
                      g.result === "win"
                        ? "bg-primary/15 text-primary"
                        : g.result === "loss"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-foreground",
                    )}
                  >
                    {resultLabel(g)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {g.ratingDelta >= 0 ? `+${g.ratingDelta}` : g.ratingDelta} ELO
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-foreground">{g.opponent}</span>
                  <span className="text-muted-foreground">({g.styleLabel})</span>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  Дебют: {g.openingHint} · {g.outcomeReason}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Ходов: {g.movesCount}</span>
                  <span>Точность: {g.accuracy}%</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {g.durationSec} сек
                  </span>
                  <span>{new Date(g.playedAt).toLocaleString("ru-RU")}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ivory"
                  size="sm"
                  onClick={() => onOpenInAnalysis(g.pgn || g.finalFen)}
                >
                  <BarChart3 className="size-3.5" /> Разобрать
                </Button>
                <Button
                  type="button"
                  variant="panel"
                  size="sm"
                  onClick={() =>
                    triggerFileDownload(
                      `prochess-${g.playedAt.slice(0, 10)}.pgn`,
                      g.pgn || `[FEN "${g.finalFen}"]\n`,
                    )
                  }
                >
                  <Download className="size-3.5" /> .pgn
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
