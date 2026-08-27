import { RawImage, type ProgressCallback } from "@huggingface/transformers";
import { detectObjects, type LocalDetection } from "./detector";
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
