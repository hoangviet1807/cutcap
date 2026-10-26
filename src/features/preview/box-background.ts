import type { StyleSettings } from "../../shared/types/project";

/** CSS background for the lyric frame (transparent by default). */
export function lyricBoxBackground(
  style: Pick<StyleSettings, "boxBgMode" | "boxBgColor" | "boxBgOpacity">,
): string {
  const mode = style.boxBgMode ?? "none";
  if (mode !== "color") return "transparent";

  const hex = (style.boxBgColor || "#000000").replace("#", "").trim();
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "transparent";

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const a = Math.min(100, Math.max(0, style.boxBgOpacity ?? 0)) / 100;
  return `rgba(${r},${g},${b},${a})`;
}

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
