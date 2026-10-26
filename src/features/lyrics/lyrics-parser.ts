import type { LyricCue } from "../../shared/types/project";
import { parseTimestamp } from "../../shared/utils/time";

export type LyricsImportFormat = "srt" | "lrc" | "plain";

function newCueId(): string {
  return crypto.randomUUID();
}

function toCue(
  text: string,
  startMs: number,
  endMs: number,
  needsReview = false,
): LyricCue {
  return {
    id: newCueId(),
    text: text.trim(),
    startMs,
    endMs,
    source: "imported",
    needsReview,
  };
}

/**
 * Parse SubRip (.srt) into lyric cues.
 * Supports optional hours and comma or dot millis.
 */
export function parseSrt(content: string): LyricCue[] {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  const cues: LyricCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    let timingLine = lines[0];
    let textStart = 1;
    if (!timingLine.includes("-->") && lines.length >= 3) {
      timingLine = lines[1];
      textStart = 2;
    }
    if (!timingLine.includes("-->")) continue;

    const [startRaw, endRaw] = timingLine.split("-->").map((s) => s.trim());
    const startMs = parseTimestamp(startRaw);
    const endMs = parseTimestamp(endRaw);
    if (startMs === null || endMs === null || endMs <= startMs) continue;

    const text = lines.slice(textStart).join("\n");
    if (!text) continue;
    cues.push(toCue(text, startMs, endMs));
  }

  return cues;
}

/**
 * Parse LRC (timed lyrics). Lines without timestamps become review cues
 * with sequential placeholder timing when mixed; pure text falls back to plain.
 */
export function parseLrc(content: string): LyricCue[] {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lineRe = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  const timed: { startMs: number; text: string }[] = [];

  for (const raw of normalized.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("[ti:") || line.startsWith("[ar:")) continue;
    if (line.startsWith("[al:") || line.startsWith("[by:")) continue;
    if (line.startsWith("[offset:")) continue;

    const match = line.match(lineRe);
    if (!match) continue;

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const frac = match[3] ?? "0";
    const millis = Number(frac.padEnd(3, "0").slice(0, 3));
    const startMs = minutes * 60_000 + seconds * 1000 + millis;
    const text = match[4].trim();
    if (!text) continue;
    timed.push({ startMs, text });
  }

  if (timed.length === 0) return [];

  timed.sort((a, b) => a.startMs - b.startMs);

  const DEFAULT_DURATION_MS = 3000;
  const cues: LyricCue[] = [];
  for (let i = 0; i < timed.length; i++) {
    const current = timed[i];
    const next = timed[i + 1];
    const endMs = next
      ? Math.max(current.startMs + 200, next.startMs)
      : current.startMs + DEFAULT_DURATION_MS;
    cues.push(toCue(current.text, current.startMs, endMs));
  }
  return cues;
}

/** Untimed lines → cues needing review, 3s each from t=0. */
export function parsePlainLyrics(content: string): LyricCue[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const DURATION = 3000;
  return lines.map((text, index) =>
    toCue(text, index * DURATION, index * DURATION + DURATION, true),
  );
}

export function detectLyricsFormat(
  fileName: string,
  content: string,
): LyricsImportFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".srt")) return "srt";
  if (lower.endsWith(".lrc")) return "lrc";
  if (content.includes("-->")) return "srt";
  if (/\[\d{1,2}:\d{2}/.test(content)) return "lrc";
  return "plain";
}

export function parseLyricsContent(
  content: string,
  format: LyricsImportFormat,
): LyricCue[] {
  switch (format) {
    case "srt":
      return parseSrt(content);
    case "lrc":
      return parseLrc(content);
    case "plain":
      return parsePlainLyrics(content);
  }
}

export function parseLyricsFile(fileName: string, content: string): LyricCue[] {
  return parseLyricsContent(content, detectLyricsFormat(fileName, content));
}
