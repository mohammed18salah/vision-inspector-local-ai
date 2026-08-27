/*
 * Apple-like practical UI reminder: this service owns real model state and should expose
 * concise, trustworthy progress rather than decorative demo states.
 */
import { env, pipeline, RawImage, type ProgressCallback } from "@huggingface/transformers";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.remoteHost = "/api/model/";
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

type DetectorResult = { score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } };
type Detector = (image: string | RawImage | HTMLImageElement | ImageData, options?: { threshold?: number }) => Promise<DetectorResult[]>;

export type LocalDetection = {
  id: number;
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  sourceModel: string;
  isUnknown: boolean;
};

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
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("cors")) {
    return "تعذر تنزيل ملفات النموذج. تحقق من الاتصال ثم أعد المحاولة؛ الصورة نفسها لم تُرفع إلى أي خدمة خارجية.";
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
        if (activeDevice !== "webgpu") throw error;
        activeDevice = "wasm";
        return await pipeline("object-detection", MODEL_ID, {
          device: "wasm",
          dtype: "q8",
          progress_callback: onProgress,
        }) as unknown as Detector;
      }
    })();
  }
  return detectorPromise;
}

export async function detectObjects(
  image: string | HTMLImageElement | RawImage,
  options: { threshold?: number; onProgress?: ProgressCallback } = {},
): Promise<LocalDetection[]> {
  const detector = await loadDetector(options.onProgress);
  const rawImage = image instanceof RawImage
    ? image
    : await RawImage.fromURL(typeof image === "string" ? image : image.src);
  const result = await detector(rawImage, { threshold: options.threshold ?? 0.28 });
  const sourceWidth = image instanceof RawImage ? image.width : typeof image === "string" ? 1 : image.naturalWidth;
  const sourceHeight = image instanceof RawImage ? image.height : typeof image === "string" ? 1 : image.naturalHeight;
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
