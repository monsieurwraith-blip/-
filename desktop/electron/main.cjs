/**
 * CHESS STUDIO — Electron main process.
 *
 * The renderer is a static bundle served from the custom `app://chess-studio/` scheme
 * (secure + standard), so absolute asset paths, Web Workers, WebAssembly (Stockfish)
 * and localStorage all behave exactly like on the web. No server or browser is needed.
 */
const { app, BrowserWindow, Menu, protocol, screen, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const SCHEME = "app";
const HOST = "chess-studio";
const APP_URL = `${SCHEME}://${HOST}/index.html`;
const RENDERER_DIR = path.join(__dirname, "renderer");
const INDEX_FILE = path.join(RENDERER_DIR, "index.html");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.setName("ProChess");
if (process.platform === "win32") app.setAppUserModelId("app.prochess.desktop");
// Move/capture sounds must play from the first move.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// ---------- Single instance: a second launch focuses the open window ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

// ---------- Window size/position, remembered between launches ----------
const stateFile = () => path.join(app.getPath("userData"), "window-state.json");
const DEFAULT_STATE = { width: 1360, height: 900, maximized: false };

function readWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    const state = { ...DEFAULT_STATE, ...s };
    if (typeof state.x === "number" && typeof state.y === "number") {
      // Drop the position if it is no longer on any connected display.
      const visible = screen
        .getAllDisplays()
        .some(
          ({ workArea: a }) =>
            state.x + 100 > a.x &&
            state.x < a.x + a.width - 100 &&
            state.y >= a.y - 10 &&
            state.y < a.y + a.height - 80,
        );
      if (!visible) {
        delete state.x;
        delete state.y;
      }
    }
    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveWindowState(win) {
  try {
    const bounds = win.getNormalBounds();
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify({ ...bounds, maximized: win.isMaximized() }));
  } catch {
    // Not critical: the window opens with default bounds next time.
  }
}

// ---------- app:// file server ----------
function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== HOST) return new Response("Not found", { status: 404 });
    const rel = decodeURIComponent(url.pathname);
    let file = path.normalize(path.join(RENDERER_DIR, rel === "/" ? "index.html" : rel));
    if (!file.startsWith(RENDERER_DIR)) return new Response("Forbidden", { status: 403 });
    try {
      if (!fs.statSync(file).isFile()) file = INDEX_FILE;
    } catch {
      file = INDEX_FILE;
    }
    try {
      const data = await fs.promises.readFile(file);
      const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      return new Response(data, { headers: { "content-type": type } });
    } catch (err) {
      return new Response(`Failed to read ${rel}: ${err}`, { status: 500 });
    }
  });
}

// ---------- Main window ----------
function createWindow() {
  const state = readWindowState();
  const iconPath = path.join(__dirname, "icon.png");
  const win = new BrowserWindow({
    ...state,
    minWidth: 900,
    minHeight: 640,
    title: "ProChess",
    backgroundColor: "#0B0D10",
    show: false,
    autoHideMenuBar: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  if (state.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());

  // Keep the window title fixed and the app inside its own origin.
  win.on("page-title-updated", (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  // F11 — full screen; Ctrl+Shift+I — developer tools (troubleshooting).
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  // Reload once if the renderer process dies, instead of leaving a blank window.
  let recovered = false;
  win.webContents.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit" || recovered) return;
    recovered = true;
    win.loadURL(APP_URL);
  });

  win.on("close", () => {
    saveWindowState(win);
    // Settings live in localStorage; make sure they are on disk before exit.
    session.defaultSession.flushStorageData();
  });

  void win.loadURL(APP_URL);
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
