import type {
  CanvasSettings,
  ExportQuality,
  LyricCue,
  StyleSettings,
} from "./project";

export interface RenderCue {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Normalized plan produced from a Project before encoding runs.
 * Validated once; the renderer should not re-interpret project JSON.
 */
export interface RenderPlan {
  projectId: string;
  projectName: string;
  canvas: CanvasSettings;
  style: StyleSettings;
  quality: ExportQuality;
  audioVolume: number;
  audioDurationMs: number;
  cues: RenderCue[];
  /** Virtual filenames written into the encoder filesystem. */
  imageFileName: string;
  audioFileName: string;
  subtitleFileName: string;
  outputFileName: string;
}

export interface EncoderProfile {
  width: number;
  height: number;
  fps: number;
  videoPreset: string;
  crf: number;
  audioBitrate: string;
}

export type ExportPhase =
  | "idle"
  | "validating"
  | "loading-encoder"
  | "preparing"
  | "encoding"
  | "finalizing"
  | "done"
  | "cancelled"
  | "error";

export interface ExportProgress {
  phase: ExportPhase;
  /** 0–1 when encoding; null otherwise. */
  ratio: number | null;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  durationMs: number;
  width: number;
  height: number;
}

export function cuesToRenderCues(cues: LyricCue[]): RenderCue[] {
  return cues
    .filter((c) => c.text.trim().length > 0 && c.endMs > c.startMs)
    .map((c) => ({
      text: c.text.trim(),
      startMs: Math.max(0, c.startMs),
      endMs: c.endMs,
    }));
}
