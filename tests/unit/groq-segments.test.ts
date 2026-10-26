import { describe, expect, it } from "vitest";
import { cuesFromGroqVerbose } from "../../src/services/ai/groq-segments";

describe("cuesFromGroqVerbose", () => {
  it("maps segments to transcription cues with ms timestamps", () => {
    let n = 0;
    const cues = cuesFromGroqVerbose(
      {
        text: "Hello world",
        language: "en",
        segments: [
          {
            id: 0,
            start: 1.0,
            end: 2.5,
            text: " Hello",
            avg_logprob: -0.2,
            no_speech_prob: 0.01,
          },
          {
            id: 1,
            start: 2.5,
            end: 4.0,
            text: " world",
            avg_logprob: -1.5,
            no_speech_prob: 0.1,
          },
        ],
      },
      { granularity: "segment", createId: () => `id-${n++}` },
    );

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      id: "id-0",
      text: "Hello",
      startMs: 1000,
      endMs: 2500,
      source: "transcription",
      needsReview: false,
    });
    expect(cues[1].needsReview).toBe(true);
    expect(cues[1].text).toBe("world");
  });

  it("maps words when granularity is word", () => {
    let n = 0;
    const cues = cuesFromGroqVerbose(
      {
        words: [
          { word: "one", start: 0, end: 0.3 },
          { word: "two", start: 0.3, end: 0.6 },
        ],
      },
      { granularity: "word", createId: () => `w-${n++}` },
    );
    expect(cues).toHaveLength(2);
    expect(cues[0].startMs).toBe(0);
    expect(cues[0].endMs).toBe(300);
    expect(cues.every((c) => c.source === "transcription")).toBe(true);
  });

  it("falls back to a single cue from text when segments are missing", () => {
    const cues = cuesFromGroqVerbose(
      { text: "Only text", duration: 5 },
      { granularity: "segment", createId: () => "solo" },
    );
    expect(cues).toEqual([
      {
        id: "solo",
        text: "Only text",
        startMs: 0,
        endMs: 5000,
        source: "transcription",
        needsReview: true,
      },
    ]);
  });

  it("flags high no_speech_prob for review", () => {
    const cues = cuesFromGroqVerbose(
      {
        segments: [
          {
            start: 0,
            end: 1,
            text: "hmm",
            no_speech_prob: 0.9,
            avg_logprob: -0.1,
          },
        ],
      },
      { granularity: "segment", createId: () => "x" },
    );
    expect(cues[0].needsReview).toBe(true);
  });
});
