import { describe, expect, it } from "vitest";
import {
  parseLrc,
  parseLyricsFile,
  parsePlainLyrics,
  parseSrt,
} from "../../src/features/lyrics/lyrics-parser";

describe("parseSrt", () => {
  it("parses numbered blocks with comma millis", () => {
    const cues = parseSrt(`1
00:00:01,000 --> 00:00:03,500
Xin chào

2
00:00:04,000 --> 00:00:06,000
Thế giới
`);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("Xin chào");
    expect(cues[0].startMs).toBe(1000);
    expect(cues[0].endMs).toBe(3500);
    expect(cues[1].text).toBe("Thế giới");
  });
});

describe("parseLrc", () => {
  it("derives end times from the next line", () => {
    const cues = parseLrc(`
[00:12.00]Dòng một
[00:15.50]Dòng hai
`);
    expect(cues).toHaveLength(2);
    expect(cues[0].startMs).toBe(12_000);
    expect(cues[0].endMs).toBe(15_500);
    expect(cues[1].text).toBe("Dòng hai");
  });
});

describe("parsePlainLyrics", () => {
  it("marks cues as needing review", () => {
    const cues = parsePlainLyrics("a\nb\n");
    expect(cues).toHaveLength(2);
    expect(cues.every((c) => c.needsReview)).toBe(true);
    expect(cues[1].startMs).toBe(3000);
  });
});

describe("parseLyricsFile", () => {
  it("detects format from extension", () => {
    const cues = parseLyricsFile(
      "song.lrc",
      "[00:01.00]Hello\n[00:02.00]World\n",
    );
    expect(cues[0].source).toBe("imported");
    expect(cues).toHaveLength(2);
  });
});
