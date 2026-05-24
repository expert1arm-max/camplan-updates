const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron");
const http = require("node:http");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createWriteStream, existsSync, appendFileSync, writeFileSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const fs = require("fs/promises");

const isDev = !app.isPackaged;
const devUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";
const localUserDataDir = path.resolve(process.cwd(), ".electron-data");
const githubReleaseRepoFallback = {
  owner: "expert1arm-max",
  repo: "camplan-updates",
};
const updateDebugLogPath = path.join(os.tmpdir(), "CamPlanUpdateDebug.log");
const updateErrorLogPath = path.join(os.tmpdir(), "CamPlanUpdateError.log");
const updateLauncherPath = path.join(os.tmpdir(), "CamPlanUpdateLauncher.cmd");
let server;
let mainWindow;
let pendingDownloadedInstaller = null;
const updateInstallLogPrefix = "[update-install]";

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("use-angle", "swiftshader");
app.commandLine.appendSwitch("user-data-dir", localUserDataDir);
app.commandLine.appendSwitch("disk-cache-dir", path.join(localUserDataDir, "Cache"));
app.disableHardwareAcceleration();
app.setPath("appData", path.join(localUserDataDir, "AppData"));
app.setPath("userData", localUserDataDir);
app.setPath("sessionData", path.join(localUserDataDir, "Session Data"));
app.setPath("cache", path.join(localUserDataDir, "Cache"));

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
    title: "CamPlan",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow = win;

  if (isDev) {
    win.setMenuBarVisibility(false);
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  win.setMenuBarVisibility(false);
  const port = await startProductionServer();
  await win.loadURL(`http://127.0.0.1:${port}`);
}

function sendUpdateEvent(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("app:update-event", payload);
}

let packageConfig;

function getPackageConfig() {
  if (!packageConfig) {
    packageConfig = require(path.join(app.getAppPath(), "package.json"));
  }

  return packageConfig;
}

function getGithubReleaseRepo() {
  const envOwner = String(process.env.CAMPLAN_UPDATE_REPO_OWNER || "").trim();
  const envRepo = String(process.env.CAMPLAN_UPDATE_REPO_NAME || "").trim();

  if (envOwner && envRepo) {
    return { owner: envOwner, repo: envRepo };
  }

  const publish = getPackageConfig()?.build?.publish;
  const firstPublish = Array.isArray(publish) ? publish[0] : null;
  const owner = firstPublish?.owner;
  const repo = firstPublish?.repo;

  if (!owner || !repo) {
    return githubReleaseRepoFallback;
  }

  return { owner, repo };
}

function normalizeReleaseVersion(tagName, name) {
  const raw = String(tagName || name || "").trim();
  return raw.replace(/^v/i, "");
}

async function fetchLatestGithubRelease() {
  const repo = getGithubReleaseRepo();
  if (!repo) {
    return { state: "error", message: "Не найден репозиторий обновлений в package.json." };
  }

  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
  const controller = new AbortController();
  const timeoutMs = 7000;
  const timeoutId = setTimeout(() => controller.abort(new Error("GitHub API timeout")), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "CamPlan",
        "x-github-api-version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return {
        state: "error",
        message: `Не удалось получить релиз GitHub (${response.status}).`,
      };
    }

    const data = await response.json();
    const version = normalizeReleaseVersion(data.tag_name, data.name);
    const assets = Array.isArray(data.assets)
      ? data.assets
          .map((asset) => ({
            name: String(asset?.name || ""),
            browserDownloadUrl: String(asset?.browser_download_url || ""),
            size: Number(asset?.size || 0),
            contentType: String(asset?.content_type || ""),
          }))
          .filter((asset) => asset.name && asset.browserDownloadUrl)
      : [];

    if (!version) {
      return {
        state: "error",
        message: "GitHub release не содержит version/tag.",
      };
    }

    return {
      state: "available",
      version,
      tagName: data.tag_name,
      htmlUrl: data.html_url,
      assets,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        state: "error",
        message: "GitHub Releases не ответил за 7 секунд.",
      };
    }

    return {
      state: "error",
      message: error instanceof Error ? error.message : "Не удалось получить релиз GitHub.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickInstallerAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const exeAsset = assets.find((asset) => String(asset?.name || "").toLowerCase().endsWith(".exe"));
  return exeAsset || null;
}

function logUpdateInstall(...parts) {
  console.log(updateInstallLogPrefix, ...parts);
}

function logUpdateInstallError(...parts) {
  console.error(updateInstallLogPrefix, ...parts);
}

function appendUpdateTempLog(logPath, ...parts) {
  const line = `[${new Date().toISOString()}] ${parts.map((part) => String(part)).join(" ")}${os.EOL}`;
  appendFileSync(logPath, line, "utf8");
}

function logUpdateDebug(...parts) {
  appendUpdateTempLog(updateDebugLogPath, ...parts);
  logUpdateInstall(...parts);
}

function logUpdateError(...parts) {
  appendUpdateTempLog(updateErrorLogPath, ...parts);
  logUpdateInstallError(...parts);
}

function spawnDetachedProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: options.windowsHide ?? true,
    });

    child.once("spawn", () => {
      child.unref();
      resolve({ pid: child.pid ?? null });
    });
    child.once("error", reject);
  });
}

function normalizeAbsolutePath(targetPath) {
  const inputPath = String(targetPath || "").trim();
  if (!inputPath) {
    throw new Error("Путь к установщику не задан.");
  }

  const resolvedPath = path.resolve(inputPath);
  return path.isAbsolute(resolvedPath) ? resolvedPath : path.resolve(resolvedPath);
}

function buildLauncherCmdContent(installerPath) {
  return [
    "@echo off",
    "setlocal",
    "timeout /t 5 /nobreak >nul",
    `if not exist "${installerPath}" (`,
    `  echo Installer not found: "${installerPath}" > "${updateErrorLogPath}"`,
    "  pause",
    "  exit /b 1",
    ")",
    `start "" "${installerPath}"`,
    "exit /b 0",
    "",
  ].join(os.EOL);
}

async function launchInstallerAfterExit(targetPath) {
  const absoluteInstallerPath = normalizeAbsolutePath(targetPath);
  const absoluteCheck = path.isAbsolute(absoluteInstallerPath);
  const exists = existsSync(absoluteInstallerPath);

  logUpdateDebug("downloaded installer path:", absoluteInstallerPath);
  logUpdateDebug("launcher path:", updateLauncherPath);
  logUpdateDebug("selected launch method:", "temp-cmd-file");
  logUpdateDebug("path.isAbsolute:", String(absoluteCheck));
  logUpdateDebug("fs.existsSync:", String(exists));

  if (!absoluteCheck) {
    const message = `Путь к установщику должен быть абсолютным: ${absoluteInstallerPath}`;
    logUpdateError(message);
    throw new Error(message);
  }

  if (!exists) {
    const message = `Установщик не найден: ${absoluteInstallerPath}`;
    logUpdateError(message);
    throw new Error(message);
  }

  const stats = await fs.stat(absoluteInstallerPath);
  logUpdateDebug("installer size bytes:", String(stats.size));

  const launcherContent = buildLauncherCmdContent(absoluteInstallerPath);
  writeFileSync(updateLauncherPath, launcherContent, { encoding: "utf8" });
  logUpdateDebug("launcher cmd written:", updateLauncherPath);
  logUpdateDebug("launcher cmd content:", launcherContent);

  const result = await spawnDetachedProcess("cmd.exe", ["/c", updateLauncherPath], {
    windowsHide: true,
  });
  logUpdateDebug("launcher cmd spawn result:", `spawned pid=${result.pid ?? "unknown"}`);

  return {
    method: "cmd-file",
    path: absoluteInstallerPath,
    launcherPath: updateLauncherPath,
  };
}

async function downloadReleaseAsset(asset, version) {
  const downloadsDir = path.join(app.getPath("userData"), "updates");
  await fs.mkdir(downloadsDir, { recursive: true });

  const assetName = String(asset?.name || `CamPlan-Installer-${version}.exe`).trim();
  const downloadUrl = String(asset?.browserDownloadUrl || "").trim();

  if (!assetName) {
    throw new Error(`В релизе ${version} не удалось определить имя файла обновления.`);
  }

  if (!downloadUrl) {
    throw new Error(`В релизе ${version} не найдена ссылка на файл обновления.`);
  }

  const targetPath = path.join(downloadsDir, assetName);
  const response = await fetch(downloadUrl, {
    headers: {
      accept: "application/octet-stream",
      "user-agent": "CamPlan",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Не удалось скачать файл обновления (${response.status}).`);
  }

  const total = Number(response.headers.get("content-length") || asset.size || 0);
  let transferred = 0;
  const startedAt = Date.now();

  const progressStream = new Transform({
    transform(chunk, _encoding, callback) {
      transferred += chunk.length;
      const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
      const bytesPerSecond = transferred > 0 ? transferred / elapsedSeconds : 0;
      sendUpdateEvent({
        type: "progress",
        progress: {
          percent: total > 0 ? (transferred / total) * 100 : 0,
          transferred,
          total,
          bytesPerSecond,
        },
      });
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(response.body), progressStream, createWriteStream(targetPath));

  logUpdateDebug("downloaded installer saved to:", path.resolve(targetPath));

  return {
    path: path.resolve(targetPath),
    version,
  };
}

app.setAppUserModelId("com.camplan.cctvmanager");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:get-latest-release-version", async () => fetchLatestGithubRelease());

  ipcMain.handle("app:check-for-updates", async () => {
    const release = await fetchLatestGithubRelease();

    if (release.state === "available") {
      return {
        state: "available",
        version: release.version,
        message: `Доступна версия ${release.version} на GitHub Releases.`,
      };
    }

    return {
      state: "error",
      message: release.message || "Не удалось получить версию GitHub Releases.",
    };
  });

  ipcMain.handle("app:check-and-download-update", async () => {
    if (!app.isPackaged) {
      return {
        state: "disabled",
        message: "Проверка обновлений доступна в собранной версии приложения.",
      };
    }

    try {
      sendUpdateEvent({
        type: "checking",
        message: "Проверяем обновления на GitHub...",
      });

      const release = await fetchLatestGithubRelease();

      if (release.state !== "available" || !release.version) {
        const message = release.message || "Не удалось получить версию GitHub Releases.";
        sendUpdateEvent({ type: "error", message });
        return {
          state: "error",
          message,
        };
      }

      if (release.version === app.getVersion()) {
        const message = "Обновлено до последней версии.";
        sendUpdateEvent({ type: "not-available", message });
        return {
          state: "not-available",
          message,
        };
      }

      const updateVersion = release.version;
      const installerAsset = pickInstallerAsset(release);

      if (!installerAsset) {
        const message = `В релизе ${updateVersion} не найден Windows installer.`;
        sendUpdateEvent({ type: "error", message });
        return {
          state: "error",
          message,
        };
      }

      sendUpdateEvent({
        type: "available",
        version: updateVersion,
        message: `Найдена версия ${updateVersion}. Начинаем загрузку...`,
      });

      const downloaded = await downloadReleaseAsset(installerAsset, updateVersion);
      pendingDownloadedInstaller = {
        ...downloaded,
        launchScheduled: false,
      };

      const message = "Обновление скачано. Программа сейчас закроется и запустит установщик.";
      sendUpdateEvent({
        type: "downloaded",
        version: updateVersion,
        message,
      });

      return {
        state: "downloaded",
        message,
        version: updateVersion,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось проверить обновления.";
      sendUpdateEvent({ type: "error", message });
      return {
        state: "error",
        message,
      };
    }
  });

  ipcMain.handle("app:launch-downloaded-update", async () => {
    if (!app.isPackaged) {
      return {
        state: "disabled",
        message: "Запуск установщика доступен в собранной версии приложения.",
      };
    }

    if (!pendingDownloadedInstaller?.path) {
      return {
        state: "error",
        message: "Установщик для запуска не подготовлен.",
      };
    }

    if (pendingDownloadedInstaller.launchScheduled) {
      return {
        state: "error",
        message: "Установщик уже готовится к запуску.",
      };
    }

    pendingDownloadedInstaller.launchScheduled = true;
    const installerPath = normalizeAbsolutePath(pendingDownloadedInstaller.path);
    logUpdateDebug("launch requested");
    logUpdateDebug("downloaded installer path:", installerPath);

    try {
      const launchResult = await launchInstallerAfterExit(installerPath);
      logUpdateDebug("launch method completed:", launchResult.method);
      logUpdateDebug("launcher path launched:", launchResult.launcherPath);
      pendingDownloadedInstaller = null;
      setImmediate(() => {
        logUpdateDebug("app.exit(0) scheduled after installer launch");
        app.exit(0);
      });
    } catch (error) {
      logUpdateError("installer launch failed:", error instanceof Error ? error.message : error);
      pendingDownloadedInstaller.launchScheduled = false;
      const message = error instanceof Error ? error.message : "Не удалось запустить installer.";
      return {
        state: "error",
        message,
      };
    }

    return {
      state: "launching",
      message: "Программа закрывается и запускает установщик.",
    };
  });

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

  ipcMain.handle("shell:open-external", async (_event, url) => {
    const target = String(url ?? "").trim();
    if (!target) return false;
    await shell.openExternal(target);
    return true;
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

  ipcMain.handle("dialog:save-binary", async (_event, payload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload?.defaultPath ?? "export.jpg",
      filters: payload?.filters ?? [{ name: "JPEG", extensions: ["jpg", "jpeg"] }],
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    const dataUrl = String(payload?.dataUrl ?? "");
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
    if (!base64) return false;

    await fs.writeFile(result.filePath, Buffer.from(base64, "base64"));
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


