import { describe, expect, it } from "vitest";
import { createHistoryEntry, parseHistoryEntry, sanitizeHistoryInput } from "./history-core";

describe("local history validation", () => {
  it("keeps only a filename and no absolute path", () => {
    expect(sanitizeHistoryInput({ action: "analysis", mediaKind: "image", fileName: "C:\\Users\\person\\private-photo.jpg", engine: "wasm", detectionCount: 5, ocrWordCount: 2 })).toMatchObject({ fileName: "private-photo.jpg", detectionCount: 5 });
  });

  it("requires an explicit supported format for exports", () => {
    expect(sanitizeHistoryInput({ action: "export", mediaKind: "image", fileName: "one.jpg", engine: "wasm" })).toBeNull();
    expect(sanitizeHistoryInput({ action: "export", mediaKind: "image", fileName: "one.jpg", engine: "wasm", exportFormat: "csv" })).toMatchObject({ exportFormat: "csv" });
  });

  it("rejects malformed persisted entries", () => {
    const entry = createHistoryEntry({ action: "analysis", mediaKind: "image", fileName: "one.jpg", engine: "wasm" }, "123e4567-e89b-42d3-a456-426614174000", "2026-08-28T10:00:00.000Z");
    expect(parseHistoryEntry(entry)).toEqual(entry);
    expect(parseHistoryEntry({ ...entry, id: "not-a-uuid" })).toBeNull();
  });
});
