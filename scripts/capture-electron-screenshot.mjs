import { mkdir, writeFile } from "node:fs/promises";

const debugPort = Number(process.env.ELECTRON_DEBUG_PORT ?? 9234);
const output = process.env.ELECTRON_SCREENSHOT_PATH ?? "docs/screenshots/windows-desktop-home.png";

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const requestId = ++id;
      socket.send(JSON.stringify({ id: requestId, method, params }));
      return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const page = pages.find((target) => target.type === "page" && target.url.includes("5174"));
if (!page) throw new Error("لم يتم العثور على نافذة Electron لالتقاط الصورة.");
const client = await connect(page.webSocketDebuggerUrl);
await client.send("Page.enable");
const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
await mkdir(new URL(".", new URL(`file://${process.cwd()}/${output}`)), { recursive: true }).catch(() => undefined);
await writeFile(output, Buffer.from(shot.data, "base64"));
console.log(output);
client.close();
