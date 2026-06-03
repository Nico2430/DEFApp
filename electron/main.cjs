const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

Menu.setApplicationMenu(null);

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
let mainWindow = null;
let updateCheckInProgress = false;

async function checkForUpdates(win, manual = false) {
  if (!app.isPackaged) {
    if (manual) {
      await dialog.showMessageBox(win, {
        type: "info",
        title: "Actualizacion de app",
        message: "La actualizacion de la app solo funciona en la version instalada."
      });
    }
    return { skipped: true };
  }

  if (updateCheckInProgress) return { checking: true };
  updateCheckInProgress = true;

  try {
    const result = await autoUpdater.checkForUpdates();
    return { version: result?.updateInfo?.version };
  } catch (error) {
    console.error("Update check failed:", error);
    if (manual) {
      await dialog.showMessageBox(win, {
        type: "error",
        title: "No se pudo buscar actualizaciones",
        message: "No se pudo consultar GitHub para buscar actualizaciones.",
        detail: error?.message || String(error)
      });
    }
    return { error: error?.message || String(error) };
  } finally {
    updateCheckInProgress = false;
  }
}

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

  autoUpdater.on("update-not-available", async () => {
    if (autoUpdater.manualCheck) {
      await dialog.showMessageBox(win, {
        type: "info",
        title: "DEFApp esta actualizada",
        message: "Ya tenes instalada la ultima version disponible."
      });
      autoUpdater.manualCheck = false;
    }
  });

  win.webContents.once("did-finish-load", () => {
    checkForUpdates(win, false);
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
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow = win;

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  setupAutoUpdater(win);
}

app.whenReady().then(createWindow);

ipcMain.handle("app:check-for-updates", async () => {
  if (mainWindow && app.isPackaged) autoUpdater.manualCheck = true;
  return checkForUpdates(mainWindow, true);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
