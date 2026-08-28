import { env, pipeline, RawImage, type ProgressCallback } from "@huggingface/transformers";
import { createWorker } from "tesseract.js";
import { boxIou, matchTracks, mergeDetections, toCsv } from "./vision-core";
import type { Box, Detection, OcrResult, TrackedDetection } from "./vision-core";
import { benchmarkStats, compareToWasm } from "./performance-core";
import type { BenchmarkComparison, BenchmarkStats } from "./performance-core";

export { boxIou, matchTracks, mergeDetections, toCsv } from "./vision-core";
export type { Box, Detection, OcrResult, TrackedDetection } from "./vision-core";

env.allowRemoteModels = true;
env.useBrowserCache = true;
env.remoteHost = "vision-model://models/";
if (env.backends.onnx.wasm) {
  env.backends.onnx.logLevel = "error";
  env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1));
  // Bundled with the desktop app so ONNX Runtime never fetches its dynamic
  // WebAssembly module from a CDN after installation. Resolve from the page,
  // rather than from Vite's prebundled dependency URL, for dev and packaged use.
  env.backends.onnx.wasm.wasmPaths = new URL("./ort/", window.location.href).href;
}

export type DeviceRuntime = "webgpu" | "wasm";

export type BenchmarkRun = {
  device: DeviceRuntime;
  modelLoadMs: number | null;
  warmupMs: number | null;
  stats: BenchmarkStats;
  error: string | null;
};

export type PerformanceBenchmark = {
  sourceSize: { width: number; height: number };
  iterations: number;
  webgpuAvailable: boolean;
  runs: BenchmarkRun[];
  comparison: BenchmarkComparison;
};

type ModelBox = { xmin: number; ymin: number; xmax: number; ymax: number };
type ModelOutput = { score: number; label: string; box: ModelBox };
type ObjectDetector = (image: RawImage, options?: { threshold?: number }) => Promise<ModelOutput[]>;
type OpenDetector = (image: RawImage, labels: string[], options?: { threshold?: number; top_k?: number }) => Promise<ModelOutput[]>;

let primaryPromise: Promise<ObjectDetector> | null = null;
let openPromise: Promise<OpenDetector> | null = null;
let ocrPromise: ReturnType<typeof createWorker> | null = null;
let activeDevice: DeviceRuntime = "wasm";

export async function getPreferredDevice(): Promise<DeviceRuntime> {
  if (!("gpu" in navigator)) return "wasm";
  try {
    const adapter = await (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu?.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch { return "wasm"; }
}

export async function loadPrimaryModel(onProgress?: ProgressCallback) {
  if (!primaryPromise) {
    primaryPromise = (async () => {
      activeDevice = await getPreferredDevice();
      try {
        return await pipeline("object-detection", "Xenova/yolos-tiny", { device: activeDevice, dtype: "q8", progress_callback: onProgress }) as unknown as ObjectDetector;
      } catch (error) {
        if (activeDevice !== "webgpu") throw error;
        activeDevice = "wasm";
        return await pipeline("object-detection", "Xenova/yolos-tiny", { device: "wasm", dtype: "q8", progress_callback: onProgress }) as unknown as ObjectDetector;
      }
    })();
  }
  return primaryPromise;
}

export function selectedInferenceDevice() { return activeDevice; }

async function benchmarkRun(raw: RawImage, device: DeviceRuntime, iterations: number): Promise<BenchmarkRun> {
  const loadStartedAt = performance.now();
  try {
    const detector = await pipeline("object-detection", "Xenova/yolos-tiny", { device, dtype: "q8" }) as unknown as ObjectDetector;
    const modelLoadMs = Math.round(performance.now() - loadStartedAt);
    const warmupStartedAt = performance.now();
    await detector(raw, { threshold: 0.18 });
    const warmupMs = Math.round(performance.now() - warmupStartedAt);
    const samplesMs: number[] = [];
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = performance.now();
      await detector(raw, { threshold: 0.18 });
      samplesMs.push(Math.round(performance.now() - startedAt));
    }
    return { device, modelLoadMs, warmupMs, stats: benchmarkStats(samplesMs), error: null };
  } catch (error) {
    return { device, modelLoadMs: null, warmupMs: null, stats: benchmarkStats([]), error: error instanceof Error ? error.message : "تعذر تشغيل القياس." };
  }
}

export async function benchmarkObjectDetection(image: HTMLImageElement | RawImage, iterations = 3): Promise<PerformanceBenchmark> {
  const raw = image instanceof RawImage ? image : await RawImage.fromURL(image.src);
  const webgpuAvailable = await getPreferredDevice() === "webgpu";
  const wasmRun = await benchmarkRun(raw, "wasm", iterations);
  const webgpuRun = webgpuAvailable ? await benchmarkRun(raw, "webgpu", iterations) : null;
  return {
    sourceSize: { width: raw.width, height: raw.height },
    iterations,
    webgpuAvailable,
    runs: webgpuRun ? [wasmRun, webgpuRun] : [wasmRun],
    comparison: compareToWasm(webgpuRun?.stats.medianMs ?? null, wasmRun.stats.medianMs),
  };
}

function resultToDetections(results: ModelOutput[], width: number, height: number, sourceModel: string, tentative = false): Detection[] {
  return results.map((result, index) => {
    const confidence = Math.round(result.score * 100);
    const label = result.label || "unknown";
    return {
      id: index + 1,
      label: tentative ? label : confidence < 45 || label === "unknown" ? "unknown" : label,
      confidence,
      box: { x: result.box.xmin / width * 100, y: result.box.ymin / height * 100, width: (result.box.xmax - result.box.xmin) / width * 100, height: (result.box.ymax - result.box.ymin) / height * 100 },
      sourceModel,
      isUnknown: tentative || confidence < 45 || label === "unknown",
    };
  });
}

export async function detectObjects(image: HTMLImageElement | RawImage, onProgress?: ProgressCallback) {
  const raw = image instanceof RawImage ? image : await RawImage.fromURL(image.src);
  const detector = await loadPrimaryModel(onProgress);
  return resultToDetections(await detector(raw, { threshold: 0.18 }), raw.width, raw.height, "YOLOS Tiny · local").sort((a, b) => b.confidence - a.confidence);
}

const candidateLabels = [
  { query: "a person.", threshold: 0.3 },
  { query: "a person trapped under rubble.", threshold: 0.18 },
  { query: "a human body or limb in debris.", threshold: 0.18 },
  { query: "a person partially visible.", threshold: 0.2 },
  { query: "a building.", threshold: 0.4 },
  { query: "a vehicle.", threshold: 0.35 },
  { query: "a bird.", threshold: 0.35 },
  { query: "a turtle.", threshold: 0.4 },
];

function normalizeOpenLabel(label: string) {
  const clean = label.replace(/^an?\s+/i, "").replace(/\.$/, "").trim().toLowerCase();
  if (clean.includes("person") || clean.includes("human") || clean.includes("body") || clean.includes("limb") || clean.includes("rubble") || clean.includes("debris")) {
    return "person";
  }
  return (clean.match(/bird|turtle|building|car|vehicle|dog|cat/i)?.[0] ?? clean).toLowerCase();
}

export async function detectOpenCandidates(image: HTMLImageElement | RawImage, onProgress?: ProgressCallback, rescueMode = false) {
  const raw = image instanceof RawImage ? image : await RawImage.fromURL(image.src);
  if (!openPromise) openPromise = pipeline("zero-shot-object-detection", "onnx-community/grounding-dino-tiny-ONNX", { device: "wasm", progress_callback: onProgress }) as unknown as Promise<OpenDetector>;
  const detector = await openPromise;
  const results: ModelOutput[] = [];
  const activeQueries = rescueMode
    ? candidateLabels.filter((c) => c.query.includes("person") || c.query.includes("human") || c.query.includes("building") || c.query.includes("debris"))
    : candidateLabels;

  for (const candidate of activeQueries) {
    const threshold = rescueMode && (candidate.query.includes("rubble") || candidate.query.includes("debris")) ? 0.15 : candidate.threshold;
    results.push(...await detector(raw, [candidate.query], { threshold, top_k: 2 }));
  }
  return resultToDetections(results.map((item) => ({ ...item, label: normalizeOpenLabel(item.label) })), raw.width, raw.height, rescueMode ? "Grounding DINO · Rescue Mode" : "Grounding DINO Tiny · local", true);
}

export async function recognizeText(image: HTMLImageElement, onProgress?: (value: number) => void): Promise<OcrResult> {
  if (!ocrPromise) {
    const assetUrl = (path: string) => new URL(`./tesseract/${path}`, window.location.href).href;
    ocrPromise = createWorker(["eng", "ara"], undefined, {
      workerPath: assetUrl("worker.min.js"),
      corePath: assetUrl("tesseract-core-simd.wasm.js"),
      langPath: assetUrl("lang/"),
      gzip: false,
      cacheMethod: "none",
      logger: (event) => { if (typeof event.progress === "number") onProgress?.(Math.round(event.progress * 100)); },
    });
  }
  const { data } = await (await ocrPromise).recognize(image, {}, { text: true, blocks: true });
  const words = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words))).map((word, index) => ({ id: index + 1, text: word.text.trim(), confidence: Math.round(word.confidence), box: { x: word.bbox.x0 / image.naturalWidth * 100, y: word.bbox.y0 / image.naturalHeight * 100, width: (word.bbox.x1 - word.bbox.x0) / image.naturalWidth * 100, height: (word.bbox.y1 - word.bbox.y0) / image.naturalHeight * 100 } })).filter((word) => word.text);
  return { text: data.text.trim(), confidence: Math.round(data.confidence), words };
}
