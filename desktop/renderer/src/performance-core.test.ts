import { describe, expect, it } from "vitest";
import { benchmarkStats, compareToWasm, median } from "./performance-core";

describe("desktop performance statistics", () => {
  it("uses a median that is resistant to a slow outlier", () => {
    expect(median([9, 10, 11, 250])).toBe(10.5);
    expect(benchmarkStats([9, 10, 11]).medianMs).toBe(10);
  });

  it("calculates a WebGPU improvement only when both paths were measured", () => {
    expect(compareToWasm(40, 100)).toEqual({ baseline: "wasm", webgpuMedianMs: 40, wasmMedianMs: 100, improvementPercent: 60 });
    expect(compareToWasm(null, 100).improvementPercent).toBeNull();
  });
});
