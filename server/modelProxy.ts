import type { Express } from "express";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

const MODEL_REPOSITORIES = [
  "Xenova/yolos-tiny/",
  "onnx-community/grounding-dino-tiny-ONNX/",
];
const HUGGING_FACE_ORIGIN = "https://huggingface.co/";
const ORT_ASSETS = new Set(["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]);
const OCR_ASSETS = new Set(["worker.min.js", "tesseract-core-simd.wasm.js", "lang/eng.traineddata", "lang/ara.traineddata"]);

/**
 * Lazily resolved paths — safe to initialize to null in serverless environments
 * where node module resolution from source paths may not be available.
 */
let _transformersDist: string | null = null;
let _ocrAssetRoot: string | null = null;

function getTransformersDist(): string | null {
  if (_transformersDist !== null) return _transformersDist;
  try {
    const req = createRequire(import.meta.url);
    const resolved = req.resolve("@huggingface/transformers");
    _transformersDist = path.dirname(resolved);
  } catch {
    _transformersDist = null;
  }
  return _transformersDist;
}

function getOcrAssetRoot(): string | null {
  if (_ocrAssetRoot !== null) return _ocrAssetRoot;
  try {
    // import.meta.dirname may be unavailable in some serverless runtimes
    const dirname: string | undefined = (import.meta as unknown as Record<string, unknown>).dirname as string | undefined;
    if (!dirname) return null;
    _ocrAssetRoot = existsSync(path.join(dirname, "ocr-assets"))
      ? path.join(dirname, "ocr-assets")
      : path.join(dirname, "..", "desktop", "renderer", "public", "tesseract");
  } catch {
    _ocrAssetRoot = null;
  }
  return _ocrAssetRoot;
}

export function isAllowedModelPath(requestPath: string) {
  return MODEL_REPOSITORIES.some((repository) => requestPath.startsWith(repository)) && !requestPath.includes("..");
}

export function isAllowedOrtAsset(asset: string) {
  return ORT_ASSETS.has(asset);
}

export function isAllowedOcrAsset(asset: string) {
  return OCR_ASSETS.has(asset);
}

/**
 * Proxies only the allow-listed local vision model files. Inference remains
 * in the browser; this route only makes public model downloads same-origin.
 */
export function registerModelProxy(app: Express) {
  app.get("/api/ort/:asset", (req, res) => {
    const asset = req.params.asset;
    if (!isAllowedOrtAsset(asset)) {
      res.status(403).json({ error: "ONNX Runtime asset is not allowed" });
      return;
    }
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.setHeader("access-control-allow-origin", "*");
    const transformersDist = getTransformersDist();
    if (!transformersDist) {
      res.status(501).json({ error: "ORT assets not available in this environment" });
      return;
    }
    res.sendFile(path.join(transformersDist, asset));
  });

  app.get("/api/ocr/*", (req, res) => {
    const asset = decodeURIComponent(req.originalUrl.split("?")[0].replace(/^\/api\/ocr\//, ""));
    if (!isAllowedOcrAsset(asset)) {
      res.status(403).json({ error: "OCR asset is not allowed" });
      return;
    }
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.setHeader("access-control-allow-origin", "*");
    const ocrRoot = getOcrAssetRoot();
    if (!ocrRoot) {
      res.status(501).json({ error: "OCR assets not available in this environment" });
      return;
    }
    res.sendFile(path.join(ocrRoot, asset));
  });

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
