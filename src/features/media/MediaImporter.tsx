import { useRef, useState } from "react";
import type { Project } from "../../shared/types/project";
import {
  browserMediaPath,
  putMediaBlob,
} from "../../services/storage/media-blob-store";
import { AUDIO_ACCEPT, IMAGE_ACCEPT, probeAudioDurationMs } from "./probe-audio";

interface MediaImporterProps {
  project: Project;
  onChange: (project: Project) => void;
}

export function MediaImporter({ project, onChange }: MediaImporterProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"image" | "audio" | null>(null);

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setBusy("image");
    setError(null);
    try {
      await putMediaBlob(project.id, "image", file);
      onChange({
        ...project,
        media: {
          ...project.media,
          imagePath: browserMediaPath(project.id, "image"),
          imageFileName: file.name,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import image");
    } finally {
      setBusy(null);
    }
  }

  async function handleAudio(file: File | undefined) {
    if (!file) return;
    setBusy("audio");
    setError(null);
    const tempUrl = URL.createObjectURL(file);
    try {
      const durationMs = await probeAudioDurationMs(tempUrl);
      await putMediaBlob(project.id, "audio", file);
      onChange({
        ...project,
        media: {
          ...project.media,
          audioPath: browserMediaPath(project.id, "audio"),
          audioFileName: file.name,
          audioDurationMs: durationMs,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import audio");
    } finally {
      URL.revokeObjectURL(tempUrl);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium text-stone-800">Assets</h2>
        {error && (
          <p className="truncate text-[10px] text-red-700" title={error}>
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => imageInputRef.current?.click()}
          title={project.media.imageFileName ?? "Import background image"}
          className="min-w-0 rounded-md border border-stone-300 bg-white px-2 py-2 text-left transition hover:bg-stone-50 disabled:opacity-50"
        >
          <span className="block text-[10px] tracking-wide text-stone-500 uppercase">
            Image
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-800">
            {busy === "image"
              ? "Importing…"
              : (project.media.imageFileName ?? "Choose…")}
          </span>
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => audioInputRef.current?.click()}
          title={project.media.audioFileName ?? "Import audio"}
          className="min-w-0 rounded-md border border-stone-300 bg-white px-2 py-2 text-left transition hover:bg-stone-50 disabled:opacity-50"
        >
          <span className="block text-[10px] tracking-wide text-stone-500 uppercase">
            Audio
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-800">
            {busy === "audio"
              ? "Importing…"
              : (project.media.audioFileName ?? "Choose…")}
          </span>
          {project.media.audioDurationMs != null && busy !== "audio" && (
            <span className="mt-0.5 block font-mono text-[10px] text-stone-500">
              {(project.media.audioDurationMs / 1000).toFixed(1)}s
            </span>
          )}
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => void handleImage(e.target.files?.[0])}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(e) => void handleAudio(e.target.files?.[0])}
      />
    </div>
  );
}
