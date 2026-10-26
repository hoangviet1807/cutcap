import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE } from "../../src/shared/types/project";
import {
  escapeDrawtext,
  generateAssSubtitles,
  hexToAssColor,
  msToAssTime,
} from "../../src/services/media/subtitle-generator";

describe("msToAssTime", () => {
  it("formats centiseconds", () => {
    expect(msToAssTime(1500)).toBe("0:00:01.50");
    expect(msToAssTime(3_723_040)).toBe("1:02:03.04");
  });
});

describe("hexToAssColor", () => {
  it("converts to ASS AABBGGRR", () => {
    expect(hexToAssColor("#FFFFFF")).toBe("&H00FFFFFF");
    expect(hexToAssColor("#FF0000")).toBe("&H000000FF");
  });
});

describe("generateAssSubtitles", () => {
  it("includes font, clip box, pos, fad, and dialogue lines", () => {
    const ass = generateAssSubtitles({
      width: 1920,
      height: 1080,
      style: {
        ...DEFAULT_STYLE,
        fontFamily: "Be Vietnam Pro",
        textX: 50,
        textY: 80,
        boxWidthPct: 80,
        boxHeightPct: 20,
        textAnimation: "fade",
        fadeInMs: 400,
        fadeOutMs: 500,
      },
      cues: [{ text: "Xin chào", startMs: 1000, endMs: 3000 }],
    });
    expect(ass).toContain("PlayResX: 1920");
    expect(ass).toContain("Be Vietnam Pro");
    expect(ass).toContain("\\clip(");
    expect(ass).toContain("\\pos(");
    expect(ass).toContain("\\fad(400,500)");
    expect(ass).toContain("Xin chào");
    expect(ass).toContain("Dialogue:");
  });

  it("uses move tags for slide-up animation", () => {
    const ass = generateAssSubtitles({
      width: 1080,
      height: 1920,
      style: {
        ...DEFAULT_STYLE,
        textAnimation: "slide-up",
        fadeInMs: 300,
        fadeOutMs: 200,
      },
      cues: [{ text: "Line", startMs: 0, endMs: 1000 }],
    });
    expect(ass).toContain("\\move(");
  });

  it("emits ornament emoji dialogues when enabled", () => {
    const ass = generateAssSubtitles({
      width: 1920,
      height: 1080,
      style: {
        ...DEFAULT_STYLE,
        textOrnament: "hearts",
      },
      cues: [{ text: "Love", startMs: 0, endMs: 2000 }],
    });
    expect(ass).toMatch(/💖|💕|💗|❤️/);
    expect(ass.split("Dialogue:").length).toBeGreaterThan(2);
  });
});

describe("escapeDrawtext", () => {
  it("escapes special characters", () => {
    expect(escapeDrawtext("a:b")).toContain("\\:");
  });
});
