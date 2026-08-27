export type Box = { x: number; y: number; width: number; height: number };
export type VisionDetection = { id: number; label: string; confidence: number; box: Box; sourceModel: string; isUnknown: boolean };
export type VisionOcrWord = { id: number; text: string; confidence: number; box: Box };
export type VisionOcrResult = { text: string; confidence: number; words: VisionOcrWord[] };
export type TrackedDetection = VisionDetection & { trackId: number; lastSeenAt: number };
type CsvCell = string | number | boolean | null | undefined;

export function boxIou(a: Box, b: Box) {
  const left = Math.max(a.x, b.x); const top = Math.max(a.y, b.y); const right = Math.min(a.x + a.width, b.x + b.width); const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, right - left) * Math.max(0, bottom - top); const union = a.width * a.height + b.width * b.height - overlap;
  return union > 0 ? overlap / union : 0;
}

export function mergeDetections(detections: VisionDetection[], duplicateIou = 0.52): VisionDetection[] {
  const kept: VisionDetection[] = [];
  [...detections].sort((a, b) => b.confidence - a.confidence).forEach((detection) => {
    const duplicate = kept.some((existing) => existing.label === detection.label && existing.isUnknown === detection.isUnknown && boxIou(existing.box, detection.box) >= duplicateIou);
    if (!duplicate) kept.push(detection);
  });
  return kept.map((detection, index) => ({ ...detection, id: index + 1 }));
}

function centerDistance(a: Box, b: Box) { return Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2); }

export function matchTracks(previous: TrackedDetection[], current: VisionDetection[], nextTrackId: number, seenAt: number, threshold = 0.18) {
  const free = new Set(previous.map((track) => track.trackId));
  const tracked = current.map((detection) => {
    const match = previous.filter((track) => free.has(track.trackId) && track.label === detection.label && track.isUnknown === detection.isUnknown).map((track) => ({ track, iou: boxIou(track.box, detection.box), distance: centerDistance(track.box, detection.box) })).filter((candidate) => candidate.iou >= threshold || candidate.distance <= 14).sort((a, b) => {
      const aHasIou = a.iou >= threshold; const bHasIou = b.iou >= threshold;
      return aHasIou !== bHasIou ? (aHasIou ? -1 : 1) : b.iou - a.iou || a.distance - b.distance;
    })[0]?.track;
    if (match) { free.delete(match.trackId); return { ...detection, trackId: match.trackId, lastSeenAt: seenAt }; }
    return { ...detection, trackId: nextTrackId++, lastSeenAt: seenAt };
  });
  return { tracked, nextTrackId };
}

export function toExportDetection(detection: VisionDetection) {
  const tentative = detection.isUnknown && detection.label !== "unknown";
  return { ...detection, label: detection.isUnknown ? "unknown" : detection.label, candidateLabel: tentative ? detection.label : null, tentative, status: tentative ? "tentative" : detection.isUnknown ? "unknown" : "confirmed" } as const;
}

export function buildDetectionCsvRows(detections: VisionDetection[]): CsvCell[][] {
  return detections.map((detection) => {
    const exported = toExportDetection(detection);
    return ["object", exported.label, exported.candidateLabel ?? "", exported.status, exported.tentative, exported.confidence, exported.box.x, exported.box.y, exported.box.width, exported.box.height, ""];
  });
}

export function toCsv(rows: CsvCell[][]) { return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n"); }

export function toUnifiedCsv(detections: VisionDetection[], ocr: VisionOcrResult | null) {
  return toCsv([["type", "label", "candidate_label", "status", "tentative", "confidence", "x_percent", "y_percent", "width_percent", "height_percent", "text"], ...buildDetectionCsvRows(detections), ...(ocr?.words ?? []).map((word) => ["text", "ocr", "", "confirmed", false, word.confidence, word.box.x, word.box.y, word.box.width, word.box.height, word.text])]);
}
