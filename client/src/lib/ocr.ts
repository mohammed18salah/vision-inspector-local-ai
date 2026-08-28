import { createWorker } from "tesseract.js";

export type LocalOcrWord = {
  id: number;
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
};

export type LocalOcrResult = {
  text: string;
  confidence: number;
  words: LocalOcrWord[];
  language: string;
};

let workerPromise: ReturnType<typeof createWorker> | null = null;

// The production build copies these files to dist/public/ocr-assets. Serving
// them as same-origin static assets works in the local Express server and on
// Vercel without making the serverless API function locate OCR language data.
const OCR_RUNTIME_BASE = import.meta.env.DEV ? "/api/ocr/" : "/ocr-assets/";

function getWorker(onProgress?: (progress: number) => void) {
  if (!workerPromise) {
    const assetUrl = (path: string) => new URL(`${OCR_RUNTIME_BASE}${path}`, window.location.href).href;
    workerPromise = (async () => {
      try {
        return await createWorker(["eng", "ara"], undefined, {
          workerPath: assetUrl("worker.min.js"),
          corePath: assetUrl("tesseract-core-simd.wasm.js"),
          langPath: assetUrl("lang/"),
          gzip: false,
          cacheMethod: "write",
          logger: (message) => {
            if (typeof message.progress === "number") onProgress?.(message.progress);
          },
        });
      } catch (localError) {
        console.warn("[Vision Inspector] Local OCR worker assets failed, falling back to official CDN:", localError);
        return await createWorker(["eng", "ara"], undefined, {
          cacheMethod: "write",
          logger: (message) => {
            if (typeof message.progress === "number") onProgress?.(message.progress);
          },
        });
      }
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function recognizeText(
  image: string | HTMLImageElement,
  sourceSize: { width: number; height: number },
  onProgress?: (progress: number) => void,
): Promise<LocalOcrResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
  const blocks = data.blocks ?? [];
  const rawWords = blocks.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)));
  const words = rawWords
    .map((word, index) => ({
      id: index + 1,
      text: word.text.trim(),
      confidence: Math.round(word.confidence),
      box: {
        x: (word.bbox.x0 / Math.max(1, sourceSize.width)) * 100,
        y: (word.bbox.y0 / Math.max(1, sourceSize.height)) * 100,
        width: ((word.bbox.x1 - word.bbox.x0) / Math.max(1, sourceSize.width)) * 100,
        height: ((word.bbox.y1 - word.bbox.y0) / Math.max(1, sourceSize.height)) * 100,
      },
    }))
    .filter((word) => word.text.length > 0);

  return {
    text: data.text.trim(),
    confidence: Math.round(data.confidence),
    words,
    language: "Arabic + English",
  };
}
