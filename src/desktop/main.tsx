/**
 * Renderer entry for the Windows desktop app (Electron). Client-only: no SSR, no
 * network — fonts are bundled and every file is served from the app package.
 * Screens are shared with the web app; only the router setup differs.
 */
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/instrument-serif";
import "@/styles.css";

import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PlayPage } from "@/features/play/PlayPage";
import { SettingsProvider } from "@/features/settings/SettingsProvider";

const rootRoute = createRootRoute({
  component: () => (
    <SettingsProvider loadImmediately>
      <Outlet />
    </SettingsProvider>
  ),
});

const playRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: PlayPage });

const router = createRouter({
  routeTree: rootRoute.addChildren([playRoute]),
  history: createHashHistory(),
});

const container = document.getElementById("root");
if (!container) throw new Error("Root element missing");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
