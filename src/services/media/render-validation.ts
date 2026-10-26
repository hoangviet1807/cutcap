import type { Project } from "../../shared/types/project";
import { validateCues } from "../../shared/utils/cue-validation";
import { isBrowserMediaPath } from "../storage/media-blob-store";

export interface RenderValidationIssue {
  code:
    | "missing-image"
    | "missing-audio"
    | "missing-duration"
    | "no-cues"
    | "invalid-cues"
    | "invalid-canvas";
  message: string;
}

export function validateProjectForRender(
  project: Project,
): RenderValidationIssue[] {
  const issues: RenderValidationIssue[] = [];

  if (!project.media.imagePath) {
    issues.push({
      code: "missing-image",
      message: "Import a background image before exporting.",
    });
  }

  if (!project.media.audioPath) {
    issues.push({
      code: "missing-audio",
      message: "Import an audio file before exporting.",
    });
  }

  if (
    project.media.audioDurationMs == null ||
    project.media.audioDurationMs <= 0
  ) {
    issues.push({
      code: "missing-duration",
      message: "Audio duration is unknown. Re-import the audio file.",
    });
  }

  const usableCues = project.lyrics.cues.filter(
    (c) => c.text.trim() && c.endMs > c.startMs,
  );
  if (usableCues.length === 0) {
    issues.push({
      code: "no-cues",
      message: "Add at least one timed lyric cue with text.",
    });
  }

  const cueIssues = validateCues(project.lyrics.cues).filter(
    (i) => i.code === "invalid-range" || i.code === "negative-start",
  );
  if (cueIssues.length > 0) {
    issues.push({
      code: "invalid-cues",
      message: `${cueIssues.length} cue(s) have invalid timestamps.`,
    });
  }

  if (
    project.canvas.width < 16 ||
    project.canvas.height < 16 ||
    project.canvas.fps < 1
  ) {
    issues.push({
      code: "invalid-canvas",
      message: "Canvas size or frame rate is invalid.",
    });
  }

  // Soft check: browser-media paths are expected in current M1 storage.
  void isBrowserMediaPath;

  return issues;
}
