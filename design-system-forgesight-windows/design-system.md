# ForgeSight Classic Dark 2.0

> **Hallmark pre-emit critique:** Philosophy 5/5 · Hierarchy 5/5 · Execution 5/5 · Specificity 5/5 · Restraint 5/5 · Variety 4/5.

ForgeSight Classic Dark is an Arabic-first system for a local Windows inspection workspace. It draws from the composure of classic Apple utility software: the media is primary, controls are quiet, typography is clear, and state is communicated by wording and placement before colour. It is deliberately not a neon, glass-heavy, or icon-dense “AI” theme.

## Colour system

| Token | Value | Visual | Rule |
| --- | --- | --- | --- |
| Canvas | `oklch(15% 0.012 255)` | ████ | Deepest background and media surround; never use for ordinary text panels. |
| Surface | `oklch(18% 0.012 255)` | ████ | Navigation, inspector, and primary cards. |
| Raised surface | `oklch(22% 0.013 255)` | ████ | Fields, secondary buttons, and result rows. |
| Focus blue | `oklch(72% 0.135 250)` | ████ | One key action per area, keyboard focus, and confirmed selection. |
| Success green | `oklch(75% 0.115 155)` | ████ | Completion only; never a general decoration or “GPU ready” claim. |
| Candidate amber | `oklch(79% 0.115 78)` | ████ | Low-confidence candidate and unavailable comparison. |
| Error coral | `oklch(68% 0.16 25)` | ████ | Recoverable errors and destructive choices. |

All normal text must retain at least 4.5:1 contrast against its intended surface. A confirmed result must say **مؤكد** where the context needs it, and a low-confidence result must say **مرشح**; colour alone is never the only signal.

## Typography and spacing

The intentional single-font system uses `Segoe UI Variable` for heading and body so Windows text feels native rather than branded. `Cascadia Mono` is limited to engine state, durations, checksums, and benchmark values. Use a 4px base grid with 12px gaps inside controls, 16px compact-panel spacing, 20px standard-panel padding, and 24px separation between major workspace areas.

## Component rules

The primary button is a restrained blue capsule only for the current task, with an Arabic verb such as «ابدأ التحليل» or «تشغيل المقارنة». Secondary buttons remain graphite with a one-pixel outline. Cards are matte and hairline-bounded; they do not use decorative gradients. Confirmed bounding boxes use quiet blue; candidate boxes use dashed amber. Icons are optional functional affordances, never decorative labels; do not use emoji or icons such as sparkles, lightning, or a brain to market the analysis.

## Windows adaptation

Preserve native window controls. Keep actions keyboard reachable and show an immediate blue focus ring. The responsive layouts are verified at 320, 375, 414, and 768 pixels for renderer resilience, while the packaged desktop window maintains its practical minimum working width. Respect system reduced-motion settings and limit motion to opacity and transform.

## AI implementation instructions

1. Use only `--fs-*` colour, type, radius, spacing, shadow, and motion tokens; do not introduce literal colours or font families inside components.
2. Keep content Arabic-first and RTL. Wrap model IDs, timings, checksums, and percentages in `dir="ltr"` spans.
3. Let media fill the visual centre. Navigation, performance, history, and results remain supporting tools.
4. Show only runtime-confirmed device information. Label absent WebGPU as unavailable rather than inferring GPU speed.
5. History is local and must not expose absolute paths or retain the user’s original media bytes.
