import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const source = path.join(projectRoot, "desktop", "renderer", "public", "tesseract");
const destination = path.join(projectRoot, "dist", "ocr-assets");

await rm(destination, { recursive: true, force: true });
await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });
console.log("Copied local OCR runtime assets for same-origin web inference.");
