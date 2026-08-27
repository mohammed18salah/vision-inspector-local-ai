const debugPort = Number(process.env.ELECTRON_DEBUG_PORT ?? 9234);
const videoPath = process.env.ELECTRON_VIDEO_FILE;

if (!videoPath) throw new Error("Set ELECTRON_VIDEO_FILE to a local MP4/WebM fixture before running this verification.");

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const response = JSON.parse(String(event.data));
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
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
if (!page) throw new Error("Electron renderer is not running.");
const client = await connect(page.webSocketDebuggerUrl);

await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('تحليل فيديو'))?.click()" });
const documentRoot = await client.send("DOM.getDocument");
const input = await client.send("DOM.querySelector", { nodeId: documentRoot.root.nodeId, selector: "input[type=file]" });
await client.send("DOM.setFileInputFiles", { files: [videoPath], nodeId: input.nodeId });
await new Promise((resolve) => setTimeout(resolve, 2500));
await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('ابدأ التتبع'))?.click()" });
await new Promise((resolve) => setTimeout(resolve, Number(process.env.ELECTRON_VIDEO_WAIT_MS ?? 30000)));

const response = await client.send("Runtime.evaluate", {
  expression: `(() => {
    const video = document.querySelector("video");
    return {
      root: document.querySelector(".desktop-shell")?.className,
      status: document.querySelector(".desktop-status-line span")?.textContent?.trim(),
      stageStatus: document.querySelector(".fs-status")?.textContent?.trim(),
      tracks: Array.from(document.querySelectorAll(".desktop-track")).map((item) => item.textContent?.replace(/\\s+/g, " ").trim()),
      overlayBoxes: document.querySelectorAll(".desktop-box").length,
      video: video ? { readyState: video.readyState, width: video.videoWidth, height: video.videoHeight, duration: video.duration, currentTime: video.currentTime, muted: video.muted, paused: video.paused, volume: video.volume } : null,
    };
  })()`,
  returnByValue: true,
});
console.log(JSON.stringify(response.result.value, null, 2));
client.close();
