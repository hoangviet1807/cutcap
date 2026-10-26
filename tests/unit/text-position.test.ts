import { describe, expect, it } from "vitest";
import {
  clampTextPercent,
  legacyPositionToPercent,
  pointerToTextPercent,
} from "../../src/features/preview/text-position";

describe("clampTextPercent", () => {
  it("keeps values inside the safe margin", () => {
    expect(clampTextPercent(-10)).toBe(4);
    expect(clampTextPercent(50)).toBe(50);
    expect(clampTextPercent(200)).toBe(96);
  });
});

describe("legacyPositionToPercent", () => {
  it("maps bottom-center near the lower middle", () => {
    expect(legacyPositionToPercent("bottom-center")).toEqual({
      textX: 50,
      textY: 82,
    });
  });
});

describe("pointerToTextPercent", () => {
  it("converts canvas pointer coords to percents", () => {
    const rect = {
      left: 100,
      top: 50,
      width: 200,
      height: 100,
    } as DOMRect;
    expect(pointerToTextPercent(200, 100, rect)).toEqual({
      textX: 50,
      textY: 50,
    });
  });
});
