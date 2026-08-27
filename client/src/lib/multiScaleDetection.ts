import { RawImage, type ProgressCallback } from "@huggingface/transformers";
import { detectObjects, type LocalDetection } from "./detector";

export type DetailTile = { x: number; y: number; width: number; height: number };

const DETAIL_TRIGGER_RESULT_COUNT = 5;

export function getDetailTiles(width: number, height: number): DetailTile[] {
  const tileWidth = Math.ceil(width * 0.58);
  const tileHeight = Math.ceil(height * 0.58);
  const xPositions = [0, Math.max(0, width - tileWidth)];
  const yPositions = [0, Math.max(0, height - tileHeight)];
  return yPositions.flatMap((y) => xPositions.map((x) => ({ x, y, width: tileWidth, height: tileHeight })));
}

export function detectionIou(a: LocalDetection["box"], b: LocalDetection["box"]) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union ? intersection / union : 0;
}

export function mergeDetections(detections: LocalDetection[], duplicateIou = 0.52): LocalDetection[] {
  const kept: LocalDetection[] = [];
  [...detections]
    .sort((a, b) => b.confidence - a.confidence)
    .forEach((detection) => {
      const duplicate = kept.some((existing) =>
        existing.label === detection.label
        && existing.isUnknown === detection.isUnknown
        && detectionIou(existing.box, detection.box) >= duplicateIou,
      );
      if (!duplicate) kept.push(detection);
    });
  return kept.map((detection, index) => ({ ...detection, id: index + 1 }));
}

function cropImage(image: HTMLImageElement, tile: DetailTile) {
  const canvas = document.createElement("canvas");
  canvas.width = tile.width;
  canvas.height = tile.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز جزء الصورة للتحليل الدقيق.");
  context.drawImage(image, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
  return RawImage.fromCanvas(canvas);
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
    onProgress?: ProgressCallback;
    onDetailProgress?: (completedTiles: number, totalTiles: number) => void;
  } = {},
) {
  const overview = await detectObjects(image, { threshold: 0.18, onProgress: options.onProgress });
  if (overview.length >= DETAIL_TRIGGER_RESULT_COUNT || image.naturalWidth < 720 || image.naturalHeight < 720) {
    return mergeDetections(overview);
  }

  const tiles = getDetailTiles(image.naturalWidth, image.naturalHeight);
  const detailed: LocalDetection[] = [];
  try {
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index]!;
      const tileImage = cropImage(image, tile);
      const tileDetections = await detectObjects(tileImage, { threshold: 0.16 });
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
