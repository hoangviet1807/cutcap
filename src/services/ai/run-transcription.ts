import type { Project } from "../../shared/types/project";
import type {
  TimestampGranularity,
  TranscriptionProvider,
  TranscriptionResult,
} from "../../shared/types/ai";
import {
  getMediaBlob,
  isBrowserMediaPath,
} from "../storage/media-blob-store";
import { getDefaultTranscriptionProvider } from "./providers";

export interface RunTranscriptionOptions {
  project: Project;
  /** Defaults to project.lyrics.language when set. */
  language?: string;
  timestamps?: TimestampGranularity;
  apiKey?: string;
  signal?: AbortSignal;
  provider?: TranscriptionProvider;
}

export class TranscriptionPrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionPrepError";
  }
}

/**
 * Resolve project audio and run the selected transcription provider.
 * Cloud upload happens only inside the provider after this call.
 */
export async function runProjectTranscription(
  options: RunTranscriptionOptions,
): Promise<TranscriptionResult> {
  const { project } = options;
  const audioPath = project.media.audioPath;
  if (!audioPath) {
    throw new TranscriptionPrepError("Import an audio file before transcribing.");
  }

  let audioBlob: Blob | undefined;
  const fileName = project.media.audioFileName ?? undefined;

  if (isBrowserMediaPath(audioPath)) {
    const blob = await getMediaBlob(project.id, "audio");
    if (!blob) {
      throw new TranscriptionPrepError(
        "Audio blob is missing from local storage. Re-import the audio file.",
      );
    }
    audioBlob = blob;
  } else {
    throw new TranscriptionPrepError(
      "Desktop path transcription is not wired yet. Use browser-imported audio (current M1/M3 flow).",
    );
  }

  const provider = options.provider ?? getDefaultTranscriptionProvider();
  const language =
    options.language?.trim() ||
    project.lyrics.language?.trim() ||
    undefined;

  return provider.transcribe({
    audioPath,
    audioBlob,
    fileName,
    language,
    timestamps: options.timestamps ?? "segment",
    apiKey: options.apiKey,
    signal: options.signal,
  });
}
