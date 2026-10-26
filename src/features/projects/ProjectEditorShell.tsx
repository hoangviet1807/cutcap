import { useEffect, useRef, useState } from "react";
import type { Project } from "../../shared/types/project";
import { getDefaultTranscriptionProvider } from "../../services/ai/providers";
import {
  downloadProjectJson,
  saveProject,
} from "../../services/storage/project-repository";
import { LyricsEditor } from "../lyrics/LyricsEditor";
import { MediaImporter } from "../media/MediaImporter";
import { useProjectMedia } from "../media/use-project-media";
import { ExportDialog } from "../export/ExportDialog";
import { DraggableLyric } from "../preview/DraggableLyric";
import { StylePanel } from "../preview/StylePanel";
import { clampTextPercent } from "../preview/text-position";
import { Timeline } from "../timeline/Timeline";

interface ProjectEditorShellProps {
  project: Project;
  onProjectChange: (project: Project) => void;
  onBack: () => void;
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function ProjectEditorShell({
  project,
  onProjectChange,
  onBack,
}: ProjectEditorShellProps) {
  const aiProvider = getDefaultTranscriptionProvider();
  const media = useProjectMedia(project);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [heldLyric, setHeldLyric] = useState("Kéo để đặt vị trí chữ");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateProject(next: Project) {
    setSaveStatus("unsaved");
    onProjectChange(next);
  }

  useEffect(() => {
    if (saveStatus !== "unsaved") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      void saveProject(project)
        .then((saved) => {
          setSaveStatus("saved");
          setSaveError(null);
          onProjectChange(saved);
        })
        .catch((e: unknown) => {
          setSaveStatus("error");
          setSaveError(e instanceof Error ? e.message : "Save failed");
        });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autosave when dirty
  }, [project, saveStatus]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentMs(Math.round(audio.currentTime * 1000));
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [media.audioUrl]);

  function seek(ms: number) {
    const audio = audioRef.current;
    setCurrentMs(ms);
    if (audio) audio.currentTime = ms / 1000;
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !media.audioUrl) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  }

  const activeCue = project.lyrics.cues.find(
    (c) => currentMs >= c.startMs && currentMs < c.endMs,
  );
  const selectedCue = project.lyrics.cues.find((c) => c.id === selectedCueId);

  useEffect(() => {
    if (activeCue?.text) setHeldLyric(activeCue.text);
  }, [activeCue?.id, activeCue?.text]);

  // Playback: hold last line between cues at full opacity (no dim flash at gaps).
  // Idle: prefer selection; dim only when paused with no active cue.
  const previewText = isPlaying
    ? (activeCue?.text ?? heldLyric)
    : (selectedCue?.text ||
        activeCue?.text ||
        project.lyrics.cues[0]?.text ||
        "Kéo để đặt vị trí chữ");
  const previewDimmed = !isPlaying && !activeCue;

  function setTextPosition(textX: number, textY: number) {
    updateProject({
      ...project,
      style: {
        ...project.style,
        textX: clampTextPercent(textX),
        textY: clampTextPercent(textY),
      },
    });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-stone-200/80 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1.5 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
        >
          ← Projects
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={project.name}
            onChange={(e) => updateProject({ ...project, name: e.target.value })}
            className="w-full max-w-md truncate border-0 bg-transparent font-medium text-stone-900 outline-none focus:ring-0"
            aria-label="Project name"
          />
          <p className="truncate text-xs text-stone-500">
            {project.canvas.width}×{project.canvas.height} · {project.canvas.fps}
            fps · {aiProvider.displayName}
            {" · "}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "unsaved" && "Unsaved"}
            {saveStatus === "error" && (saveError ?? "Save error")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadProjectJson(project)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Export MP4
        </button>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-stone-200/80 bg-white/40 text-sm">
          <div className="shrink-0 border-b border-stone-200/80 p-3">
            <MediaImporter project={project} onChange={updateProject} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-2">
            <LyricsEditor
              project={project}
              selectedCueId={selectedCueId}
              onSelectCue={setSelectedCueId}
              onChange={updateProject}
            />
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden bg-stone-900/5">
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 lg:p-6">
            <div
              className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-sm border border-stone-300 bg-stone-900 shadow-inner"
              style={{
                aspectRatio: `${project.canvas.width} / ${project.canvas.height}`,
              }}
            >
              {media.imageUrl ? (
                <img
                  src={media.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  Import a background image
                </div>
              )}
              <DraggableLyric
                text={previewText}
                style={project.style}
                dimmed={previewDimmed}
                onPositionChange={setTextPosition}
              />
            </div>
          </div>
          {media.audioUrl && (
            <audio ref={audioRef} src={media.audioUrl} preload="metadata" />
          )}
        </main>

        <aside className="min-h-0 overflow-y-auto overscroll-contain border-l border-stone-200/80 bg-white/40 p-4 text-sm">
          <StylePanel project={project} onChange={updateProject} />
        </aside>
      </div>

      <footer className="shrink-0 border-t border-stone-200/80 bg-white/80">
        <Timeline
          cues={project.lyrics.cues}
          durationMs={project.media.audioDurationMs ?? 0}
          currentMs={currentMs}
          selectedCueId={selectedCueId}
          isPlaying={isPlaying}
          onSeek={seek}
          onTogglePlay={() => void togglePlay()}
          onSelectCue={setSelectedCueId}
          onCuesChange={(cues) =>
            updateProject({
              ...project,
              lyrics: { ...project.lyrics, cues },
            })
          }
        />
      </footer>

      <ExportDialog
        project={project}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onProjectChange={updateProject}
      />
    </div>
  );
}
