# ADR 001 — Stack and free-first AI

## Status

Accepted (M0)

## Context

Build a personal-first lyric video desktop app that stays product-ready. Prefer free AI models/tiers for transcription.

## Decision

- Desktop shell: **Tauri 2 + React + TypeScript + Vite + Tailwind**
- Local render later via **FFmpeg + ASS**
- AI behind `TranscriptionProvider` / `LyricsAligner` adapters
- Default provider candidate: **Groq Whisper** (free tier), BYOK

## Consequences

- Rust toolchain is required for `pnpm tauri dev`
- Frontend and domain logic can be developed/tested without Rust via `pnpm dev` + Vitest
- Provider swaps do not require UI rewrites
