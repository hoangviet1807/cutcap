# Transcription (M3)

## Flow

1. User imports audio into the project (IndexedDB blob).
2. **Lyrics → Transcribe** opens a confirmation dialog (provider + upload warning).
3. User supplies a **Groq API key** (BYOK). Optional remember → `localStorage` only.
4. App uploads audio to Groq Whisper (`whisper-large-v3-turbo`, `verbose_json` + segment timestamps).
5. Segments become lyric cues (`source: "transcription"`). Low-confidence segments are flagged `needsReview`.

## Credentials

| Source | Notes |
|---|---|
| Transcribe dialog | Preferred; can remember in `localStorage` (`cutcap.apiKey.groq`) |
| `VITE_GROQ_API_KEY` in `.env` | Dev convenience only — never commit real keys |
| Project JSON | Never stores keys |

OS keychain via Tauri is planned as a later hardening step; the credential helper API is already isolated under `src/services/ai/credentials.ts`.

## Provider registry

`src/services/ai/providers/` — free-tier adapters first. Default: `groq-whisper`.

UI must not call Groq URLs directly; use `runProjectTranscription` / `TranscriptionProvider`.
