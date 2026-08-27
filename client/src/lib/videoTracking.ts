import type { LocalDetection } from "./detector";

export type TrackedDetection = LocalDetection & { trackId: number; lastSeenAt: number };

type TrackMatch = { tracked: TrackedDetection[]; nextTrackId: number };

export function boxIou(a: LocalDetection["box"], b: LocalDetection["box"]) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function boxCenterDistance(a: LocalDetection["box"], b: LocalDetection["box"]) {
  const aCenterX = a.x + a.width / 2;
  const aCenterY = a.y + a.height / 2;
  const bCenterX = b.x + b.width / 2;
  const bCenterY = b.y + b.height / 2;
  return Math.hypot(aCenterX - bCenterX, aCenterY - bCenterY);
}

export function matchVideoTracks(previous: TrackedDetection[], current: LocalDetection[], nextTrackId: number, seenAt: number, threshold = 0.18): TrackMatch {
  const maxCenterDistance = 14;
  const unused = new Set(previous.map((track) => track.trackId));
  const tracked = current.map((detection) => {
    const candidates = previous
      .filter((track) => unused.has(track.trackId) && track.label === detection.label && track.isUnknown === detection.isUnknown)
      .map((track) => ({ track, iou: boxIou(track.box, detection.box), centerDistance: boxCenterDistance(track.box, detection.box) }))
      .filter(({ iou, centerDistance }) => iou >= threshold || centerDistance <= maxCenterDistance)
      .sort((a, b) => {
        const aHasIou = a.iou >= threshold;
        const bHasIou = b.iou >= threshold;
        if (aHasIou !== bHasIou) return aHasIou ? -1 : 1;
        return b.iou - a.iou || a.centerDistance - b.centerDistance;
      });
    const match = candidates[0]?.track;
    if (match) {
      unused.delete(match.trackId);
      return { ...detection, trackId: match.trackId, lastSeenAt: seenAt };
    }
    const trackId = nextTrackId++;
    return { ...detection, trackId, lastSeenAt: seenAt };
  });
  return { tracked, nextTrackId };
}
