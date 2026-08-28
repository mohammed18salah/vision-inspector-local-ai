# Vision Inspector Local AI

> **Developed by:** **Mohammed Salahuldeen Dev** ([@mohammed18salah](https://github.com/mohammed18salah))  
> **Version:** `v1.3.0` | **Privacy:** 100% On-Device AI Processing (Zero Cloud Data Transmission) | **License:** MIT

**Vision Inspector Local AI** is an Arabic-first, right-to-left visual-analysis and disaster rescue workspace for the web and Windows. It supports image object detection, humanitarian disaster search & rescue scanning, OCR, interactive bounding boxes, structured JSON/CSV export, and local video object tracking while leaving the original video audio available to the user.

> The application is designed around local processing. Uploaded images, video frames, OCR results, detection boxes, tracking data, and exports stay on the device. The web version connects directly to model repositories via local browser cache (`CacheStorage` / `IndexedDB`) using WebGPU or WASM. The Windows version accesses files through a native selection dialog and downloads public model artifacts only when they are missing from the local cache.

---

## Screenshots

| Windows Classic Dark — initial state | Windows local-history sharing |
| --- | --- |
| ![Electron capture of the current Classic Dark initial state with no file selected and no claimed detections.](docs/screenshots/windows-desktop-classic-home.png) | ![Electron capture of the local history panel with CSV and PDF sharing controls.](docs/screenshots/windows-desktop-history-export.png) |

---

## Capabilities

| Capability | Implementation |
| :--- | :--- |
| **Image object detection** | `Xenova/yolos-tiny` through `@huggingface/transformers` v3, utilizing WebGPU when available and WASM fallback. |
| **Disaster Search & Rescue** | Dedicated mode with `onnx-community/grounding-dino-tiny-ONNX` zero-shot detection for finding trapped persons under rubble, partially buried human bodies/limbs in debris, and emergency equipment. |
| **Small and distant objects** | A local multi-scale detail pass reviews overlapping image tiles when the overview finds few objects or when Rescue Mode is active. |
| **Open-vocabulary candidates** | Local Grounding DINO pass for people, buildings, vehicles, and specific target queries. Low-confidence results are explicitly marked as **tentative** or **rescue candidates**. |
| **Arabic & English OCR** | Arabic and English OCR with bundled Tesseract.js worker/core and `eng`/`ara` language data, including confidence and word coordinates. |
| **Interactive image inspection** | Accurate `object-fit: contain` box layout, smooth pan/zoom, focusable detections, and real image-region thumbnails. |
| **Structured export** | JSON and CSV downloads, including bounding boxes, OCR text, model source, and `candidateLabel`/`tentative`/`rescue` fields. |
| **Real-time video tracking** | Local periodic frame analysis, IoU plus center-proximity track matching, stable track IDs, and a canvas overlay above a native video player that preserves audio playback. |
| **Windows desktop application** | Electron desktop workspace with native file/save dialogs, local `vision-media://` file session protocol, device diagnostics, bundled ONNX Runtime/OCR assets, and WebGPU-to-WASM fallback. |
| **Local performance benchmark** | Optional, on-demand benchmark with separate model warm-up and three inference passes. Reports median execution time for WASM/CPU vs WebGPU hardware acceleration. |
| **Local history & audit log** | Persisted analysis and export summaries with local review, individual deletion, and clear-all control. Visible summaries can be exported as BOM-encoded CSV or self-contained landscape A4 PDF. |

---

## Quick start

### Prerequisites

- **Node.js** 20 or 22+.
- **pnpm** 9 or 10.
- A modern Chromium-based browser (Chrome, Edge) is recommended for hardware-accelerated **WebGPU** inference.

---

### Run the web application locally

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open `http://localhost:5173`. Select **تحليل صورة والأنقاض** for image/disaster inspection or **تحليل فيديو** for real-time video tracking.

---

### Run the Windows desktop app from source

| Requirement | Notes |
| :--- | :--- |
| **Operating system** | Windows 10/11 x64 is the primary target. The UI can also be developed on any Electron-supported OS. |
| **Runtime** | Node.js 22 and pnpm 10. |
| **GPU Acceleration** | Optional. The app uses WebGPU when available and automatically falls back to local WASM/CPU. |
| **Storage** | Free space is needed for the initial vision-model cache. ONNX Runtime and Tesseract OCR resources are bundled. |

```bash
pnpm install
pnpm desktop:dev
```

To build a standalone production Windows installer (.exe):

```bash
pnpm desktop:pack:win
```

The installer executable will be written to `release/`.

---

### Validation commands

```bash
pnpm test          # Run Vitest test suites (all 14 test files)
pnpm check         # TypeScript typecheck
pnpm build         # Build production web bundle (dist/public)
pnpm desktop:check # Typecheck desktop codebase
pnpm desktop:build # Build desktop renderer and main bundles
```

---

### Deploy to Vercel

This repository includes `vercel.json` configured for instant deployment:

| Vercel setting | Required value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Install Command** | `pnpm install --frozen-lockfile` |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist/public` |

Static assets (`/assets/*`, `/ocr-assets/*`, `*.wasm`, `*.onnx`) are served with explicit HTTP `Cache-Control` headers for maximum client-side performance.

---

## Architecture

```text
Vision Inspector Local AI
├── Web Client (Vite + React + TailwindCSS)
│   ├── Hugging Face Transformers.js v3 (WebGPU / WASM execution)
│   │   ├── Primary Detector: Xenova/yolos-tiny
│   │   └── Zero-Shot & Rescue Detector: onnx-community/grounding-dino-tiny-ONNX
│   ├── Tesseract.js (Arabic & English OCR with IndexedDB model persistence)
│   ├── Multi-Scale Detail & Tile Scanner (Canvas recycle pool)
│   └── Video Audio-Preserving Frame Tracker
│
├── Desktop App (Electron Windows x64)
│   ├── Native IPC Bridge & Local File Protocols (vision-media://)
│   ├── Offline Model Cache (ONNX + Tensor Weights)
│   └── Local History & PDF/CSV Export Engine
│
└── Developed by: Mohammed Salahuldeen Dev
```

---

## Privacy Manifesto

- **Zero Cloud Leakage:** No image, video frame, detection box, or OCR text is ever transmitted to remote servers.
- **Local Persistence:** Vision models and OCR dictionaries are cached locally within the client browser (`IndexedDB` / `CacheStorage`) for complete offline availability.
- **Humanitarian Purpose:** Designed for emergency responders, civil defense teams, and computer vision researchers.

---

## Author & Developer

- **Name:** **Mohammed Salahuldeen Dev**
- **GitHub:** [@mohammed18salah](https://github.com/mohammed18salah)
- **Repository:** [mohammed18salah/vision-inspector-local-ai](https://github.com/mohammed18salah/vision-inspector-local-ai)

---

## License

This project is licensed under the [MIT License](LICENSE).
