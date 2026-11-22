/**
 * Windows packaging for CHESS STUDIO.
 *   npm run desktop:dist  →  release/Chess Studio Setup <version>.exe   (installer)
 *                            release/Chess Studio Portable <version>.exe (no install)
 * Packages the staged folder desktop-dist/app (see scripts/desktop-build.mjs).
 */
const electronVersion = require("electron/package.json").version;

module.exports = {
  appId: "app.chessstudio.desktop",
  productName: "CHESS STUDIO",
  executableName: "CHESS STUDIO",
  copyright: "CHESS STUDIO",
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
    artifactName: "Chess Studio Setup ${version}.${ext}",
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    shortcutName: "CHESS STUDIO",
    uninstallDisplayName: "CHESS STUDIO",
    installerIcon: "desktop/build/icon.ico",
    uninstallerIcon: "desktop/build/icon.ico",
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
  },
  portable: {
    artifactName: "Chess Studio Portable ${version}.${ext}",
  },
};
