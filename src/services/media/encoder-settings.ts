import type { CanvasSettings, ExportQuality } from "../../shared/types/project";
import type { EncoderProfile } from "../../shared/types/render";

export function resolveEncoderProfile(
  canvas: CanvasSettings,
  quality: ExportQuality,
): EncoderProfile {
  if (quality === "draft") {
    const scale = Math.min(1, 1280 / Math.max(canvas.width, canvas.height));
    return {
      width: even(Math.round(canvas.width * scale)),
      height: even(Math.round(canvas.height * scale)),
      fps: Math.min(24, canvas.fps),
      videoPreset: "ultrafast",
      crf: 28,
      audioBitrate: "128k",
    };
  }

  if (quality === "high") {
    return {
      width: even(canvas.width),
      height: even(canvas.height),
      fps: canvas.fps,
      videoPreset: "slow",
      crf: 18,
      audioBitrate: "256k",
    };
  }

  return {
    width: even(canvas.width),
    height: even(canvas.height),
    fps: canvas.fps,
    videoPreset: "medium",
    crf: 23,
    audioBitrate: "192k",
  };
}

function even(n: number): number {
  const v = Math.max(2, n);
  return v % 2 === 0 ? v : v - 1;
}
