# Security Policy

## Desktop application model

Vision Inspector Local AI uses Electron with `contextIsolation` enabled and `nodeIntegration` disabled. The renderer receives a deliberately small preload API: select a supported local image/video file, save a text export through a native dialog, and read device diagnostics. It cannot execute arbitrary system commands or access arbitrary filesystem paths.

The desktop Content Security Policy permits `'unsafe-eval'` solely because the bundled ONNX Runtime WebAssembly runtime requires it in current Electron/Chromium builds. All renderer JavaScript is still constrained to packaged same-origin files; no third-party script origin is whitelisted. Keep Electron and ONNX Runtime updated, and do not load remote web content into the application window.

The `vision-media://` protocol is backed only by files selected through the native dialog during the running session. It is not a general file URL handler.

## Reporting a vulnerability

Please open a private GitHub security advisory for this repository. Do not include user media, model caches, API credentials, or personally identifiable information in a public issue.

## Distribution integrity

The public Windows build is currently **not Authenticode-signed**. Download the installer only from GitHub Releases, verify the published SHA-256 checksum, and treat any mismatched checksum as untrusted.

The release workflow supports a controlled signing path when the repository owner adds both GitHub Actions secrets below. The PFX file is decoded only in the temporary directory of the Windows runner, used by Electron Builder through `CSC_LINK` and `CSC_KEY_PASSWORD`, verified with `signtool verify /pa`, then deleted in an `always()` cleanup step. Neither secret belongs in source control, release assets, logs, issues, or local configuration files.

| GitHub Actions secret | Required value |
| --- | --- |
| `WINDOWS_CERTIFICATE_PFX_BASE64` | Base64 encoding of a valid code-signing PFX certificate. |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password protecting that PFX certificate. |

Until both secrets are present and the verification step passes, the workflow deliberately records the build as unsigned. A prepared signing path does not itself create a certificate or remove Windows SmartScreen warnings.
