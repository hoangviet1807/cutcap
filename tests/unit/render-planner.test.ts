import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../src/shared/types/project";
import { buildRenderPlan } from "../../src/services/media/render-planner";
import { validateProjectForRender } from "../../src/services/media/render-validation";
import { resolveEncoderProfile } from "../../src/services/media/encoder-settings";

describe("validateProjectForRender", () => {
  it("flags an empty project", () => {
    const issues = validateProjectForRender(createEmptyProject());
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["missing-image", "missing-audio", "no-cues"]),
    );
  });
});

describe("buildRenderPlan", () => {
  it("builds a plan from a complete project", () => {
    const project = createEmptyProject("Demo Song");
    project.media.imagePath = "browser-media://x/image";
    project.media.audioPath = "browser-media://x/audio";
    project.media.audioDurationMs = 10_000;
    project.media.imageFileName = "bg.jpg";
    project.media.audioFileName = "song.mp3";
    project.lyrics.cues = [
      {
        id: "1",
        text: "Hello",
        startMs: 0,
        endMs: 2000,
        source: "manual",
        needsReview: false,
      },
    ];

    const plan = buildRenderPlan(project);
    expect(plan.imageFileName).toBe("background.jpg");
    expect(plan.audioFileName).toBe("audio.mp3");
    expect(plan.cues).toHaveLength(1);
    expect(plan.outputFileName).toMatch(/\.mp4$/);
  });
});

describe("resolveEncoderProfile", () => {
  it("shrinks draft exports", () => {
    const draft = resolveEncoderProfile(
      { width: 1920, height: 1080, fps: 30 },
      "draft",
    );
    expect(draft.width).toBeLessThanOrEqual(1280);
    expect(draft.height % 2).toBe(0);
  });
});
