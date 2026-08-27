import { describe, expect, it } from "vitest";
import { isAllowedModelPath } from "./modelProxy";

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
});
