import { boxIou, matchTracks } from "@shared/vision-core";
import type { LocalDetection } from "./detector";

export { boxIou };
export type { TrackedDetection } from "@shared/vision-core";
export function matchVideoTracks(previous: import("@shared/vision-core").TrackedDetection[], current: LocalDetection[], nextTrackId: number, seenAt: number, threshold = 0.18) {
  return matchTracks(previous, current, nextTrackId, seenAt, threshold);
}
