# Vision Inspector Local AI

**Vision Inspector Local AI** is an Arabic-first, right-to-left visual-analysis workspace that runs core inference directly in the browser. It supports image object detection, OCR, interactive bounding boxes, structured JSON/CSV export, and local video object tracking while leaving the original video audio available to the user.

> The application is designed around local processing. Uploaded images and video frames are processed in the browser; the server only provides a constrained same-origin proxy for downloading public model files when the browser needs them.

## Capabilities

| Capability | Implementation |
| --- | --- |
| Image object detection | `Xenova/yolos-tiny` through Transformers.js, using WebGPU when available and WASM otherwise. |
| Small and distant objects | A local multi-scale detail pass reviews overlapping image regions when the overview finds few objects. |
| Open-vocabulary candidates | Local Grounding DINO pass for bird, turtle, and building candidates when the overview is sparse. Low-confidence results are explicitly marked as **tentative**. |
| OCR | Arabic and English OCR with Tesseract.js, including confidence and word coordinates. |
| Image inspection | Accurate `object-fit: contain` box layout, pan/zoom, focusable detections, and real image-region thumbnails. |
| Result export | JSON and CSV downloads, including bounding boxes, OCR, model source, and `candidateLabel`/`tentative` fields where relevant. |
| Video tracking | Local periodic frame analysis, IoU plus centre-proximity track matching, stable track IDs, and a canvas overlay above a native video player. |

## Quick start

### Prerequisites

- Node.js 22 or later.
- pnpm 9 or later.
- A modern Chromium-based browser is recommended. WebGPU can improve inference speed; the app falls back to WASM when it is unavailable.

### Install and run

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. Select **تحليل صورة** for image inspection or **تحليل فيديو** for video tracking. The first analysis can take longer because the browser downloads and caches the selected local model.

### Validation commands

```bash
pnpm test
pnpm check
pnpm build
```

## Architecture

```text
Browser
├── React RTL workspace
├── Transformers.js: YOLOS + Grounding DINO
├── Tesseract.js OCR
├── Canvas overlays, pan/zoom, and video frame extraction
└── JSON/CSV export

Express server
└── Allow-listed /api/model proxy for public model downloads only
```

The proxy only allows downloads from `Xenova/yolos-tiny` and `onnx-community/grounding-dino-tiny-ONNX`. It does not receive a user’s uploaded image or video data.

## Accuracy and confidence

Computer-vision detections are model predictions, not guaranteed facts. Small, blurred, distant, occluded, or unusual objects may be missed. The interface distinguishes normal detections from low-confidence open-vocabulary candidates, displayed as **مرشح** and exported with `tentative: true` and `candidateLabel`.

For best results, use well-lit source material with the object occupying a meaningful part of the frame. Video tracking rate is configurable, trading processing load for temporal detail.

## Privacy

Images, video frames, inference outputs, OCR, and exports stay in the browser. The server route used by the app is restricted to serving model files from public model repositories so that the browser can load them reliably.

## Licenses and model notices

The source code in this repository is licensed under [Apache License 2.0](./LICENSE). Third-party packages and model weights are **not** relicensed by this repository; they remain subject to their respective terms. Review the upstream model cards before redistribution or production use:

- [Xenova/yolos-tiny](https://huggingface.co/Xenova/yolos-tiny)
- [onnx-community/grounding-dino-tiny-ONNX](https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX)
- [Transformers.js](https://github.com/huggingface/transformers.js)
- [Tesseract.js](https://github.com/naptha/tesseract.js)

See [NOTICE](./NOTICE) for the repository-level attribution notice.

## Repository layout

```text
client/             React application and RTL interface
server/             Express runtime and constrained model proxy
scripts/            Reproducible browser and model validation scripts
drizzle/            Database schema scaffold from the full-stack template
shared/             Shared application types and constants
```

## Contributing

Contributions are welcome. Please keep changes Arabic-first and RTL-aware, preserve the local-processing model, add or update tests for functional behavior, and run `pnpm test && pnpm check && pnpm build` before opening a pull request.
