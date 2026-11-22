/**
 * Windows packaging for ProChess.
 *   npm run desktop:dist  →  release/ProChess Setup <version>.exe   (installer)
 *                            release/ProChess Portable <version>.exe (no install)
 * Packages the staged folder desktop-dist/app (see scripts/desktop-build.mjs).
 */
const electronVersion = require("electron/package.json").version;

module.exports = {
  appId: "app.prochess.desktop",
  productName: "ProChess",
  executableName: "ProChess",
  copyright: "ProChess",
  electronVersion,
  directories: {
    app: "desktop-dist/app",
    output: "release",
    buildResources: "desktop/build",
  },
  // Everything is bundled by Vite; never ship the project's node_modules.
  files: ["**/*", "!**/node_modules/**"],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  win: {
    icon: "desktop/build/icon.ico",
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
  },
  nsis: {
    artifactName: "ProChess Setup ${version}.${ext}",
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    shortcutName: "ProChess",
    uninstallDisplayName: "ProChess",
    installerIcon: "desktop/build/icon.ico",
    uninstallerIcon: "desktop/build/icon.ico",
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
  },
  portable: {
    artifactName: "ProChess Portable ${version}.${ext}",
  },
};
