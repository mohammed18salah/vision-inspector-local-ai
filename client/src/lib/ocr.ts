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
            if (typeof message.progress === "number") onProgress?.(Math.round(message.progress * 100));
          },
        });
      } catch (localError) {
        console.warn("[Vision Inspector] Local OCR worker assets failed, falling back to official CDN:", localError);
        return await createWorker(["eng", "ara"], undefined, {
          cacheMethod: "write",
          logger: (message) => {
            if (typeof message.progress === "number") onProgress?.(Math.round(message.progress * 100));
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

/**
 * Preprocesses image on an offscreen canvas: scales up small text and applies contrast normalization
 */
async function preprocessForOcr(
  imageSource: string | HTMLImageElement,
  sourceSize: { width: number; height: number }
): Promise<string> {
  if (typeof document === "undefined") return typeof imageSource === "string" ? imageSource : imageSource.src;

  return new Promise((resolve) => {
    const img = typeof imageSource === "string" ? new Image() : imageSource;
    if (typeof imageSource === "string") {
      img.crossOrigin = "anonymous";
      img.src = imageSource;
    }

    const process = () => {
      try {
        const w = img.naturalWidth || sourceSize.width || 800;
        const h = img.naturalHeight || sourceSize.height || 600;

        // Upscale small scene images to help OCR read small text cleanly
        const minDim = Math.min(w, h);
        const scale = minDim < 900 ? Math.min(2.5, 1200 / minDim) : 1;
        const targetW = Math.round(w * scale);
        const targetH = Math.round(h * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(typeof imageSource === "string" ? imageSource : img.src);

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imageData.data;

        // Grayscale contrast stretching
        let minL = 255;
        let maxL = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          if (lum < minL) minL = lum;
          if (lum > maxL) maxL = lum;
        }

        const range = Math.max(1, maxL - minL);
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const enhanced = Math.min(255, Math.max(0, ((lum - minL) / range) * 255));
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("[OCR Preprocess] Error during preprocessing:", err);
        resolve(typeof imageSource === "string" ? imageSource : img.src);
      }
    };

    if (img.complete && img.naturalWidth) {
      process();
    } else {
      img.onload = () => process();
      img.onerror = () => resolve(typeof imageSource === "string" ? imageSource : img.src);
    }
  });
}

export async function recognizeText(
  image: string | HTMLImageElement,
  sourceSize: { width: number; height: number },
  onProgress?: (progress: number) => void,
): Promise<LocalOcrResult> {
  const worker = await getWorker(onProgress);
  
  // Preprocess image for maximum text edge definition
  const processedImage = await preprocessForOcr(image, sourceSize);

  // Perform recognition with automatic layout detection
  const { data } = await worker.recognize(processedImage, {}, { text: true, blocks: true });
  const blocks = data.blocks ?? [];
  const rawWords = blocks.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)));

  const words = rawWords
    .map((word, index) => {
      const cleanWord = word.text.trim();
      return {
        id: index + 1,
        text: cleanWord,
        confidence: Math.round(word.confidence),
        box: {
          x: (word.bbox.x0 / Math.max(1, sourceSize.width)) * 100,
          y: (word.bbox.y0 / Math.max(1, sourceSize.height)) * 100,
          width: ((word.bbox.x1 - word.bbox.x0) / Math.max(1, sourceSize.width)) * 100,
          height: ((word.bbox.y1 - word.bbox.y0) / Math.max(1, sourceSize.height)) * 100,
        },
      };
    })
    .filter((word) => {
      if (!word.text || word.text.length === 0) return false;
      // Filter out low confidence single-character noise artifacts (like solitary '7' with low confidence)
      if (word.text.length === 1 && word.confidence < 50) return false;
      // Filter out pure noise punctuation
      if (/^[^\w\u0600-\u06FF]+$/.test(word.text) && word.text.length <= 2) return false;
      return true;
    });

  // Calculate real average confidence from valid words only
  const validAvgConfidence = words.length
    ? Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length)
    : data.text.trim().length > 0
    ? Math.round(data.confidence)
    : 0;

  // Clean formatted paragraph lines
  const cleanLines = data.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[\-_=~*`.]+$/.test(l));

  const cleanText = words.length > 0 ? cleanLines.join("\n") : "";

  return {
    text: cleanText,
    confidence: validAvgConfidence,
    words,
    language: "Arabic + English",
  };
}

