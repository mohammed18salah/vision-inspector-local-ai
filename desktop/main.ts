import { app, BrowserWindow, dialog, ipcMain, net, protocol } from "electron";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHistoryEntry, parseHistoryEntry, sanitizeHistoryInput, type LocalHistoryEntry } from "./history-core";

protocol.registerSchemesAsPrivileged([
  { scheme: "vision-media", privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: "vision-model", privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

type LocalAsset = { path: string; mime: string };
const selectedAssets = new Map<string, LocalAsset>();
const HISTORY_LIMIT = 100;
let historyQueue: Promise<void> = Promise.resolve();

function historyFilePath() { return path.join(app.getPath("userData"), "vision-inspector-history.json"); }

async function readHistory(): Promise<LocalHistoryEntry[]> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(historyFilePath(), "utf8"));
    return Array.isArray(value) ? value.map(parseHistoryEntry).filter((entry): entry is LocalHistoryEntry => entry !== null).slice(0, HISTORY_LIMIT) : [];
  } catch { return []; }
}

async function writeHistory(entries: LocalHistoryEntry[]) {
  const destination = historyFilePath();
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(temporary, JSON.stringify(entries.slice(0, HISTORY_LIMIT), null, 2), "utf8");
  await fs.rename(temporary, destination);
}

function queueHistory<T>(work: () => Promise<T>) {
  const result = historyQueue.then(work, work);
  historyQueue = result.then(() => undefined, () => undefined);
  return result;
}

function mediaMime(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if ([".mp4", ".m4v"].includes(extension)) return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".png") return "image/png";
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

function registerAsset(filePath: string) {
  const token = randomUUID();
  selectedAssets.set(token, { path: filePath, mime: mediaMime(filePath) });
  return `vision-media://local/${token}`;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 680,
    title: "Vision Inspector Local AI",
    backgroundColor: "#101317",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#171B21", symbolColor: "#dce7f1", height: 36 },
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (app.isPackaged) void window.loadFile(path.join(import.meta.dirname, "renderer", "index.html"));
  else void window.loadURL("http://127.0.0.1:5174");
}

app.whenReady().then(async () => {
  protocol.handle("vision-model", async (request) => {
    const relativePath = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
    const allowedModels = ["Xenova/yolos-tiny/", "onnx-community/grounding-dino-tiny-ONNX/"];
    if (!allowedModels.some((model) => relativePath.startsWith(model)) || !relativePath.includes("/resolve/main/")) {
      return new Response("Model path is not allowed", { status: 403 });
    }
    try {
      const headers = new Headers();
      const range = request.headers.get("range");
      if (range) headers.set("range", range);
      const upstream = await net.fetch(`https://huggingface.co/${relativePath}`, { headers });
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set("access-control-allow-origin", "*");
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch {
      return new Response("Unable to download model artifact", { status: 502 });
    }
  });

  protocol.handle("vision-media", async (request) => {
    const token = new URL(request.url).pathname.replace(/^\//, "");
    const asset = selectedAssets.get(token);
    if (!asset || !existsSync(asset.path)) return new Response("Not found", { status: 404 });
    const response = await net.fetch(pathToFileURL(asset.path).toString());
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", "*");
    headers.set("content-type", asset.mime);
    return new Response(response.body, { status: response.status, headers });
  });

  ipcMain.handle("vision:pick-media", async (_event, kind: "image" | "video") => {
    const result = await dialog.showOpenDialog({
      title: kind === "image" ? "اختيار صورة للتحليل" : "اختيار فيديو للتتبع",
      properties: ["openFile"],
      filters: kind === "image"
        ? [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }]
        : [{ name: "Videos", extensions: ["mp4", "webm", "mov", "m4v"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const stats = await fs.stat(filePath);
    return { name: path.basename(filePath), size: stats.size, path: filePath, url: registerAsset(filePath) };
  });

  // Development-only smoke path. The packaged app never exposes arbitrary paths
  // to the renderer; this handler returns a single developer-supplied file only.
  ipcMain.handle("vision:smoke-media", async () => {
    const filePath = process.env.VISION_INSPECTOR_SMOKE_FILE;
    if (app.isPackaged || !filePath || !existsSync(filePath) || !["image/png", "image/jpeg", "image/webp"].includes(mediaMime(filePath))) return null;
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);
    return { name: path.basename(filePath), size: stats.size, path: filePath, url: `data:${mediaMime(filePath)};base64,${content.toString("base64")}` };
  });

  ipcMain.handle("vision:save-result", async (_event, request: { name: string; content: string; filters: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showSaveDialog({ title: "حفظ نتيجة التحليل", defaultPath: request.name, filters: request.filters });
    if (result.canceled || !result.filePath) return { saved: false };
    await fs.writeFile(result.filePath, request.content, "utf8");
    const checksum = createHash("sha256").update(request.content).digest("hex");
    return { saved: true, path: result.filePath, checksum };
  });

  ipcMain.handle("vision:history-list", () => queueHistory(readHistory));
  ipcMain.handle("vision:history-add", (_event, request: unknown) => queueHistory(async () => {
    const input = sanitizeHistoryInput(request);
    if (!input) throw new Error("Invalid local history record");
    const entry = createHistoryEntry(input, randomUUID(), new Date().toISOString());
    const next = [entry, ...(await readHistory())].slice(0, HISTORY_LIMIT);
    await writeHistory(next);
    return entry;
  }));
  ipcMain.handle("vision:history-remove", (_event, id: unknown) => queueHistory(async () => {
    if (typeof id !== "string") throw new Error("Invalid history id");
    const history = await readHistory();
    const next = history.filter((entry) => entry.id !== id);
    if (next.length !== history.length) await writeHistory(next);
    return { removed: next.length !== history.length };
  }));
  ipcMain.handle("vision:history-clear", () => queueHistory(async () => {
    await writeHistory([]);
    return { cleared: true };
  }));

  ipcMain.handle("vision:device", async () => {
    const gpuFeatures = app.getGPUFeatureStatus();
    const gpuInfo = await app.getGPUInfo("basic").catch(() => null);
    return {
      platform: process.platform,
      arch: process.arch,
      appVersion: app.getVersion(),
      hardwareAcceleration: app.isHardwareAccelerationEnabled(),
      gpuFeatures,
      gpuInfo,
    };
  });

  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
