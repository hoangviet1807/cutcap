import type { LegacyTextPosition } from "../../shared/types/project";

/** Clamp text anchor into the canvas with a small safe margin. */
export function clampTextPercent(value: number, margin = 4): number {
  return Math.min(100 - margin, Math.max(margin, value));
}

export function legacyPositionToPercent(position: LegacyTextPosition): {
  textX: number;
  textY: number;
} {
  switch (position) {
    case "top-left":
      return { textX: 18, textY: 14 };
    case "top-center":
      return { textX: 50, textY: 14 };
    case "top-right":
      return { textX: 82, textY: 14 };
    case "middle-left":
      return { textX: 18, textY: 50 };
    case "center":
      return { textX: 50, textY: 50 };
    case "middle-right":
      return { textX: 82, textY: 50 };
    case "bottom-left":
      return { textX: 18, textY: 82 };
    case "bottom-center":
      return { textX: 50, textY: 82 };
    case "bottom-right":
      return { textX: 82, textY: 82 };
  }
}

/** Convert pointer position inside a canvas element to percent anchors. */
export function pointerToTextPercent(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { textX: number; textY: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { textX: 50, textY: 50 };
  }
  return {
    textX: clampTextPercent(((clientX - rect.left) / rect.width) * 100),
    textY: clampTextPercent(((clientY - rect.top) / rect.height) * 100),
  };
}
