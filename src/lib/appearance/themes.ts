/** Board color themes and piece sets. Pure data + lookups, no React. */

export interface BoardTheme {
  id: string;
  label: string;
  note: string;
  light: string;
  dark: string;
}

export const BOARD_THEMES = [
  {
    id: "emerald",
    label: "Studio",
    note: "Фирменная CHESS STUDIO",
    light: "#e3dcc8",
    dark: "#6f9077",
  },
  {
    id: "classic",
    label: "Classic Wood",
    note: "Классическое дерево",
    light: "#f0d9b5",
    dark: "#b58863",
  },
  { id: "walnut", label: "Walnut", note: "Тёмный орех", light: "#d9b88f", dark: "#6f4831" },
  {
    id: "tournament",
    label: "Tournament",
    note: "Турнирная виниловая",
    light: "#ebe6d3",
    dark: "#47714f",
  },
  { id: "green", label: "Green", note: "Зелёная классическая", light: "#eeeed2", dark: "#769656" },
  { id: "ice", label: "Blue", note: "Сине-серая", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "dark", label: "Dark", note: "Тёмная современная", light: "#7e8188", dark: "#474a50" },
  { id: "ivory", label: "Ivory", note: "Светлая элегантная", light: "#f6f1e4", dark: "#c9b996" },
  { id: "graphite", label: "Graphite", note: "Графит", light: "#c9c9c4", dark: "#6e6e6a" },
  { id: "coral", label: "Coral", note: "Коралл", light: "#f3e3d3", dark: "#c47a6a" },
] as const satisfies readonly BoardTheme[];

export type PresetBoardThemeId = (typeof BOARD_THEMES)[number]["id"];
/** "custom" uses the user's own light/dark square colors. */
export type BoardThemeId = PresetBoardThemeId | "custom";

export interface BoardColors {
  light: string;
  dark: string;
}

/** SVG folders bundled under public/pieces (lichess collection, permissive licenses). */
export type SvgSetId = "cburnett" | "merida" | "chessnut" | "fantasy" | "celtic" | "spatial";

/** Material rendering on top of an SVG set: the silhouette is filled with glass or marble. */
export type PieceMaterial = "glass" | "marble";

export interface PieceSet {
  id: string;
  label: string;
  note: string;
  /** Author and license, shown in the settings for attribution. */
  credit: string;
  base: SvgSetId;
  material?: PieceMaterial;
}

export const PIECE_SETS = [
  {
    id: "cburnett",
    label: "Classic",
    note: "Классические",
    base: "cburnett",
    credit: "Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "merida",
    label: "Staunton",
    note: "Турнирный стиль",
    base: "merida",
    credit: "Armando H. Marroquin · GPLv2+",
  },
  {
    id: "chessnut",
    label: "Modern",
    note: "Минималистичные",
    base: "chessnut",
    credit: "Alexis Luengas · Apache 2.0",
  },
  {
    id: "spatial",
    label: "Neo",
    note: "Современные объёмные",
    base: "spatial",
    credit: "Maurizio Monge · MIT",
  },
  {
    id: "glass",
    label: "Glass",
    note: "Стеклянные",
    base: "cburnett",
    material: "glass",
    credit: "На основе Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "marble",
    label: "Marble",
    note: "Мраморные",
    base: "merida",
    material: "marble",
    credit: "На основе Armando H. Marroquin · GPLv2+",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    note: "Фэнтези",
    base: "fantasy",
    credit: "Maurizio Monge · MIT",
  },
  {
    id: "celtic",
    label: "Celtic",
    note: "Кельтские",
    base: "celtic",
    credit: "Maurizio Monge · MIT",
  },
] as const satisfies readonly PieceSet[];

export type PieceSetId = (typeof PIECE_SETS)[number]["id"];

export const DEFAULT_BOARD_THEME: BoardThemeId = "emerald";
export const DEFAULT_PIECE_SET: PieceSetId = "cburnett";

export function getBoardTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export function getPieceSet(id: PieceSetId): PieceSet {
  return PIECE_SETS.find((p) => p.id === id) ?? PIECE_SETS[0];
}

/** Square colors for a theme; "custom" falls back to the user's colors. */
export function resolveBoardColors(id: BoardThemeId, custom: BoardColors): BoardColors {
  if (id === "custom") return custom;
  const t = getBoardTheme(id);
  return { light: t.light, dark: t.dark };
}

export function isBoardThemeId(value: unknown): value is BoardThemeId {
  return value === "custom" || BOARD_THEMES.some((t) => t.id === value);
}

export function isPieceSetId(value: unknown): value is PieceSetId {
  return PIECE_SETS.some((p) => p.id === value);
}

/**
 * Path of a piece SVG. Relative to the app base so it works both on the web ("/")
 * and inside the desktop app.
 */
export function pieceSetPath(set: SvgSetId, file: string): string {
  return `${import.meta.env.BASE_URL}pieces/${set}/${file}.svg`;
}
