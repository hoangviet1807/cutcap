import { useEffect, useRef, useState } from "react";
import type { ExportQuality, Project } from "../../shared/types/project";
import type { ExportProgress } from "../../shared/types/render";
import {
  downloadBlob,
  ExportCancelledError,
  exportLyricVideo,
} from "../../services/media/ffmpeg-service";
import { resolveEncoderProfile } from "../../services/media/encoder-settings";
import { validateProjectForRender } from "../../services/media/render-validation";

interface ExportDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  onProjectChange: (project: Project) => void;
}

const QUALITIES: { id: ExportQuality; label: string; hint: string }[] = [
  { id: "draft", label: "Draft", hint: "Faster, ~720p" },
  { id: "standard", label: "Standard", hint: "Good balance" },
  { id: "high", label: "High", hint: "Slower, sharper" },
];

export function ExportDialog({
  project,
  open,
  onClose,
  onProjectChange,
}: ExportDialogProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const issues = validateProjectForRender(project);
  const profile = resolveEncoderProfile(
    project.canvas,
    project.export.quality,
  );
  const busy =
    progress != null &&
    progress.phase !== "done" &&
    progress.phase !== "error" &&
    progress.phase !== "cancelled" &&
    progress.phase !== "idle";

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
      setResultName(null);
      setResultBlob(null);
      setProgress(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when dialog closes
  }, [open]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!open) return null;

  function setQuality(quality: ExportQuality) {
    onProjectChange({
      ...project,
      export: { ...project.export, quality },
    });
  }

  async function startExport() {
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultName(null);
    setResultBlob(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await exportLyricVideo({
        project,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResultBlob(result.blob);
      setResultName(result.fileName);
      setResultUrl(URL.createObjectURL(result.blob));
    } catch (e) {
      if (e instanceof ExportCancelledError) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function saveFile() {
    if (!resultBlob || !resultName) return;
    downloadBlob(resultBlob, resultName);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="w-full max-w-lg rounded-lg border border-stone-200 bg-[#f7f2ea] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id="export-title" className="font-medium text-stone-900">
            Export MP4
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
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">
              Quality
            </p>
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setQuality(q.id)}
                  className={`rounded-md px-3 py-2 text-left text-xs ${
                    project.export.quality === q.id
                      ? "bg-stone-900 text-stone-50"
                      : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                  } disabled:opacity-50`}
                >
                  <span className="block font-medium">{q.label}</span>
                  <span className="opacity-70">{q.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-xs text-stone-600">
            <div>
              <dt className="text-stone-500">Resolution</dt>
              <dd className="font-medium text-stone-900">
                {profile.width}×{profile.height}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">FPS</dt>
              <dd className="font-medium text-stone-900">{profile.fps}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Aspect</dt>
              <dd className="font-medium text-stone-900">
                {project.canvas.width >= project.canvas.height
                  ? "16:9"
                  : "9:16"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Cues</dt>
              <dd className="font-medium text-stone-900">
                {project.lyrics.cues.length}
              </dd>
            </div>
          </dl>

          {issues.length > 0 && (
            <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {issues.map((issue) => (
                <li key={issue.code}>• {issue.message}</li>
              ))}
            </ul>
          )}

          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-600">
                <span>{progress.message}</span>
                {progress.ratio != null && (
                  <span>{Math.round(progress.ratio * 100)}%</span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-800 transition-[width] duration-200"
                  style={{
                    width: `${Math.round((progress.ratio ?? (busy ? 5 : 0)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </pre>
          )}

          {resultUrl && (
            <div className="space-y-2">
              <video
                src={resultUrl}
                controls
                className="max-h-48 w-full rounded-md border border-stone-300 bg-black"
              />
              <p className="text-xs text-stone-500">
                Ready: {resultName}. Encoded locally with ffmpeg.wasm (no
                upload). Prefer Draft for a quick smoke test.
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
              {resultBlob && (
                <button
                  type="button"
                  onClick={saveFile}
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
                >
                  Download MP4
                </button>
              )}
              <button
                type="button"
                disabled={issues.length > 0}
                onClick={() => void startExport()}
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                {resultUrl ? "Export again" : "Start export"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
