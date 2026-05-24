const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cctvDesktop", {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getLatestReleaseVersion: () => ipcRenderer.invoke("app:get-latest-release-version"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  checkAndDownloadUpdate: () => ipcRenderer.invoke("app:check-and-download-update"),
  launchDownloadedUpdate: () => ipcRenderer.invoke("app:launch-downloaded-update"),
  onUpdateEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("app:update-event", listener);
    return () => ipcRenderer.removeListener("app:update-event", listener);
  },
  openJsonFile: () => ipcRenderer.invoke("dialog:open-json"),
  openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
  saveTextFile: (payload) => ipcRenderer.invoke("dialog:save-text", payload),
  saveBinaryFile: (payload) => ipcRenderer.invoke("dialog:save-binary", payload),
});
