const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cctvDesktop", {
  platform: process.platform,
  openJsonFile: () => ipcRenderer.invoke("dialog:open-json"),
  saveTextFile: (payload) => ipcRenderer.invoke("dialog:save-text", payload),
});
