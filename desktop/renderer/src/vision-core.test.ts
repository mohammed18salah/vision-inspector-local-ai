import { describe, expect, it } from "vitest";
import { matchTracks, mergeDetections, toCsv, type Detection } from "./vision-core";

const car: Detection = { id: 1, label: "car", confidence: 89, box: { x: 20, y: 20, width: 20, height: 20 }, sourceModel: "YOLOS", isUnknown: false };

describe("Windows vision core", () => {
  it("keeps a track ID when a matching object moves a short distance", () => {
    const first = matchTracks([], [car], 1, 0);
    const second = matchTracks(first.tracked, [{ ...car, box: { ...car.box, x: 27 } }], first.nextTrackId, 1);
    expect(second.tracked[0]?.trackId).toBe(1);
  });

  it("deduplicates an overlapping candidate but preserves a distant candidate", () => {
    const merged = mergeDetections([car, { ...car, id: 2, confidence: 50 }, { ...car, id: 3, label: "bird", box: { x: 72, y: 10, width: 8, height: 8 }, isUnknown: true }]);
    expect(merged).toHaveLength(2);
    expect(merged[1]?.label).toBe("bird");
  });

  it("exports tentative candidates with an explicit label and status", () => {
    const csv = toCsv([{ ...car, label: "turtle", isUnknown: true, confidence: 42 }], null);
    expect(csv).toContain('"unknown","turtle","tentative"');
  });
});
