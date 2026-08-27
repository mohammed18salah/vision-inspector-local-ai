import type { Express } from "express";
import { Readable } from "node:stream";

const MODEL_REPOSITORIES = [
  "Xenova/yolos-tiny/",
  "onnx-community/grounding-dino-tiny-ONNX/",
];
const HUGGING_FACE_ORIGIN = "https://huggingface.co/";

export function isAllowedModelPath(requestPath: string) {
  return MODEL_REPOSITORIES.some((repository) => requestPath.startsWith(repository)) && !requestPath.includes("..");
}

/**
 * Proxies only the allow-listed local vision model files. Inference remains
 * in the browser; this route only makes public model downloads same-origin.
 */
export function registerModelProxy(app: Express) {
  app.get("/api/model/*", async (req, res) => {
    try {
      const requestPath = decodeURIComponent(req.originalUrl.split("?")[0].replace(/^\/api\/model\//, ""));
      if (!isAllowedModelPath(requestPath)) {
        res.status(403).json({ error: "Model path is not allowed" });
        return;
      }

      const upstream = await fetch(`${HUGGING_FACE_ORIGIN}${requestPath}`, {
        headers: {
          ...(req.headers.range ? { range: req.headers.range } : {}),
          "user-agent": "VisionInspector/1.0 model-proxy",
        },
        redirect: "follow",
      });

      res.status(upstream.status);
      for (const header of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      res.setHeader("access-control-allow-origin", "*");

      if (!upstream.body) {
        res.end();
        return;
      }
      const modelStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
      const closeStream = () => {
        if (!modelStream.destroyed) modelStream.destroy();
      };
      req.once("aborted", closeStream);
      res.once("close", () => {
        if (!res.writableEnded) closeStream();
      });
      modelStream.once("error", (streamError) => {
        console.warn("[Model Proxy] Model download stream interrupted", streamError);
        if (!res.headersSent) res.status(502).json({ error: "Model download was interrupted" });
        else if (!res.writableEnded) res.end();
      });
      modelStream.pipe(res);
    } catch (error) {
      console.error("[Model Proxy] Upstream model fetch failed", error);
      if (!res.headersSent) res.status(502).json({ error: "Unable to download the local model" });
      else res.end();
    }
  });
}
