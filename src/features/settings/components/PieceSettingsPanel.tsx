import { Check } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PIECE_SETS, resolveBoardColors, type PieceSetId } from "@/lib/appearance/themes";
import type { Color, PieceSymbol } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

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

type PieceTarget = "both" | "w" | "b";

export function PieceSettingsPanel() {
  const { settings, update } = useSettings();
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);
  const boardVars = { "--board-light": colors.light, "--board-dark": colors.dark } as CSSProperties;

  const hasSplit = settings.whitePieceSet !== null || settings.blackPieceSet !== null;
  const [splitEnabled, setSplitEnabled] = useState(hasSplit);
  const [targetColor, setTargetColor] = useState<PieceTarget>(hasSplit ? "w" : "both");

  const activeSetId: PieceSetId =
    splitEnabled && targetColor === "w"
      ? (settings.whitePieceSet ?? settings.pieceSet)
      : splitEnabled && targetColor === "b"
        ? (settings.blackPieceSet ?? settings.pieceSet)
        : settings.pieceSet;

  const handleSelectSet = (id: PieceSetId) => {
    if (!splitEnabled || targetColor === "both") {
      update({ pieceSet: id, whitePieceSet: null, blackPieceSet: null });
    } else if (targetColor === "w") {
      update({ whitePieceSet: id });
    } else {
      update({ blackPieceSet: id });
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle hint="16 коллекций фигур · поддерживается раздельный выбор для белых и чёрных.">
        Темы фигур
      </SectionTitle>

      <div className="panel space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="split-piece-sets" className="text-sm font-medium">
              Раздельные фигуры для белых и чёрных
            </Label>
            <p className="text-xs text-muted-foreground">
              Комбинируйте разные материалы, например Gold против Titanium
            </p>
          </div>
          <Switch
            id="split-piece-sets"
            checked={splitEnabled}
            onCheckedChange={(checked) => {
              setSplitEnabled(checked);
              if (checked) {
                setTargetColor("w");
                update({
                  whitePieceSet: settings.whitePieceSet ?? settings.pieceSet,
                  blackPieceSet: settings.blackPieceSet ?? settings.pieceSet,
                });
              } else {
                setTargetColor("both");
                update({ whitePieceSet: null, blackPieceSet: null });
              }
            }}
          />
        </div>

        {splitEnabled && (
          <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
            {(
              [
                {
                  id: "w",
                  label: "Белые фигуры",
                  current: settings.whitePieceSet ?? settings.pieceSet,
                },
                {
                  id: "b",
                  label: "Чёрные фигуры",
                  current: settings.blackPieceSet ?? settings.pieceSet,
                },
              ] as const
            ).map((side) => {
              const name = PIECE_SETS.find((s) => s.id === side.current)?.label ?? side.current;
              const active = targetColor === side.id;
              return (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => setTargetColor(side.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                    active
                      ? "border-primary/70 bg-primary/15 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <PieceImage color={side.id} type="n" set={side.current} className="size-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{side.label}</span>
                    <span className="block truncate text-[11px] text-primary">{name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Тема фигур"
      >
        {PIECE_SETS.map((set) => {
          const selected = activeSetId === set.id;
          return (
            <button
              key={set.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-selected={selected}
              onClick={() => handleSelectSet(set.id as PieceSetId)}
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
