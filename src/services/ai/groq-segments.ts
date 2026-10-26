import type { LyricCue } from "../../shared/types/project";
import type { TimestampGranularity } from "../../shared/types/ai";

export interface GroqVerboseSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

export interface GroqVerboseWord {
  word: string;
  start: number;
  end: number;
}

export interface GroqVerboseResponse {
  text?: string;
  language?: string;
  duration?: number;
  segments?: GroqVerboseSegment[];
  words?: GroqVerboseWord[];
}

const LOW_LOGPROB = -1.0;
const HIGH_NO_SPEECH = 0.6;
const MIN_CUE_MS = 80;

function needsReviewFromMeta(seg: GroqVerboseSegment): boolean {
  if (
    typeof seg.no_speech_prob === "number" &&
    seg.no_speech_prob >= HIGH_NO_SPEECH
  ) {
    return true;
  }
  if (typeof seg.avg_logprob === "number" && seg.avg_logprob < LOW_LOGPROB) {
    return true;
  }
  return false;
}

function toMs(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

function confidenceFromLogprob(avg?: number): number | undefined {
  if (typeof avg !== "number" || Number.isNaN(avg)) return undefined;
  // Map typical Whisper logprobs (~0 … -2) into 0–1-ish score for UI.
  return Math.max(0, Math.min(1, 1 + avg / 2));
}

/**
 * Map Groq `verbose_json` transcription payload into CutCap lyric cues.
 */
export function cuesFromGroqVerbose(
  data: GroqVerboseResponse,
  options: {
    granularity: TimestampGranularity;
    createId?: () => string;
  },
): LyricCue[] {
  const createId = options.createId ?? (() => crypto.randomUUID());

  if (options.granularity === "word" && data.words?.length) {
    return data.words
      .map((w) => {
        const text = w.word.trim();
        if (!text) return null;
        const startMs = toMs(w.start);
        let endMs = toMs(w.end);
        if (endMs <= startMs) endMs = startMs + MIN_CUE_MS;
        const cue: LyricCue = {
          id: createId(),
          text,
          startMs,
          endMs,
          source: "transcription",
          needsReview: true,
        };
        return cue;
      })
      .filter((c): c is LyricCue => c != null);
  }

  const segments = data.segments ?? [];
  if (segments.length === 0 && data.text?.trim()) {
    // Fallback: single cue covering declared duration or a default span.
    const endMs = toMs(data.duration ?? 4);
    return [
      {
        id: createId(),
        text: data.text.trim(),
        startMs: 0,
        endMs: Math.max(endMs, MIN_CUE_MS),
        source: "transcription",
        needsReview: true,
      },
    ];
  }

  return segments
    .map((seg) => {
      const text = seg.text.trim();
      if (!text) return null;
      const startMs = toMs(seg.start);
      let endMs = toMs(seg.end);
      if (endMs <= startMs) endMs = startMs + MIN_CUE_MS;
      const cue: LyricCue = {
        id: createId(),
        text,
        startMs,
        endMs,
        confidence: confidenceFromLogprob(seg.avg_logprob),
        source: "transcription",
        needsReview: needsReviewFromMeta(seg),
      };
      return cue;
    })
    .filter((c): c is LyricCue => c != null);
}
