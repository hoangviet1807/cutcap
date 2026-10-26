import { describe, expect, it } from "vitest";
import {
  clampMs,
  moveCueTimes,
  patchCueTimes,
  resizeCueEnd,
  resizeCueStart,
} from "../../src/features/timeline/timeline-utils";
import type { LyricCue } from "../../src/shared/types/project";

describe("clampMs", () => {
  it("clamps into duration", () => {
    expect(clampMs(-10, 5000)).toBe(0);
    expect(clampMs(9000, 5000)).toBe(5000);
    expect(clampMs(1200.6, 5000)).toBe(1201);
  });
});

describe("moveCueTimes", () => {
  it("shifts a cue and clamps to bounds", () => {
    expect(moveCueTimes(1000, 2000, 500, 10_000)).toEqual({
      startMs: 1500,
      endMs: 2500,
    });
    expect(moveCueTimes(100, 600, -500, 10_000)).toEqual({
      startMs: 0,
      endMs: 500,
    });
    expect(moveCueTimes(9000, 9800, 500, 10_000)).toEqual({
      startMs: 9200,
      endMs: 10_000,
    });
  });
});

describe("resizeCueStart / resizeCueEnd", () => {
  it("respects minimum duration", () => {
    expect(resizeCueStart(0, 1000, 950, 5000).startMs).toBeLessThanOrEqual(
      920,
    );
    expect(resizeCueEnd(0, 1000, 50, 5000).endMs).toBeGreaterThanOrEqual(80);
  });
});

describe("patchCueTimes", () => {
  it("updates one cue", () => {
    const cues: LyricCue[] = [
      {
        id: "a",
        text: "hi",
        startMs: 0,
        endMs: 500,
        source: "transcription",
        needsReview: true,
      },
    ];
    const next = patchCueTimes(cues, "a", { startMs: 100, endMs: 700 });
    expect(next[0]).toMatchObject({
      startMs: 100,
      endMs: 700,
      source: "manual",
      needsReview: false,
    });
  });
});
