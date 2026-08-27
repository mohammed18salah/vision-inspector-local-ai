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

function getWorker(onProgress?: (progress: number) => void) {
  if (!workerPromise) {
    const assetUrl = (path: string) => new URL(`/api/ocr/${path}`, window.location.href).href;
    workerPromise = createWorker(["eng", "ara"], undefined, {
      workerPath: assetUrl("worker.min.js"),
      corePath: assetUrl("tesseract-core-simd.wasm.js"),
      langPath: assetUrl("lang/"),
      gzip: false,
      cacheMethod: "none",
      logger: (message) => {
        if (typeof message.progress === "number") onProgress?.(message.progress);
      },
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
