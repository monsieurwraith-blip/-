<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- All chess rules and game state go through chess.js (`src/hooks/useChessGame.ts`); never re-implement move legality in UI code — one source of truth.
- Stockfish runs only in a Web Worker via `src/lib/engine/stockfishEngine.ts` (serialized UCI queue, `stop()` cancels stale searches) — prevents overlapping searches and moves for old positions.
- Engine files are served from `public/stockfish/` (single-threaded lite WASM, refreshed with `bun run engine:copy`) — no CDN and no cross-origin isolation needed.
- Pure logic lives in `src/lib/chess/*` with unit tests; React hooks wrap it; feature screens live in `src/features/<feature>/` — keeps the board and engine reusable for future analysis, puzzles and online play.
- Show only implemented features in the UI — no placeholder sections, fake ELO or dead menu items.
- User settings live in one versioned object (`src/lib/settings/settings.ts`, parsed field by field) behind `SettingsProvider`; board/piece/sound code reads only from it — one place to persist and reset.
- Sound effects are synthesized with Web Audio (`src/lib/sound/synth.ts`); which clip plays is decided by pure functions in `src/lib/sound/gameSounds.ts` — works offline in the desktop app with no audio files.
- Glass/Marble piece sets are CSS materials masked onto a bundled SVG set (`PieceImage` + `.piece-material`), not separate artwork — any new material set only needs tokens in styles.css.
- Asset URLs use `import.meta.env.BASE_URL` — the same code serves the web app and the Electron renderer.
- The Windows app (Electron) loads a separate client-only bundle (`vite.desktop.config.ts`, entry `src/desktop/main.tsx`) staged by `scripts/desktop-build.mjs` into `desktop-dist/app` with no node_modules, served via the privileged `app://` scheme — keeps Workers/WASM/localStorage working and the web build untouched.
- Screens are page components in `src/features/*` shared by file routes and the desktop hash router — add new screens there, then register them in both.
