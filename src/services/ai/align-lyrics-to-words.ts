import type { LyricCue } from "../../shared/types/project";

export interface TimedWord {
  word: string;
  /** Seconds */
  start: number;
  /** Seconds */
  end: number;
}

export interface AlignLyricsOptions {
  createId?: () => string;
  /** Clamp interpolated ends (ms). */
  audioDurationMs?: number;
  /** Match ratio below this → needsReview (default 0.55). */
  reviewThreshold?: number;
}

const MATCH = 2;
const PARTIAL = 1;
const MISMATCH = -1;
const GAP = -1;
const MIN_CUE_MS = 120;

/** Normalize for fuzzy matching (case/diacritics/punct). */
export function normalizeAlignToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function tokenizeLyricLine(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .map((t) => normalizeAlignToken(t))
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j]
          ? row[j]
          : 1 + Math.min(row[j], row[j + 1], prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function tokenScore(a: string, b: string): number {
  if (!a || !b) return MISMATCH;
  if (a === b) return MATCH;
  if (a.length >= 2 && b.length >= 2 && (a.startsWith(b) || b.startsWith(a))) {
    return PARTIAL;
  }
  if (Math.abs(a.length - b.length) <= 2 && levenshtein(a, b) <= 2) {
    return PARTIAL;
  }
  return MISMATCH;
}

type Ptr = "diag" | "up" | "left";

/**
 * Needleman–Wunsch alignment of lyric tokens → ASR word indices.
 * Returns parallel array: for each lyric token, matched ASR index or null.
 */
export function alignTokenSequences(
  lyricTokens: string[],
  asrTokens: string[],
): Array<number | null> {
  const n = lyricTokens.length;
  const m = asrTokens.length;
  if (n === 0) return [];

  const score: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  const ptr: Ptr[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => "diag" as Ptr),
  );

  for (let i = 1; i <= n; i++) {
    score[i][0] = i * GAP;
    ptr[i][0] = "up";
  }
  for (let j = 1; j <= m; j++) {
    score[0][j] = j * GAP;
    ptr[0][j] = "left";
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag =
        score[i - 1][j - 1] + tokenScore(lyricTokens[i - 1], asrTokens[j - 1]);
      const up = score[i - 1][j] + GAP;
      const left = score[i][j - 1] + GAP;
      if (diag >= up && diag >= left) {
        score[i][j] = diag;
        ptr[i][j] = "diag";
      } else if (up >= left) {
        score[i][j] = up;
        ptr[i][j] = "up";
      } else {
        score[i][j] = left;
        ptr[i][j] = "left";
      }
    }
  }

  const map: Array<number | null> = Array.from({ length: n }, () => null);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ptr[i][j] === "diag") {
      const s = tokenScore(lyricTokens[i - 1], asrTokens[j - 1]);
      if (s > MISMATCH) map[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else if (i > 0 && (j === 0 || ptr[i][j] === "up")) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return map;
}

interface LineSpan {
  text: string;
  tokenStart: number;
  tokenCount: number;
}

function toMs(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

/**
 * Force-align known lyric lines onto Whisper word timings.
 * Preserves lyric text; borrows ASR timestamps via sequence alignment.
 */
export function alignLyricsToWords(
  lyrics: string[],
  words: TimedWord[],
  options: AlignLyricsOptions = {},
): LyricCue[] {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const reviewThreshold = options.reviewThreshold ?? 0.55;
  const lines = lyrics.map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const spans: LineSpan[] = [];
  const flatTokens: string[] = [];
  for (const text of lines) {
    const tokens = tokenizeLyricLine(text);
    spans.push({
      text,
      tokenStart: flatTokens.length,
      tokenCount: Math.max(1, tokens.length),
    });
    if (tokens.length === 0) {
      // Keep a placeholder token so empty-ish lines still get a slot.
      flatTokens.push("");
    } else {
      flatTokens.push(...tokens);
    }
  }

  const asrTokens = words.map((w) => normalizeAlignToken(w.word));
  const map = alignTokenSequences(flatTokens, asrTokens);

  type Draft = {
    text: string;
    startMs: number | null;
    endMs: number | null;
    matched: number;
    tokenCount: number;
  };

  const drafts: Draft[] = spans.map((span) => {
    const matchedIdx: number[] = [];
    let matched = 0;
    for (let t = 0; t < span.tokenCount; t++) {
      const asr = map[span.tokenStart + t];
      if (asr != null && asr >= 0 && asr < words.length) {
        matchedIdx.push(asr);
        if (flatTokens[span.tokenStart + t]) matched += 1;
      }
    }
    matchedIdx.sort((a, b) => a - b);
    if (matchedIdx.length === 0) {
      return {
        text: span.text,
        startMs: null,
        endMs: null,
        matched: 0,
        tokenCount: span.tokenCount,
      };
    }
    const first = words[matchedIdx[0]];
    const last = words[matchedIdx[matchedIdx.length - 1]];
    return {
      text: span.text,
      startMs: toMs(first.start),
      endMs: toMs(last.end),
      matched,
      tokenCount: span.tokenCount,
    };
  });

  // Interpolate gaps for unmatched lines.
  const durationCap =
    options.audioDurationMs ??
    (words.length
      ? toMs(words[words.length - 1].end) + 500
      : drafts.length * 2000);

  for (let i = 0; i < drafts.length; i++) {
    if (drafts[i].startMs != null) continue;
    let prevEnd = 0;
    for (let p = i - 1; p >= 0; p--) {
      if (drafts[p].endMs != null) {
        prevEnd = drafts[p].endMs!;
        break;
      }
    }
    let nextStart = durationCap;
    for (let n = i + 1; n < drafts.length; n++) {
      if (drafts[n].startMs != null) {
        nextStart = drafts[n].startMs!;
        break;
      }
    }
    // Spread consecutive gaps evenly.
    let run = 1;
    while (i + run < drafts.length && drafts[i + run].startMs == null) run += 1;
    const slice = Math.max(MIN_CUE_MS, Math.floor((nextStart - prevEnd) / run));
    for (let k = 0; k < run; k++) {
      const start = prevEnd + k * slice;
      drafts[i + k].startMs = start;
      drafts[i + k].endMs = Math.min(nextStart, start + slice);
    }
    i += run - 1;
  }

  // Ensure monotonic non-empty ranges.
  for (let i = 0; i < drafts.length; i++) {
    let start = drafts[i].startMs ?? 0;
    let end = drafts[i].endMs ?? start + MIN_CUE_MS;
    if (i > 0) {
      const prevEnd = drafts[i - 1].endMs ?? 0;
      if (start < prevEnd) start = prevEnd;
    }
    if (end <= start) end = start + MIN_CUE_MS;
    if (options.audioDurationMs != null) {
      start = Math.min(start, options.audioDurationMs);
      end = Math.min(end, Math.max(start + MIN_CUE_MS, options.audioDurationMs));
    }
    drafts[i].startMs = start;
    drafts[i].endMs = end;
  }

  return drafts.map((d) => {
    const ratio = d.matched / Math.max(1, d.tokenCount);
    return {
      id: createId(),
      text: d.text,
      startMs: d.startMs ?? 0,
      endMs: d.endMs ?? MIN_CUE_MS,
      confidence: ratio,
      source: "aligned" as const,
      needsReview: ratio < reviewThreshold,
    };
  });
}
