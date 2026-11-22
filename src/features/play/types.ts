import type { Color, PieceSymbol, SquarePair } from "@/lib/chess/types";
import type { HintLevel } from "@/lib/coach/hints";
import type { GameSetupSettings } from "@/lib/settings/settings";

/** Setup of a game (mode, side, difficulty, clock) — persisted in the user settings. */
export type GameSettings = GameSetupSettings;

/** A started game: the settings it was created with and the resolved player color. */
export interface ActiveGame {
  id: number;
  settings: GameSettings;
  playerColor: Color;
}

/** Progressive 3-level hint suggested by Stockfish + chess.js geometry. */
export interface HintMove extends SquarePair {
  level: HintLevel;
  san: string;
  piece: PieceSymbol;
  captured: PieceSymbol | null;
  promotion: PieceSymbol | null;
  level1Text: string;
  level2Text: string;
  level3Text: string;
}
