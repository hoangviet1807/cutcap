import { useEffect, useRef, useState } from "react";
import type { Project } from "../../shared/types/project";
import type { TranscriptionResult } from "../../shared/types/ai";
import {
  getApiKey,
  setApiKey,
} from "../../services/ai/credentials";
import { getDefaultTranscriptionProvider } from "../../services/ai/providers";
import { runProjectTranscription } from "../../services/ai/run-transcription";

interface TranscribeDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  onApply: (result: TranscriptionResult) => void;
}

type Phase = "idle" | "uploading" | "done" | "error";

export function TranscribeDialog({
  project,
  open,
  onClose,
  onApply,
}: TranscribeDialogProps) {
  const provider = getDefaultTranscriptionProvider();
  const [apiKey, setApiKeyDraft] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [language, setLanguage] = useState(project.lyrics.language || "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TranscriptionResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasAudio = Boolean(project.media.audioPath);
  const willReplace = project.lyrics.cues.length > 0;
  const busy = phase === "uploading";

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setPhase("idle");
      setError(null);
      setPreview(null);
      return;
    }
    setApiKeyDraft(getApiKey("groq") ?? "");
    setLanguage(project.lyrics.language || "");
    setRememberKey(true);
    setPhase("idle");
    setError(null);
    setPreview(null);
  }, [open, project.lyrics.language]);

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
      setError("Import an audio file before transcribing.");
      setPhase("error");
      return;
    }

    if (rememberKey) setApiKey("groq", key);

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("uploading");

    try {
      const result = await runProjectTranscription({
        project,
        language: language.trim() || undefined,
        timestamps: "segment",
        apiKey: key,
        signal: controller.signal,
        provider,
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

  function apply() {
    if (!preview) return;
    onApply(preview);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcribe-title"
        className="w-full max-w-lg rounded-lg border border-stone-200 bg-[#f7f2ea] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="transcribe-title" className="font-medium text-stone-900">
            Transcribe audio
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

        <div className="space-y-4 px-4 py-4 text-sm">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">Cloud upload</p>
            <p className="mt-1 text-amber-900/90">
              Your audio will be sent to{" "}
              <span className="font-medium">{provider.displayName}</span> over
              HTTPS. The background image and project JSON stay local. Keys are
              never stored in the project file.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-xs text-stone-600">
            <div>
              <dt className="text-stone-500">Provider</dt>
              <dd className="font-medium text-stone-900">
                {provider.displayName}
                {provider.freeTier ? " · free tier" : ""}
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
              Applying results will{" "}
              <span className="font-medium text-stone-900">
                replace {project.lyrics.cues.length} existing cue
                {project.lyrics.cues.length === 1 ? "" : "s"}
              </span>
              .
            </p>
          )}

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
              Uploading audio and waiting for Whisper…
            </p>
          )}

          {error && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </pre>
          )}

          {preview && (
            <div className="space-y-2 rounded-md border border-stone-200 bg-white/80 px-3 py-2">
              <p className="text-xs text-stone-500">
                {preview.cues.length} cue
                {preview.cues.length === 1 ? "" : "s"}
                {preview.model ? ` · ${preview.model}` : ""}
                {preview.language ? ` · lang ${preview.language}` : ""}
              </p>
              <p className="line-clamp-4 text-xs text-stone-800">
                {preview.text}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-4 py-3">
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
                  onClick={apply}
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50 hover:bg-stone-800"
                >
                  Apply cues
                </button>
              )}
              <button
                type="button"
                disabled={!hasAudio}
                onClick={() => void start()}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {preview ? "Transcribe again" : "Start transcription"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
