import { AppHeader } from "@/components/layout/AppHeader";

import { PlayScreen } from "./PlayScreen";

/** The "play against Stockfish" page, shared by the web route and the desktop app. */
export function PlayPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <PlayScreen />
    </div>
  );
}
