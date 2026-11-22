import { createFileRoute } from "@tanstack/react-router";

import { PlayPage } from "@/features/play/PlayPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProChess — Профессиональный шахматный терминал" },
      {
        name: "description",
        content:
          "Профессиональная шахматная платформа ProChess со Stockfish 19, голосовым ИИ-тренером, 3-уровневыми подсказками и лабораторией анализа.",
      },
      { property: "og:title", content: "ProChess — Профессиональный шахматный терминал" },
      {
        property: "og:description",
        content: "ProChess — игра против Stockfish 19, ИИ-тренер и живая аналитика позиции.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});
