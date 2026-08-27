import { parseHistoryEntry, type LocalHistoryEntry } from "./history-core";

export type HistoryExportFormat = "csv" | "pdf";

type HistoryRow = {
  time: string;
  event: string;
  fileName: string;
  media: string;
  engine: string;
  detections: string;
  tracks: string;
  ocrWords: string;
  exportFormat: string;
  checksum: string;
};

function safeEntries(value: unknown): LocalHistoryEntry[] {
  return Array.isArray(value) ? value.map(parseHistoryEntry).filter((entry): entry is LocalHistoryEntry => entry !== null) : [];
}

function toRow(entry: LocalHistoryEntry): HistoryRow {
  return {
    time: new Date(entry.createdAt).toLocaleString("ar-IQ"),
    event: entry.action === "analysis" ? "تحليل" : "تصدير",
    fileName: entry.fileName,
    media: entry.mediaKind === "image" ? "صورة" : "فيديو",
    engine: entry.engine === "webgpu" ? "WebGPU" : "WASM / CPU",
    detections: String(entry.detectionCount ?? 0),
    tracks: String(entry.trackCount ?? 0),
    ocrWords: String(entry.ocrWordCount ?? 0),
    exportFormat: entry.exportFormat?.toUpperCase() ?? "—",
    checksum: entry.checksum ?? "—",
  };
}

const labels: Record<keyof HistoryRow, string> = {
  time: "الوقت", event: "الحدث", fileName: "اسم الملف", media: "النوع", engine: "المحرك", detections: "الكائنات", tracks: "المسارات", ocrWords: "كلمات OCR", exportFormat: "صيغة التصدير", checksum: "SHA-256",
};
const rowKeys = Object.keys(labels) as (keyof HistoryRow)[];

function quoteCsv(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }

export function createHistoryCsv(value: unknown) {
  const rows = safeEntries(value).map(toRow);
  return `\ufeff${[rowKeys.map((key) => quoteCsv(labels[key])), ...rows.map((row) => rowKeys.map((key) => quoteCsv(row[key])))] .map((line) => line.join(",")).join("\r\n")}\r\n`;
}

export function createHistoryPdfHtml(value: unknown) {
  const rows = safeEntries(value).map(toRow);
  const headers = rowKeys.map((key) => `<th>${escapeHtml(labels[key])}</th>`).join("");
  const body = rows.length ? rows.map((row) => `<tr>${rowKeys.map((key) => `<td>${escapeHtml(row[key])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${rowKeys.length}">لا توجد عناصر في السجل المحلي.</td></tr>`;
  const generatedAt = new Date().toLocaleString("ar-IQ");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#152033;font-size:10px}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:14px}h1{font-size:20px;margin:0}p{color:#475569;margin:5px 0 0}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#152033;color:#fff;font-weight:600}th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top;overflow-wrap:anywhere;text-align:right}tbody tr:nth-child(even){background:#f8fafc}footer{margin-top:12px;color:#64748b;font-size:9px}</style></head><body><header><div><h1>سجل Vision Inspector المحلي</h1><p>ملخصات التحليل والتصدير فقط — لا يتضمن هذا الملف صورًا أو فيديوهات أو مسارات مطلقة.</p></div><p>أُنشئ: ${escapeHtml(generatedAt)}</p></header><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table><footer>Vision Inspector Local AI · سجل محلي قابل للمشاركة</footer></body></html>`;
}
