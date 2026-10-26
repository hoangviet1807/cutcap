import type { LyricCue } from "./project";

export type TimestampGranularity = "segment" | "word";

export interface TranscriptionInput {
  /** Local absolute path, or `browser-media://` URI when media is in IndexedDB. */
  audioPath: string;
  /** Browser / in-memory audio; preferred when the file is not on disk. */
  audioBlob?: Blob;
  /** Filename hint for multipart upload (extension helps Groq). */
  fileName?: string;
  language?: string;
  timestamps: TimestampGranularity;
  signal?: AbortSignal;
  /** BYOK override; if omitted the provider resolves from local credentials. */
  apiKey?: string;
}

export interface TranscriptionResult {
  language?: string;
  text: string;
  cues: LyricCue[];
  provider: string;
  model?: string;
}

export interface TranscriptionProvider {
  readonly id: string;
  readonly displayName: string;
  /** True when the provider has a usable free tier / no paid key required. */
  readonly freeTier: boolean;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export interface AlignmentInput {
  audioPath: string;
  audioBlob?: Blob;
  fileName?: string;
  /** Known lyric lines (text only). Timing is inferred from audio. */
  lyrics: string[];
  language?: string;
  apiKey?: string;
  signal?: AbortSignal;
  audioDurationMs?: number;
}

export interface AlignmentResult {
  cues: LyricCue[];
  provider: string;
  model?: string;
  /** How many lyric tokens matched ASR words (0–1). */
  matchRatio?: number;
}

export interface LyricsAligner {
  readonly id: string;
  readonly displayName: string;
  readonly freeTier: boolean;
  align(input: AlignmentInput): Promise<AlignmentResult>;
}
