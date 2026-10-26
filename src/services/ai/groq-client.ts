import type { TimestampGranularity } from "../../shared/types/ai";
import type { GroqVerboseResponse } from "./groq-segments";

export const GROQ_TRANSCRIPTIONS_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

/** Fast free-tier Whisper model on Groq. */
export const GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";

export const GROQ_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class GroqApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GroqApiError";
    this.status = status;
  }
}

export function guessAudioFileName(
  audioPath: string,
  fileName?: string,
): string {
  if (fileName?.trim()) return fileName.trim();
  const leaf = audioPath.split(/[/\\]/).pop();
  if (leaf && /\.\w+$/.test(leaf) && !leaf.includes(":")) return leaf;
  return "audio.mp3";
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error &&
      typeof body.error === "object" &&
      "message" in body.error &&
      typeof (body.error as { message: unknown }).message === "string"
    ) {
      return (body.error as { message: string }).message;
    }
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`;
}

export interface GroqTranscriptionRequest {
  apiKey: string;
  audioBlob: Blob;
  fileName: string;
  timestamps: TimestampGranularity;
  language?: string;
  signal?: AbortSignal;
}

/**
 * Shared Groq Whisper `verbose_json` call (segment or word timestamps).
 */
export async function fetchGroqVerboseTranscription(
  req: GroqTranscriptionRequest,
): Promise<GroqVerboseResponse> {
  if (!req.apiKey.trim()) {
    throw new GroqApiError(
      "Missing Groq API key. Enter it in the dialog or set VITE_GROQ_API_KEY in .env.",
    );
  }
  if (!req.audioBlob || req.audioBlob.size === 0) {
    throw new GroqApiError(
      "No audio data to upload. Import an audio file first.",
    );
  }
  if (req.audioBlob.size > GROQ_MAX_UPLOAD_BYTES) {
    throw new GroqApiError(
      `Audio is too large for Groq (${(req.audioBlob.size / (1024 * 1024)).toFixed(1)} MB). Max is 25 MB.`,
    );
  }

  const form = new FormData();
  form.append("file", req.audioBlob, req.fileName);
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  form.append(
    "timestamp_granularities[]",
    req.timestamps === "word" ? "word" : "segment",
  );
  if (req.language?.trim()) {
    form.append("language", req.language.trim().toLowerCase());
  }

  const res = await fetch(GROQ_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${req.apiKey.trim()}` },
    body: form,
    signal: req.signal,
  });

  if (!res.ok) {
    const detail = await readErrorMessage(res);
    throw new GroqApiError(
      `Groq request failed (${res.status}): ${detail}`,
      res.status,
    );
  }

  return (await res.json()) as GroqVerboseResponse;
}
