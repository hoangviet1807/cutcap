import { getApiKey } from "../credentials";
import {
  fetchGroqVerboseTranscription,
  GROQ_WHISPER_MODEL,
  GroqApiError,
  guessAudioFileName,
} from "../groq-client";
import { cuesFromGroqVerbose } from "../groq-segments";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "../transcription-provider";

export { GROQ_WHISPER_MODEL } from "../groq-client";

export class GroqTranscriptionError extends GroqApiError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "GroqTranscriptionError";
  }
}

/**
 * Free-tier-first Whisper adapter (Groq), BYOK.
 *
 * @see https://console.groq.com/docs/speech-to-text
 */
export const groqWhisperProvider: TranscriptionProvider = {
  id: "groq-whisper",
  displayName: "Groq Whisper (free tier)",
  freeTier: true,

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    try {
      const apiKey = (input.apiKey ?? getApiKey("groq"))?.trim() ?? "";
      const blob = input.audioBlob;
      if (!blob) {
        throw new GroqTranscriptionError(
          "No audio data to upload. Import an audio file first.",
        );
      }

      const data = await fetchGroqVerboseTranscription({
        apiKey,
        audioBlob: blob,
        fileName: guessAudioFileName(input.audioPath, input.fileName),
        timestamps: input.timestamps,
        language: input.language,
        signal: input.signal,
      });

      const cues = cuesFromGroqVerbose(data, {
        granularity: input.timestamps,
      });

      if (cues.length === 0) {
        throw new GroqTranscriptionError(
          "Groq returned no lyric segments. Try a clearer vocal track or a different language code.",
        );
      }

      return {
        language: data.language ?? input.language,
        text: (data.text ?? cues.map((c) => c.text).join(" ")).trim(),
        cues,
        provider: groqWhisperProvider.id,
        model: GROQ_WHISPER_MODEL,
      };
    } catch (e) {
      if (e instanceof GroqTranscriptionError) throw e;
      if (e instanceof GroqApiError) {
        throw new GroqTranscriptionError(e.message, e.status);
      }
      throw e;
    }
  },
};
