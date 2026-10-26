import { alignLyricsToWords } from "../align-lyrics-to-words";
import { getApiKey } from "../credentials";
import {
  fetchGroqVerboseTranscription,
  GROQ_WHISPER_MODEL,
  GroqApiError,
  guessAudioFileName,
} from "../groq-client";
import type {
  AlignmentInput,
  AlignmentResult,
  LyricsAligner,
} from "../lyrics-aligner";

export class GroqAlignmentError extends GroqApiError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "GroqAlignmentError";
  }
}

/**
 * Force-align known lyrics to audio via Groq Whisper word timestamps + local NW align.
 * Keeps the user's lyric text; only timing comes from ASR.
 */
export const groqLyricsAligner: LyricsAligner = {
  id: "groq-force-align",
  displayName: "Groq force-align (free tier)",
  freeTier: true,

  async align(input: AlignmentInput): Promise<AlignmentResult> {
    const lines = input.lyrics.map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new GroqAlignmentError(
        "Add lyric lines first (paste / import), then run Align.",
      );
    }

    try {
      const apiKey = (input.apiKey ?? getApiKey("groq"))?.trim() ?? "";
      const blob = input.audioBlob;
      if (!blob) {
        throw new GroqAlignmentError(
          "No audio data to upload. Import an audio file first.",
        );
      }

      const data = await fetchGroqVerboseTranscription({
        apiKey,
        audioBlob: blob,
        fileName: guessAudioFileName(input.audioPath, input.fileName),
        timestamps: "word",
        language: input.language,
        signal: input.signal,
      });

      const words = data.words ?? [];
      if (words.length === 0) {
        throw new GroqAlignmentError(
          "Groq returned no word timestamps. Try again or check the audio language.",
        );
      }

      const durationMs =
        input.audioDurationMs ??
        (typeof data.duration === "number"
          ? Math.round(data.duration * 1000)
          : undefined);

      const cues = alignLyricsToWords(lines, words, {
        audioDurationMs: durationMs,
      });

      if (cues.length === 0) {
        throw new GroqAlignmentError("Alignment produced no cues.");
      }

      const matchRatio =
        cues.reduce((sum, c) => sum + (c.confidence ?? 0), 0) / cues.length;

      return {
        cues,
        provider: groqLyricsAligner.id,
        model: GROQ_WHISPER_MODEL,
        matchRatio,
      };
    } catch (e) {
      if (e instanceof GroqAlignmentError) throw e;
      if (e instanceof GroqApiError) {
        throw new GroqAlignmentError(e.message, e.status);
      }
      throw e;
    }
  },
};
