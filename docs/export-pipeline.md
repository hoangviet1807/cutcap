# Export pipeline (M2)

## Flow

1. Validate project (image, audio, duration, cues).
2. Build a `RenderPlan` (canvas, style, cues, quality).
3. Generate ASS subtitles (`lyrics.ass`) with `\pos` + `\fad`.
4. Encode MP4:
   - **Browser (current):** `ffmpeg.wasm` burns ASS when libass is available; otherwise falls back to `drawtext` + bundled Noto Sans.
   - **Native (later):** Tauri spawns system/bundled FFmpeg with the same ASS + filter plan.

## Quality presets

| Quality | Resolution | Notes |
|---|---|---|
| draft | ≤ ~720p edge | `ultrafast`, CRF 28 |
| standard | project canvas | `medium`, CRF 23 |
| high | project canvas | `slow`, CRF 18 |

Aspect ratio comes from the project canvas (16:9 or 9:16).

## Cancellation

`AbortController` terminates the in-flight ffmpeg.wasm instance and resets the singleton so the next export reloads cleanly.
