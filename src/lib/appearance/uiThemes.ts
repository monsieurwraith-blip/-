export const UI_THEMES = [
  {
    id: "obsidian",
    label: "Obsidian Emerald",
    description: "Фирменная тема ProChess: обсидиан, титан и изумрудный акцент",
    bg: "#0B0D10",
    surface: "#171B22",
    accent: "#16C784",
  },
  {
    id: "titanium",
    label: "Titanium Sapphire",
    description: "Холодный металлик с сапфировой телеметрией",
    bg: "#0B0F15",
    surface: "#151C26",
    accent: "#38BDF8",
  },
  {
    id: "imperial",
    label: "Imperial Gold",
    description: "Антрацитовый уголь с благородным золотым акцентом",
    bg: "#0E0C0A",
    surface: "#1A1612",
    accent: "#E5A93C",
  },
  {
    id: "crimson",
    label: "Crimson Carbon",
    description: "Тёмный карбон с рубиновой подсветкой действий",
    bg: "#0E0B0D",
    surface: "#1B1418",
    accent: "#F43F5E",
  },
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]["id"];

export const DEFAULT_UI_THEME: UiThemeId = "obsidian";

export function isUiThemeId(value: unknown): value is UiThemeId {
  return UI_THEMES.some((t) => t.id === value);
}
