/*
 * Vision Inspector Local AI — Client-side PDF Report Exporter
 * Generates high-fidelity, printable PDF inspection reports with image snapshots,
 * detection tables, OCR extractions, and metadata.
 */
import type { LocalDetection } from "./detector";
import type { LocalOcrResult } from "./ocr";

export type PdfReportOptions = {
  imageSrc: string;
  fileName: string;
  detections: LocalDetection[];
  ocrResult: LocalOcrResult | null;
  rescueMode: boolean;
  deviceName?: string;
  sourceModel?: string;
  sourceDimensions?: { width: number; height: number };
};

/**
 * Creates an annotated snapshot of the image with bounding box overlays
 */
async function createAnnotatedImageSnapshot(
  imageSrc: string,
  detections: LocalDetection[],
  sourceSize: { width: number; height: number }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || sourceSize.width || 1200;
        const h = img.naturalHeight || sourceSize.height || 800;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(imageSrc);

        // Draw base image
        ctx.drawImage(img, 0, 0, w, h);

        // Draw bounding boxes
        detections.forEach((det, idx) => {
          const bx = (det.box.x / 100) * w;
          const by = (det.box.y / 100) * h;
          const bw = (det.box.width / 100) * w;
          const bh = (det.box.height / 100) * h;

          const isRescue = det.sourceModel?.includes("Rescue") || det.label.includes("person");
          const strokeColor = isRescue ? "#dc2626" : det.isUnknown ? "#d97706" : "#0071e3";

          ctx.lineWidth = Math.max(2, Math.round(w / 400));
          ctx.strokeStyle = strokeColor;
          if (det.isUnknown) {
            ctx.setLineDash([6, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.strokeRect(bx, by, bw, bh);

          // Draw label badge
          const labelText = `#${String(idx + 1).padStart(2, "0")} ${det.label} (${det.confidence}%)`;
          const fontSize = Math.max(12, Math.round(w / 70));
          ctx.font = `600 ${fontSize}px sans-serif`;
          const textWidth = ctx.measureText(labelText).width;
          const badgeHeight = fontSize + 8;
          const badgeWidth = textWidth + 12;

          ctx.fillStyle = strokeColor;
          ctx.fillRect(bx, Math.max(0, by - badgeHeight), badgeWidth, badgeHeight);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, bx + 6, Math.max(fontSize, by - 6));
        });

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (err) {
        console.warn("[PDF Export] Error rendering canvas snapshot:", err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Generates and triggers high-fidelity PDF export
 */
export async function exportInspectionPdf(options: PdfReportOptions): Promise<void> {
  const {
    imageSrc,
    fileName,
    detections,
    ocrResult,
    rescueMode,
    deviceName = "Local WebGPU / WASM",
    sourceModel = "Xenova/yolos-tiny",
    sourceDimensions = { width: 1280, height: 720 },
  } = options;

  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rescueCount = detections.filter(
    (d) => d.sourceModel?.includes("Rescue") || d.label.includes("person")
  ).length;

  const annotatedImage = await createAnnotatedImageSnapshot(imageSrc, detections, sourceDimensions);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("تعذر فتح نافذة التصدير، يرجى السماح بالنوافذ المنبثقة.");
  }

  const detectionRowsHtml = detections.length
    ? detections
        .map((item, index) => {
          const isRescue = item.sourceModel?.includes("Rescue") || item.label.includes("person");
          return `
          <tr style="border-bottom: 1px solid #e5e5ea; ${isRescue ? "background-color: #fef2f2;" : ""}">
            <td style="padding: 8px 10px; font-family: monospace; font-weight: 600;">#${String(index + 1).padStart(2, "0")}</td>
            <td style="padding: 8px 10px; font-weight: 600;">${item.label}</td>
            <td style="padding: 8px 10px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: ${
                item.confidence >= 80 ? "#ecfdf5; color: #047857;" : item.confidence >= 50 ? "#eff6ff; color: #1d4ed8;" : "#fffbeb; color: #b45309;"
              }">
                ${item.confidence}%
              </span>
            </td>
            <td style="padding: 8px 10px; font-family: monospace; direction: ltr; font-size: 11px;">
              X: ${Math.round(item.box.x)}% | Y: ${Math.round(item.box.y)}% | ${Math.round(item.box.width)}×${Math.round(item.box.height)}%
            </td>
            <td style="padding: 8px 10px; font-family: monospace; font-size: 10px; color: #64748b;">
              ${item.sourceModel || sourceModel}
            </td>
          </tr>
        `;
        })
        .join("")
    : `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #8c8c92;">لم يتم رصد كائنات في هذا المشهد.</td></tr>`;

  const ocrSectionHtml = ocrResult?.text
    ? `
    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 14px; color: #0f172a;">النصوص المستخرجة بالذكاء الاصطناعي (OCR)</h3>
        <div style="font-size: 11px; color: #64748b;">
          <span>${ocrResult.words.length} كلمة</span> · 
          <span>دقة المحرك: ${ocrResult.confidence}%</span>
        </div>
      </div>
      <p style="margin: 0; font-size: 12px; line-height: 1.7; color: #1e293b; white-space: pre-wrap; direction: auto;">
        ${ocrResult.text}
      </p>
    </div>
  `
    : "";

  const reportHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <title>Vision Inspector Report — ${fileName}</title>
      <style>
        @page {
          size: A4;
          margin: 14mm 12mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1d1d1f;
          background: #ffffff;
          margin: 0;
          padding: 16px;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0071e3;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .title-block h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1d1d1f;
        }
        .title-block span {
          display: block;
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }
        .meta-block {
          text-align: left;
          font-size: 10px;
          color: #64748b;
          font-family: monospace;
          direction: ltr;
        }
        .meta-block strong {
          color: #0071e3;
          font-size: 11px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .kpi-card {
          background: #f8f9fa;
          border: 1px solid #e5e5ea;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .kpi-card span {
          display: block;
          font-size: 10px;
          color: #64748b;
        }
        .kpi-card strong {
          display: block;
          font-size: 18px;
          color: #0f172a;
          margin-top: 2px;
        }
        .image-container {
          text-align: center;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px;
          margin-bottom: 20px;
        }
        .image-container img {
          max-width: 100%;
          max-height: 380px;
          border-radius: 6px;
          object-fit: contain;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 10px;
        }
        th {
          background: #f1f5f9;
          padding: 8px 10px;
          text-align: right;
          font-size: 11px;
          color: #475569;
          border-bottom: 2px solid #cbd5e1;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; padding: 12px; background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; font-weight: 600; color: #0369a1;">اضغط زر الحفظ لحفظ التقرير كملف PDF رسمي:</span>
        <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          📄 حفظ / طباعة كـ PDF
        </button>
      </div>

      <div class="header">
        <div class="title-block">
          <h1>VISION INSPECTOR LOCAL AI</h1>
          <span>تقرير الفحص والاستدلال البصري المتقدم · معالجة محلية خاصة</span>
        </div>
        <div class="meta-block">
          <strong>CONFIDENTIAL REPORT</strong><br />
          FILE: ${fileName}<br />
          DATE: ${dateStr}<br />
          ENGINE: ${deviceName}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span>إجمالي الكائنات</span>
          <strong>${detections.length}</strong>
        </div>
        <div class="kpi-card">
          <span>أهداف الإنقاذ</span>
          <strong style="color: ${rescueCount > 0 ? "#dc2626" : "#0f172a"};">${rescueCount}</strong>
        </div>
        <div class="kpi-card">
          <span>الكلمات المستخرجة</span>
          <strong>${ocrResult?.words.length ?? 0}</strong>
        </div>
        <div class="kpi-card">
          <span>وضع الفحص</span>
          <strong style="font-size: 13px;">${rescueMode ? "بحث وإنقاذ كوارث" : "استدلال عام"}</strong>
        </div>
      </div>

      <div class="image-container">
        <img src="${annotatedImage}" alt="Annotated Visual Detection" />
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">المشهد البصري الموثق مع إحداثيات ومربعات الاستدلال</div>
      </div>

      <h3 style="font-size: 14px; margin-bottom: 6px; color: #0f172a;">جدول الكائنات المكتشفة وتفاصيل الإحداثيات:</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>الكائن المكتشف</th>
            <th style="width: 80px;">الثقة</th>
            <th>الإحداثيات والأبعاد</th>
            <th>النموذج</th>
          </tr>
        </thead>
        <tbody>
          ${detectionRowsHtml}
        </tbody>
      </table>

      ${ocrSectionHtml}

      <div class="footer">
        <span>تم التطوير بواسطة: <strong>Mohammed Salahuldeen Dev</strong></span>
        <span>100% On-Device WebGPU Inference · Zero Data Leakage</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();
}
