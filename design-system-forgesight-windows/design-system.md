# ForgeSight Windows Design System

## Overview

ForgeSight Windows is a **precision desktop workspace** for local media analysis. It must feel native to a modern Windows desktop: dense enough for serious inspection, calm enough for long sessions, and clear about the privacy and hardware state of the device. It is not a copy of the web interface. The desktop app uses a graphite inspection field, translucent command surfaces, and high-signal device indicators.

## Color system

| Token | Value | Visual | Usage rule |
| --- | --- | --- | --- |
| Canvas | `#101317` | ████ | Media surround and app background. Never use for body text surfaces. |
| Surface | `#171B21` | ████ | Main sidebars, panels, and inspector cards. |
| Raised surface | `#202630` | ████ | Hover states, menus, and controls. |
| Azure | `#53B2FF` | ████ | Primary action, focus, selected navigation. Keep it for a single key action per area. |
| Mineral lime | `#A8E85A` | ████ | Local processing, ready GPU, success only. Do not use as a general decorative color. |
| Amber | `#F4BE63` | ████ | Candidate/low-confidence result and fallback state. |
| Coral | `#FF7D7B` | ████ | Recoverable errors and destructive actions. |

All regular text must meet a minimum 4.5:1 contrast ratio against its surface. Never convey confidence only by color: confirmed labels say **مؤكد**, and low-confidence labels say **مرشح**.

## Typography

`Changa` gives Arabic headings a deliberate, technical presence. `Tajawal` carries dense UI copy with readable Arabic metrics. `JetBrains Mono` is reserved for runtime, device, timecode, confidence, and file metadata. Avoid all-caps Arabic. Keep English technical names in LTR isolated spans so RTL layout stays stable.

## Spacing and layout

The system uses a 4px unit. Standard panel padding is 20px; related control groups use 8px or 12px gaps; major workspace areas are separated by 24px. At widths above 1100px, use a three-column layout: navigation (240px), media workspace (fluid), inspector (320px). Collapse the navigation at narrow widths and stack the inspector below the media area under 840px.

## Component patterns

Primary buttons are azure, one per task context, and contain a verb: «افتح ملفًا»، «ابدأ التحليل»، «صدّر JSON». Secondary buttons use the raised surface and visible 1px boundary. Panels always retain a thin border—even when shadowed—to preserve hierarchy on dark surfaces. Detection boxes use cool blue when confirmed and amber dashed borders when tentative. Tooltips should explain the actual WebGPU and WASM/CPU fallback choices in plain Arabic; this implementation does not claim a native DirectML backend.

## Windows adaptation rules

Respect the system color scheme, reduced-motion setting, and window scale. Use a 36px minimum control height and visible keyboard focus. For standard window chrome, preserve native Windows controls; do not recreate minimize/maximize/close buttons unless using a custom title bar with equivalent accessible actions. Report the inference device actually selected by runtime, not the preferred device.

## AI agent instructions

1. Keep content Arabic-first and RTL; wrap file extensions, model IDs, timecodes, and percentages in `dir="ltr"` spans.
2. Use `--fs-*` variables only; do not hardcode color, radius, or shadow values in components.
3. Preserve a strong visual distinction between confirmed detections and tentative candidates.
4. Make the media canvas the largest region; controls and results must support, not compete with, the image or video.
5. Do not simulate device capability. The UI must render the execution provider reported by runtime.
