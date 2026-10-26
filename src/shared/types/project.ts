/** Project schema version — bump when making breaking JSON changes. */
export const PROJECT_SCHEMA_VERSION = 2 as const;

export type AspectRatio = "16:9" | "9:16";

export type LyricCueSource = "manual" | "transcription" | "imported" | "aligned";

export type LyricsSource = "manual" | "transcription" | "imported" | "aligned";

export type ExportQuality = "draft" | "standard" | "high";

/** How a cue appears on screen (preview + ASS export). */
export type TextAppearAnimation = "none" | "fade" | "pop" | "slide-up";

/** Decorative particles around the lyric box. */
export type TextOrnament =
  | "none"
  | "hearts"
  | "butterflies"
  | "sparkles"
  | "stars"
  | "petals"
  | "notes";

/** @deprecated Kept for migrating schema v1 projects. */
export type LegacyTextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface CanvasSettings {
  width: number;
  height: number;
  fps: number;
}

export interface MediaReferences {
  /** Path relative to the project directory, absolute, or browser-media:// URI. */
  imagePath: string | null;
  audioPath: string | null;
  audioDurationMs: number | null;
  imageFileName: string | null;
  audioFileName: string | null;
}

export interface LyricCue {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  source: LyricCueSource;
  needsReview: boolean;
}

export interface LyricsData {
  language: string;
  source: LyricsSource;
  cues: LyricCue[];
}

export interface StyleSettings {
  preset: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  /** Horizontal anchor as % of canvas width (0–100), center of the text box. */
  textX: number;
  /** Vertical anchor as % of canvas height (0–100), center of the text box. */
  textY: number;
  /** Text box width as % of canvas width. */
  boxWidthPct: number;
  /** Text box height as % of canvas height. */
  boxHeightPct: number;
  /** Lyric frame fill: none = transparent over the video. */
  boxBgMode: "none" | "color";
  /** Fill color when boxBgMode is "color" (#RRGGBB). */
  boxBgColor: string;
  /** Fill opacity 0–100 when boxBgMode is "color". */
  boxBgOpacity: number;
  /** Cue appear animation. */
  textAnimation: TextAppearAnimation;
  /** Floating ornaments around the lyric (hearts, butterflies, …). */
  textOrnament: TextOrnament;
  fadeInMs: number;
  fadeOutMs: number;
  shadow: boolean;
}

export interface AudioSettings {
  volume: number;
}

export interface ExportSettings {
  format: "mp4";
  quality: ExportQuality;
}

export interface Project {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSettings;
  media: MediaReferences;
  lyrics: LyricsData;
  style: StyleSettings;
  audio: AudioSettings;
  export: ExportSettings;
}

export const CANVAS_PRESETS: Record<
  AspectRatio | "low-resource",
  CanvasSettings
> = {
  "16:9": { width: 1920, height: 1080, fps: 30 },
  "9:16": { width: 1080, height: 1920, fps: 30 },
  "low-resource": { width: 1280, height: 720, fps: 24 },
};

export const DEFAULT_STYLE: StyleSettings = {
  preset: "cinematic-fade",
  fontFamily: "Noto Sans",
  fontSize: 56,
  color: "#FFFFFF",
  textX: 50,
  textY: 82,
  boxWidthPct: 80,
  boxHeightPct: 18,
  boxBgMode: "none",
  boxBgColor: "#000000",
  boxBgOpacity: 45,
  textAnimation: "fade",
  textOrnament: "none",
  fadeInMs: 400,
  fadeOutMs: 500,
  shadow: true,
};

export function createEmptyProject(name = "Untitled Project"): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    canvas: { ...CANVAS_PRESETS["16:9"] },
    media: {
      imagePath: null,
      audioPath: null,
      audioDurationMs: null,
      imageFileName: null,
      audioFileName: null,
    },
    lyrics: {
      language: "vi",
      source: "manual",
      cues: [],
    },
    style: { ...DEFAULT_STYLE },
    audio: { volume: 1 },
    export: { format: "mp4", quality: "standard" },
  };
}
