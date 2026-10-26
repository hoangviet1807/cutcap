import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LyricCue } from "../../shared/types/project";
import { formatClock } from "../../shared/utils/time";
import {
  cueLeftPercent,
  cueWidthPercent,
  msFromTimelineClick,
  moveCueTimes,
  patchCueTimes,
  playheadPercent,
  resizeCueEnd,
  resizeCueStart,
} from "./timeline-utils";

interface TimelineProps {
  cues: LyricCue[];
  durationMs: number;
  currentMs: number;
  selectedCueId: string | null;
  isPlaying: boolean;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onSelectCue: (id: string) => void;
  onCuesChange: (cues: LyricCue[]) => void;
}

type DragState =
  | { kind: "scrub" }
  | {
      kind: "move";
      cueId: string;
      originStart: number;
      originEnd: number;
      originPointerMs: number;
    }
  | {
      kind: "resize-start" | "resize-end";
      cueId: string;
      originStart: number;
      originEnd: number;
    };

export function Timeline({
  cues,
  durationMs,
  currentMs,
  selectedCueId,
  isPlaying,
  onSeek,
  onTogglePlay,
  onSelectCue,
  onCuesChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  const effectiveDuration =
    durationMs > 0
      ? durationMs
      : Math.max(10_000, ...cues.map((c) => c.endMs), currentMs + 1000);

  const showLabels = cues.length > 0 && cues.length <= 24;

  const msAtClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      return msFromTimelineClick(
        clientX,
        el.getBoundingClientRect(),
        effectiveDuration,
      );
    },
    [effectiveDuration],
  );

  const applyPointer = useCallback(
    (clientX: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const ms = msAtClientX(clientX);

      if (drag.kind === "scrub") {
        onSeek(ms);
        return;
      }

      if (drag.kind === "move") {
        const delta = ms - drag.originPointerMs;
        const times = moveCueTimes(
          drag.originStart,
          drag.originEnd,
          delta,
          effectiveDuration,
        );
        onCuesChange(patchCueTimes(cuesRef.current, drag.cueId, times));
        return;
      }

      if (drag.kind === "resize-start") {
        const times = resizeCueStart(
          drag.originStart,
          drag.originEnd,
          ms,
          effectiveDuration,
        );
        onCuesChange(patchCueTimes(cuesRef.current, drag.cueId, times));
        return;
      }

      const times = resizeCueEnd(
        drag.originStart,
        drag.originEnd,
        ms,
        effectiveDuration,
      );
      onCuesChange(patchCueTimes(cuesRef.current, drag.cueId, times));
    },
    [effectiveDuration, msAtClientX, onCuesChange, onSeek],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => applyPointer(e.clientX);
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, applyPointer, endDrag]);

  function beginDrag(state: DragState, e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = state;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onTrackPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Empty track / playhead area → scrub freely
    beginDrag({ kind: "scrub" }, e);
    onSeek(msAtClientX(e.clientX));
  }

  function onCueBodyPointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    cue: LyricCue,
  ) {
    if (e.button !== 0) return;
    onSelectCue(cue.id);
    beginDrag(
      {
        kind: "move",
        cueId: cue.id,
        originStart: cue.startMs,
        originEnd: cue.endMs,
        originPointerMs: msAtClientX(e.clientX),
      },
      e,
    );
  }

  function onResizePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    cue: LyricCue,
    edge: "resize-start" | "resize-end",
  ) {
    if (e.button !== 0) return;
    onSelectCue(cue.id);
    beginDrag(
      {
        kind: edge,
        cueId: cue.id,
        originStart: cue.startMs,
        originEnd: cue.endMs,
      },
      e,
    );
  }

  return (
    <div className="space-y-2 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50 hover:bg-stone-800"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="font-mono text-xs tabular-nums text-stone-600">
          {formatClock(currentMs)} / {formatClock(effectiveDuration)}
        </span>
        <span className="hidden text-[10px] text-stone-500 sm:inline">
          Kéo timeline để tua · kéo cue để chỉnh timing · mép cue để resize
        </span>
        <span className="ml-auto text-[10px] text-stone-500">
          {cues.length} cue{cues.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={effectiveDuration}
        aria-valuenow={currentMs}
        tabIndex={0}
        onPointerDown={onTrackPointerDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight")
            onSeek(Math.min(effectiveDuration, currentMs + 500));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, currentMs - 500));
        }}
        className={`relative h-12 touch-none rounded-md border border-stone-300 bg-stone-200/60 select-none ${
          dragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
      >
        {cues.map((cue) => {
          const widthPct = Math.max(
            0.35,
            cueWidthPercent(cue, effectiveDuration),
          );
          const selected = cue.id === selectedCueId;
          return (
            <div
              key={cue.id}
              title={`${cue.text || "(empty)"} · ${formatClock(cue.startMs)} → ${formatClock(cue.endMs)}`}
              onPointerDown={(e) => onCueBodyPointerDown(e, cue)}
              className={`absolute top-2 bottom-2 overflow-hidden rounded-sm ${
                selected
                  ? "z-[1] bg-amber-600 ring-1 ring-amber-300"
                  : cue.needsReview
                    ? "bg-amber-300/85"
                    : "bg-stone-700/75"
              } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                left: `${cueLeftPercent(cue, effectiveDuration)}%`,
                width: `${widthPct}%`,
              }}
            >
              {selected && (
                <>
                  <div
                    role="separator"
                    aria-label="Resize cue start"
                    onPointerDown={(e) =>
                      onResizePointerDown(e, cue, "resize-start")
                    }
                    className="absolute top-0 bottom-0 left-0 z-[2] w-2 cursor-ew-resize bg-white/25 hover:bg-white/50"
                  />
                  <div
                    role="separator"
                    aria-label="Resize cue end"
                    onPointerDown={(e) =>
                      onResizePointerDown(e, cue, "resize-end")
                    }
                    className="absolute top-0 right-0 bottom-0 z-[2] w-2 cursor-ew-resize bg-white/25 hover:bg-white/50"
                  />
                </>
              )}
              {showLabels && widthPct > 3 && (
                <span className="pointer-events-none block truncate px-2 text-left text-[9px] leading-8 text-white/95">
                  {cue.text || "…"}
                </span>
              )}
            </div>
          );
        })}

        {/* Playhead + scrub handle */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-[3]"
          style={{
            left: `${playheadPercent(currentMs, effectiveDuration)}%`,
          }}
        >
          <div className="absolute top-0 bottom-0 left-0 w-0.5 -translate-x-1/2 bg-red-600" />
          <div
            className="pointer-events-auto absolute top-1/2 left-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-red-600 shadow"
            onPointerDown={(e) => {
              beginDrag({ kind: "scrub" }, e);
              onSeek(msAtClientX(e.clientX));
            }}
          />
        </div>
      </div>
    </div>
  );
}
