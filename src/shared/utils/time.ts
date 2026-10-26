/** Format milliseconds as `MM:SS.mmm` (or `H:MM:SS.mmm` if ≥ 1h). */
export function formatTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}.${mmm}`;
  }
  return `${mm}:${ss}.${mmm}`;
}

/** Parse `HH:MM:SS,mmm`, `HH:MM:SS.mmm`, `MM:SS.mmm`, or `M:SS`. */
export function parseTimestamp(raw: string): number | null {
  const value = raw.trim().replace(",", ".");
  if (!value) return null;

  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  let hours = 0;
  let minutes = 0;
  let secondsPart = "";

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    secondsPart = parts[2];
  } else {
    minutes = Number(parts[0]);
    secondsPart = parts[1];
  }

  const secParts = secondsPart.split(".");
  const seconds = Number(secParts[0]);
  const millis =
    secParts.length > 1
      ? Number(secParts[1].padEnd(3, "0").slice(0, 3))
      : 0;

  if (
    [hours, minutes, seconds, millis].some((n) => Number.isNaN(n) || n < 0)
  ) {
    return null;
  }

  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + millis;
}

/** Compact `M:SS` for timeline labels. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
