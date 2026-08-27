import { describe, expect, it } from "vitest";
import { getBoxInImageSpace, getContainedImageLayout } from "./imageLayout";

describe("getContainedImageLayout", () => {
  it("centers a portrait image in a wider canvas while preserving its ratio", () => {
    expect(getContainedImageLayout(1000, 500, 500, 1000)).toEqual({ width: 250, height: 500, left: 375, top: 0 });
  });

  it("centers a landscape image in a taller canvas while preserving its ratio", () => {
    expect(getContainedImageLayout(500, 1000, 1000, 500)).toEqual({ width: 500, height: 250, left: 0, top: 375 });
  });

  it("converts the model bbox to pixels inside the contained image, not the full canvas", () => {
    const layout = getContainedImageLayout(1000, 500, 500, 1000);
    expect(getBoxInImageSpace({ x: 50, y: 60, width: 10, height: 20 }, layout)).toEqual({ left: 125, top: 300, width: 25, height: 100 });
  });

  it("centers a portrait video in a 16:9 stage so overlays exclude letterbox space", () => {
    expect(getContainedImageLayout(1280, 720, 720, 1280)).toEqual({ width: 405, height: 720, left: 437.5, top: 0 });
  });
});
