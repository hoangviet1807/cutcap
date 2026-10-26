import { useRef, useState } from "react";
import type { LyricCue } from "../../shared/types/project";
import { LYRICS_ACCEPT } from "../media/probe-audio";
import { parseLyricsFile } from "./lyrics-parser";

interface LyricsImportProps {
  onImport: (cues: LyricCue[]) => void;
  /** Inline button only — errors surface via alert to avoid layout shift. */
  compact?: boolean;
}

export function LyricsImport({ onImport, compact = false }: LyricsImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const cues = parseLyricsFile(file.name, text);
      if (cues.length === 0) {
        const msg = "No lyric lines found in that file.";
        if (compact) window.alert(msg);
        else setError(msg);
        return;
      }
      onImport(cues);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      if (compact) window.alert(msg);
      else setError(msg);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={compact ? "contents" : "space-y-1"}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={
          compact
            ? "shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 transition hover:bg-stone-50"
            : "rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 transition hover:bg-stone-50"
        }
      >
        {compact ? "Import" : "Import .srt / .lrc"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={LYRICS_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {!compact && error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
