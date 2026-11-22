import { createFileRoute } from "@tanstack/react-router";

import { PlayPage } from "@/features/play/PlayPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHESS STUDIO — игра против Stockfish" },
      {
        name: "description",
        content:
          "Сыграйте полноценную партию против шахматного движка Stockfish прямо в браузере: пять уровней сложности, часы, подсказки и отмена ходов.",
      },
      { property: "og:title", content: "CHESS STUDIO — игра против Stockfish" },
      {
        property: "og:description",
        content: "Полноценная шахматная партия против настоящего Stockfish в браузере.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});
