import { env, pipeline, RawImage, type ProgressCallback } from "@huggingface/transformers";
import { createWorker } from "tesseract.js";
import { boxIou, matchTracks, mergeDetections, toCsv } from "./vision-core";
import type { Box, Detection, OcrResult, TrackedDetection } from "./vision-core";

export { boxIou, matchTracks, mergeDetections, toCsv } from "./vision-core";
export type { Box, Detection, OcrResult, TrackedDetection } from "./vision-core";

env.allowRemoteModels = true;
env.useBrowserCache = true;
env.remoteHost = "vision-model://models/";
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1));
  // Bundled with the desktop app so ONNX Runtime never fetches its dynamic
  // WebAssembly module from a CDN after installation. Resolve from the page,
  // rather than from Vite's prebundled dependency URL, for dev and packaged use.
  env.backends.onnx.wasm.wasmPaths = new URL("./ort/", window.location.href).href;
}

export type DeviceRuntime = "webgpu" | "wasm";

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

const candidateLabels = [{ query: "a bird.", threshold: .35 }, { query: "a turtle.", threshold: .4 }, { query: "a building.", threshold: .5 }];
function normalizeOpenLabel(label: string) { return (label.match(/bird|turtle|building/i)?.[0] ?? label.replace(/^an?\s+/i, "").replace(/\.$/, "")).toLowerCase(); }

export async function detectOpenCandidates(image: HTMLImageElement | RawImage, onProgress?: ProgressCallback) {
  const raw = image instanceof RawImage ? image : await RawImage.fromURL(image.src);
  if (!openPromise) openPromise = pipeline("zero-shot-object-detection", "onnx-community/grounding-dino-tiny-ONNX", { device: "wasm", progress_callback: onProgress }) as unknown as Promise<OpenDetector>;
  const detector = await openPromise;
  const results: ModelOutput[] = [];
  for (const candidate of candidateLabels) results.push(...await detector(raw, [candidate.query], { threshold: candidate.threshold, top_k: 1 }));
  return resultToDetections(results.map((item) => ({ ...item, label: normalizeOpenLabel(item.label) })), raw.width, raw.height, "Grounding DINO Tiny · local", true);
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
