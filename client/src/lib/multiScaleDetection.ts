import { RawImage, type ProgressCallback } from "@huggingface/transformers";
import { detectObjects, yieldToMainThread, type LocalDetection } from "./detector";
import { boxIou, mergeDetections as mergeSharedDetections } from "@shared/vision-core";

export type DetailTile = { x: number; y: number; width: number; height: number };

const DETAIL_TRIGGER_RESULT_COUNT = 5;

export function getDetailTiles(width: number, height: number): DetailTile[] {
  const tileWidth = Math.ceil(width * 0.58);
  const tileHeight = Math.ceil(height * 0.58);
  const xPositions = [0, Math.max(0, width - tileWidth)];
  const yPositions = [0, Math.max(0, height - tileHeight)];
  return yPositions.flatMap((y) => xPositions.map((x) => ({ x, y, width: tileWidth, height: tileHeight })));
}

export const detectionIou = boxIou;
export const mergeDetections = mergeSharedDetections;

// A small pool of off-screen canvases reused across tile crops to reduce GC pressure.
const CANVAS_POOL_MAX = 4;
const canvasPool: HTMLCanvasElement[] = [];

function acquireCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = canvasPool.pop() ?? document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  if (canvasPool.length < CANVAS_POOL_MAX) canvasPool.push(canvas);
}

function cropImage(image: HTMLImageElement, tile: DetailTile) {
  const canvas = acquireCanvas(tile.width, tile.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز جزء الصورة للتحليل الدقيق.");
  context.drawImage(image, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
  const rawImage = RawImage.fromCanvas(canvas);
  releaseCanvas(canvas);
  return rawImage;
}

function projectTileDetection(detection: LocalDetection, tile: DetailTile, imageWidth: number, imageHeight: number): LocalDetection {
  const x = ((tile.x + (detection.box.x / 100) * tile.width) / imageWidth) * 100;
  const y = ((tile.y + (detection.box.y / 100) * tile.height) / imageHeight) * 100;
  const width = ((detection.box.width / 100) * tile.width / imageWidth) * 100;
  const height = ((detection.box.height / 100) * tile.height / imageHeight) * 100;
  return { ...detection, box: { x, y, width, height } };
}

export async function detectImageWithDetailPass(
  image: HTMLImageElement,
  options: {
    threshold?: number;
    rescueMode?: boolean;
    onProgress?: ProgressCallback;
    onDetailProgress?: (completedTiles: number, totalTiles: number) => void;
  } = {},
) {
  const baseThreshold = options.threshold ?? (options.rescueMode ? 0.12 : 0.18);
  const overview = await detectObjects(image, { threshold: baseThreshold, onProgress: options.onProgress });
  
  // In rescue mode, scan tiles if image is large enough; otherwise skip to preserve speed
  const shouldSkipTiles = !options.rescueMode && (overview.length >= DETAIL_TRIGGER_RESULT_COUNT || image.naturalWidth < 600 || image.naturalHeight < 600);
  if (shouldSkipTiles) {
    return mergeDetections(overview);
  }

  const tiles = getDetailTiles(image.naturalWidth, image.naturalHeight);
  const detailed: LocalDetection[] = [];
  try {
    for (let index = 0; index < tiles.length; index += 1) {
      await yieldToMainThread(10); // Yield to keep UI responsive
      const tile = tiles[index]!;
      const tileImage = cropImage(image, tile);
      const tileDetections = await detectObjects(tileImage, { threshold: options.rescueMode ? 0.12 : 0.16 });
      detailed.push(...tileDetections.map((detection) => projectTileDetection(detection, tile, image.naturalWidth, image.naturalHeight)));
      options.onDetailProgress?.(index + 1, tiles.length);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      return mergeDetections(overview);
    }
    throw error;
  }
  return mergeDetections([...overview, ...detailed]);
}
