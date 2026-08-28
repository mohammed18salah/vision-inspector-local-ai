import { describe, expect, it, vi } from "vitest";
import { installOnnxRuntimeDiagnosticFilter, isOnnxNodeAssignmentDiagnostic } from "./onnxDiagnostics";

describe("ONNX Runtime diagnostic filter", () => {
  it("recognizes only the known execution-provider placement diagnostic", () => {
    expect(isOnnxNodeAssignmentDiagnostic(["[W:onnxruntime:, session_state.cc] VerifyEachNodeIsAssignedToAnEp"])).toBe(true);
    expect(isOnnxNodeAssignmentDiagnostic(["[E:onnxruntime:] model failed to load"])).toBe(false);
  });

  it("suppresses the placement diagnostic but passes real errors through", () => {
    const error = vi.fn();
    const target = { error } as unknown as Console;
    installOnnxRuntimeDiagnosticFilter(target);

    target.error("VerifyEachNodeIsAssignedToAnEp: Some nodes were not assigned");
    target.error("model failed to load");

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("model failed to load");
  });
});
