# CutCap — Lyric Video Generator

Web-first lyric video tool: **one background image + one audio file + lyrics** → cinematic MP4.

**Current scope: browser only** (`pnpm dev`). Windows / Tauri desktop packaging is deferred (M5 later). Local export uses **ffmpeg.wasm**; cloud AI is optional and **free-tier first** (Groq Whisper, BYOK).

Product plan: [`lyric-video-generator-project-plan.md`](./lyric-video-generator-project-plan.md)

## Status

**M4 — Lyrics alignment** fits your lyric text to audio timing (Groq word timestamps + local align).

| Milestone | Focus | Status |
|---|---|---|
| M0 | Scaffold, lint/test, types, minimal navigation | done |
| M1 | Project save/open, media import, lyrics editor | done |
| M2 | FFmpeg export MVP (ASS + MP4, progress/cancel) | done (ffmpeg.wasm / web) |
| M3 | Cloud transcription (free-tier provider) | done (Groq Whisper) |
| M4 | Lyrics alignment | done (Groq force-align) |
| M5 | Windows packaging (Tauri) | deferred |
| — | Web polish / reliability (export parity, autosave, UX) | see [`docs/enhancement-plan.md`](./docs/enhancement-plan.md) |

### Web notes (supported now)

- Projects autosave in the browser (`localStorage` + media blobs in `IndexedDB`).
- Reload the page and reopen a recent project to resume editing.
- Import `.srt` / `.lrc` / plain text; edit cue text and timestamps; timeline + audio playback.
- `Download JSON` exports the project document (media stays in IndexedDB).
- **Export MP4** burns lyrics in-browser with ffmpeg.wasm (draft/standard/high); first run loads the wasm encoder.
- **Transcribe** / **Align** use Groq BYOK. See [`docs/transcription.md`](./docs/transcription.md) and [`docs/alignment.md`](./docs/alignment.md).

See [`docs/export-pipeline.md`](./docs/export-pipeline.md).

## Prerequisites (web)

- **Node.js** 20+ and **pnpm**
- Modern Chromium/Firefox/Safari (SharedArrayBuffer / wasm for export)

Rust, system FFmpeg, and VS Build Tools are **not** required for the web app. Optional desktop notes live in [`docs/setup-windows.md`](./docs/setup-windows.md) for when M5 resumes.

## Scripts

```bash
pnpm install
pnpm dev          # web app (supported path)
pnpm test         # Vitest unit tests
pnpm lint
pnpm format
# Deferred — Windows desktop:
# pnpm tauri dev
# pnpm tauri build
```

## Free AI preference

Transcription providers are registered under `src/services/ai/providers/`. Free-tier providers are listed first. Enter your Groq key in the **Transcribe** dialog (optional remember in `localStorage`), or copy `.env.example` → `.env` with `VITE_GROQ_API_KEY` for local experiments (never commit real keys).

## Project layout

See the plan’s suggested tree. Day-one modules:

- `src/app` — app shell
- `src/features/projects` — project list + editor shell
- `src/shared/types` — `Project`, cues, render plan, AI interfaces
- `src/services/ai` — provider adapters
- `src-tauri` — Tauri/Rust commands
- `docs/` — architecture and security notes
