const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("defapp", {
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates")
});
