/**
 * Named Bot Opponents Roster (400 – 2800 ELO) with distinct personalities,
 * Stockfish strength mapping, preferred opening lines, portraits, and dialogue lines.
 */
import aggressiveImg from "@/assets/images/char_aggressive_portrait_1795462404688.jpg";
import darkGmImg from "@/assets/images/char_dark_gm_portrait_1795462406583.jpg";
import defenderImg from "@/assets/images/char_defender_portrait_1795462404938.jpg";
import kingImg from "@/assets/images/char_king_portrait_1795462404541.jpg";
import legendImg from "@/assets/images/char_legend_portrait_1795462406691.jpg";
import tacticianImg from "@/assets/images/char_tactician_portrait_1795462402562.jpg";
import analystImg from "@/assets/images/coach_analyst_portrait_1795460268641.jpg";
import grandmasterImg from "@/assets/images/coach_grandmaster_portrait_1795460268275.jpg";
import mentorImg from "@/assets/images/coach_mentor_portrait_1795460270533.jpg";
import professorImg from "@/assets/images/coach_professor_portrait_1795460270530.jpg";

import { Chess } from "chess.js";

import type { DifficultyId } from "./difficulty";
import type { PlayStyleId } from "@/lib/settings/settings";

export type BotId =
  | "misha_400"
  | "katya_800"
  | "oleg_1150"
  | "artem_1450"
  | "maxim_1750"
  | "dmitry_2100"
  | "viktor_2450"
  | "mentor_2800";

export interface NamedBot {
  id: BotId;
  name: string;
  title: string;
  elo: number;
  difficulty: DifficultyId;
  skillLevel: number;
  depth: number | null;
  playStyle: PlayStyleId;
  portrait: string;
  accentHex: string;
  favoriteOpening: string;
  styleTag: string;
  bio: string;
  /** Preferred early UCI moves keyed by piece-placement+turn prefix for thematic openings. */
  openingBook: Record<string, readonly string[]>;
  quotes: {
    start: string;
    capture: string;
    check: string;
    win: string;
    loss: string;
  };
}

export const NAMED_BOTS: readonly NamedBot[] = [
  {
    id: "misha_400",
    name: "Миша",
    title: "Новичок клуба",
    elo: 400,
    difficulty: "novice",
    skillLevel: 0,
    depth: 1,
    playStyle: "random",
    portrait: professorImg,
    accentHex: "#94A3B8",
    favoriteOpening: "Дебют королевской пешки (1. e4)",
    styleTag: "Импульсивный",
    bio: "Любит быстро двигать крайние пешки и иногда оставляет фигуры без защиты.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4", "d2d4", "a2a3"],
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["e7e5", "c7c5", "a7a6"],
    },
    quotes: {
      start: "Привет! Я только учусь, давай сыграем бодрую партию!",
      capture: "Ого, получилось забрать фигуру!",
      check: "Шах! Надеюсь, я не зевнул ответ…",
      win: "Ух ты, я выиграл! Попробуешь реванш?",
      loss: "Отличная игра! Покажешь мне потом, где я ошибся?",
    },
  },
  {
    id: "katya_800",
    name: "Николай «Искра»",
    title: "Смелый любитель",
    elo: 800,
    difficulty: "easy",
    skillLevel: 2,
    depth: 2,
    playStyle: "aggressive",
    portrait: aggressiveImg,
    accentHex: "#F59E0B",
    favoriteOpening: "Итальянская партия",
    styleTag: "Атакующий",
    bio: "Ищет ранние атаки на пункт f7 и обожает открытые линии к королю.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4"],
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b": ["b8c6"],
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w": ["f1c4"],
    },
    quotes: {
      start: "Готовь короля — я сегодня иду в атаку с первых ходов!",
      capture: "Забираю без колебаний! Натиск нарастает!",
      check: "Шах! Проверяю прочность твоей крепости!",
      win: "Натиск сработал! В следующий раз укрепляй f7.",
      loss: "Хорошая защита! Ты охладил мой штурм.",
    },
  },
  {
    id: "oleg_1150",
    name: "Олег Громов",
    title: "Бастион",
    elo: 1150,
    difficulty: "easy",
    skillLevel: 5,
    depth: 4,
    playStyle: "defender",
    portrait: defenderImg,
    accentHex: "#60A5FA",
    favoriteOpening: "Защита Каро-Канн",
    styleTag: "Надёжный",
    bio: "Строит крепкие пешечные бастионы, редко рискует и ждёт вашей неточности.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["c7c6"],
      "rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b": ["d7d5"],
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["d2d4", "c2c4"],
    },
    quotes: {
      start: "Спешить некуда. Крепкий центр и безопасность короля решают всё.",
      capture: "Аккуратный размен в мою пользу.",
      check: "Профилактический шах — посмотрим, где укроется ваш король.",
      win: "Крепость выстояла. Твоя атака разбилась о точную защиту.",
      loss: "Браво! Тебе удалось пробить даже мою оборону.",
    },
  },
  {
    id: "artem_1450",
    name: "Артём Лебедев",
    title: "Аналитик",
    elo: 1450,
    difficulty: "medium",
    skillLevel: 8,
    depth: 6,
    playStyle: "solid",
    portrait: analystImg,
    accentHex: "#22D3EE",
    favoriteOpening: "Лондонская система",
    styleTag: "Системный",
    bio: "Играет дисциплинированно по структуре, любит Лондонскую систему и точные размены.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["d2d4"],
      "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w": ["c1f4", "g1f3"],
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b": ["g8f6", "d7d5"],
    },
    quotes: {
      start: "Начинаю расчёт структуры. Держи точность выше 85%!",
      capture: "Оптимальный размен по материалу и структуре.",
      check: "Шах фиксирует инициативу. Проверяем доступные отходы.",
      win: "Позиционный перевес переведён в победу без лишнего риска.",
      loss: "Высокая точность! По графику оценки ты переиграл меня по делу.",
    },
  },
  {
    id: "maxim_1750",
    name: "Максим Воронцов",
    title: "Тактик арены",
    elo: 1750,
    difficulty: "strong",
    skillLevel: 12,
    depth: 9,
    playStyle: "tactician",
    portrait: tacticianImg,
    accentHex: "#38BDF8",
    favoriteOpening: "Сицилианская защита (Дракон)",
    styleTag: "Комбинатор",
    bio: "Обожает острые осложнения, связки, вилки и тактические перестрелки в миттельшпиле.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["c7c5"],
      "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b": ["d7d6", "b8c6"],
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4"],
    },
    quotes: {
      start: "Осторожнее с висячими фигурами — я ищу комбинации на каждом ходу!",
      capture: "Видишь связку? Материал уходит в мою пользу!",
      check: "Темповый шах! Считай на два хода вперёд.",
      win: "Тактический расчёт не подвёл — красивая развязка!",
      loss: "Мощно! Ты удержал все тактические угрозы и нашёл контригру.",
    },
  },
  {
    id: "dmitry_2100",
    name: "Дмитрий Орлов",
    title: "Тёмный гроссмейстер",
    elo: 2100,
    difficulty: "strong",
    skillLevel: 15,
    depth: 12,
    playStyle: "counter",
    portrait: darkGmImg,
    accentHex: "#D97706",
    favoriteOpening: "Староиндийская защита",
    styleTag: "Контратакующий",
    bio: "Ждёт перегиба с вашей стороны и наносит сокрушительный удар на королевском фланге.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b": ["g8f6"],
      "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b": ["g7g6"],
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["c2c4", "d2d4"],
    },
    quotes: {
      start: "Малейшая неточность — и инициатива перейдёт ко мне.",
      capture: "Расплата за поспешный выпад.",
      check: "Король под прицелом — пространство для манёвра сужается.",
      win: "Контратака сработала безупречно.",
      loss: "Достойно. Ты не оставил мне ни единого шанса на контригру.",
    },
  },
  {
    id: "viktor_2450",
    name: "Виктор Соколов",
    title: "Международный гроссмейстер",
    elo: 2450,
    difficulty: "expert",
    skillLevel: 18,
    depth: 15,
    playStyle: "grandmaster",
    portrait: grandmasterImg,
    accentHex: "#16C784",
    favoriteOpening: "Испанская партия (Руй Лопес)",
    styleTag: "Универсал ГМ",
    bio: "Мастер классического позиционного давления и хирургически точной реализации эндшпиля.",
    openingBook: {
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4"],
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w": ["f1b5"],
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["e7e5"],
    },
    quotes: {
      start: "Сыграем серьёзную турнирную партию. Каждая пешка имеет значение.",
      capture: "Упрощение выгодно стороне с лучшей структурой.",
      check: "Точный промежуточный шах.",
      win: "Классическая реализация преимущества. Разберите эндшпиль в лаборатории.",
      loss: "Блестящая партия! Вы играли на уровне гроссмейстера.",
    },
  },
  {
    id: "mentor_2800",
    name: "Ментор V-19",
    title: "Абсолют Stockfish",
    elo: 2800,
    difficulty: "expert",
    skillLevel: 20,
    depth: null,
    playStyle: "balanced",
    portrait: mentorImg,
    accentHex: "#2DD4BF",
    favoriteOpening: "Испанская / Сицилианская (Теория)",
    styleTag: "Максимум Эло",
    bio: "Полная вычислительная мощность Stockfish 19 без искусственных ограничений.",
    openingBook: {},
    quotes: {
      start: "Модуль V-19 в боевом режиме. Максимальная глубина расчёта активна.",
      capture: "Оптимальное материальное преобразование.",
      check: "Форсирующий шаг зафиксирован.",
      win: "Вычислительное превосходство реализовано.",
      loss: "Невероятно! Вы превзошли 2800 Эло.",
    },
  },
];

export const BONUS_LEGEND_PORTRAIT = legendImg;
export const KING_PORTRAIT = kingImg;

export function getBotById(id: string | null | undefined): NamedBot | null {
  if (!id) return null;
  return NAMED_BOTS.find((b) => b.id === id) ?? null;
}

export function isBotId(value: unknown): value is BotId {
  return NAMED_BOTS.some((b) => b.id === value);
}

/** Picks a legal thematic opening book move for the selected bot during the opening, if configured. */
export function pickBotBookMove(bot: NamedBot, fen: string): string | null {
  const parts = fen.split(" ");
  const key = `${parts[0]} ${parts[1]}`;
  const candidates = bot.openingBook[key];
  if (!candidates || candidates.length === 0) return null;

  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  for (const uci of shuffled) {
    const found = legal.find((m) => `${m.from}${m.to}${m.promotion ?? ""}` === uci);
    if (found) return uci;
  }
  return null;
}
