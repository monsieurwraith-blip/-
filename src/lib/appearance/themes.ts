/** Board color themes and piece sets. Pure data + lookups, no React. */

export type BoardThemeCategory = "classic" | "luxury" | "metal" | "special";

export interface BoardTheme {
  id: string;
  label: string;
  note: string;
  category: BoardThemeCategory;
  light: string;
  dark: string;
}

export const BOARD_CATEGORY_LABEL: Record<BoardThemeCategory, string> = {
  classic: "Классика",
  luxury: "Премиум",
  metal: "Современные и металл",
  special: "Специальные",
};

export const BOARD_THEMES = [
  // Classic / Классика
  {
    id: "classic",
    label: "Классическая деревянная",
    note: "Турнирное дерево",
    category: "classic",
    light: "#F0D9B5",
    dark: "#B58863",
  },
  {
    id: "walnut",
    label: "Орех",
    note: "Благородный тёмный орех",
    category: "classic",
    light: "#DFC39D",
    dark: "#6F4831",
  },
  {
    id: "light-oak",
    label: "Дуб",
    note: "Светлый матовый дуб",
    category: "classic",
    light: "#F0DFC2",
    dark: "#B4895E",
  },
  {
    id: "mahogany",
    label: "Красное дерево",
    note: "Красный палисандр",
    category: "classic",
    light: "#E4C0A2",
    dark: "#753629",
  },
  {
    id: "dark-wood",
    label: "Тёмный венге",
    note: "Глубокое дерево венге",
    category: "classic",
    light: "#C9A57C",
    dark: "#4B3022",
  },
  {
    id: "ivory",
    label: "Слоновая кость",
    note: "Тёплый клубный стандарт",
    category: "classic",
    light: "#F4F1E8",
    dark: "#C2B69E",
  },

  // Luxury / Премиум
  {
    id: "emerald",
    label: "Emerald ProChess",
    note: "Фирменная изумрудная",
    category: "luxury",
    light: "#DCE6E0",
    dark: "#0F6E4A",
  },
  {
    id: "black-marble",
    label: "Чёрный мрамор",
    note: "Обсидиан с прожилками",
    category: "luxury",
    light: "#A3ABB5",
    dark: "#1C2128",
  },
  {
    id: "white-marble",
    label: "Белый мрамор",
    note: "Каррарский камень",
    category: "luxury",
    light: "#F2F4F7",
    dark: "#8D97A4",
  },
  {
    id: "gold-marble",
    label: "Золотой мрамор",
    note: "Королевская золотая жила",
    category: "luxury",
    light: "#F3E6C9",
    dark: "#7C5A24",
  },
  {
    id: "onyx",
    label: "Оникс",
    note: "Глянцевый камень",
    category: "luxury",
    light: "#B9C0CA",
    dark: "#171A20",
  },
  {
    id: "granite",
    label: "Гранит",
    note: "Холодный монолит",
    category: "luxury",
    light: "#D1D5DB",
    dark: "#4B5563",
  },
  {
    id: "sapphire",
    label: "Сапфир",
    note: "Королевский сапфир",
    category: "luxury",
    light: "#D7E4F2",
    dark: "#1F4B7A",
  },
  {
    id: "ruby",
    label: "Рубин",
    note: "Глубокий бордовый камень",
    category: "luxury",
    light: "#ECD8DC",
    dark: "#7C2334",
  },
  {
    id: "amethyst",
    label: "Аметист",
    note: "Имперский кристалл",
    category: "luxury",
    light: "#E4DDF0",
    dark: "#4D3273",
  },

  // Modern & Metal / Современные и металл
  {
    id: "carbon",
    label: "Carbon",
    note: "Углеродное волокно",
    category: "metal",
    light: "#697382",
    dark: "#1D222B",
  },
  {
    id: "minimal-dark",
    label: "Minimal Dark",
    note: "Матовый графит терминала",
    category: "metal",
    light: "#47505E",
    dark: "#161B22",
  },
  {
    id: "glass",
    label: "Glass",
    note: "Дымчатое стекло",
    category: "metal",
    light: "#CFD8E3",
    dark: "#394452",
  },
  {
    id: "neon",
    label: "Neon",
    note: "Изумрудный неон",
    category: "metal",
    light: "#78E4B6",
    dark: "#14222A",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    note: "Кибер-матрица",
    category: "metal",
    light: "#8CE9D9",
    dark: "#1C1833",
  },
  {
    id: "ice",
    label: "Ice",
    note: "Арктический лёд",
    category: "metal",
    light: "#E1F0F7",
    dark: "#5D89A3",
  },
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
    note: "Воронёная сталь",
    category: "metal",
    light: "#7B8491",
    dark: "#252B33",
  },

  // Special / Специальные
  {
    id: "royal-palace",
    label: "Royal Palace",
    note: "Дворцовый бархат и золото",
    category: "special",
    light: "#EAE0CC",
    dark: "#4A2538",
  },
  {
    id: "golden-empire",
    label: "Golden Empire",
    note: "Имперское золото и обсидиан",
    category: "special",
    light: "#EED697",
    dark: "#241C11",
  },
  {
    id: "midnight",
    label: "Midnight",
    note: "Ночной сапфир",
    category: "special",
    light: "#7E93B8",
    dark: "#121A2E",
  },
  {
    id: "ancient-temple",
    label: "Ancient Temple",
    note: "Древний базальт и песчаник",
    category: "special",
    light: "#DFCFB4",
    dark: "#4F463B",
  },
  {
    id: "space",
    label: "Space",
    note: "Дальний космос",
    category: "special",
    light: "#8F9AC2",
    dark: "#131728",
  },
  {
    id: "liquid-metal",
    label: "Liquid Metal",
    note: "Хромированная ртуть",
    category: "special",
    light: "#D2DCE6",
    dark: "#343E4A",
  },
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
    id: "galaxy",
    label: "Galaxy",
    note: "Звёздная туманность",
    category: "special",
    light: "#8F9AC2",
    dark: "#171C30",
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
  | "gold-mirror"
  | "royal-gold"
  | "champagne-gold"
  | "black-gold"
  | "liquid-gold"
  | "glass"
  | "marble"
  | "wood"
  | "obsidian"
  | "titanium"
  | "platinum"
  | "bronze"
  | "gold"
  | "silver"
  | "crystal"
  | "luxury"
  | "royal"
  | "neon"
  | "holographic"
  | "cyber"
  | "cosmic"
  | "futuristic";

export interface PieceSet {
  id: string;
  label: string;
  note: string;
  category: "gold" | "classic" | "metal" | "special";
  /** Author and license, shown in the settings for attribution. */
  credit: string;
  base: SvgSetId;
  material?: PieceMaterial;
}

export const PIECE_SETS = [
  // Flagship Gold Mirror Collection
  {
    id: "gold-mirror",
    label: "GOLD MIRROR",
    note: "Зеркальное 24K золото с бликами",
    category: "gold",
    base: "merida",
    material: "gold-mirror",
    credit: "ProChess Gold Finish · на базе Merida",
  },
  {
    id: "royal-gold",
    label: "ROYAL GOLD",
    note: "Тёмное королевское золото",
    category: "gold",
    base: "fantasy",
    material: "royal-gold",
    credit: "ProChess Gold Finish · на базе Fantasy",
  },
  {
    id: "champagne-gold",
    label: "CHAMPAGNE GOLD",
    note: "Светлое благородное золото",
    category: "gold",
    base: "cburnett",
    material: "champagne-gold",
    credit: "ProChess Gold Finish · на базе Burnett",
  },
  {
    id: "black-gold",
    label: "BLACK GOLD",
    note: "Чёрный металл с золотыми гранями",
    category: "gold",
    base: "spatial",
    material: "black-gold",
    credit: "ProChess Gold Finish · на базе Spatial",
  },
  {
    id: "liquid-gold",
    label: "LIQUID GOLD",
    note: "Эффект расплавленного золота",
    category: "gold",
    base: "merida",
    material: "liquid-gold",
    credit: "ProChess Gold Finish · на базе Merida",
  },

  // Classic & Wood & Marble
  {
    id: "cburnett",
    label: "Классические Staunton",
    note: "Турнирная классика",
    category: "classic",
    base: "cburnett",
    credit: "Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "merida",
    label: "Гроссмейстерские",
    note: "Строгие турнирные формы",
    category: "classic",
    base: "merida",
    credit: "Armando H. Marroquin · GPLv2+",
  },
  {
    id: "chessnut",
    label: "Минималистичные",
    note: "Лаконичная геометрия",
    category: "classic",
    base: "chessnut",
    credit: "Alexis Luengas · Apache 2.0",
  },
  {
    id: "spatial",
    label: "Современные 3D",
    note: "Выраженный объём",
    category: "classic",
    base: "spatial",
    credit: "Maurizio Monge · MIT",
  },
  {
    id: "wood",
    label: "Деревянные",
    note: "Клён и палисандр ручной работы",
    category: "classic",
    base: "cburnett",
    material: "wood",
    credit: "ProChess Finish · на базе Burnett",
  },
  {
    id: "marble",
    label: "Мраморные",
    note: "Прожилковый мрамор",
    category: "classic",
    base: "merida",
    material: "marble",
    credit: "На основе Armando H. Marroquin · GPLv2+",
  },
  {
    id: "obsidian",
    label: "Тёмные Обсидиан",
    note: "Матовый вулканический графит",
    category: "classic",
    base: "chessnut",
    material: "obsidian",
    credit: "ProChess Finish · на базе Chessnut",
  },

  // Premium Metals
  {
    id: "gold",
    label: "Золотые",
    note: "Сатиновое золото и бронза",
    category: "metal",
    base: "merida",
    material: "gold",
    credit: "ProChess Finish · на базе Merida",
  },
  {
    id: "platinum",
    label: "Платиновые",
    note: "Холодный блеск платины",
    category: "metal",
    base: "spatial",
    material: "platinum",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "silver",
    label: "Серебряные",
    note: "Полированное серебро",
    category: "metal",
    base: "cburnett",
    material: "silver",
    credit: "ProChess Finish · на базе Burnett",
  },
  {
    id: "bronze",
    label: "Бронзовые",
    note: "Античная патина и медь",
    category: "metal",
    base: "celtic",
    material: "bronze",
    credit: "ProChess Finish · на базе Celtic",
  },
  {
    id: "titanium",
    label: "Титановые",
    note: "Шлифованный титан",
    category: "metal",
    base: "spatial",
    material: "titanium",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "luxury",
    label: "Luxury",
    note: "Слоновая кость и чёрное золото",
    category: "metal",
    base: "merida",
    material: "luxury",
    credit: "ProChess Finish · на базе Merida",
  },
  {
    id: "royal",
    label: "Royal Emerald",
    note: "Платина и изумрудный лак",
    category: "metal",
    base: "fantasy",
    material: "royal",
    credit: "ProChess Finish · на базе Fantasy",
  },

  // Glass, Crystal, Neon, Space
  {
    id: "glass",
    label: "Стеклянные",
    note: "Матовое хрупкое стекло",
    category: "special",
    base: "cburnett",
    material: "glass",
    credit: "На основе Colin M.L. Burnett · GPLv2+",
  },
  {
    id: "crystal",
    label: "Кристаллические",
    note: "Гранёный ледяной кристалл",
    category: "special",
    base: "spatial",
    material: "crystal",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "neon",
    label: "Неоновые",
    note: "Изумрудное неоновое свечение",
    category: "special",
    base: "chessnut",
    material: "neon",
    credit: "ProChess Finish · на базе Chessnut",
  },
  {
    id: "cosmic",
    label: "Космические",
    note: "Тёмный сапфир и звёздная пыль",
    category: "special",
    base: "fantasy",
    material: "cosmic",
    credit: "ProChess Finish · на базе Fantasy",
  },
  {
    id: "holographic",
    label: "Голографические",
    note: "Призматический хром",
    category: "special",
    base: "spatial",
    material: "holographic",
    credit: "ProChess Finish · на базе Spatial",
  },
  {
    id: "cyber",
    label: "Кибернетика",
    note: "Цифровая сталь",
    category: "special",
    base: "chessnut",
    material: "cyber",
    credit: "ProChess Finish · на базе Chessnut",
  },
  {
    id: "futuristic",
    label: "Футуристичные",
    note: "Авангард будущего",
    category: "special",
    base: "celtic",
    material: "futuristic",
    credit: "ProChess Finish · на базе Celtic",
  },
] as const satisfies readonly PieceSet[];

export type PieceSetId = (typeof PIECE_SETS)[number]["id"];

export const DEFAULT_BOARD_THEME: BoardThemeId = "emerald";
export const DEFAULT_PIECE_SET: PieceSetId = "cburnett";

const LEGACY_BOARD_ALIAS: Record<string, BoardThemeId> = {
  green: "emerald",
  blue: "midnight",
  dark: "black-steel",
  "carbon-fiber": "carbon",
};

const LEGACY_PIECE_ALIAS: Record<string, PieceSetId> = {
  fantasy: "royal",
  celtic: "futuristic",
};

export function normalizeBoardThemeId(value: unknown): BoardThemeId | null {
  if (typeof value !== "string") return null;
  if (value === "custom") return "custom";
  if (BOARD_THEMES.some((t) => t.id === value)) return value as BoardThemeId;
  return LEGACY_BOARD_ALIAS[value] ?? null;
}

export function normalizePieceSetId(value: unknown): PieceSetId | null {
  if (typeof value !== "string") return null;
  if (PIECE_SETS.some((p) => p.id === value)) return value as PieceSetId;
  return LEGACY_PIECE_ALIAS[value] ?? null;
}

export function getBoardTheme(id: BoardThemeId): BoardTheme | null {
  if (id === "custom") return null;
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export function resolveBoardColors(id: BoardThemeId, custom: BoardColors): BoardColors {
  if (id === "custom") return custom;
  const t = getBoardTheme(id) ?? BOARD_THEMES[0];
  return { light: t.light, dark: t.dark };
}

export function getPieceSet(id: PieceSetId): PieceSet {
  return PIECE_SETS.find((p) => p.id === id) ?? PIECE_SETS[0];
}

export function pieceSetPath(base: SvgSetId, code: string): string {
  return `${import.meta.env.BASE_URL}pieces/${base}/${code}.svg`;
}

export function isGoldPieceSet(id: PieceSetId): boolean {
  return getPieceSet(id).category === "gold" || id === "gold";
}
