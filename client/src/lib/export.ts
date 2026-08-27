import type { LocalDetection } from "./detector";

type CsvCell = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvCell) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function toCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function toExportDetection(detection: LocalDetection) {
  const tentative = detection.isUnknown && detection.label !== "unknown";
  return {
    ...detection,
    label: detection.isUnknown ? "unknown" : detection.label,
    candidateLabel: tentative ? detection.label : null,
    tentative,
    status: tentative ? "tentative" : detection.isUnknown ? "unknown" : "confirmed",
  } as const;
}

export function buildDetectionCsvRows(detections: LocalDetection[]) {
  return detections.map((detection) => {
    const exported = toExportDetection(detection);
    return [
      "object",
      exported.label,
      exported.candidateLabel ?? "",
      exported.status,
      exported.tentative,
      exported.confidence,
      exported.box.x,
      exported.box.y,
      exported.box.width,
      exported.box.height,
      "",
    ];
  });
}
