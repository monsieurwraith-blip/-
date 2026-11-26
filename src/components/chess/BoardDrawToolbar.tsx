import {
  ArrowUpRight,
  Eraser,
  Eye,
  EyeOff,
  MousePointer2,
  ShieldAlert,
  Sparkles,
  Square as SquareIcon,
  Trash2,
  Undo2,
} from "lucide-react";

import { DRAW_COLORS, type DrawColorId, type DrawToolId } from "@/lib/chess/drawings";
import { cn } from "@/lib/utils";

interface BoardDrawToolbarProps {
  tool: DrawToolId;
  onToolChange: (tool: DrawToolId) => void;
  color: DrawColorId;
  onColorChange: (color: DrawColorId) => void;
  drawingsVisible: boolean;
  onToggleVisible: () => void;
  autoClear: boolean;
  onAutoClearChange: (val: boolean) => void;
  hasDrawings: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  showThreats?: boolean;
  onToggleThreats?: () => void;
  showCombos?: boolean;
  onToggleCombos?: () => void;
  className?: string;
}

const TOOLS: readonly {
  id: DrawToolId;
  label: string;
  icon: typeof ArrowUpRight;
  title: string;
}[] = [
  { id: "move", label: "Ход", icon: MousePointer2, title: "Обычная игра (ПКМ рисует стрелки)" },
  { id: "arrow", label: "Стрелка", icon: ArrowUpRight, title: "Рисовать стрелки левой кнопкой" },
  { id: "highlight", label: "Выделение", icon: SquareIcon, title: "Выделять клетки левой кнопкой" },
  { id: "eraser", label: "Ластик", icon: Eraser, title: "Удалить рисунок с клетки" },
];

export function BoardDrawToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  drawingsVisible,
  onToggleVisible,
  autoClear,
  onAutoClearChange,
  hasDrawings,
  canUndo,
  onUndo,
  onClear,
  showThreats,
  onToggleThreats,
  showCombos,
  onToggleCombos,
  className,
}: BoardDrawToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/85 px-2.5 py-1.5 backdrop-blur-sm",
        className,
      )}
    >
      {/* Tools */}
      <div
        className="flex flex-wrap items-center gap-1"
        role="toolbar"
        aria-label="Рисование на доске"
      >
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToolChange(t.id)}
              title={t.title}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary/20 text-primary ring-1 ring-primary/45"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        {/* 5 Colors */}
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Цвет рисования">
          {DRAW_COLORS.map((c) => {
            const active = color === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Цвет: ${c.label} (${c.meaning})`}
                title={`${c.label} — ${c.meaning}`}
                onClick={() => onColorChange(c.id)}
                className={cn(
                  "size-4 rounded-sm transition-transform",
                  active
                    ? "scale-110 ring-2 ring-white ring-offset-1 ring-offset-card"
                    : "opacity-75 hover:opacity-100",
                )}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
      </div>

      {/* Actions + Threat / Combo overlays */}
      <div className="flex flex-wrap items-center gap-1">
        {onToggleThreats && (
          <button
            type="button"
            onClick={onToggleThreats}
            aria-pressed={Boolean(showThreats)}
            title="Показать висячие фигуры, защитников и угрозы на доске"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
              showThreats
                ? "border-destructive/50 bg-destructive/15 text-destructive"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <ShieldAlert className="size-3.5" />
            <span>Показать угрозы</span>
          </button>
        )}

        {onToggleCombos && (
          <button
            type="button"
            onClick={onToggleCombos}
            aria-pressed={Boolean(showCombos)}
            title="Подсветить вилки, связки и тактические комбинации"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
              showCombos
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Sparkles className="size-3.5" />
            <span className="hidden md:inline">Визуализация комбинаций</span>
            <span className="md:hidden">Комбинации</span>
          </button>
        )}

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить последний рисунок"
          aria-label="Отменить рисунок"
          className="inline-flex items-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35"
        >
          <Undo2 className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleVisible}
          aria-pressed={drawingsVisible}
          title={drawingsVisible ? "Скрыть рисунки" : "Показать рисунки"}
          aria-label={drawingsVisible ? "Скрыть рисунки" : "Показать рисунки"}
          className={cn(
            "inline-flex items-center rounded-lg p-1.5 transition-colors",
            drawingsVisible
              ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
              : "bg-secondary text-primary",
          )}
        >
          {drawingsVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasDrawings}
          title="Очистить все стрелки и выделения"
          aria-label="Очистить рисунки"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-35"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Очистить</span>
        </button>

        <button
          type="button"
          onClick={() => onAutoClearChange(!autoClear)}
          aria-pressed={autoClear}
          title="Автоматически очищать стрелки при смене позиции"
          className={cn(
            "hidden xl:inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-medium whitespace-nowrap transition-colors",
            autoClear
              ? "bg-secondary/90 text-foreground"
              : "text-muted-foreground hover:bg-secondary",
          )}
        >
          {autoClear ? "Автоочистка: вкл" : "Сохранять рисунки"}
        </button>
      </div>
    </div>
  );
}
