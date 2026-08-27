const port = 9233;
const targetUrl = process.env.VISION_TEST_URL ?? "http://localhost:3000/";

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
  await sleep(400);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.id === targetId);
  if (!page) throw new Error("تعذر فتح صفحة اختبار الهاتف.");
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await client.send("Page.navigate", { url: targetUrl });
  await sleep(1500);
  const measurement = await client.send("Runtime.evaluate", {
    expression: `(async () => { const picker = document.querySelector('.analysis-mode-picker')?.getBoundingClientRect(); const root = document.querySelector('.vision-app')?.getBoundingClientRect(); const initialImageWorkspace = Boolean(document.querySelector('.work-grid')); const initialVideoWorkspace = Boolean(document.querySelector('.video-tracking-panel')); const buttons = [...document.querySelectorAll('.mode-choice')]; buttons.find((button) => button.textContent?.includes('تحليل صورة'))?.click(); await new Promise((resolve) => setTimeout(resolve, 80)); const imageWorkspace = Boolean(document.querySelector('.work-grid')); const videoAfterImage = Boolean(document.querySelector('.video-tracking-panel')); buttons.find((button) => button.textContent?.includes('تحليل فيديو'))?.click(); await new Promise((resolve) => setTimeout(resolve, 80)); const videoWorkspace = Boolean(document.querySelector('.video-tracking-panel')); const imageAfterVideo = Boolean(document.querySelector('.work-grid')); return { innerWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, picker: picker ? { left: picker.left, right: picker.right, width: picker.width } : null, root: root ? { left: root.left, right: root.right, width: root.width } : null, initialImageWorkspace, initialVideoWorkspace, imageWorkspace, videoAfterImage, videoWorkspace, imageAfterVideo }; })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log(JSON.stringify(measurement.result.value, null, 2));
  client.close();
  browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
