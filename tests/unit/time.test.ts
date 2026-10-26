import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  parseTimestamp,
} from "../../src/shared/utils/time";

describe("timestamp helpers", () => {
  it("round-trips common values", () => {
    expect(parseTimestamp("00:01.500")).toBe(1500);
    expect(formatTimestamp(1500)).toBe("00:01.500");
    expect(parseTimestamp("01:02:03,004")).toBe(3_723_004);
  });

  it("rejects invalid input", () => {
    expect(parseTimestamp("nope")).toBeNull();
    expect(parseTimestamp("")).toBeNull();
  });
});
