const query = process.env.VIDEO_PROBE === "1" ? "?videoSmoke=1&videoProbe=1" : "?videoSmoke=1";
const targetUrl = process.env.VISION_TEST_URL ?? `http://localhost:3000/${query}`;
const port = 9230;
const trackingWaitMs = Number(process.env.VIDEO_TRACKING_WAIT_MS ?? 24000);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  });
  return {
    send(method, params = {}) {
      const id = ++sequence;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

async function main() {
  const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const browser = await connect(browserInfo.webSocketDebuggerUrl);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  await sleep(1200);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.id === targetId);
  if (!page) throw new Error("لم يتم العثور على صفحة التحقق.");
  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  if (process.env.MOBILE_EMULATION === "1") {
    await client.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  }
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { window.__videoValidationErrors = []; window.__videoValidationInfo = []; const originalError = console.error; const originalInfo = console.info; console.error = (...args) => { window.__videoValidationErrors.push(args.map((arg) => arg instanceof Error ? arg.stack || arg.message : String(arg)).join(' ')); originalError(...args); }; console.info = (...args) => { window.__videoValidationInfo.push(args.map((arg) => arg instanceof Error ? arg.stack || arg.message : String(arg)).join(' ')); originalInfo(...args); }; })()`,
  });
  await client.send("Page.navigate", { url: targetUrl });
  await sleep(2400);
  if (process.env.VIDEO_PROBE !== "1") {
    if (process.env.VIDEO_PLAYBACK_RATE) {
      await client.send("Runtime.evaluate", {
        expression: `(() => { const video = document.querySelector('video'); if (video) video.playbackRate = ${Number(process.env.VIDEO_PLAYBACK_RATE)}; })()`,
      });
    }
    await client.send("Runtime.evaluate", {
      expression: `(() => { window.__trackHistory = []; window.__trackHistoryTimer = window.setInterval(() => { const video = document.querySelector('video'); const ids = [...document.querySelectorAll('.track-item .track-id')].map((item) => item.textContent?.trim()); if (ids.length) window.__trackHistory.push({ time: Number((video?.currentTime ?? 0).toFixed(2)), ids }); }, 1000); })()`,
    });
    await client.send("Runtime.evaluate", {
      expression: `(() => [...document.querySelectorAll('button')].find((button) => button.textContent.includes('ابدأ التتبع'))?.click())()`,
      userGesture: true,
    });
  }
  await sleep(trackingWaitMs);
  const result = await client.send("Runtime.evaluate", {
    expression: `(() => { const video = document.querySelector('video'); const tracks = [...document.querySelectorAll('.track-item')]; const overlay = document.querySelector('canvas.video-overlay'); const overlayPixels = overlay?.getContext('2d')?.getImageData(0, 0, overlay.width, overlay.height).data; let overlayAlphaPixels = 0; if (overlayPixels) { for (let index = 3; index < overlayPixels.length; index += 4) overlayAlphaPixels += overlayPixels[index] > 0 ? 1 : 0; } if (window.__trackHistoryTimer) window.clearInterval(window.__trackHistoryTimer); const modelResources = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/api/model/')).map((entry) => ({ name: entry.name.split('/').slice(-2).join('/'), duration: Math.round(entry.duration), bytes: entry.transferSize })); return { videoWidth: video?.videoWidth ?? 0, videoHeight: video?.videoHeight ?? 0, currentTime: Number((video?.currentTime ?? 0).toFixed(2)), trackCount: tracks.length, trackIds: tracks.map((item) => item.querySelector('.track-id')?.textContent?.trim()), trackHistory: window.__trackHistory ?? [], overlayAlphaPixels, inferenceDevice: document.querySelector('.runtime-pill')?.textContent?.trim() ?? '', state: document.querySelector('.video-live-chip')?.textContent?.trim() ?? '', errorText: document.querySelector('.video-error span')?.textContent?.trim() ?? '', consoleErrors: window.__videoValidationErrors ?? [], consoleInfo: window.__videoValidationInfo ?? [], modelResources }; })()`,
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
