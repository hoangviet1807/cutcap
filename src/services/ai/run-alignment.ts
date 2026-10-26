import type { Project } from "../../shared/types/project";
import type {
  AlignmentResult,
  LyricsAligner,
} from "../../shared/types/ai";
import {
  getMediaBlob,
  isBrowserMediaPath,
} from "../storage/media-blob-store";
import { getDefaultLyricsAligner } from "./providers";

export interface RunAlignmentOptions {
  project: Project;
  /** Lyric lines to keep (text). Defaults to current cue texts. */
  lyrics?: string[];
  language?: string;
  apiKey?: string;
  signal?: AbortSignal;
  aligner?: LyricsAligner;
}

export class AlignmentPrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlignmentPrepError";
  }
}

/**
 * Resolve project audio + lyrics and run the selected force-aligner.
 */
export async function runProjectAlignment(
  options: RunAlignmentOptions,
): Promise<AlignmentResult> {
  const { project } = options;
  const audioPath = project.media.audioPath;
  if (!audioPath) {
    throw new AlignmentPrepError("Import an audio file before aligning.");
  }

  const lyrics =
    options.lyrics?.map((l) => l.trim()).filter(Boolean) ??
    project.lyrics.cues.map((c) => c.text.trim()).filter(Boolean);

  if (lyrics.length === 0) {
    throw new AlignmentPrepError(
      "Add lyric lines (paste / import) before aligning.",
    );
  }

  let audioBlob: Blob | undefined;
  const fileName = project.media.audioFileName ?? undefined;

  if (isBrowserMediaPath(audioPath)) {
    const blob = await getMediaBlob(project.id, "audio");
    if (!blob) {
      throw new AlignmentPrepError(
        "Audio blob is missing from local storage. Re-import the audio file.",
      );
    }
    audioBlob = blob;
  } else {
    throw new AlignmentPrepError(
      "Desktop path alignment is not wired yet. Use browser-imported audio.",
    );
  }

  const aligner = options.aligner ?? getDefaultLyricsAligner();
  const language =
    options.language?.trim() ||
    project.lyrics.language?.trim() ||
    undefined;

  return aligner.align({
    audioPath,
    audioBlob,
    fileName,
    lyrics,
    language,
    apiKey: options.apiKey,
    signal: options.signal,
    audioDurationMs: project.media.audioDurationMs ?? undefined,
  });
}
