/**
 * Real-time ECO Opening Classifier.
 * Matches played SAN move prefixes (from the standard starting position)
 * against curated ECO theory lines and returns the deepest specific match.
 */

export interface EcoOpening {
  code: string;
  name: string;
  variation?: string;
  /** Full Russian display label, e.g. "C65 · Испанская партия, Берлинская защита". */
  label: string;
}

interface RawEcoEntry {
  code: string;
  name: string;
  variation?: string;
  /** Space-separated SAN moves from startpos (no move numbers or check signs). */
  moves: string;
}

const ECO_DATABASE: readonly RawEcoEntry[] = [
  // A00–A39: Flank openings & English
  { code: "A00", name: "Дебют Сокольского (Орангутанг)", moves: "b4" },
  { code: "A00", name: "Дебют Гроба", moves: "g4" },
  { code: "A01", name: "Дебют Ларсена", moves: "b3" },
  { code: "A02", name: "Дебют Бёрда", moves: "f4" },
  { code: "A03", name: "Дебют Бёрда", variation: "классический вариант", moves: "f4 d5" },
  { code: "A04", name: "Дебют Рети", moves: "Nf3" },
  { code: "A06", name: "Дебют Рети", variation: "основная линия", moves: "Nf3 d5" },
  { code: "A07", name: "Староиндийская атака", moves: "Nf3 d5 g3" },
  { code: "A09", name: "Дебют Рети", variation: "гамбит Рети", moves: "Nf3 d5 c4" },
  { code: "A10", name: "Английское начало", moves: "c4" },
  { code: "A15", name: "Английское начало", variation: "англо-индийская система", moves: "c4 Nf6" },
  {
    code: "A20",
    name: "Английское начало",
    variation: "сицилианский вариант наоборот",
    moves: "c4 e5",
  },
  {
    code: "A22",
    name: "Английское начало",
    variation: "система Бремен",
    moves: "c4 e5 Nc3 Nf6 g3",
  },
  { code: "A30", name: "Английское начало", variation: "симметричный вариант", moves: "c4 c5" },

  // A40–A99: Queen's Pawn sidelines, Benoni, Dutch
  { code: "A40", name: "Дебют ферзевой пешки", moves: "d4" },
  { code: "A45", name: "Атака Тромповского", moves: "d4 Nf6 Bg5" },
  { code: "A46", name: "Система Торре", moves: "d4 Nf6 Nf3 e6 Bg5" },
  { code: "A52", name: "Будапештский гамбит", moves: "d4 Nf6 c4 e5" },
  { code: "A56", name: "Модерн-Бенони", moves: "d4 Nf6 c4 c5 d5" },
  { code: "A57", name: "Волжский гамбит (Бенко)", moves: "d4 Nf6 c4 c5 d5 b5" },
  { code: "A60", name: "Защита Бенони", moves: "d4 Nf6 c4 c5 d5 e6" },
  { code: "A80", name: "Голландская защита", moves: "d4 f5" },
  {
    code: "A87",
    name: "Голландская защита",
    variation: "ленинградский вариант",
    moves: "d4 f5 c4 Nf6 g3 g6 Bg2 Bg7",
  },
  {
    code: "A90",
    name: "Голландская защита",
    variation: "каменная стена",
    moves: "d4 f5 c4 Nf6 g3 e6 Bg2 d5",
  },

  // B00–B19: Semi-open (Scandinavian, Alekhine, Pirc, Caro-Kann)
  { code: "B00", name: "Королевская пешка", moves: "e4" },
  { code: "B01", name: "Скандинавская защита", moves: "e4 d5" },
  {
    code: "B01",
    name: "Скандинавская защита",
    variation: "вариант с 3...Qa5",
    moves: "e4 d5 exd5 Qxd5 Nc3 Qa5",
  },
  { code: "B02", name: "Защита Алехина", moves: "e4 Nf6" },
  {
    code: "B03",
    name: "Защита Алехина",
    variation: "атака четырёх пешек",
    moves: "e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4",
  },
  { code: "B06", name: "Современная защита", moves: "e4 g6" },
  { code: "B07", name: "Защита Пирца — Уфимцева", moves: "e4 d6 d4 Nf6 Nc3" },
  {
    code: "B09",
    name: "Защита Пирца — Уфимцева",
    variation: "австрийская атака",
    moves: "e4 d6 d4 Nf6 Nc3 g6 f4",
  },
  { code: "B10", name: "Защита Каро-Канн", moves: "e4 c6" },
  {
    code: "B12",
    name: "Защита Каро-Канн",
    variation: "закрытый вариант (3. e5)",
    moves: "e4 c6 d4 d5 e5",
  },
  {
    code: "B13",
    name: "Защита Каро-Канн",
    variation: "атака Панова",
    moves: "e4 c6 d4 d5 exd5 cxd5 c4",
  },
  { code: "B15", name: "Защита Каро-Канн", variation: "система 3. Nc3", moves: "e4 c6 d4 d5 Nc3" },
  {
    code: "B18",
    name: "Защита Каро-Канн",
    variation: "классическая система",
    moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5",
  },

  // B20–B99: Sicilian Defense
  { code: "B20", name: "Сицилианская защита", moves: "e4 c5" },
  {
    code: "B21",
    name: "Сицилианская защита",
    variation: "гамбит Морра",
    moves: "e4 c5 d4 cxd4 c3",
  },
  {
    code: "B22",
    name: "Сицилианская защита",
    variation: "система Алапина (2. c3)",
    moves: "e4 c5 c3",
  },
  { code: "B23", name: "Сицилианская защита", variation: "закрытый вариант", moves: "e4 c5 Nc3" },
  {
    code: "B30",
    name: "Сицилианская защита",
    variation: "система Россолимо",
    moves: "e4 c5 Nf3 Nc6 Bb5",
  },
  {
    code: "B33",
    name: "Сицилианская защита",
    variation: "челябинский вариант (Свешникова)",
    moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5",
  },
  { code: "B40", name: "Сицилианская защита", variation: "система 2...e6", moves: "e4 c5 Nf3 e6" },
  {
    code: "B44",
    name: "Сицилианская защита",
    variation: "вариант Тайманова",
    moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6",
  },
  {
    code: "B50",
    name: "Сицилианская защита",
    variation: "классическая разработка",
    moves: "e4 c5 Nf3 d6",
  },
  {
    code: "B54",
    name: "Сицилианская защита",
    variation: "открытый вариант",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4",
  },
  {
    code: "B70",
    name: "Сицилианская защита",
    variation: "вариант Дракона",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6",
  },
  {
    code: "B80",
    name: "Сицилианская защита",
    variation: "схевенингенский вариант",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6",
  },
  {
    code: "B90",
    name: "Сицилианская защита",
    variation: "вариант Найдорфа",
    moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
  },

  // C00–C19: French Defense
  { code: "C00", name: "Французская защита", moves: "e4 e6" },
  {
    code: "C02",
    name: "Французская защита",
    variation: "закрытый вариант (3. e5)",
    moves: "e4 e6 d4 d5 e5",
  },
  {
    code: "C03",
    name: "Французская защита",
    variation: "система Тарраша",
    moves: "e4 e6 d4 d5 Nd2",
  },
  {
    code: "C11",
    name: "Французская защита",
    variation: "классический вариант",
    moves: "e4 e6 d4 d5 Nc3 Nf6",
  },
  {
    code: "C15",
    name: "Французская защита",
    variation: "система Винавера",
    moves: "e4 e6 d4 d5 Nc3 Bb4",
  },

  // C20–C99: Open Games (King's Pawn 1. e4 e5)
  { code: "C20", name: "Открытый дебют", moves: "e4 e5" },
  { code: "C21", name: "Северный гамбит", moves: "e4 e5 d4 exd4 c3" },
  { code: "C23", name: "Дебют слона", moves: "e4 e5 Bc4" },
  { code: "C25", name: "Венская партия", moves: "e4 e5 Nc3" },
  { code: "C30", name: "Королевский гамбит", moves: "e4 e5 f4" },
  { code: "C33", name: "Принятый королевский гамбит", moves: "e4 e5 f4 exf4" },
  { code: "C40", name: "Дебют королевского коня", moves: "e4 e5 Nf3" },
  { code: "C41", name: "Защита Филидора", moves: "e4 e5 Nf3 d6" },
  { code: "C42", name: "Русская партия (Защита Петрова)", moves: "e4 e5 Nf3 Nf6" },
  { code: "C44", name: "Шотландский гамбит", moves: "e4 e5 Nf3 Nc6 d4 exd4 Bc4" },
  { code: "C45", name: "Шотландская партия", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4" },
  { code: "C46", name: "Дебют трёх коней", moves: "e4 e5 Nf3 Nc6 Nc3" },
  { code: "C47", name: "Дебют четырёх коней", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6" },
  { code: "C50", name: "Итальянская партия", moves: "e4 e5 Nf3 Nc6 Bc4" },
  { code: "C51", name: "Гамбит Эванса", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4" },
  {
    code: "C53",
    name: "Итальянская партия",
    variation: "тишайшая система",
    moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3",
  },
  { code: "C55", name: "Защита двух коней", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6" },
  {
    code: "C57",
    name: "Защита двух коней",
    variation: "атака Фегателло",
    moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7",
  },
  { code: "C60", name: "Испанская партия (Руй Лопес)", moves: "e4 e5 Nf3 Nc6 Bb5" },
  {
    code: "C63",
    name: "Испанская партия",
    variation: "гамбит Яниша",
    moves: "e4 e5 Nf3 Nc6 Bb5 f5",
  },
  {
    code: "C65",
    name: "Испанская партия",
    variation: "Берлинская защита",
    moves: "e4 e5 Nf3 Nc6 Bb5 Nf6",
  },
  {
    code: "C68",
    name: "Испанская партия",
    variation: "разменный вариант",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6",
  },
  {
    code: "C70",
    name: "Испанская партия",
    variation: "защита Морфи",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6",
  },
  {
    code: "C78",
    name: "Испанская партия",
    variation: "вариант Морфи",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O",
  },
  {
    code: "C80",
    name: "Испанская партия",
    variation: "открытый вариант",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4",
  },
  {
    code: "C84",
    name: "Испанская партия",
    variation: "закрытая система",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7",
  },
  {
    code: "C89",
    name: "Испанская партия",
    variation: "атака Маршалла",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5",
  },

  // D00–D99: Closed Games, London, Queen's Gambit, Slav, Grünfeld
  { code: "D00", name: "Дебют ферзевых пешек", moves: "d4 d5" },
  { code: "D02", name: "Лондонская система", moves: "d4 d5 Nf3 Nf6 Bf4" },
  { code: "D02", name: "Лондонская система", moves: "d4 d5 Bf4" },
  { code: "D06", name: "Ферзевый гамбит", moves: "d4 d5 c4" },
  { code: "D10", name: "Славянская защита", moves: "d4 d5 c4 c6" },
  {
    code: "D15",
    name: "Славянская защита",
    variation: "основная система",
    moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3",
  },
  { code: "D20", name: "Принятый ферзевый гамбит", moves: "d4 d5 c4 dxc4" },
  { code: "D30", name: "Отказанный ферзевый гамбит", moves: "d4 d5 c4 e6" },
  { code: "D32", name: "Защита Тарраша", moves: "d4 d5 c4 e6 Nc3 c5" },
  {
    code: "D35",
    name: "Отказанный ферзевый гамбит",
    variation: "разменный вариант",
    moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5",
  },
  {
    code: "D37",
    name: "Отказанный ферзевый гамбит",
    variation: "система 5. Bf4",
    moves: "d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4",
  },
  { code: "D43", name: "Полуславянская защита", moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6" },
  {
    code: "D53",
    name: "Отказанный ферзевый гамбит",
    variation: "вариант Ласкера",
    moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4",
  },
  { code: "D80", name: "Защита Грюнфельда", moves: "d4 Nf6 c4 g6 Nc3 d5" },
  {
    code: "D85",
    name: "Защита Грюнфельда",
    variation: "разменный вариант",
    moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4",
  },

  // E00–E99: Indian Defenses & Catalan
  { code: "E01", name: "Каталонское начало", moves: "d4 Nf6 c4 e6 g3 d5" },
  { code: "E12", name: "Новоиндийская защита", moves: "d4 Nf6 c4 e6 Nf3 b6" },
  { code: "E20", name: "Защита Нимцовича", moves: "d4 Nf6 c4 e6 Nc3 Bb4" },
  {
    code: "E32",
    name: "Защита Нимцовича",
    variation: "классическая система (4. Qc2)",
    moves: "d4 Nf6 c4 e6 Nc3 Bb4 Qc2",
  },
  {
    code: "E46",
    name: "Защита Нимцовича",
    variation: "система Рубинштейна",
    moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3",
  },
  { code: "E60", name: "Староиндийская защита", moves: "d4 Nf6 c4 g6" },
  {
    code: "E70",
    name: "Староиндийская защита",
    variation: "система 4. e4",
    moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4",
  },
  {
    code: "E80",
    name: "Староиндийская защита",
    variation: "вариант Земиша",
    moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3",
  },
  {
    code: "E90",
    name: "Староиндийская защита",
    variation: "классическая система",
    moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O",
  },
];

const PARSED_ENTRIES = ECO_DATABASE.map((entry) => ({
  ...entry,
  tokens: entry.moves.split(" "),
})).sort((a, b) => b.tokens.length - a.tokens.length);

function normalizeSanToken(san: string): string {
  return san.replace(/[+#!?]+$/g, "");
}

const STANDARD_START_PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

/**
 * Classifies an opening from a sequence of SAN moves (or verbose chess.js Move objects).
 * Returns null if no moves have been played or if the game began from a custom FEN.
 */
export function detectOpening(
  history: readonly (string | { san: string })[],
  startFen?: string | null,
): EcoOpening | null {
  if (history.length === 0) return null;
  if (startFen && startFen.split(" ")[0] !== STANDARD_START_PLACEMENT) {
    return null;
  }

  const played = history
    .slice(0, 24)
    .map((item) => normalizeSanToken(typeof item === "string" ? item : item.san));

  for (const entry of PARSED_ENTRIES) {
    if (played.length < entry.tokens.length) continue;
    let matches = true;
    for (let i = 0; i < entry.tokens.length; i++) {
      if (played[i] !== entry.tokens[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      const label = entry.variation
        ? `${entry.code} · ${entry.name}, ${entry.variation}`
        : `${entry.code} · ${entry.name}`;
      return {
        code: entry.code,
        name: entry.name,
        ...(entry.variation ? { variation: entry.variation } : {}),
        label,
      };
    }
  }

  return null;
}
