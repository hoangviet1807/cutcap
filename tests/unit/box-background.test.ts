import { describe, expect, it } from "vitest";
import {
  clampOpacity,
  lyricBoxBackground,
} from "../../src/features/preview/box-background";

describe("lyricBoxBackground", () => {
  it("is transparent when mode is none", () => {
    expect(
      lyricBoxBackground({
        boxBgMode: "none",
        boxBgColor: "#000000",
        boxBgOpacity: 50,
      }),
    ).toBe("transparent");
  });

  it("builds rgba for color mode", () => {
    expect(
      lyricBoxBackground({
        boxBgMode: "color",
        boxBgColor: "#112233",
        boxBgOpacity: 50,
      }),
    ).toBe("rgba(17,34,51,0.5)");
  });
});

describe("clampOpacity", () => {
  it("clamps to 0–100", () => {
    expect(clampOpacity(-10)).toBe(0);
    expect(clampOpacity(150)).toBe(100);
    expect(clampOpacity(42.6)).toBe(43);
  });
});
