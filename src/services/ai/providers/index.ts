import type { LyricsAligner } from "../lyrics-aligner";
import type { TranscriptionProvider } from "../transcription-provider";
import { groqLyricsAligner } from "./groq-lyrics-aligner";
import { groqWhisperProvider } from "./groq-whisper-provider";

/** Free-tier providers first. UI picks from this registry. */
export const transcriptionProviders: TranscriptionProvider[] = [
  groqWhisperProvider,
];

export const lyricsAligners: LyricsAligner[] = [groqLyricsAligner];

export function getDefaultTranscriptionProvider(): TranscriptionProvider {
  const free = transcriptionProviders.find((p) => p.freeTier);
  return free ?? transcriptionProviders[0];
}

export function getDefaultLyricsAligner(): LyricsAligner {
  const free = lyricsAligners.find((a) => a.freeTier);
  return free ?? lyricsAligners[0];
}

export { groqWhisperProvider, groqLyricsAligner };
