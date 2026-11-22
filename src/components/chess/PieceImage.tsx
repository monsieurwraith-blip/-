import type { CSSProperties } from "react";

import { useSettings } from "@/features/settings/SettingsProvider";
import { getPieceSet, pieceSetPath, type PieceSetId } from "@/lib/appearance/themes";
import type { Color, PieceSymbol } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

const NAMES: Record<PieceSymbol, string> = {
  k: "король",
  q: "ферзь",
  r: "ладья",
  b: "слон",
  n: "конь",
  p: "пешка",
};

export function pieceName(type: PieceSymbol): string {
  return NAMES[type];
}

export function pieceSrc(color: Color, type: PieceSymbol, set: PieceSetId = "cburnett"): string {
  return pieceSetPath(getPieceSet(set).base, `${color}${type.toUpperCase()}`);
}

interface PieceImageProps {
  color: Color;
  type: PieceSymbol;
  className?: string;
  decorative?: boolean;
  /** Overrides the user's chosen set (used by the settings previews). */
  set?: PieceSetId;
}

/**
 * Piece from the set chosen in settings (supports independent white/black sets).
 * Material sets fill the SVG silhouette with a CSS material layer and keep outlines on top.
 */
export function PieceImage({ color, type, className, decorative = true, set }: PieceImageProps) {
  const { settings } = useSettings();
  const resolvedId =
    set ??
    (color === "w"
      ? (settings.whitePieceSet ?? settings.pieceSet)
      : (settings.blackPieceSet ?? settings.pieceSet));
  const pieceSet = getPieceSet(resolvedId);
  const src = pieceSrc(color, type, pieceSet.id as PieceSetId);
  const material = pieceSet.material;
  return (
    <span
      className={cn("piece-art", className)}
      data-material={material}
      data-color={color}
      style={material ? ({ "--piece-mask": `url("${src}")` } as CSSProperties) : undefined}
    >
      {material && <span className="piece-material" aria-hidden />}
      <img
        src={src}
        alt={decorative ? "" : `${color === "w" ? "Белый" : "Чёрный"} ${NAMES[type]}`}
        draggable={false}
      />
    </span>
  );
}
