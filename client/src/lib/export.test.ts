import { describe, expect, it } from "vitest";
import { buildDetectionCsvRows, toCsv, toExportDetection } from "./export";

describe("export helpers", () => {
  it("quotes values and safely escapes embedded quote marks", () => {
    expect(toCsv([["type", "text"], ["text", "قال: \"مرحبًا\", one, two"]])).toBe('"type","text"\n"text","قال: ""مرحبًا"", one, two"');
  });

  it("exports a low-confidence candidate without presenting its candidate label as final", () => {
    const candidate = {
      id: 1,
      label: "turtle",
      confidence: 46,
      box: { x: 12, y: 20, width: 8, height: 6 },
      sourceModel: "Grounding DINO Tiny · local",
      isUnknown: true,
    };
    expect(toExportDetection(candidate)).toMatchObject({ label: "unknown", candidateLabel: "turtle", tentative: true, status: "tentative" });
    expect(buildDetectionCsvRows([candidate])[0]).toEqual(["object", "unknown", "turtle", "tentative", true, 46, 12, 20, 8, 6, ""]);
  });
});
