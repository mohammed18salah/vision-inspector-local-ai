import { describe, expect, it } from "vitest";
import { createHistoryCsv, createHistoryPdfHtml } from "./history-export-core";

const fixture = [{ id: "123e4567-e89b-42d3-a456-426614174000", createdAt: "2026-08-28T10:00:00.000Z", action: "analysis", mediaKind: "image", fileName: "C:\\Private\\<unsafe>,photo.jpg", engine: "wasm", detectionCount: 5, ocrWordCount: 9 }];

describe("local history export", () => {
  it("writes a BOM-prefixed CSV with escaped safe fields only", () => {
    const csv = createHistoryCsv(fixture);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"<unsafe>,photo.jpg"');
    expect(csv).not.toContain("C:\\Private");
  });

  it("escapes unsafe text in the self-contained PDF HTML", () => {
    const html = createHistoryPdfHtml(fixture);
    expect(html).toContain("&lt;unsafe&gt;");
    expect(html).not.toContain("C:\\Private");
    expect(html).toContain("لا يتضمن هذا الملف صورًا أو فيديوهات أو مسارات مطلقة");
  });
});
