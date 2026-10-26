import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GroqAlignmentError,
  groqLyricsAligner,
} from "../../src/services/ai/providers/groq-lyrics-aligner";
import { GROQ_WHISPER_MODEL } from "../../src/services/ai/groq-client";

describe("groqLyricsAligner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requires lyric lines", async () => {
    await expect(
      groqLyricsAligner.align({
        audioPath: "browser-media://p/audio",
        audioBlob: new Blob(["x"]),
        lyrics: ["  ", ""],
        apiKey: "gsk",
      }),
    ).rejects.toBeInstanceOf(GroqAlignmentError);
  });

  it("fetches word timings and returns aligned cues", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "hello world",
        duration: 2,
        words: [
          { word: "hello", start: 0.2, end: 0.6 },
          { word: "world", start: 0.6, end: 1.2 },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await groqLyricsAligner.align({
      audioPath: "browser-media://p/audio",
      audioBlob: new Blob(["audio"]),
      fileName: "song.mp3",
      lyrics: ["Hello world"],
      language: "en",
      apiKey: "gsk_test",
    });

    expect(result.provider).toBe("groq-force-align");
    expect(result.model).toBe(GROQ_WHISPER_MODEL);
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0].text).toBe("Hello world");
    expect(result.cues[0].source).toBe("aligned");
    expect(result.cues[0].startMs).toBe(200);
    expect(result.cues[0].endMs).toBe(1200);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = init.body as FormData;
    expect(form.get("timestamp_granularities[]")).toBe("word");
  });
});
