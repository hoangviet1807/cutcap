import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  PROJECT_SCHEMA_VERSION,
} from "../../src/shared/types/project";

describe("createEmptyProject", () => {
  it("creates a schema v1 project with defaults", () => {
    const project = createEmptyProject("Demo");
    expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(project.name).toBe("Demo");
    expect(project.canvas).toEqual({ width: 1920, height: 1080, fps: 30 });
    expect(project.lyrics.language).toBe("vi");
    expect(project.lyrics.cues).toEqual([]);
    expect(project.media.imagePath).toBeNull();
  });
});
