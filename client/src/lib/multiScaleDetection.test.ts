import { describe, expect, it } from "vitest";
import { getDetailTiles, mergeDetections } from "./multiScaleDetection";

const detection = (label: string, x: number, y: number, confidence = 70) => ({
  id: 99,
  label,
  confidence,
  box: { x, y, width: 20, height: 16 },
  sourceModel: "test",
  isUnknown: false,
});

describe("multi-scale image detection", () => {
  it("creates four overlapping image regions for a detailed pass", () => {
    expect(getDetailTiles(2000, 1000)).toEqual([
      { x: 0, y: 0, width: 1160, height: 580 },
      { x: 840, y: 0, width: 1160, height: 580 },
      { x: 0, y: 420, width: 1160, height: 580 },
      { x: 840, y: 420, width: 1160, height: 580 },
    ]);
  });

  it("removes overlapping duplicate detections while retaining separate objects", () => {
    const result = mergeDetections([
      detection("bird", 10, 10, 62),
      detection("bird", 11, 11, 78),
      detection("bird", 70, 70, 66),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => [item.id, item.confidence])).toEqual([[1, 78], [2, 66]]);
  });
});
