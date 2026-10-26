import type { LyricCue } from "../types/project";

export interface CueValidationIssue {
  cueId: string;
  code: "negative-start" | "invalid-range" | "duplicate-id" | "suspicious-overlap";
  message: string;
}

export function validateCues(cues: LyricCue[]): CueValidationIssue[] {
  const issues: CueValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const cue of cues) {
    if (seenIds.has(cue.id)) {
      issues.push({
        cueId: cue.id,
        code: "duplicate-id",
        message: `Duplicate cue id: ${cue.id}`,
      });
    }
    seenIds.add(cue.id);

    if (cue.startMs < 0) {
      issues.push({
        cueId: cue.id,
        code: "negative-start",
        message: "startMs must be >= 0",
      });
    }

    if (cue.endMs <= cue.startMs) {
      issues.push({
        cueId: cue.id,
        code: "invalid-range",
        message: "endMs must be greater than startMs",
      });
    }
  }

  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.endMs > next.startMs) {
      issues.push({
        cueId: current.id,
        code: "suspicious-overlap",
        message: `Overlaps with cue ${next.id}`,
      });
    }
  }

  return issues;
}
