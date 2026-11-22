import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { Color, PromotionPiece } from "@/lib/chess/types";

import { PieceImage, pieceName } from "./PieceImage";

const CHOICES: PromotionPiece[] = ["q", "r", "b", "n"];

interface PromotionPickerProps {
  color: Color;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export function PromotionPicker({ color, onSelect, onCancel }: PromotionPickerProps) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-overlay backdrop-blur-[2px] animate-in fade-in duration-150"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Выбор фигуры для превращения пешки"
        className="panel w-[min(92%,22rem)] p-4 shadow-[var(--shadow-float)] animate-rise sm:p-5"
      >
        <p className="eyebrow">Превращение пешки</p>
        <p className="mt-1 text-sm text-muted-foreground">Выберите фигуру</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {CHOICES.map((piece, i) => (
            <button
              key={piece}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              onClick={() => onSelect(piece)}
              aria-label={pieceName(piece)}
              className="group flex aspect-square flex-col items-center justify-center rounded-lg border border-border bg-ivory p-1.5 transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PieceImage
                color={color}
                type={piece}
                className="h-full w-full transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px] text-muted-foreground">
          {CHOICES.map((piece) => (
            <span key={piece} className="capitalize">
              {pieceName(piece)}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
