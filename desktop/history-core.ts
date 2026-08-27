export type HistoryMediaKind = "image" | "video";
export type HistoryAction = "analysis" | "export";
export type HistoryExportFormat = "json" | "csv";

export type LocalHistoryInput = {
  action: HistoryAction;
  mediaKind: HistoryMediaKind;
  fileName: string;
  engine: "webgpu" | "wasm";
  detectionCount?: number;
  trackCount?: number;
  ocrWordCount?: number;
  exportFormat?: HistoryExportFormat;
  checksum?: string;
};

export type LocalHistoryEntry = LocalHistoryInput & { id: string; createdAt: string };

const MAX_FILE_NAME_LENGTH = 160;
const SHA256 = /^[a-f0-9]{64}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonNegativeCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function safeFileName(value: unknown) {
  if (typeof value !== "string") return null;
  const leaf = value.split(/[\\/]/).pop()?.trim().replace(/[\u0000-\u001f]/g, "") ?? "";
  return leaf ? leaf.slice(0, MAX_FILE_NAME_LENGTH) : null;
}

export function sanitizeHistoryInput(value: unknown): LocalHistoryInput | null {
  if (!isRecord(value)) return null;
  const fileName = safeFileName(value.fileName);
  if (!fileName || (value.action !== "analysis" && value.action !== "export") || (value.mediaKind !== "image" && value.mediaKind !== "video") || (value.engine !== "webgpu" && value.engine !== "wasm")) return null;
  const exportFormat = value.exportFormat === "json" || value.exportFormat === "csv" ? value.exportFormat : undefined;
  const checksum = typeof value.checksum === "string" && SHA256.test(value.checksum) ? value.checksum.toLowerCase() : undefined;
  if (value.action === "export" && !exportFormat) return null;
  return {
    action: value.action,
    mediaKind: value.mediaKind,
    fileName,
    engine: value.engine,
    detectionCount: nonNegativeCount(value.detectionCount),
    trackCount: nonNegativeCount(value.trackCount),
    ocrWordCount: nonNegativeCount(value.ocrWordCount),
    exportFormat,
    checksum,
  };
}

export function createHistoryEntry(input: LocalHistoryInput, id: string, createdAt: string): LocalHistoryEntry {
  return { ...input, id, createdAt };
}

export function parseHistoryEntry(value: unknown): LocalHistoryEntry | null {
  if (!isRecord(value) || typeof value.id !== "string" || !UUID.test(value.id) || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return null;
  const input = sanitizeHistoryInput(value);
  return input ? createHistoryEntry(input, value.id, value.createdAt) : null;
}
