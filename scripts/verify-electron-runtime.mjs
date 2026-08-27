const debugPort = Number(process.env.ELECTRON_DEBUG_PORT ?? 9234);

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let id = 0; const pending = new Map();
  socket.addEventListener("message", (event) => { const message = JSON.parse(String(event.data)); const request = pending.get(message.id); if (!request) return; pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); });
  return { send(method, params = {}) { const requestId = ++id; socket.send(JSON.stringify({ id: requestId, method, params })); return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject })); }, close() { socket.close(); } };
}

const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const page = pages.find((target) => target.type === "page" && target.url.includes("5174"));
if (!page) throw new Error("Electron renderer is not running.");
const client = await connect(page.webSocketDebuggerUrl);
if (process.env.ELECTRON_TRIGGER_ANALYSIS === "1") {
  await client.send("Runtime.evaluate", { expression: "Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('ابدأ التحليل'))?.click()" });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.ELECTRON_ANALYSIS_WAIT_MS ?? 180000)));
}
const response = await client.send("Runtime.evaluate", { expression: "(async () => { const paths = ['config.json','preprocessor_config.json','onnx/model.onnx','onnx/model_quantized.onnx','onnx/model_q8.onnx']; const modelProbe = await Promise.all(paths.map(async (path) => { try { const response = await fetch('vision-model://models/Xenova/yolos-tiny/resolve/main/' + path, { headers: { Range: 'bytes=0-31' } }); return { path, ok: response.ok, status: response.status, contentRange: response.headers.get('content-range'), type: response.headers.get('content-type') }; } catch (error) { return { path, error: String(error) }; } })); const source = document.querySelector('.desktop-media')?.src; const mediaProbe = source ? await fetch(source).then(async (response) => ({ ok: response.ok, status: response.status, type: response.headers.get('content-type'), length: (await response.arrayBuffer()).byteLength })).catch((error) => ({ error: String(error) })) : null; return { bridge: Boolean(window.visionDesktop), device: await window.visionDesktop?.getDevice(), root: document.querySelector('.desktop-shell')?.className, mode: document.querySelector('.nav-active')?.textContent?.trim(), file: document.querySelector('.stage-file')?.textContent?.trim(), mediaSource: source?.slice(0, 60), status: document.querySelector('.desktop-status-line span')?.textContent?.trim(), detections: Array.from(document.querySelectorAll('.desktop-result strong')).map((item) => item.textContent?.trim()), ocr: document.querySelector('.ocr-zone p')?.textContent?.trim(), mediaProbe, modelProbe, modelRequests: performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('vision-model') || name.includes('huggingface')).slice(-12) }; })()", awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(response.result.value, null, 2));
client.close();
