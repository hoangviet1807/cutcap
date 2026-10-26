# Architecture (M0)

## Stack

- **Shell:** Tauri 2 (Windows desktop first)
- **UI:** React + TypeScript + Vite + Tailwind CSS
- **Render (M2+):** local FFmpeg + ASS subtitles
- **AI (M3+):** provider adapters; free-tier first (Groq Whisper transcription + force-align), BYOK

## Boundaries

```text
React UI  --invoke-->  Tauri commands (Rust)
                          ├── project / filesystem
                          ├── credentials (OS keychain)
                          └── render (FFmpeg child process)

React UI  --HTTPS-->  TranscriptionProvider / LyricsAligner
                      (only after explicit user action)
```

- No always-on local Python/FastAPI service in MVP.
- No database; versioned project JSON + files.
- UI must not call provider-specific APIs directly — use adapters under `src/services/ai/`.

## Domain

Core types live in `src/shared/types/`:

- `Project`, `LyricCue`, `CanvasSettings`
- `RenderPlan` (normalized export input)
- `TranscriptionProvider`, `LyricsAligner`

`schemaVersion` is required on every project file; migrations will live next to the repository layer.

## Free-model preference

Default transcription registry order:

1. `groq-whisper` — free tier, Whisper-compatible (`freeTier: true`)
2. Paid / other hosted Whisper adapters as they are added

Default lyrics aligner:

1. `groq-force-align` — Whisper word timestamps + local Needleman–Wunsch (`freeTier: true`)

Keys are never stored in project JSON or the repo. Personal use is BYOK via the Transcribe/Align dialogs / `localStorage` (or `VITE_GROQ_API_KEY` for dev). OS keychain via Tauri can replace storage later.

## Security notes (initial)

- Restrict Tauri capabilities to what the app needs (`src-tauri/capabilities/`).
- Validate paths and project JSON as untrusted input.
- Invoke FFmpeg with argument arrays, never shell-interpolated strings.
- Redact secrets from logs; warn before uploading audio to any cloud provider.
