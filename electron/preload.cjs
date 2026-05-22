const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cctvDesktop", {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  openJsonFile: () => ipcRenderer.invoke("dialog:open-json"),
  openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
  saveTextFile: (payload) => ipcRenderer.invoke("dialog:save-text", payload),
  saveBinaryFile: (payload) => ipcRenderer.invoke("dialog:save-binary", payload),
});
