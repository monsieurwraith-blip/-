import { Flag, FlipVertical2, Lightbulb, Loader2, Plus, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { ConfirmAction } from "./ConfirmAction";
import { HintBanner } from "./HintBanner";
import type { HintMove } from "../types";

interface GameControlsProps {
  canUndo: boolean;
  canHint: boolean;
  hintPending: boolean;
  hint: HintMove | null;
  canResign: boolean;
  inProgress: boolean;
  showLegalMoves: boolean;
  onUndo: () => void;
  onHint: () => void;
  onFlip: () => void;
  onRestart: () => void;
  onNewGame: () => void;
  onResign: () => void;
  onShowLegalMovesChange: (value: boolean) => void;
}

export function GameControls(props: GameControlsProps) {
  const {
    canUndo,
    canHint,
    hintPending,
    hint,
    canResign,
    inProgress,
    showLegalMoves,
    onUndo,
    onHint,
    onFlip,
    onRestart,
    onNewGame,
    onResign,
    onShowLegalMovesChange,
  } = props;

  return (
    <section className="panel space-y-3 p-3" aria-label="Управление партией">
      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="panel"
          size="tile"
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить ваш последний ход"
        >
          <Undo2 /> Отменить
        </Button>
        <Button
          variant="panel"
          size="tile"
          onClick={onHint}
          disabled={!canHint}
          title="Stockfish покажет, куда лучше сходить"
          aria-pressed={hint !== null}
        >
          {hintPending ? <Loader2 className="animate-spin" /> : <Lightbulb />} Подсказка
        </Button>
        <Button variant="panel" size="tile" onClick={onFlip} title="Перевернуть доску">
          <FlipVertical2 /> Перевернуть
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
      {(hint || hintPending) && <HintBanner hint={hint} pending={hintPending} />}
      <div className="grid grid-cols-2 gap-2">
        <ConfirmAction
          needsConfirm={inProgress}
          title="Начать заново?"
          description="Текущая партия будет прервана и начнётся новая с теми же настройками."
          confirmLabel="Начать заново"
          onConfirm={onRestart}
        >
          <Button variant="panel">
            <RotateCcw /> Начать заново
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
