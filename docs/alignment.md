# Lyrics alignment (M4)

## Goal

You already know the lyric text (paste / import). Alignment **keeps that text** and fits start/end times to the audio.

Different from **Transcribe** (M3), which invents both text and timing from speech.

## Flow

1. Import audio; paste or import lyric lines (text only is fine).
2. **Lyrics → Align** opens a confirmation dialog.
3. BYOK Groq key (same store as Transcribe).
4. App uploads audio → Groq Whisper **word** timestamps.
5. Local Needleman–Wunsch maps your words onto ASR words and builds cues (`source: "aligned"`).
6. Low match-ratio lines are flagged `needsReview` for manual fix.

## Credentials

Same as transcription — see [`transcription.md`](./transcription.md). Keys never enter project JSON.

## Provider registry

`src/services/ai/providers/` — default aligner: `groq-force-align` (`freeTier: true`).

UI uses `runProjectAlignment` / `LyricsAligner` only (no direct Groq calls from components).
