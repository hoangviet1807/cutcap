import type {
  TextAppearAnimation,
  TextOrnament,
} from "../types/project";

export interface FontOption {
  id: string;
  /** CSS / ASS font family name */
  family: string;
  label: string;
  /** Hint for CJK / Vietnamese coverage */
  script?: "latin" | "viet" | "display" | "mono";
}

/** Fonts available in the Style panel (browser + ASS Fontname). */
export const FONT_OPTIONS: FontOption[] = [
  { id: "noto-sans", family: "Noto Sans", label: "Noto Sans", script: "viet" },
  {
    id: "be-vietnam",
    family: "Be Vietnam Pro",
    label: "Be Vietnam Pro",
    script: "viet",
  },
  { id: "segoe", family: "Segoe UI", label: "Segoe UI", script: "viet" },
  { id: "arial", family: "Arial", label: "Arial", script: "latin" },
  {
    id: "playfair",
    family: "Playfair Display",
    label: "Playfair Display",
    script: "display",
  },
  { id: "oswald", family: "Oswald", label: "Oswald", script: "display" },
  { id: "georgia", family: "Georgia", label: "Georgia", script: "latin" },
  {
    id: "roboto-mono",
    family: "Roboto Mono",
    label: "Roboto Mono",
    script: "mono",
  },
  { id: "impact", family: "Impact", label: "Impact", script: "display" },
];

export const TEXT_ANIMATION_OPTIONS: {
  id: TextAppearAnimation;
  label: string;
  hint: string;
}[] = [
  { id: "none", label: "None", hint: "Instant" },
  { id: "fade", label: "Fade", hint: "Opacity in/out" },
  { id: "pop", label: "Pop", hint: "Scale up" },
  { id: "slide-up", label: "Slide up", hint: "Rise into place" },
];

export interface OrnamentPreset {
  id: TextOrnament;
  label: string;
  glyphs: string[];
  /** How many particles in the preview. */
  count: number;
  motion: "float" | "flutter" | "twinkle" | "drift";
}

export const TEXT_ORNAMENT_OPTIONS: OrnamentPreset[] = [
  { id: "none", label: "None", glyphs: [], count: 0, motion: "float" },
  {
    id: "hearts",
    label: "Hearts",
    glyphs: ["💕", "💖", "💗", "❤️", "✨"],
    count: 9,
    motion: "float",
  },
  {
    id: "butterflies",
    label: "Butterflies",
    glyphs: ["🦋", "✨", "🌸"],
    count: 7,
    motion: "flutter",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    glyphs: ["✨", "⭐", "🌟", "💫"],
    count: 11,
    motion: "twinkle",
  },
  {
    id: "stars",
    label: "Stars",
    glyphs: ["⭐", "✦", "✧", "🌟"],
    count: 9,
    motion: "twinkle",
  },
  {
    id: "petals",
    label: "Petals",
    glyphs: ["🌸", "🌺", "💮", "🌼"],
    count: 10,
    motion: "drift",
  },
  {
    id: "notes",
    label: "Notes",
    glyphs: ["🎵", "🎶", "♪", "♫"],
    count: 8,
    motion: "float",
  },
];

export function getOrnamentPreset(
  id: TextOrnament,
): OrnamentPreset {
  return (
    TEXT_ORNAMENT_OPTIONS.find((o) => o.id === id) ?? TEXT_ORNAMENT_OPTIONS[0]
  );
}

export function clampBoxPercent(value: number, min = 8, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
