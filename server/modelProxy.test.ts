import { describe, expect, it } from "vitest";
import { isAllowedModelPath, isAllowedOcrAsset, isAllowedOrtAsset } from "./modelProxy";

describe("model proxy allowlist", () => {
  it("allows only the two local vision model repositories", () => {
    expect(isAllowedModelPath("Xenova/yolos-tiny/resolve/main/config.json")).toBe(true);
    expect(isAllowedModelPath("Xenova/yolos-tiny/resolve/main/onnx/model_quantized.onnx")).toBe(true);
    expect(isAllowedModelPath("onnx-community/grounding-dino-tiny-ONNX/resolve/main/config.json")).toBe(true);
  });

  it("rejects traversal and other repositories", () => {
    expect(isAllowedModelPath("Xenova/yolos-tiny/../secrets.txt")).toBe(false);
    expect(isAllowedModelPath("onnx-community/grounding-dino-tiny-ONNX/../secrets.txt")).toBe(false);
    expect(isAllowedModelPath("other/model/resolve/main/config.json")).toBe(false);
  });

  it("allows only required local ONNX Runtime artifacts", () => {
    expect(isAllowedOrtAsset("ort-wasm-simd-threaded.jsep.mjs")).toBe(true);
    expect(isAllowedOrtAsset("ort-wasm-simd-threaded.jsep.wasm")).toBe(true);
    expect(isAllowedOrtAsset("../../secrets.txt")).toBe(false);
    expect(isAllowedOrtAsset("other-runtime.wasm")).toBe(false);
  });

  it("allows only required same-origin OCR artifacts", () => {
    expect(isAllowedOcrAsset("worker.min.js")).toBe(true);
    expect(isAllowedOcrAsset("tesseract-core-simd.wasm.js")).toBe(true);
    expect(isAllowedOcrAsset("lang/ara.traineddata")).toBe(true);
    expect(isAllowedOcrAsset("lang/eng.traineddata")).toBe(true);
    expect(isAllowedOcrAsset("lang/../private.txt")).toBe(false);
  });
});
