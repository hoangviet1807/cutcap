import { getOrnamentPreset } from "../../shared/constants/typography";
import type { StyleSettings, TextAppearAnimation } from "../../shared/types/project";
import type { RenderCue } from "../../shared/types/render";

/** Convert #RRGGBB to ASS &HAABBGGRR (opaque). */
export function hexToAssColor(hex: string, alpha = 0): string {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return "&H00FFFFFF";
  }
  const r = full.slice(0, 2);
  const g = full.slice(2, 4);
  const b = full.slice(4, 6);
  const a = alpha.toString(16).padStart(2, "0").toUpperCase();
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function pad2cs(n: number): string {
  return String(n).padStart(2, "0");
}

/** ASS timestamp H:MM:SS.cs (centiseconds). */
export function msToAssTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  const cs = Math.floor((clamped % 1000) / 10);
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2cs(cs)}`;
}

function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function escapeAssFontName(name: string): string {
  return name.replace(/,/g, "");
}

/** Build ASS override tags for appear animation + position + optional clip box. */
export function buildAssAppearTags(input: {
  x: number;
  y: number;
  clip?: { x1: number; y1: number; x2: number; y2: number };
  animation: TextAppearAnimation;
  fadeInMs: number;
  fadeOutMs: number;
}): string {
  const fadeIn = Math.max(0, Math.round(input.fadeInMs));
  const fadeOut = Math.max(0, Math.round(input.fadeOutMs));
  const { x, y } = input;
  const parts: string[] = [];

  if (input.clip) {
    const { x1, y1, x2, y2 } = input.clip;
    parts.push(`\\clip(${x1},${y1},${x2},${y2})`);
  }

  switch (input.animation) {
    case "none":
      parts.push(`\\pos(${x},${y})`);
      break;
    case "pop":
      parts.push(`\\pos(${x},${y})`);
      parts.push(`\\fscx70\\fscy70\\t(0,${fadeIn},\\fscx100\\fscy100)`);
      if (fadeIn > 0 || fadeOut > 0) parts.push(`\\fad(${fadeIn},${fadeOut})`);
      break;
    case "slide-up": {
      const fromY = y + Math.round(Math.max(24, fadeIn / 8));
      parts.push(`\\move(${x},${fromY},${x},${y},0,${fadeIn})`);
      if (fadeIn > 0 || fadeOut > 0) parts.push(`\\fad(${fadeIn},${fadeOut})`);
      break;
    }
    case "fade":
    default:
      parts.push(`\\pos(${x},${y})`);
      if (fadeIn > 0 || fadeOut > 0) parts.push(`\\fad(${fadeIn},${fadeOut})`);
      break;
  }

  return `{${parts.join("")}}`;
}

/**
 * Generate an ASS subtitle file with cinematic animation and a text box clip.
 * Alignment 5 = center; `\pos` / `\move` place the center of the text.
 */
export function generateAssSubtitles(input: {
  width: number;
  height: number;
  style: StyleSettings;
  cues: RenderCue[];
}): string {
  const { width, height, style, cues } = input;
  const x = Math.round((style.textX / 100) * width);
  const y = Math.round((style.textY / 100) * height);
  const boxW = Math.round((style.boxWidthPct / 100) * width);
  const boxH = Math.round((style.boxHeightPct / 100) * height);
  const clip = {
    x1: Math.max(0, Math.round(x - boxW / 2)),
    y1: Math.max(0, Math.round(y - boxH / 2)),
    x2: Math.min(width, Math.round(x + boxW / 2)),
    y2: Math.min(height, Math.round(y + boxH / 2)),
  };
  const primary = hexToAssColor(style.color);
  const outline = style.shadow ? 2 : 0;
  const shadow = style.shadow ? 1 : 0;
  const fontName = escapeAssFontName(style.fontFamily || "Noto Sans");
  const useBoxBg = (style.boxBgMode ?? "none") === "color";
  // ASS alpha: 00 opaque … FF transparent
  const boxOpacity = Math.min(100, Math.max(0, style.boxBgOpacity ?? 0));
  const backAlpha = useBoxBg
    ? Math.round((1 - boxOpacity / 100) * 255)
    : 0x80;
  const backColour = useBoxBg
    ? hexToAssColor(style.boxBgColor || "#000000", backAlpha)
    : "&H80000000";
  const borderStyle = useBoxBg ? 3 : 1;

  const header = `[Script Info]
Title: CutCap Lyrics
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${style.fontSize},${primary},&H000000FF,&H00000000,${backColour},0,0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const ornamentPreset = getOrnamentPreset(style.textOrnament ?? "none");
  const ornamentFs = Math.max(18, Math.round(style.fontSize * 0.45));
  const ornamentCount = Math.min(6, ornamentPreset.count);

  const events = cues
    .flatMap((cue, cueIndex) => {
      const start = msToAssTime(cue.startMs);
      const end = msToAssTime(cue.endMs);
      const tags = buildAssAppearTags({
        x,
        y,
        clip,
        animation: style.textAnimation,
        fadeInMs: style.fadeInMs,
        fadeOutMs: style.fadeOutMs,
      });
      const text = `${tags}${escapeAssText(cue.text)}`;
      const lines = [
        `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`,
      ];

      for (let i = 0; i < ornamentCount; i++) {
        const glyph = ornamentPreset.glyphs[i % ornamentPreset.glyphs.length];
        const side = i % 2 === 0 ? -1 : 1;
        const ox0 = x + side * Math.round(boxW * (0.42 + (i % 3) * 0.08));
        const oy0 = y + Math.round(((i % 5) - 2) * (boxH * 0.22));
        const ox1 = ox0 + side * (18 + (i % 4) * 10);
        const oy1 = oy0 - (28 + (i % 3) * 12);
        const fadIn = Math.max(80, Math.round(style.fadeInMs * 0.6));
        const fadOut = Math.max(80, Math.round(style.fadeOutMs * 0.6));
        // Stagger ornaments slightly within the cue window via layer + move.
        const delayCs = ((cueIndex + i) % 5) * 8;
        lines.push(
          `Dialogue: 1,${start},${end},Default,,0,0,0,,{\\fs${ornamentFs}\\move(${ox0},${oy0},${ox1},${oy1},${delayCs},${delayCs + Math.max(40, Math.round((cue.endMs - cue.startMs) / 10))})\\fad(${fadIn},${fadOut})}${glyph}`,
        );
      }
      return lines;
    })
    .join("\n");

  return `${header}${events}\n`;
}

/** Escape text for ffmpeg drawtext filter. */
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "%%")
    .replace(/\n/g, " ");
}

/**
 * Build a video filtergraph: scale/crop cover + timed drawtext layers.
 * Used when the encoder build lacks libass (fade approximated by hard enable window).
 */
export function buildDrawtextFiltergraph(input: {
  width: number;
  height: number;
  style: StyleSettings;
  cues: RenderCue[];
  fontFile: string;
}): string {
  const { width, height, style, cues, fontFile } = input;
  const xExpr = `(w*${style.textX / 100})-(text_w/2)`;
  const yExpr = `(h*${style.textY / 100})-(text_h/2)`;
  const fontcolor = style.color.replace("#", "");
  const shadow = style.shadow
    ? `:shadowx=2:shadowy=2:shadowcolor=black@0.8`
    : "";

  const base = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`;

  const drawtexts = cues.map((cue) => {
    const start = (cue.startMs / 1000).toFixed(3);
    const end = (cue.endMs / 1000).toFixed(3);
    return [
      `drawtext=fontfile=${fontFile}`,
      `text='${escapeDrawtext(cue.text)}'`,
      `x=${xExpr}`,
      `y=${yExpr}`,
      `fontsize=${style.fontSize}`,
      `fontcolor=0x${fontcolor}`,
      `borderw=${style.shadow ? 2 : 0}`,
      `bordercolor=black@0.85${shadow}`,
      `enable='between(t\\,${start}\\,${end})'`,
    ].join(":");
  });

  return [base, ...drawtexts].join(",");
}
