import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { StyleSettings } from "../../shared/types/project";
import { lyricBoxBackground } from "./box-background";
import { LyricOrnaments } from "./LyricOrnaments";
import { clampTextPercent } from "./text-position";

interface DraggableLyricProps {
  text: string;
  style: StyleSettings;
  dimmed?: boolean;
  onPositionChange: (textX: number, textY: number) => void;
}

function animationClass(
  animation: StyleSettings["textAnimation"],
): string {
  switch (animation) {
    case "pop":
      return "lyric-anim-pop";
    case "slide-up":
      return "lyric-anim-slide-up";
    case "fade":
      return "lyric-anim-fade";
    case "none":
    default:
      return "";
  }
}

/**
 * Preview lyric box. Size follows style.boxWidth/HeightPct; appear anim
 * re-runs when the cue text changes.
 */
export function DraggableLyric({
  text,
  style,
  dimmed = false,
  onPositionChange,
}: DraggableLyricProps) {
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<{ textX: number; textY: number } | null>(
    null,
  );
  const [displayed, setDisplayed] = useState(text);
  const [animKey, setAnimKey] = useState(0);
  const dragOrigin = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origTextX: number;
    origTextY: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const textX = draft?.textX ?? style.textX;
  const textY = draft?.textY ?? style.textY;

  useEffect(() => {
    if (text === displayed) return;
    // Swap immediately and let CSS appear-anim handle the transition —
    // avoid an opacity dip that looks like the lyric "fades out" early.
    setDisplayed(text);
    setAnimKey((k) => k + 1);
  }, [text, displayed]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const origin = dragOrigin.current;
    if (!origin || e.pointerId !== origin.pointerId) return;
    if (origin.canvasWidth <= 0 || origin.canvasHeight <= 0) return;

    const dxPct = ((e.clientX - origin.startX) / origin.canvasWidth) * 100;
    const dyPct = ((e.clientY - origin.startY) / origin.canvasHeight) * 100;
    setDraft({
      textX: clampTextPercent(origin.origTextX + dxPct),
      textY: clampTextPercent(origin.origTextY + dyPct),
    });
  }, []);

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const origin = dragOrigin.current;
      if (!origin || e.pointerId !== origin.pointerId) return;
      const finalPos = draftRef.current;
      dragOrigin.current = null;
      setDragging(false);
      setDraft(null);
      if (finalPos) {
        onPositionChange(finalPos.textX, finalPos.textY);
      }
    },
    [onPositionChange],
  );

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, handlePointerMove, endDrag]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = e.currentTarget.parentElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    dragOrigin.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origTextX: style.textX,
      origTextY: style.textY,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    };
    setDraft({ textX: style.textX, textY: style.textY });
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPositionChange(clampTextPercent(style.textX - step), style.textY);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onPositionChange(clampTextPercent(style.textX + step), style.textY);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onPositionChange(style.textX, clampTextPercent(style.textY - step));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onPositionChange(style.textX, clampTextPercent(style.textY + step));
    }
  }

  const showPlaceholder = !displayed.trim();
  const anim = animationClass(style.textAnimation);
  const durationMs = Math.max(80, style.fadeInMs);

  return (
    <div
      role="slider"
      aria-label="Lyric text position"
      aria-valuetext={`${Math.round(textX)}%, ${Math.round(textY)}%`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 ${
        dragging ? "cursor-grabbing ring-1 ring-amber-300/70" : ""
      }`}
      style={{
        left: `${textX}%`,
        top: `${textY}%`,
        width: `${style.boxWidthPct}%`,
        height: `${style.boxHeightPct}%`,
      }}
    >
      <LyricOrnaments
        ornament={style.textOrnament ?? "none"}
        seedKey={`${animKey}-${displayed}`}
        active={!showPlaceholder && !dimmed}
      />
      <div
        className={`relative z-[2] box-border flex h-full w-full items-center justify-center overflow-hidden rounded-sm px-2 py-1 transition-opacity duration-200 ${
          (style.boxBgMode ?? "none") === "color" || dragging
            ? "border border-white/25"
            : "border border-transparent"
        } ${dimmed ? "opacity-55" : "opacity-100"}`}
        style={{
          background: lyricBoxBackground(style),
        }}
      >
        <p
          key={animKey}
          className={`w-full text-center font-medium leading-snug break-words ${
            showPlaceholder ? "italic opacity-70" : ""
          } ${!showPlaceholder && !dimmed ? anim : ""}`}
          style={{
            fontFamily: `"${style.fontFamily}", system-ui, sans-serif`,
            fontSize: `clamp(0.7rem, ${style.fontSize / 36}vw, ${style.fontSize}px)`,
            color: style.color,
            textShadow: style.shadow
              ? "0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)"
              : "none",
            animationDuration: `${durationMs}ms`,
          }}
        >
          {showPlaceholder ? "Kéo để đặt vị trí chữ" : displayed}
        </p>
      </div>
      {dragging && (
        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {Math.round(textX)}%, {Math.round(textY)}% · {Math.round(style.boxWidthPct)}×
          {Math.round(style.boxHeightPct)}%
        </span>
      )}
    </div>
  );
}
