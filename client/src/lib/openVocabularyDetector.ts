import { env, pipeline, RawImage, type ProgressCallback } from "@huggingface/transformers";
import type { LocalDetection } from "./detector";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.backends.onnx.logLevel = "error";

const MODEL_ID = "onnx-community/grounding-dino-tiny-ONNX";
// Primary categories plus disaster rescue / occluded human detection queries
const CANDIDATE_LABELS = [
  { query: "a person.", threshold: 0.3 },
  { query: "a person trapped under rubble.", threshold: 0.2 },
  { query: "a human body or limb in debris.", threshold: 0.2 },
  { query: "a person partially visible.", threshold: 0.2 },
  { query: "a bird.", threshold: 0.35 },
  { query: "a turtle.", threshold: 0.4 },
  { query: "a building.", threshold: 0.45 },
  { query: "a vehicle.", threshold: 0.35 },
];
export const OPEN_VOCABULARY_CONFIRMED_CONFIDENCE = 45;

type DetectorResult = { score: number; label: string; box: { xmin: number; ymin: number; xmax: number; ymax: number } };
type OpenVocabularyDetector = (image: RawImage, labels: string[], options?: { threshold?: number; top_k?: number }) => Promise<DetectorResult[]>;

let detectorPromise: Promise<OpenVocabularyDetector> | null = null;

async function loadOpenVocabularyDetector(onProgress?: ProgressCallback) {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      return await pipeline("zero-shot-object-detection", MODEL_ID, {
        device: "wasm",
        progress_callback: onProgress,
      }) as unknown as OpenVocabularyDetector;
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

export function normalizeOpenVocabularyLabel(label: string) {
  const normalized = label.replace(/^an?\s+/i, "").replace(/\.$/, "").trim().toLowerCase();
  if (normalized.includes("person") || normalized.includes("human") || normalized.includes("body") || normalized.includes("limb") || normalized.includes("rubble") || normalized.includes("debris")) {
    return "person";
  }
  const knownLabels = ["person", "bird", "turtle", "building", "car", "dog", "cat", "animal", "tree", "vehicle"];
  return (knownLabels.find((knownLabel) => normalized.includes(knownLabel)) ?? normalized) || "unknown";
}

export function isOpenVocabularyCandidate(confidence: number) {
  return confidence < OPEN_VOCABULARY_CONFIRMED_CONFIDENCE;
}

export async function detectOpenVocabularyObjects(
  image: HTMLImageElement | RawImage,
  options: { onProgress?: ProgressCallback; onCategoryProgress?: (completed: number, total: number) => void } = {},
): Promise<LocalDetection[]> {
  const detector = await loadOpenVocabularyDetector(options.onProgress);
  const rawImage = image instanceof RawImage ? image : await RawImage.fromURL(image.src);
  const result: DetectorResult[] = [];
  for (let index = 0; index < CANDIDATE_LABELS.length; index += 1) {
    const candidate = CANDIDATE_LABELS[index]!;
    const matches = await detector(rawImage, [candidate.query], { threshold: candidate.threshold, top_k: 1 });
    result.push(...matches);
    options.onCategoryProgress?.(index + 1, CANDIDATE_LABELS.length);
  }
  const width = rawImage.width;
  const height = rawImage.height;
  return result.map((item, index) => {
    const label = normalizeOpenVocabularyLabel(item.label);
    const confidence = Math.round(item.score * 100);
    return {
      id: index + 1,
      label,
      confidence,
      box: {
        x: (item.box.xmin / width) * 100,
        y: (item.box.ymin / height) * 100,
        width: ((item.box.xmax - item.box.xmin) / width) * 100,
        height: ((item.box.ymax - item.box.ymin) / height) * 100,
      },
      sourceModel: "Grounding DINO Tiny · local",
      isUnknown: label === "unknown" || isOpenVocabularyCandidate(confidence),
    };
  });
}
