import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GROQ_WHISPER_MODEL,
  GroqTranscriptionError,
  groqWhisperProvider,
} from "../../src/services/ai/providers/groq-whisper-provider";

describe("groqWhisperProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when API key is missing", async () => {
    await expect(
      groqWhisperProvider.transcribe({
        audioPath: "browser-media://p/audio",
        audioBlob: new Blob(["x"], { type: "audio/mpeg" }),
        timestamps: "segment",
        apiKey: "",
      }),
    ).rejects.toBeInstanceOf(GroqTranscriptionError);
  });

  it("posts multipart form and maps verbose_json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Xin chào",
        language: "vi",
        segments: [{ id: 0, start: 0.5, end: 1.5, text: " Xin chào" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await groqWhisperProvider.transcribe({
      audioPath: "browser-media://p/audio",
      audioBlob: new Blob(["fake-audio"], { type: "audio/mpeg" }),
      fileName: "vocal.mp3",
      language: "vi",
      timestamps: "segment",
      apiKey: "gsk_test",
    });

    expect(result.provider).toBe("groq-whisper");
    expect(result.model).toBe(GROQ_WHISPER_MODEL);
    expect(result.language).toBe("vi");
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0].text).toBe("Xin chào");
    expect(result.cues[0].startMs).toBe(500);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer gsk_test",
    });
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("model")).toBe(GROQ_WHISPER_MODEL);
    expect(form.get("response_format")).toBe("verbose_json");
    expect(form.get("language")).toBe("vi");
  });

  it("surfaces Groq HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { message: "Invalid API Key" },
        }),
      }),
    );

    await expect(
      groqWhisperProvider.transcribe({
        audioPath: "x",
        audioBlob: new Blob(["a"]),
        timestamps: "segment",
        apiKey: "bad",
      }),
    ).rejects.toThrow(/Invalid API Key/);
  });
});
