import { useEffect, useRef, useState } from "react";
import type { AlignmentResult } from "../../shared/types/ai";
import type { Project } from "../../shared/types/project";
import { getApiKey, setApiKey } from "../../services/ai/credentials";
import { getDefaultLyricsAligner } from "../../services/ai/providers";
import { runProjectAlignment } from "../../services/ai/run-alignment";
import { formatTimestamp } from "../../shared/utils/time";

interface AlignDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  onApply: (result: AlignmentResult) => void;
}

type Phase = "idle" | "working" | "done" | "error";

function linesFromProject(project: Project): string {
  return project.lyrics.cues
    .map((c) => c.text.trim())
    .filter(Boolean)
    .join("\n");
}

export function AlignDialog({
  project,
  open,
  onClose,
  onApply,
}: AlignDialogProps) {
  const aligner = getDefaultLyricsAligner();
  const [apiKey, setApiKeyDraft] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [language, setLanguage] = useState(project.lyrics.language || "");
  const [lyricsText, setLyricsText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AlignmentResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasAudio = Boolean(project.media.audioPath);
  const lyricLines = lyricsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const willReplace = project.lyrics.cues.length > 0;
  const busy = phase === "working";

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setPhase("idle");
      setError(null);
      setPreview(null);
      return;
    }
    // Init only when the dialog opens — avoid resetting while autosave mutates project.
    setApiKeyDraft(getApiKey("groq") ?? "");
    setLanguage(project.lyrics.language || "");
    setLyricsText(linesFromProject(project));
    setRememberKey(true);
    setPhase("idle");
    setError(null);
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open transition only
  }, [open]);

  if (!open) return null;

  async function start() {
    setError(null);
    setPreview(null);

    const key = apiKey.trim();
    if (!key) {
      setError("Paste your Groq API key first (BYOK, free tier).");
      setPhase("error");
      return;
    }
    if (!hasAudio) {
      setError("Import an audio file before aligning.");
      setPhase("error");
      return;
    }
    if (lyricLines.length === 0) {
      setError("Paste or keep at least one lyric line to align.");
      setPhase("error");
      return;
    }

    if (rememberKey) setApiKey("groq", key);

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("working");

    try {
      const result = await runProjectAlignment({
        project,
        lyrics: lyricLines,
        language: language.trim() || undefined,
        apiKey: key,
        signal: controller.signal,
        aligner,
      });
      setPreview(result);
      setPhase("done");
    } catch (e) {
      if (controller.signal.aborted) {
        setPhase("idle");
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="align-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-stone-200 bg-[#f7f2ea] shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="align-title" className="font-medium text-stone-900">
            Align lyrics
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-200/60 disabled:opacity-40"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">Keep your words · fit the timing</p>
            <p className="mt-1 text-amber-900/90">
              Audio is uploaded to{" "}
              <span className="font-medium">{aligner.displayName}</span> for
              word timestamps, then matched locally to your lyric lines. Your
              text stays as written.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-xs text-stone-600">
            <div>
              <dt className="text-stone-500">Aligner</dt>
              <dd className="font-medium text-stone-900">
                {aligner.displayName}
                {aligner.freeTier ? " · free tier" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Audio</dt>
              <dd className="truncate font-medium text-stone-900">
                {project.media.audioFileName ??
                  (hasAudio ? "Imported audio" : "Missing")}
              </dd>
            </div>
          </dl>

          {willReplace && (
            <p className="text-xs text-stone-600">
              Applying will{" "}
              <span className="font-medium text-stone-900">
                replace {project.lyrics.cues.length} existing cue
                {project.lyrics.cues.length === 1 ? "" : "s"}
              </span>{" "}
              with aligned timings.
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Lyric lines (one per line)
            </span>
            <textarea
              value={lyricsText}
              disabled={busy}
              rows={6}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={"Line one\nLine two\n…"}
              className="w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 font-sans text-stone-900 outline-none focus:border-stone-500"
            />
            <span className="text-[10px] text-stone-500">
              {lyricLines.length} line{lyricLines.length === 1 ? "" : "s"}
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Groq API key
            </span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              disabled={busy}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder="gsk_…"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={rememberKey}
              disabled={busy}
              onChange={(e) => setRememberKey(e.target.checked)}
            />
            Remember key in this browser (localStorage only)
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Language (ISO-639-1, optional)
            </span>
            <input
              value={language}
              disabled={busy}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. en, vi, ja"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-500"
            />
          </label>

          {busy && (
            <p className="text-xs text-stone-600">
              Uploading audio, fetching word timings, aligning locally…
            </p>
          )}

          {error && (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </pre>
          )}

          {preview && (
            <div className="space-y-2 rounded-md border border-stone-200 bg-white/80 px-3 py-2">
              <p className="text-xs text-stone-500">
                {preview.cues.length} cue
                {preview.cues.length === 1 ? "" : "s"}
                {preview.matchRatio != null &&
                  ` · ~${Math.round(preview.matchRatio * 100)}% token match`}
                {preview.cues.filter((c) => c.needsReview).length > 0 &&
                  ` · ${preview.cues.filter((c) => c.needsReview).length} need review`}
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-stone-800">
                {preview.cues.slice(0, 8).map((c) => (
                  <li key={c.id} className="truncate font-mono">
                    <span className="text-stone-500">
                      {formatTimestamp(c.startMs)}
                    </span>{" "}
                    {c.text}
                    {c.needsReview ? " !" : ""}
                  </li>
                ))}
                {preview.cues.length > 8 && (
                  <li className="text-stone-500">
                    …and {preview.cues.length - 8} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-stone-200 px-4 py-3">
          {busy ? (
            <button
              type="button"
              onClick={cancel}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
            >
              Cancel
            </button>
          ) : (
            <>
              {preview && (
                <button
                  type="button"
                  onClick={() => onApply(preview)}
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50 hover:bg-stone-800"
                >
                  Apply timings
                </button>
              )}
              <button
                type="button"
                disabled={!hasAudio}
                onClick={() => void start()}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {preview ? "Align again" : "Start alignment"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
