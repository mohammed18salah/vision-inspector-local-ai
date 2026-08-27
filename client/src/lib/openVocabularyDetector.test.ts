import { describe, expect, it } from "vitest";
import { isOpenVocabularyCandidate, normalizeOpenVocabularyLabel } from "./openVocabularyDetector";

describe("open vocabulary label normalization", () => {
  it("normalizes a prompt-derived combined label to the concrete class", () => {
    expect(normalizeOpenVocabularyLabel("car vehicle")).toBe("car");
  });

  it("removes the article and preserves supported open vocabulary labels", () => {
    expect(normalizeOpenVocabularyLabel("a turtle.")).toBe("turtle");
    expect(normalizeOpenVocabularyLabel("a building.")).toBe("building");
  });

  it("marks low-confidence open vocabulary output as a tentative candidate", () => {
    expect(isOpenVocabularyCandidate(38)).toBe(true);
    expect(isOpenVocabularyCandidate(50)).toBe(false);
  });
});
