import {
  Check,
  Copy,
  Download,
  Flag,
  FlipVertical2,
  Handshake,
  Lightbulb,
  Loader2,
  Maximize2,
  MessageSquare,
  Plus,
  Redo2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HintLevel } from "@/lib/coach/hints";
import { cn } from "@/lib/utils";

import { ConfirmAction } from "./ConfirmAction";
import { HintBanner } from "./HintBanner";
import type { HintMove } from "../types";

interface GameControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  canHint: boolean;
  hintPending: boolean;
  hint: HintMove | null;
  canResign: boolean;
  inProgress: boolean;
  showLegalMoves: boolean;
  showThreats: boolean;
  drawNotice: string | null;
  coachAvailable?: boolean;
  coachVisible?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onHint: (level?: HintLevel) => void;
  onBestMove: () => void;
  onFlip: () => void;
  onRestart: () => void;
  onNewGame: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onToggleThreats: () => void;
  onToggleCoach?: () => void;
  onCopyFen: () => void;
  onDownloadPgn: () => void;
  onToggleFullscreen: () => void;
  onShowLegalMovesChange: (value: boolean) => void;
}

export function GameControls(props: GameControlsProps) {
  const {
    canUndo,
    canRedo,
    canHint,
    hintPending,
    hint,
    canResign,
    inProgress,
    showLegalMoves,
    showThreats,
    drawNotice,
    coachAvailable = false,
    coachVisible = true,
    onUndo,
    onRedo,
    onHint,
    onBestMove,
    onFlip,
    onRestart,
    onNewGame,
    onResign,
    onOfferDraw,
    onToggleThreats,
    onToggleCoach,
    onCopyFen,
    onDownloadPgn,
    onToggleFullscreen,
    onShowLegalMovesChange,
  } = props;

  const [copiedFen, setCopiedFen] = useState(false);

  const handleCopyFen = () => {
    onCopyFen();
    setCopiedFen(true);
    window.setTimeout(() => setCopiedFen(false), 1600);
  };

  return (
    <section className="panel space-y-3 p-3" aria-label="Управление партией">
      <div className="grid grid-cols-5 gap-1.5">
        <Button
          variant="panel"
          size="tile"
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить последний ход (Z)"
        >
          <Undo2 /> Назад
        </Button>
        <Button
          variant="panel"
          size="tile"
          onClick={onRedo}
          disabled={!canRedo}
          title="Вернуть отменённый ход (Y)"
        >
          <Redo2 /> Повтор
        </Button>
        <Button
          variant="panel"
          size="tile"
          onClick={() => onHint()}
          disabled={!canHint}
          title="Тренер и Stockfish: 3 уровня подсказки (H)"
          aria-pressed={hint !== null}
        >
          {hintPending ? <Loader2 className="animate-spin" /> : <Lightbulb />}
          {hint ? `Ур.${hint.level}` : "Подск."}
        </Button>
        <Button variant="panel" size="tile" onClick={onFlip} title="Перевернуть доску (F)">
          <FlipVertical2 /> Доска
        </Button>
        <ConfirmAction
          needsConfirm={inProgress}
          title="Сдаться?"
          description="Партия завершится вашим поражением."
          confirmLabel="Сдаться"
          onConfirm={onResign}
        >
          <Button variant="panel" size="tile" disabled={!canResign} title="Сдаться">
            <Flag /> Сдаться
          </Button>
        </ConfirmAction>
      </div>

      {/* Quick Actions PRO Toolbar */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[11px]"
          onClick={onBestMove}
          disabled={!canHint}
          title="Показать лучший ход (уровень 3)"
        >
          <Sparkles className="size-3.5 text-primary" /> Лучший
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1 px-2 text-[11px]", showThreats && "bg-warning/15 text-warning")}
          onClick={onToggleThreats}
          aria-pressed={showThreats}
          title="Подсветить незащищённые фигуры под угрозой"
        >
          <ShieldAlert className="size-3.5" /> Угрозы
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[11px]"
          onClick={onOfferDraw}
          disabled={!canResign}
          title="Предложить ничью сопернику"
        >
          <Handshake className="size-3.5" /> Ничья
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[11px]"
          onClick={handleCopyFen}
          title="Скопировать FEN текущей позиции"
        >
          {copiedFen ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          FEN
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[11px]"
          onClick={onDownloadPgn}
          title="Скачать партию файлом PGN"
        >
          <Download className="size-3.5 text-primary" /> PGN
        </Button>
        {coachAvailable && onToggleCoach ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1 px-2 text-[11px]",
              coachVisible && "bg-primary/15 text-primary",
            )}
            onClick={onToggleCoach}
            title="Показать или скрыть тренера (C)"
          >
            <MessageSquare className="size-3.5" /> Тренер
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-[11px]"
            onClick={onToggleFullscreen}
            title="Полноэкранный режим (Shift+F)"
          >
            <Maximize2 className="size-3.5" /> Экран
          </Button>
        )}
      </div>

      {drawNotice && (
        <p className="rounded-lg border border-border bg-secondary/75 px-3 py-1.5 text-xs text-muted-foreground">
          {drawNotice}
        </p>
      )}

      {(hint || hintPending) && (
        <HintBanner hint={hint} pending={hintPending} onRequestLevel={(lvl) => onHint(lvl)} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <ConfirmAction
          needsConfirm={inProgress}
          title="Начать заново?"
          description="Текущая партия будет прервана и начнётся новая с теми же настройками."
          confirmLabel="Начать заново"
          onConfirm={onRestart}
        >
          <Button variant="panel">
            <RotateCcw /> Реванш
          </Button>
        </ConfirmAction>
        <ConfirmAction
          needsConfirm={inProgress}
          title="Новая партия?"
          description="Текущая партия будет прервана. Вы сможете выбрать сторону, сложность и контроль времени."
          confirmLabel="К настройкам"
          onConfirm={onNewGame}
        >
          <Button variant="default">
            <Plus /> Новая партия
          </Button>
        </ConfirmAction>
      </div>

      <div className="flex items-center justify-between rounded-lg px-1 pt-1">
        <Label htmlFor="show-legal" className="text-sm font-normal text-muted-foreground">
          Показывать легальные ходы
        </Label>
        <Switch id="show-legal" checked={showLegalMoves} onCheckedChange={onShowLegalMovesChange} />
      </div>
    </section>
  );
}
