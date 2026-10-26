import { useEffect, useRef, useState } from "react";
import type { LyricCue, Project } from "../../shared/types/project";
import { formatTimestamp, parseTimestamp } from "../../shared/utils/time";
import { AlignDialog } from "../alignment/AlignDialog";
import { TranscribeDialog } from "../transcription/TranscribeDialog";
import { LyricsImport } from "./LyricsImport";
import { parsePlainLyrics } from "./lyrics-parser";

interface LyricsEditorProps {
  project: Project;
  selectedCueId: string | null;
  onSelectCue: (id: string | null) => void;
  onChange: (project: Project) => void;
}

function updateCue(
  cues: LyricCue[],
  id: string,
  patch: Partial<LyricCue>,
): LyricCue[] {
  return cues.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function LyricsEditor({
  project,
  selectedCueId,
  onSelectCue,
  onChange,
}: LyricsEditorProps) {
  const cues = project.lyrics.cues;
  const selected = cues.find((c) => c.id === selectedCueId) ?? null;
  const [transcribeOpen, setTranscribeOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRowRef = useRef<HTMLLIElement>(null);

  function setCues(next: LyricCue[], source = project.lyrics.source) {
    onChange({
      ...project,
      lyrics: {
        ...project.lyrics,
        source,
        cues: next,
      },
    });
  }

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedCueId]);

  function addCue() {
    const last = cues[cues.length - 1];
    const startMs = last ? last.endMs : 0;
    const cue: LyricCue = {
      id: crypto.randomUUID(),
      text: "",
      startMs,
      endMs: startMs + 2000,
      source: "manual",
      needsReview: false,
    };
    setCues([...cues, cue], "manual");
    onSelectCue(cue.id);
  }

  function removeSelected() {
    if (!selected) return;
    setCues(cues.filter((c) => c.id !== selected.id));
    onSelectCue(null);
  }

  function pastePlain() {
    const text = window.prompt("Paste lyrics (one line per cue):");
    if (!text?.trim()) return;
    const imported = parsePlainLyrics(text);
    setCues(imported, "manual");
    onSelectCue(imported[0]?.id ?? null);
  }

  const reviewCount = cues.filter((c) => c.needsReview).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-stone-200/80 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-stone-800">Lyrics</h2>
          <span className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">
            {cues.length}
          </span>
          {reviewCount > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
              {reviewCount} review
            </span>
          )}
          <label className="ml-auto flex items-center gap-1 text-xs text-stone-600">
            Lang
            <input
              value={project.lyrics.language}
              onChange={(e) =>
                onChange({
                  ...project,
                  lyrics: { ...project.lyrics, language: e.target.value },
                })
              }
              className="w-10 rounded border border-stone-300 bg-white px-1 py-0.5 text-stone-900"
            />
          </label>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={addCue}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={pastePlain}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-50"
          >
            Paste
          </button>
          <LyricsImport
            compact
            onImport={(imported) => {
              setCues(imported, "imported");
              onSelectCue(imported[0]?.id ?? null);
            }}
          />
          <button
            type="button"
            onClick={() => setTranscribeOpen(true)}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-50"
          >
            Transcribe
          </button>
          <button
            type="button"
            onClick={() => setAlignOpen(true)}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-50"
          >
            Align
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={removeSelected}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 hover:bg-stone-50 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>

      <TranscribeDialog
        project={project}
        open={transcribeOpen}
        onClose={() => setTranscribeOpen(false)}
        onApply={(result) => {
          onChange({
            ...project,
            lyrics: {
              ...project.lyrics,
              source: "transcription",
              language: result.language ?? project.lyrics.language,
              cues: result.cues,
            },
          });
          onSelectCue(result.cues[0]?.id ?? null);
          setTranscribeOpen(false);
        }}
      />

      <AlignDialog
        project={project}
        open={alignOpen}
        onClose={() => setAlignOpen(false)}
        onApply={(result) => {
          onChange({
            ...project,
            lyrics: {
              ...project.lyrics,
              source: "aligned",
              cues: result.cues,
            },
          });
          onSelectCue(result.cues[0]?.id ?? null);
          setAlignOpen(false);
        }}
      />

      <ul
        ref={listRef}
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain py-2"
      >
        {cues.length === 0 ? (
          <li className="px-2 py-8 text-center text-xs text-stone-500">
            No cues yet. Add, paste, import, or transcribe.
          </li>
        ) : (
          cues.map((cue, index) => {
            const active = cue.id === selectedCueId;
            return (
              <li
                key={cue.id}
                ref={active ? selectedRowRef : undefined}
              >
                <button
                  type="button"
                  onClick={() => onSelectCue(cue.id)}
                  className={`grid w-full grid-cols-[2rem_minmax(0,1fr)] items-center gap-1 rounded-md px-1.5 py-1.5 text-left text-xs transition ${
                    active
                      ? "bg-stone-900 text-stone-50"
                      : "text-stone-800 hover:bg-stone-100/90"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      active ? "text-stone-400" : "text-stone-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-mono text-[10px] ${
                        active ? "text-stone-300" : "text-stone-500"
                      }`}
                    >
                      {formatTimestamp(cue.startMs)}
                      {cue.needsReview ? " · !" : ""}
                    </span>
                    <span className="block truncate">
                      {cue.text || "(empty)"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Fixed-height inspector — always mounted so the list does not jump */}
      <div className="shrink-0 border-t border-stone-200/80 pt-2">
        <div className="h-[9.75rem]">
          {selected ? (
            <div className="flex h-full flex-col gap-1.5">
              <p className="text-[10px] font-medium tracking-wide text-stone-500 uppercase">
                Edit cue
              </p>
              <textarea
                value={selected.text}
                rows={2}
                onChange={(e) =>
                  setCues(
                    updateCue(cues, selected.id, {
                      text: e.target.value,
                      source: "manual",
                    }),
                  )
                }
                className="min-h-0 w-full flex-1 resize-none rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <label className="space-y-0.5 text-[10px] text-stone-600">
                  Start
                  <input
                    value={formatTimestamp(selected.startMs)}
                    onChange={(e) => {
                      const ms = parseTimestamp(e.target.value);
                      if (ms === null) return;
                      setCues(
                        updateCue(cues, selected.id, {
                          startMs: ms,
                          source: "manual",
                          needsReview: false,
                        }),
                      );
                    }}
                    className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-900"
                  />
                </label>
                <label className="space-y-0.5 text-[10px] text-stone-600">
                  End
                  <input
                    value={formatTimestamp(selected.endMs)}
                    onChange={(e) => {
                      const ms = parseTimestamp(e.target.value);
                      if (ms === null) return;
                      setCues(
                        updateCue(cues, selected.id, {
                          endMs: ms,
                          source: "manual",
                          needsReview: false,
                        }),
                      );
                    }}
                    className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-900"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-stone-600">
                <input
                  type="checkbox"
                  checked={selected.needsReview}
                  onChange={(e) =>
                    setCues(
                      updateCue(cues, selected.id, {
                        needsReview: e.target.checked,
                      }),
                    )
                  }
                />
                Needs review
              </label>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-stone-300/80 bg-white/40 px-3 text-center text-xs text-stone-500">
              Select a cue to edit text and timing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
