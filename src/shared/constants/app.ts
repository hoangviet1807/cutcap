export const APP_NAME = "CutCap";
export const APP_TAGLINE = "Lyric video generator";

/** Preferred AI providers: free-tier first, BYOK. */
export const AI_PROVIDER_PRIORITY = [
  "groq-whisper",
  "openai-whisper",
] as const;
