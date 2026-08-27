# Vision Inspector Local AI — Windows Desktop

This release introduces the Windows x64 desktop edition of Vision Inspector Local AI.

## Included

- Local image object detection, multi-scale detail recovery, and open-vocabulary candidates.
- Arabic and English OCR using bundled Tesseract worker/core and language data, interactive detection boxes, JSON/CSV export, and native save dialogs.
- Local video frame tracking with stable track IDs and original video audio preserved.
- A device-aware runtime that uses WebGPU when the Windows device/browser runtime exposes an adapter and falls back to local WASM/CPU when it does not.
- An optional in-app benchmark that times warm-up and three inference iterations for local WASM/CPU and, only when available, WebGPU.
- A local history panel for analysis and export summaries. It does not retain original media bytes or absolute media paths.

## Installation and trust notice

Download the `Vision Inspector Local AI Setup *.exe` installer and verify its SHA-256 checksum against `SHA256SUMS.txt` before installation. The current public desktop build is not Authenticode-signed, so Windows SmartScreen may show a warning. Do not bypass a warning unless you downloaded the EXE from this repository's official GitHub Release and verified the checksum.

The release workflow is prepared to sign future installers only after the repository owner provides a trusted PFX certificate and password as protected GitHub Actions secrets. The workflow then verifies the finished installer with `signtool`; it otherwise emits an explicitly unsigned build. This setup does not claim that the current installer is signed.

ONNX Runtime and OCR resources are included in the installer. The first download of YOLOS or Grounding DINO weights still requires an internet connection when the selected public model is absent from the local cache. Images, videos, OCR content, detections, tracking data, and exports stay local to the device.
