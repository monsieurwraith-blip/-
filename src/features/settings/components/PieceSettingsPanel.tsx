import { Check, Crown } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { PieceImage } from "@/components/chess/PieceImage";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  PIECE_SETS,
  resolveBoardColors,
  type PieceSet,
  type PieceSetId,
} from "@/lib/appearance/themes";
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
type PieceCategory = "all" | PieceSet["category"];

const CATEGORY_TABS: { id: PieceCategory; label: string }[] = [
  { id: "all", label: `Все (${PIECE_SETS.length})` },
  { id: "gold", label: "GOLD MIRROR" },
  { id: "classic", label: "Классика и камень" },
  { id: "metal", label: "Премиум-металл" },
  { id: "special", label: "Стекло и неон" },
];

export function PieceSettingsPanel() {
  const { settings, update } = useSettings();
  const colors = resolveBoardColors(settings.boardTheme, settings.customBoard);
  const boardVars = { "--board-light": colors.light, "--board-dark": colors.dark } as CSSProperties;

  const hasSplit = settings.whitePieceSet !== null || settings.blackPieceSet !== null;
  const [splitEnabled, setSplitEnabled] = useState(hasSplit);
  const [targetColor, setTargetColor] = useState<PieceTarget>(hasSplit ? "w" : "both");
  const [category, setCategory] = useState<PieceCategory>("all");

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

  const visibleSets =
    category === "all" ? PIECE_SETS : PIECE_SETS.filter((s) => s.category === category);

  return (
    <div className="space-y-4">
      <SectionTitle hint="26 коллекций, включая флагманскую линейку GOLD MIRROR с металлическим 3D-блеском и раздельным выбором сторон.">
        Темы фигур и GOLD MIRROR
      </SectionTitle>

      {/* Flagship GOLD MIRROR Quick Showcase */}
      <div className="rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-card to-secondary/70 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
            <Crown className="size-3.5" aria-hidden />
            GOLD MIRROR EDITION
          </span>
          <span className="text-[11px] text-muted-foreground">5 зеркальных золотых покрытий</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PIECE_SETS.filter((s) => s.category === "gold").map((gold) => {
            const active = activeSetId === gold.id;
            return (
              <button
                key={gold.id}
                type="button"
                onClick={() => handleSelectSet(gold.id as PieceSetId)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-amber-300 bg-amber-400/20 text-amber-100"
                    : "border-amber-400/25 bg-black/30 text-amber-100/80 hover:border-amber-300/60",
                )}
              >
                <PieceImage color="w" type="q" set={gold.id as PieceSetId} className="size-5" />
                <span>{gold.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="split-piece-sets" className="text-sm font-medium">
              Раздельные фигуры для белых и чёрных
            </Label>
            <p className="text-xs text-muted-foreground">
              Комбинируйте разные материалы, например CHAMPAGNE GOLD против BLACK GOLD
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

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Категории фигур">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            onClick={() => setCategory(tab.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              category === tab.id
                ? "border-primary/70 bg-primary/15 text-primary"
                : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Тема фигур"
      >
        {visibleSets.map((set) => {
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
