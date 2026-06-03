const { app, BrowserWindow, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

Menu.setApplicationMenu(null);

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function setupAutoUpdater(win) {
  if (!app.isPackaged) return;

  autoUpdater.on("update-available", async (info) => {
    const version = info.version ? ` ${info.version}` : "";
    const choice = await dialog.showMessageBox(win, {
      type: "info",
      buttons: ["Actualizar", "Mantener version actual"],
      defaultId: 0,
      cancelId: 1,
      title: "Actualizacion disponible",
      message: `Hay una nueva version${version} de DEFApp.`,
      detail: "Podés actualizar ahora o seguir usando la version instalada."
    });

    if (choice.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    const choice = await dialog.showMessageBox(win, {
      type: "info",
      buttons: ["Reiniciar e instalar", "Despues"],
      defaultId: 0,
      cancelId: 1,
      title: "Actualizacion lista",
      message: "La actualizacion ya se descargo.",
      detail: "Para instalarla, DEFApp se va a cerrar y abrir nuevamente."
    });

    if (choice.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto update error:", error);
  });

  win.webContents.once("did-finish-load", () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error("Update check failed:", error);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "DEFApp",
    icon: path.join(__dirname, "../public/logo-def.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  setupAutoUpdater(win);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
