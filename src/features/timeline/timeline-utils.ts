import type { LyricCue } from "../../shared/types/project";

export const MIN_CUE_DURATION_MS = 80;

export function cueLeftPercent(cue: LyricCue, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return (cue.startMs / durationMs) * 100;
}

export function cueWidthPercent(cue: LyricCue, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return (Math.max(0, cue.endMs - cue.startMs) / durationMs) * 100;
}

export function playheadPercent(currentMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (currentMs / durationMs) * 100));
}

export function msFromTimelineClick(
  clientX: number,
  rect: DOMRect,
  durationMs: number,
): number {
  if (durationMs <= 0 || rect.width <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(ratio * durationMs);
}

export function clampMs(ms: number, durationMs: number): number {
  if (durationMs <= 0) return Math.max(0, Math.round(ms));
  return Math.min(durationMs, Math.max(0, Math.round(ms)));
}

/** Move a cue by delta while keeping duration; clamped to [0, durationMs]. */
export function moveCueTimes(
  startMs: number,
  endMs: number,
  deltaMs: number,
  durationMs: number,
): { startMs: number; endMs: number } {
  const dur = Math.max(MIN_CUE_DURATION_MS, endMs - startMs);
  let nextStart = startMs + deltaMs;
  let nextEnd = nextStart + dur;
  if (nextStart < 0) {
    nextStart = 0;
    nextEnd = dur;
  }
  if (durationMs > 0 && nextEnd > durationMs) {
    nextEnd = durationMs;
    nextStart = Math.max(0, nextEnd - dur);
  }
  return {
    startMs: Math.round(nextStart),
    endMs: Math.round(nextEnd),
  };
}

/** Resize cue start edge; keeps end fixed (unless min duration). */
export function resizeCueStart(
  _startMs: number,
  endMs: number,
  nextStartMs: number,
  durationMs: number,
): { startMs: number; endMs: number } {
  const maxStart = endMs - MIN_CUE_DURATION_MS;
  const start = clampMs(Math.min(nextStartMs, maxStart), durationMs);
  return { startMs: start, endMs };
}

/** Resize cue end edge; keeps start fixed (unless min duration). */
export function resizeCueEnd(
  startMs: number,
  _endMs: number,
  nextEndMs: number,
  durationMs: number,
): { startMs: number; endMs: number } {
  const minEnd = startMs + MIN_CUE_DURATION_MS;
  let end = Math.max(minEnd, nextEndMs);
  if (durationMs > 0) end = Math.min(durationMs, end);
  return { startMs, endMs: Math.round(end) };
}

export function patchCueTimes(
  cues: LyricCue[],
  cueId: string,
  times: { startMs: number; endMs: number },
): LyricCue[] {
  return cues.map((c) =>
    c.id === cueId
      ? {
          ...c,
          startMs: times.startMs,
          endMs: times.endMs,
          source: c.source === "manual" ? c.source : "manual",
          needsReview: false,
        }
      : c,
  );
}
