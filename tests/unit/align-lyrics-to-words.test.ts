import { describe, expect, it } from "vitest";
import {
  alignLyricsToWords,
  alignTokenSequences,
  normalizeAlignToken,
  tokenizeLyricLine,
} from "../../src/services/ai/align-lyrics-to-words";

describe("normalizeAlignToken", () => {
  it("strips case, diacritics, and punctuation", () => {
    expect(normalizeAlignToken("Chào!")).toBe("chao");
    expect(normalizeAlignToken("Don't")).toBe("dont");
  });
});

describe("tokenizeLyricLine", () => {
  it("splits and normalizes words", () => {
    expect(tokenizeLyricLine("  Hello, World!  ")).toEqual(["hello", "world"]);
  });
});

describe("alignTokenSequences", () => {
  it("maps matching sequences 1:1", () => {
    const map = alignTokenSequences(
      ["hello", "world"],
      ["hello", "world"],
    );
    expect(map).toEqual([0, 1]);
  });

  it("skips ASR insertions", () => {
    const map = alignTokenSequences(
      ["hello", "world"],
      ["uh", "hello", "world"],
    );
    expect(map).toEqual([1, 2]);
  });
});

describe("alignLyricsToWords", () => {
  it("assigns timings from matched whisper words and keeps lyric text", () => {
    let n = 0;
    const cues = alignLyricsToWords(
      ["Hello world", "Good night"],
      [
        { word: "Hello", start: 1.0, end: 1.4 },
        { word: "world", start: 1.4, end: 2.0 },
        { word: "Good", start: 3.0, end: 3.3 },
        { word: "night", start: 3.3, end: 4.0 },
      ],
      { createId: () => `c${n++}` },
    );

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      id: "c0",
      text: "Hello world",
      startMs: 1000,
      endMs: 2000,
      source: "aligned",
      needsReview: false,
    });
    expect(cues[1].text).toBe("Good night");
    expect(cues[1].startMs).toBe(3000);
    expect(cues[1].endMs).toBe(4000);
  });

  it("interpolates unmatched lines and flags low confidence", () => {
    let n = 0;
    const cues = alignLyricsToWords(
      ["Known line", "Mystery line", "Also known"],
      [
        { word: "Known", start: 0, end: 0.5 },
        { word: "line", start: 0.5, end: 1.0 },
        { word: "Also", start: 4.0, end: 4.4 },
        { word: "known", start: 4.4, end: 5.0 },
      ],
      { createId: () => `x${n++}`, reviewThreshold: 0.55 },
    );

    expect(cues).toHaveLength(3);
    expect(cues[1].text).toBe("Mystery line");
    expect(cues[1].startMs).toBeGreaterThanOrEqual(cues[0].endMs);
    expect(cues[1].endMs).toBeLessThanOrEqual(cues[2].startMs);
    expect(cues[1].needsReview).toBe(true);
  });

  it("handles ASR mishears with fuzzy partial matches", () => {
    const cues = alignLyricsToWords(
      ["saved a wretch"],
      [
        { word: "same", start: 0, end: 0.3 },
        { word: "a", start: 0.3, end: 0.4 },
        { word: "wretch", start: 0.4, end: 0.9 },
      ],
      { createId: () => "a" },
    );
    expect(cues[0].text).toBe("saved a wretch");
    expect(cues[0].endMs).toBe(900);
    // "a" and "wretch" should match; "saved"~"same" may partial
    expect(cues[0].source).toBe("aligned");
  });
});
