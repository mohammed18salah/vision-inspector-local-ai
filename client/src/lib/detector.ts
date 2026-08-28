/*
 * Vision Inspector Local AI — Optimized Inference Engine
 * Fast on-device inference using WebGPU / WASM with UI-yielding and memory safety.
 */
import { env, pipeline, RawImage, type ProgressCallback } from "@huggingface/transformers";
import type { VisionDetection } from "@shared/vision-core";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.backends.onnx.logLevel = "error";
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

type DetectorResult = { score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } };
type Detector = (image: string | RawImage | HTMLImageElement | ImageData, options?: { threshold?: number }) => Promise<DetectorResult[]>;

export type LocalDetection = VisionDetection;

const MODEL_ID = "Xenova/yolos-tiny";
let detectorPromise: Promise<Detector> | null = null;
let activeDevice: "webgpu" | "wasm" = "wasm";

async function preferredDevice(): Promise<"webgpu" | "wasm"> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return "wasm";
  try {
    const adapter = await (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu?.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

export function getInferenceDevice() {
  return activeDevice;
}

export function getDetectorErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("cors") || raw.includes("internal server error") || raw.includes("500") || raw.includes("502")) {
    return "تعذر تنزيل ملفات النموذج. تحقق من الاتصال بالإنترنت ثم أعد المحاولة؛ الصورة نفسها تُعالج محليًا.";
  }
  if (raw.includes("webgpu") || raw.includes("execution provider")) {
    return "لم يستطع المتصفح تشغيل WebGPU. سيعمل النظام على WASM تلقائيًا، أو جرّب Chrome/Edge محدثًا.";
  }
  if (raw.includes("memory") || raw.includes("out of memory")) {
    return "ذاكرة الجهاز غير كافية لهذا النموذج. أغلق التبويبات الأخرى أو استخدم صورة أصغر.";
  }
  return "تعذر تشغيل النموذج المحلي على هذه الصورة. جرّب صورة أوضح أو أعد تحميل الصفحة.";
}

export async function loadDetector(onProgress?: ProgressCallback) {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      activeDevice = await preferredDevice();
      try {
        return await pipeline("object-detection", MODEL_ID, {
          device: activeDevice,
          dtype: "q8",
          progress_callback: onProgress,
        }) as unknown as Detector;
      } catch (error) {
        console.warn("[Vision Inspector] Primary inference device load failed, falling back to WASM:", error);
        if (activeDevice !== "webgpu") throw error;
        activeDevice = "wasm";
        return await pipeline("object-detection", MODEL_ID, {
          device: "wasm",
          dtype: "q8",
          progress_callback: onProgress,
        }) as unknown as Detector;
      }
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

// Yield execution to the browser event loop so animations & UI remain buttery smooth
export function yieldToMainThread(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fast downscaling for high-resolution images to prevent tab freeze and memory spikes
export function extractScaledRawImage(image: HTMLImageElement, maxDim = 1024): { rawImage: RawImage; width: number; height: number } {
  const origW = image.naturalWidth || image.width;
  const origH = image.naturalHeight || image.height;
  if (!origW || !origH) {
    return { rawImage: RawImage.fromCanvas(document.createElement("canvas")), width: 1, height: 1 };
  }
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, 0, 0, targetW, targetH);
  }
  return { rawImage: RawImage.fromCanvas(canvas), width: targetW, height: targetH };
}

export async function detectObjects(
  image: string | HTMLImageElement | RawImage,
  options: { threshold?: number; onProgress?: ProgressCallback } = {},
): Promise<LocalDetection[]> {
  await yieldToMainThread(0);
  const detector = await loadDetector(options.onProgress);
  let rawImage: RawImage;
  let sourceWidth: number;
  let sourceHeight: number;

  if (image instanceof HTMLImageElement) {
    const scaled = extractScaledRawImage(image, 1024);
    rawImage = scaled.rawImage;
    sourceWidth = scaled.width;
    sourceHeight = scaled.height;
  } else if (image instanceof RawImage) {
    rawImage = image;
    sourceWidth = image.width;
    sourceHeight = image.height;
  } else {
    rawImage = await RawImage.fromURL(image);
    sourceWidth = rawImage.width;
    sourceHeight = rawImage.height;
  }

  const result = await detector(rawImage, { threshold: options.threshold ?? 0.28 });
  return result
    .map((item, index) => {
      const box = item.box;
      const confidence = Math.round(item.score * 100);
      const label = item.label || "unknown";
      const isUnknown = confidence < 45 || label.toLowerCase() === "unknown";
      return {
        id: index + 1,
        label: isUnknown ? "unknown" : label,
        confidence,
        box: {
          x: (box.xmin / sourceWidth) * 100,
          y: (box.ymin / sourceHeight) * 100,
          width: ((box.xmax - box.xmin) / sourceWidth) * 100,
          height: ((box.ymax - box.ymin) / sourceHeight) * 100,
        },
        sourceModel: MODEL_ID,
        isUnknown,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}
