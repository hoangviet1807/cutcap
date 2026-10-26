import { describe, expect, it } from "vitest";
import type { LyricCue } from "../../src/shared/types/project";
import { validateCues } from "../../src/shared/utils/cue-validation";

function cue(partial: Partial<LyricCue> & Pick<LyricCue, "id">): LyricCue {
  return {
    text: "line",
    startMs: 0,
    endMs: 1000,
    source: "manual",
    needsReview: false,
    ...partial,
  };
}

describe("validateCues", () => {
  it("accepts a valid cue list", () => {
    const issues = validateCues([
      cue({ id: "a", startMs: 0, endMs: 1000 }),
      cue({ id: "b", startMs: 1000, endMs: 2000 }),
    ]);
    expect(issues).toEqual([]);
  });

  it("flags invalid ranges and duplicates", () => {
    const issues = validateCues([
      cue({ id: "a", startMs: -1, endMs: 500 }),
      cue({ id: "a", startMs: 0, endMs: 0 }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["duplicate-id", "negative-start", "invalid-range"]),
    );
  });

  it("flags suspicious overlaps", () => {
    const issues = validateCues([
      cue({ id: "a", startMs: 0, endMs: 1500 }),
      cue({ id: "b", startMs: 1000, endMs: 2000 }),
    ]);
    expect(issues.some((i) => i.code === "suspicious-overlap")).toBe(true);
  });
});
