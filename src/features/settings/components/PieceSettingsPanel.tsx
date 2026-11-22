import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { PIECE_SETS, resolveBoardColors, type PieceSetId } from "@/lib/appearance/themes";
import type { Color, PieceSymbol } from "@/lib/chess/types";

import { useSettings } from "../SettingsProvider";
import { SectionTitle } from "./SettingRow";

const PREVIEW: { color: Color; type: PieceSymbol }[] = [
  { color: "w", type: "k" },
  { color: "w", type: "q" },
  { color: "w", type: "n" },
  { color: "b", type: "k" },
  { color: "b", type: "q" },
  { color: "b", type: "n" },
];

export function PieceSettingsPanel() {
  const { settings, update } = useSettings();
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);
  const boardVars = { "--board-light": colors.light, "--board-dark": colors.dark } as CSSProperties;

  return (
    <div>
      <SectionTitle hint="Фигуры на доске меняются сразу.">Темы фигур</SectionTitle>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Тема фигур"
      >
        {PIECE_SETS.map((set) => {
          const selected = settings.pieceSet === set.id;
          return (
            <button
              key={set.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-selected={selected}
              onClick={() => update({ pieceSet: set.id })}
              className="choice-card"
            >
              <div
                className="grid grid-cols-6 overflow-hidden rounded-md"
                style={boardVars}
                aria-hidden
              >
                {PREVIEW.map((p, i) => (
                  <div key={i} className={i % 2 === 0 ? "sq-light" : "sq-dark"}>
                    <PieceImage
                      color={p.color}
                      type={p.type}
                      set={set.id as PieceSetId}
                      className="block aspect-square w-full p-[8%]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-start justify-between gap-2 px-1 pb-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{set.label}</p>
                  <p className="text-xs text-muted-foreground">{set.note}</p>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground/70">{set.credit}</p>
                </div>
                {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
