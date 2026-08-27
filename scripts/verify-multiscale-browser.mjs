const targetUrl = process.env.VISION_TEST_URL ?? "http://localhost:3000/?smoke=1";
const port = 9232;
const waitMs = Number(process.env.IMAGE_ANALYSIS_WAIT_MS ?? 70000);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const requests = new Map();
  socket.addEventListener("message", (event) => {
    const response = JSON.parse(String(event.data));
    const request = requests.get(response.id);
    if (!request) return;
    requests.delete(response.id);
    response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
  });
  return {
    send(method, params = {}) {
      const requestId = ++id;
      socket.send(JSON.stringify({ id: requestId, method, params }));
      return new Promise((resolve, reject) => requests.set(requestId, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

async function main() {
  const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const browser = await connect(browserInfo.webSocketDebuggerUrl);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  await sleep(1400);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.id === targetId);
  if (!page) throw new Error("لم يتم العثور على صفحة اختبار الصورة.");
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  if (process.env.MOBILE_EMULATION === "1") {
    await client.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  }
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { window.__visionErrors = []; window.__visionDownloads = []; const original = console.error; console.error = (...args) => { window.__visionErrors.push(args.map((item) => item instanceof Error ? item.stack || item.message : String(item)).join(' ')); original(...args); }; const originalCreateObjectURL = URL.createObjectURL.bind(URL); URL.createObjectURL = (blob) => { blob.text().then((text) => window.__visionDownloads.push({ type: blob.type, text })); return originalCreateObjectURL(blob); }; })()`,
  });
  await client.send("Page.navigate", { url: targetUrl });
  await sleep(waitMs);
  await client.send("Runtime.evaluate", {
    expression: `(() => [...document.querySelectorAll('button')].filter((button) => ['JSON', 'CSV'].includes(button.textContent?.trim() ?? '')).forEach((button) => button.click()))()`,
  });
  await sleep(400);
  const result = await client.send("Runtime.evaluate", {
    expression: `(() => ({ status: document.querySelector('.analysis-state')?.textContent?.trim() ?? '', count: document.querySelectorAll('.real-box').length, results: [...document.querySelectorAll('.result-item')].map((item) => ({ label: item.querySelector('.result-label strong')?.textContent?.trim(), confidence: item.querySelector('.result-score')?.textContent?.trim() })), downloads: window.__visionDownloads ?? [], error: document.querySelector('.error-banner span')?.textContent?.trim() ?? '', consoleErrors: window.__visionErrors ?? [] }))()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(result.result.value, null, 2));
  client.close();
  browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
