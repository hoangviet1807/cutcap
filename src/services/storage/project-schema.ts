import {
  clampTextPercent,
  legacyPositionToPercent,
} from "../../features/preview/text-position";
import { clampBoxPercent } from "../../shared/constants/typography";
import { clampOpacity } from "../../features/preview/box-background";
import {
  DEFAULT_STYLE,
  PROJECT_SCHEMA_VERSION,
  type LegacyTextPosition,
  type LyricCue,
  type Project,
  type TextAppearAnimation,
  type TextOrnament,
} from "../../shared/types/project";

function parseBoxBgMode(value: unknown): "none" | "color" {
  return value === "color" ? "color" : "none";
}

function parseBoxBgColor(value: unknown): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return DEFAULT_STYLE.boxBgColor;
}

function parseTextAnimation(value: unknown): TextAppearAnimation {
  if (
    value === "none" ||
    value === "fade" ||
    value === "pop" ||
    value === "slide-up"
  ) {
    return value;
  }
  return DEFAULT_STYLE.textAnimation;
}

function parseTextOrnament(value: unknown): TextOrnament {
  if (
    value === "none" ||
    value === "hearts" ||
    value === "butterflies" ||
    value === "sparkles" ||
    value === "stars" ||
    value === "petals" ||
    value === "notes"
  ) {
    return value;
  }
  return DEFAULT_STYLE.textOrnament;
}

export class ProjectSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectSchemaError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || !value) {
    throw new ProjectSchemaError(`Missing or invalid string field: ${key}`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new ProjectSchemaError("Expected string or null");
  }
  return value;
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ProjectSchemaError(`Missing or invalid number field: ${key}`);
  }
  return value;
}

function parseCue(raw: unknown): LyricCue {
  if (!isRecord(raw)) throw new ProjectSchemaError("Cue must be an object");
  const source = requireString(raw, "source");
  if (
    source !== "manual" &&
    source !== "transcription" &&
    source !== "imported" &&
    source !== "aligned"
  ) {
    throw new ProjectSchemaError(`Invalid cue source: ${source}`);
  }

  return {
    id: requireString(raw, "id"),
    text: requireString(raw, "text"),
    startMs: requireNumber(raw, "startMs"),
    endMs: requireNumber(raw, "endMs"),
    confidence:
      typeof raw.confidence === "number" ? raw.confidence : undefined,
    source,
    needsReview: Boolean(raw.needsReview),
  };
}

function resolveTextAnchor(style: Record<string, unknown>): {
  textX: number;
  textY: number;
} {
  if (typeof style.textX === "number" && typeof style.textY === "number") {
    return {
      textX: clampTextPercent(style.textX),
      textY: clampTextPercent(style.textY),
    };
  }

  if (typeof style.position === "string") {
    return legacyPositionToPercent(style.position as LegacyTextPosition);
  }

  return { textX: DEFAULT_STYLE.textX, textY: DEFAULT_STYLE.textY };
}

/** Validate and normalize a project document (migrate when needed). */
export function parseProjectDocument(raw: unknown): Project {
  if (!isRecord(raw)) {
    throw new ProjectSchemaError("Project root must be an object");
  }

  const schemaVersion = requireNumber(raw, "schemaVersion");
  if (schemaVersion !== 1 && schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new ProjectSchemaError(
      `Unsupported schemaVersion ${schemaVersion}; expected 1 or ${PROJECT_SCHEMA_VERSION}`,
    );
  }

  if (!isRecord(raw.canvas)) {
    throw new ProjectSchemaError("canvas is required");
  }
  if (!isRecord(raw.media)) {
    throw new ProjectSchemaError("media is required");
  }
  if (!isRecord(raw.lyrics)) {
    throw new ProjectSchemaError("lyrics is required");
  }
  if (!isRecord(raw.style)) {
    throw new ProjectSchemaError("style is required");
  }
  if (!isRecord(raw.audio)) {
    throw new ProjectSchemaError("audio is required");
  }
  if (!isRecord(raw.export)) {
    throw new ProjectSchemaError("export is required");
  }

  const cuesRaw = raw.lyrics.cues;
  if (!Array.isArray(cuesRaw)) {
    throw new ProjectSchemaError("lyrics.cues must be an array");
  }

  const lyricsSource = requireString(raw.lyrics, "source");
  if (
    lyricsSource !== "manual" &&
    lyricsSource !== "transcription" &&
    lyricsSource !== "imported" &&
    lyricsSource !== "aligned"
  ) {
    throw new ProjectSchemaError(`Invalid lyrics source: ${lyricsSource}`);
  }

  const quality = requireString(raw.export, "quality");
  if (quality !== "draft" && quality !== "standard" && quality !== "high") {
    throw new ProjectSchemaError(`Invalid export quality: ${quality}`);
  }

  const anchor = resolveTextAnchor(raw.style);

  const project: Project = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: requireString(raw, "id"),
    name: requireString(raw, "name"),
    createdAt: requireString(raw, "createdAt"),
    updatedAt: requireString(raw, "updatedAt"),
    canvas: {
      width: requireNumber(raw.canvas, "width"),
      height: requireNumber(raw.canvas, "height"),
      fps: requireNumber(raw.canvas, "fps"),
    },
    media: {
      imagePath: optionalString(raw.media.imagePath),
      audioPath: optionalString(raw.media.audioPath),
      audioDurationMs:
        raw.media.audioDurationMs === null ||
        raw.media.audioDurationMs === undefined
          ? null
          : requireNumber(raw.media, "audioDurationMs"),
      imageFileName: optionalString(raw.media.imageFileName),
      audioFileName: optionalString(raw.media.audioFileName),
    },
    lyrics: {
      language: requireString(raw.lyrics, "language"),
      source: lyricsSource,
      cues: cuesRaw.map(parseCue),
    },
    style: {
      ...DEFAULT_STYLE,
      preset: requireString(raw.style, "preset"),
      fontFamily: requireString(raw.style, "fontFamily"),
      fontSize: requireNumber(raw.style, "fontSize"),
      color: requireString(raw.style, "color"),
      textX: anchor.textX,
      textY: anchor.textY,
      boxWidthPct:
        typeof raw.style.boxWidthPct === "number"
          ? clampBoxPercent(raw.style.boxWidthPct)
          : DEFAULT_STYLE.boxWidthPct,
      boxHeightPct:
        typeof raw.style.boxHeightPct === "number"
          ? clampBoxPercent(raw.style.boxHeightPct, 6, 60)
          : DEFAULT_STYLE.boxHeightPct,
      boxBgMode: parseBoxBgMode(raw.style.boxBgMode),
      boxBgColor: parseBoxBgColor(raw.style.boxBgColor),
      boxBgOpacity:
        typeof raw.style.boxBgOpacity === "number"
          ? clampOpacity(raw.style.boxBgOpacity)
          : DEFAULT_STYLE.boxBgOpacity,
      textAnimation: parseTextAnimation(raw.style.textAnimation),
      textOrnament: parseTextOrnament(raw.style.textOrnament),
      fadeInMs: requireNumber(raw.style, "fadeInMs"),
      fadeOutMs: requireNumber(raw.style, "fadeOutMs"),
      shadow: Boolean(raw.style.shadow),
    },
    audio: {
      volume: requireNumber(raw.audio, "volume"),
    },
    export: {
      format: "mp4",
      quality,
    },
  };

  return project;
}

export function serializeProject(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function deserializeProject(json: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ProjectSchemaError("Invalid JSON");
  }
  return parseProjectDocument(parsed);
}

export function toProjectSummary(project: Project): {
  id: string;
  name: string;
  updatedAt: string;
} {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
  };
}
