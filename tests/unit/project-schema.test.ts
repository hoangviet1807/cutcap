import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../src/shared/types/project";
import {
  deserializeProject,
  serializeProject,
} from "../../src/services/storage/project-schema";

describe("project schema", () => {
  it("serializes and deserializes a project", () => {
    const project = createEmptyProject("Roundtrip");
    const json = serializeProject(project);
    const restored = deserializeProject(json);
    expect(restored.name).toBe("Roundtrip");
    expect(restored.media.imageFileName).toBeNull();
    expect(restored.schemaVersion).toBe(2);
    expect(restored.style.textX).toBe(50);
    expect(restored.style.boxWidthPct).toBe(80);
    expect(restored.style.textAnimation).toBe("fade");
  });

  it("fills new style fields when missing from older JSON", () => {
    const project = createEmptyProject("Legacy style");
    const raw = JSON.parse(serializeProject(project)) as Record<string, unknown>;
    const style = raw.style as Record<string, unknown>;
    delete style.boxWidthPct;
    delete style.boxHeightPct;
    delete style.textAnimation;
    const restored = deserializeProject(JSON.stringify(raw));
    expect(restored.style.boxWidthPct).toBe(80);
    expect(restored.style.boxHeightPct).toBe(18);
    expect(restored.style.textAnimation).toBe("fade");
  });

  it("migrates schema v1 position presets to percent anchors", () => {
    const v1 = createEmptyProject("Legacy");
    const raw = JSON.parse(serializeProject(v1)) as Record<string, unknown>;
    raw.schemaVersion = 1;
    const style = raw.style as Record<string, unknown>;
    delete style.textX;
    delete style.textY;
    style.position = "top-left";
    const restored = deserializeProject(JSON.stringify(raw));
    expect(restored.schemaVersion).toBe(2);
    expect(restored.style.textX).toBe(18);
    expect(restored.style.textY).toBe(14);
  });

  it("rejects bad JSON", () => {
    expect(() => deserializeProject("{")).toThrow(/Invalid JSON/);
  });
});
