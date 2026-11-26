import { Check, Palette } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BOARD_CATEGORY_LABEL,
  BOARD_THEMES,
  type BoardColors,
  type BoardThemeCategory,
  type BoardThemeId,
} from "@/lib/appearance/themes";
import { UI_THEMES, type UiThemeId } from "@/lib/appearance/uiThemes";
import {
  ARROW_STYLES,
  BOARD_FRAME_STYLES,
  BOARD_SCALES,
  type ArrowStyle,
  type BoardFrameStyle,
  type BoardScale,
} from "@/lib/settings/settings";
import { cn } from "@/lib/utils";

import { useSettings } from "../SettingsProvider";
import { SectionTitle, SettingRow } from "./SettingRow";

type CategoryFilter = "all" | BoardThemeCategory;

function MiniBoard({ colors }: { colors: BoardColors }) {
  const style = { "--board-light": colors.light, "--board-dark": colors.dark } as CSSProperties;
  return (
    <div
      className="grid aspect-[2/1] grid-cols-8 grid-rows-4 overflow-hidden rounded-md"
      style={style}
      aria-hidden
    >
      {Array.from({ length: 32 }, (_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const light = (row + col) % 2 === 0;
        return (
          <div key={i} className={light ? "sq-light" : "sq-dark"}>
            {i === 10 && <PieceImage color="b" type="n" className="block size-full" />}
            {i === 21 && <PieceImage color="w" type="q" className="block size-full" />}
          </div>
        );
      })}
    </div>
  );
}

function ThemeCard({
  id,
  label,
  note,
  colors,
  selected,
  onSelect,
}: {
  id: BoardThemeId;
  label: string;
  note: string;
  colors: BoardColors;
  selected: boolean;
  onSelect: (id: BoardThemeId) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-selected={selected}
      onClick={() => onSelect(id)}
      className="choice-card"
    >
      <MiniBoard colors={colors} />
      <div className="flex items-start justify-between gap-2 px-1 pb-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{note}</p>
        </div>
        {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
      </div>
    </button>
  );
}

export function BoardSettingsPanel() {
  const { settings, update, updateBoard } = useSettings();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const select = (boardTheme: BoardThemeId) => update({ boardTheme });
  const custom = settings.customBoard;
  const board = settings.board;

  const visibleThemes =
    category === "all" ? BOARD_THEMES : BOARD_THEMES.filter((t) => t.category === category);

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Меняет палитру интерфейса ProChess: фон, панели и акцентные индикаторы.">
          Цветовая схема интерфейса
        </SectionTitle>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Цветовая схема интерфейса"
        >
          {UI_THEMES.map((theme) => {
            const selected = settings.uiTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-selected={selected}
                onClick={() => update({ uiTheme: theme.id as UiThemeId })}
                className="choice-card flex-row items-center gap-3 p-3"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/15"
                  style={{ backgroundColor: theme.bg }}
                  aria-hidden
                >
                  <span className="size-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{theme.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {theme.description}
                  </span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle hint="4 категории отделки: дерево, мрамор, металлы и спецэффекты.">
          Темы доски ({BOARD_THEMES.length})
        </SectionTitle>
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Категории тем доски"
        >
          {(["all", "classic", "luxury", "metal", "special"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                category === cat
                  ? "border-primary/70 bg-primary/15 text-primary"
                  : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {cat === "all" ? `Все (${BOARD_THEMES.length})` : BOARD_CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Тема доски"
        >
          {visibleThemes.map((t) => (
            <ThemeCard
              key={t.id}
              id={t.id}
              label={t.label}
              note={t.note}
              colors={t}
              selected={settings.boardTheme === t.id}
              onSelect={select}
            />
          ))}
          <ThemeCard
            id="custom"
            label="Custom"
            note="Свои цвета"
            colors={custom}
            selected={settings.boardTheme === "custom"}
            onSelect={select}
          />
        </div>
      </section>

      <section>
        <SectionTitle hint="Настройка рамки, размера, стрелок и подсветки клеток.">
          Детализация и подсветка доски
        </SectionTitle>
        <div className="panel space-y-1 px-4 py-1">
          <SettingRow id="frame-style" label="Стиль рамки" description="Обрамление шахматной доски">
            <ToggleGroup
              id="frame-style"
              type="single"
              variant="segment"
              size="sm"
              value={board.frameStyle}
              onValueChange={(v) => v && update({ board: { frameStyle: v as BoardFrameStyle } })}
              className="rounded-lg border border-border bg-secondary p-0.5"
            >
              {BOARD_FRAME_STYLES.map((f) => (
                <ToggleGroupItem key={f.id} value={f.id} className="px-2.5 text-xs">
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>

          <SettingRow id="arrow-style" label="Стиль стрелок" description="Подсказки, угрозы и идеи">
            <ToggleGroup
              id="arrow-style"
              type="single"
              variant="segment"
              size="sm"
              value={board.arrowStyle}
              onValueChange={(v) => v && update({ board: { arrowStyle: v as ArrowStyle } })}
              className="rounded-lg border border-border bg-secondary p-0.5"
            >
              {ARROW_STYLES.map((a) => (
                <ToggleGroupItem key={a.id} value={a.id} className="px-2.5 text-xs">
                  {a.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>

          <SettingRow id="board-scale" label="Размер доски" description="Масштаб игровой области">
            <ToggleGroup
              id="board-scale"
              type="single"
              variant="segment"
              size="sm"
              value={board.boardScale}
              onValueChange={(v) => v && update({ board: { boardScale: v as BoardScale } })}
              className="rounded-lg border border-border bg-secondary p-0.5"
            >
              {BOARD_SCALES.map((s) => (
                <ToggleGroupItem key={s.id} value={s.id} className="px-2.5 text-xs">
                  {s.label.split(" ")[0]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>
        </div>

        <div className="panel mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <Palette className="size-4 text-muted-foreground" aria-hidden />
          <ColorField
            id="custom-light"
            label="Светлые клетки"
            value={custom.light}
            onChange={(light) => update({ boardTheme: "custom", customBoard: { light } })}
          />
          <ColorField
            id="custom-dark"
            label="Тёмные клетки"
            value={custom.dark}
            onChange={(dark) => update({ boardTheme: "custom", customBoard: { dark } })}
          />
          <ColorField
            id="selected-color"
            label="Выбранная клетка"
            value={board.selectedColor}
            onChange={(selectedColor) => update({ board: { selectedColor } })}
          />
          <ColorField
            id="legal-color"
            label="Возможные ходы"
            value={board.legalMoveColor}
            onChange={(legalMoveColor) => update({ board: { legalMoveColor } })}
          />
          <ColorField
            id="check-color"
            label="Подсветка шаха"
            value={board.checkColor}
            onChange={(checkColor) => update({ board: { checkColor } })}
          />
        </div>
      </section>

      <section>
        <SectionTitle hint="Рисование стрелок правой кнопкой, живой персонаж и тактические подсказки на доске.">
          Рисование, персонаж и тактика
        </SectionTitle>
        <div className="panel space-y-1 px-4 py-1">
          <SettingRow
            id="board-autoclear-drawings"
            label="Автоочистка рисунков после хода"
            description="Автоматически убирать пользовательские стрелки и выделения клеток при следующем ходе"
          >
            <Switch
              id="board-autoclear-drawings"
              checked={board.autoClearDrawings}
              onCheckedChange={(autoClearDrawings) => updateBoard({ autoClearDrawings })}
            />
          </SettingRow>
          <SettingRow
            id="board-show-character"
            label="Персонаж рядом с доской"
            description="Показывать живую карточку выбранного персонажа PROCHESS во время партии"
          >
            <Switch
              id="board-show-character"
              checked={board.showCharacterInGame}
              onCheckedChange={(showCharacterInGame) => updateBoard({ showCharacterInGame })}
            />
          </SettingRow>
          <SettingRow
            id="board-show-threats"
            label="Подсветка угроз на доске"
            description="Отмечать атакуемые, незащищённые и защищённые фигуры на текущей позиции"
          >
            <Switch
              id="board-show-threats"
              checked={board.showThreatOverlay}
              onCheckedChange={(showThreatOverlay) => updateBoard({ showThreatOverlay })}
            />
          </SettingRow>
          <SettingRow
            id="board-show-combos"
            label="Визуализация комбинаций"
            description="Подсвечивать тактические удары, шахи и потенциальные вилки"
          >
            <Switch
              id="board-show-combos"
              checked={board.showComboOverlay}
              onCheckedChange={(showComboOverlay) => updateBoard({ showComboOverlay })}
            />
          </SettingRow>
          <SettingRow
            id="board-premoves"
            label="Премувы (Premoves)"
            description="Заранее планировать следующий ход во время раздумий Stockfish"
          >
            <Switch
              id="board-premoves"
              checked={board.premovesEnabled}
              onCheckedChange={(premovesEnabled) => updateBoard({ premovesEnabled })}
            />
          </SettingRow>
          <SettingRow
            id="board-auto-flip-pnp"
            label="Автопереворот вдвоём"
            description="Автоматически поворачивать доску к активному игроку за одним экраном"
          >
            <Switch
              id="board-auto-flip-pnp"
              checked={board.autoFlipPassAndPlay}
              onCheckedChange={(autoFlipPassAndPlay) => updateBoard({ autoFlipPassAndPlay })}
            />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 text-sm">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="swatch-input"
      />
      <span>
        {label}
        <span className="block font-mono text-[11px] uppercase text-muted-foreground">{value}</span>
      </span>
    </label>
  );
}
