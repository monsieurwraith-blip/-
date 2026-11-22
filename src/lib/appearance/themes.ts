/** Board color themes and piece sets. Pure data + lookups, no React. */

export type BoardThemeCategory = "classic" | "metal" | "luxury" | "special";

export interface BoardTheme {
  id: string;
  label: string;
  note: string;
  category: BoardThemeCategory;
  light: string;
  dark: string;
}

export const BOARD_CATEGORY_LABEL: Record<BoardThemeCategory, string> = {
  classic: "Classic",
  metal: "Metal",
  luxury: "Luxury",
  special: "Special",
};

export const BOARD_THEMES = [
  // Classic
  {
    id: "walnut",
    label: "Classic Walnut",
    note: "Классический орех",
    category: "classic",
    light: "#DFC39D",
    dark: "#6F4831",
  },
  {
    id: "light-oak",
    label: "Light Oak",
    note: "Светлый дуб",
    category: "classic",
    light: "#F0DFC2",
    dark: "#B4895E",
  },
  {
    id: "dark-wood",
    label: "Dark Wood",
    note: "Тёмное дерево",
    category: "classic",
    light: "#C9A57C",
    dark: "#4B3022",
  },
  {
    id: "mahogany",
    label: "Mahogany",
    note: "Красное дерево",
    category: "classic",
    light: "#E4C0A2",
    dark: "#753629",
  },
  {
    id: "ivory",
    label: "Ivory",
    note: "Слоновая кость",
    category: "classic",
    light: "#F4F1E8",
    dark: "#C2B69E",
  },
  {
    id: "classic",
    label: "Classic Wood",
    note: "Турнирное дерево",
    category: "classic",
    light: "#F0D9B5",
    dark: "#B58863",
  },

  // Metal
  {
    id: "titanium",
    label: "Titanium",
    note: "Титановый сплав",
    category: "metal",
    light: "#98A4B3",
    dark: "#363E4A",
  },
  {
    id: "silver",
    label: "Silver",
    note: "Матовое серебро",
    category: "metal",
    light: "#D7DEE6",
    dark: "#6C7785",
  },
  {
    id: "gold",
    label: "Gold",
    note: "Анодированное золото",
    category: "metal",
    light: "#E7CC8A",
    dark: "#85672C",
  },
  {
    id: "bronze",
    label: "Bronze",
    note: "Тёмная бронза",
    category: "metal",
    light: "#D2A77D",
    dark: "#6A4730",
  },
  {
    id: "graphite",
    label: "Graphite",
    note: "Полированный графит",
    category: "metal",
    light: "#B7BEC7",
    dark: "#474D57",
  },
  {
    id: "black-steel",
    label: "Black Steel",
    note: "Чёрная сталь",
    category: "metal",
    light: "#7B8491",
    dark: "#252B33",
  },

  // Luxury
  {
    id: "emerald",
    label: "Emerald",
    note: "Фирменная ProChess",
    category: "luxury",
    light: "#DCE6E0",
    dark: "#0F6E4A",
  },
  {
    id: "black-marble",
    label: "Black Marble",
    note: "Чёрный мрамор",
    category: "luxury",
    light: "#A3ABB5",
    dark: "#1C2128",
  },
  {
    id: "white-marble",
    label: "White Marble",
    note: "Каррарский мрамор",
    category: "luxury",
    light: "#F2F4F7",
    dark: "#8D97A4",
  },
  {
    id: "sapphire",
    label: "Sapphire",
    note: "Королевский сапфир",
    category: "luxury",
    light: "#D7E4F2",
    dark: "#1F4B7A",
  },
  {
    id: "ruby",
    label: "Ruby",
    note: "Глубокий рубин",
    category: "luxury",
    light: "#ECD8DC",
    dark: "#7C2334",
  },
  {
    id: "amethyst",
    label: "Amethyst",
    note: "Имперский аметист",
    category: "luxury",
    light: "#E4DDF0",
    dark: "#4D3273",
  },

  // Special
  {
    id: "holographic",
    label: "Holographic",
    note: "Голографический блеск",
    category: "special",
    light: "#B4ECE2",
    dark: "#2D3C5C",
  },
  {
    id: "iridescent",
    label: "Iridescent",
    note: "Перламутровый перелив",
    category: "special",
    light: "#D8D6F2",
    dark: "#384E68",
  },
  {
    id: "rainbow",
    label: "Rainbow",
    note: "Призматический спектр",
    category: "special",
    light: "#E3E7F0",
    dark: "#3A4260",
  },
  {
    id: "neon",
    label: "Neon",
    note: "Изумрудный неон",
    category: "special",
    light: "#78E4B6",
    dark: "#14222A",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    note: "Кибер-матрица",
    category: "special",
    light: "#8CE9D9",
    dark: "#1C1833",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    note: "Глубокий космос",
    category: "special",
    light: "#8F9AC2",
    dark: "#171C30",
  },
  {
    id: "ice",
    label: "Ice",
    note: "Арктический лёд",
    category: "special",
    light: "#E1F0F7",
    dark: "#5D89A3",
  },
  {
    id: "fire",
    label: "Fire",
    note: "Вулканический жар",
    category: "special",
    light: "#F0BA8E",
    dark: "#6E2318",
  },
  {
    id: "glass",
    label: "Glass",
    note: "Дымчатое стекло",
    category: "special",
    light: "#CFD8E3",
    dark: "#394452",
  },
  {
    id: "aurora",
    label: "Aurora",
    note: "Северное сияние",
    category: "special",
    light: "#B3EAD6",
    dark: "#1A3D46",
  },
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

/** Material rendering on top of an SVG set. */
export type PieceMaterial =
  | "glass"
  | "marble"
  | "titanium"
  | "gold"
  | "silver"
  | "crystal"
  | "luxury"
  | "royal"
  | "neon"
  | "holographic"
  | "cyber"
  | "futuristic";

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
    label: "Classic Staunton",
    note: "Классические турнирные",
    base: "cburnett",
    credit: "Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "merida",
    label: "Tournament",
    note: "Строгие гроссмейстерские",
    base: "merida",
    credit: "Armando H. Marroquin · GPLv2+",
  },
  {
    id: "chessnut",
    label: "Minimal",
    note: "Лаконичная геометрия",
    base: "chessnut",
    credit: "Alexis Luengas · Apache 2.0",
  },
  {
    id: "spatial",
    label: "Modern",
    note: "Современные объёмные",
    base: "spatial",
    credit: "Maurizio Monge · MIT",
  },
  {
    id: "luxury",
    label: "Luxury",
    note: "Слоновая кость и чёрное золото",
    base: "merida",
    material: "luxury",
    credit: "ProChess Finish · на базе Merida",
  },
  {
    id: "royal",
    label: "Royal",
    note: "Платина и изумрудный лак",
    base: "fantasy",
    material: "royal",
    credit: "ProChess Finish · на базе Fantasy",
  },
  {
    id: "titanium",
    label: "Titanium",
    note: "Шлифованный титан",
    base: "spatial",
    material: "titanium",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "gold",
    label: "Gold",
    note: "Полированное золото и бронза",
    base: "merida",
    material: "gold",
    credit: "ProChess Finish · на базе Merida",
  },
  {
    id: "silver",
    label: "Silver",
    note: "Холодное серебро",
    base: "cburnett",
    material: "silver",
    credit: "ProChess Finish · на базе Burnett",
  },
  {
    id: "crystal",
    label: "Crystal",
    note: "Гранёный хрусталь",
    base: "spatial",
    material: "crystal",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "glass",
    label: "Glass",
    note: "Матовое стекло",
    base: "cburnett",
    material: "glass",
    credit: "На основе Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "marble",
    label: "Marble",
    note: "Прожилковый мрамор",
    base: "merida",
    material: "marble",
    credit: "На основе Armando H. Marroquin · GPLv2+",
  },
  {
    id: "neon",
    label: "Neon",
    note: "Изумрудно-ледяное свечение",
    base: "chessnut",
    material: "neon",
    credit: "ProChess Finish · на базе Chessnut",
  },
  {
    id: "holographic",
    label: "Holographic",
    note: "Голографический хром",
    base: "spatial",
    material: "holographic",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "cyber",
    label: "Cyber",
    note: "Кибернетическая сталь",
    base: "chessnut",
    material: "cyber",
    credit: "ProChess Finish · на базе Chessnut",
  },
  {
    id: "futuristic",
    label: "Futuristic",
    note: "Футуристический авангард",
    base: "celtic",
    material: "futuristic",
    credit: "ProChess Finish · на базе Celtic",
  },
] as const satisfies readonly PieceSet[];

export type PieceSetId = (typeof PIECE_SETS)[number]["id"];

export const DEFAULT_BOARD_THEME: BoardThemeId = "emerald";
export const DEFAULT_PIECE_SET: PieceSetId = "cburnett";

const LEGACY_BOARD_ALIASES: Record<string, PresetBoardThemeId> = {
  tournament: "emerald",
  green: "emerald",
  dark: "black-steel",
  coral: "ruby",
};

const LEGACY_PIECE_ALIASES: Record<string, PieceSetId> = {
  fantasy: "royal",
  celtic: "futuristic",
};

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
  return (
    value === "custom" ||
    BOARD_THEMES.some((t) => t.id === value) ||
    (typeof value === "string" && value in LEGACY_BOARD_ALIASES)
  );
}

export function normalizeBoardThemeId(value: unknown): BoardThemeId | null {
  if (value === "custom") return "custom";
  if (typeof value === "string") {
    if (BOARD_THEMES.some((t) => t.id === value)) return value as PresetBoardThemeId;
    if (value in LEGACY_BOARD_ALIASES) return LEGACY_BOARD_ALIASES[value]!;
  }
  return null;
}

export function isPieceSetId(value: unknown): value is PieceSetId {
  return (
    PIECE_SETS.some((p) => p.id === value) ||
    (typeof value === "string" && value in LEGACY_PIECE_ALIASES)
  );
}

export function normalizePieceSetId(value: unknown): PieceSetId | null {
  if (typeof value === "string") {
    if (PIECE_SETS.some((p) => p.id === value)) return value as PieceSetId;
    if (value in LEGACY_PIECE_ALIASES) return LEGACY_PIECE_ALIASES[value]!;
  }
  return null;
}

/**
 * Path of a piece SVG. Relative to the app base so it works both on the web ("/")
 * and inside the desktop app.
 */
export function pieceSetPath(set: SvgSetId, file: string): string {
  return `${import.meta.env.BASE_URL}pieces/${set}/${file}.svg`;
}
