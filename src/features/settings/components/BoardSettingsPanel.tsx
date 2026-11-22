import { Check, Palette } from "lucide-react";
import type { CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { BOARD_THEMES, type BoardColors, type BoardThemeId } from "@/lib/appearance/themes";

import { useSettings } from "../SettingsProvider";
import { SectionTitle } from "./SettingRow";

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
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{note}</p>
        </div>
        {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
      </div>
    </button>
  );
}

export function BoardSettingsPanel() {
  const { settings, update } = useSettings();
  const select = (boardTheme: BoardThemeId) => update({ boardTheme });
  const custom = settings.customBoard;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Цвет клеток на доске меняется сразу.">Темы доски</SectionTitle>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Тема доски"
        >
          {BOARD_THEMES.map((t) => (
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
        <SectionTitle hint="Изменение цвета включает тему Custom.">Свои цвета клеток</SectionTitle>
        <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
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
