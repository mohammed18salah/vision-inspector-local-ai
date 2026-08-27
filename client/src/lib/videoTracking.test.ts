import { describe, expect, it } from "vitest";
import { boxIou, matchVideoTracks, type TrackedDetection } from "./videoTracking";

const car = (x: number, y: number) => ({ id: 0, label: "car", confidence: 82, box: { x, y, width: 20, height: 12 }, sourceModel: "test", isUnknown: false });

describe("video tracking", () => {
  it("calculates IoU for overlapping boxes", () => {
    expect(boxIou(car(10, 10).box, car(20, 10).box)).toBeCloseTo(1 / 3);
  });

  it("keeps a stable track ID for the same object across adjacent frames", () => {
    const previous: TrackedDetection[] = [{ ...car(10, 10), trackId: 7, lastSeenAt: 0 }];
    const result = matchVideoTracks(previous, [car(13, 11)], 8, 0.5);
    expect(result.tracked[0]?.trackId).toBe(7);
    expect(result.nextTrackId).toBe(8);
  });

  it("keeps the ID when fast motion drops IoU just below the threshold", () => {
    const previous: TrackedDetection[] = [{ ...car(10, 10), trackId: 7, lastSeenAt: 0 }];
    const result = matchVideoTracks(previous, [car(24, 10)], 8, 0.5);
    expect(result.tracked[0]?.trackId).toBe(7);
    expect(result.nextTrackId).toBe(8);
  });

  it("assigns a new track ID to a separate or differently classified object", () => {
    const previous: TrackedDetection[] = [{ ...car(10, 10), trackId: 7, lastSeenAt: 0 }];
    const result = matchVideoTracks(previous, [{ ...car(70, 60), label: "person" }], 8, 0.5);
    expect(result.tracked[0]?.trackId).toBe(8);
    expect(result.nextTrackId).toBe(9);
  });

  it("does not merge a distant object with a track of the same label", () => {
    const previous: TrackedDetection[] = [{ ...car(10, 10), trackId: 7, lastSeenAt: 0 }];
    const result = matchVideoTracks(previous, [car(70, 60)], 8, 0.5);
    expect(result.tracked[0]?.trackId).toBe(8);
    expect(result.nextTrackId).toBe(9);
  });
});
