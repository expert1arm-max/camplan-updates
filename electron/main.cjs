const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("fs/promises");

const isDev = !app.isPackaged;
const devUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
let server;

function getMimeType(filePath) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

async function startProductionServer() {
  const serverEntryPath = path.join(app.getAppPath(), "dist", "server", "index.js");
  const clientDir = path.join(app.getAppPath(), "dist", "client");
  const mod = await import(pathToFileURL(serverEntryPath).href);
  const worker = mod.default;

  server = http.createServer(async (req, res) => {
    try {
      const origin = `http://${req.headers.host || "127.0.0.1"}`;
      const url = new URL(req.url || "/", origin);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(", "));
        }
      }

      const pathname = url.pathname;
      if (pathname.startsWith("/assets/") || pathname === "/.assetsignore") {
        const assetPath = path.join(clientDir, pathname.slice(1));
        try {
          const buffer = await fs.readFile(assetPath);
          res.statusCode = 200;
          res.setHeader("content-type", getMimeType(assetPath));
          res.end(buffer);
          return;
        } catch {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
      }

      const request = new Request(url, {
        method: req.method,
        headers,
      });
      const response = await worker.fetch(request, {}, { waitUntil() {} });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (!response.body) {
        res.end();
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      res.end(buffer);
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.stack || error.message : "Unknown error");
    }
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 1040,
    minWidth: 1320,
    minHeight: 820,
    backgroundColor: "#0f172a",
    title: "CCTV Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  const port = await startProductionServer();
  await win.loadURL(`http://127.0.0.1:${port}`);
}

app.setAppUserModelId("com.camplan.cctvmanager");

app.whenReady().then(() => {
  ipcMain.handle("dialog:open-json", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return fs.readFile(result.filePaths[0], "utf-8");
  });

  ipcMain.handle("dialog:save-text", async (_event, payload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload?.defaultPath ?? "export.txt",
      filters: payload?.filters ?? [{ name: "Text", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    await fs.writeFile(result.filePath, String(payload?.content ?? ""), "utf-8");
    return true;
  });

  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (server) {
    server.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
