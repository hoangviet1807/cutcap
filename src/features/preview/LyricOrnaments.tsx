import { useMemo } from "react";
import { getOrnamentPreset } from "../../shared/constants/typography";
import type { TextOrnament } from "../../shared/types/project";

interface LyricOrnamentsProps {
  ornament: TextOrnament;
  /** Bump when cue text changes so particles re-seed gently. */
  seedKey?: string | number;
  active?: boolean;
}

interface Particle {
  id: string;
  glyph: string;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  rotate: number;
}

/** Deterministic pseudo-random in [0, 1). */
function hash01(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildParticles(
  ornament: TextOrnament,
  seedKey: string | number,
): Particle[] {
  const preset = getOrnamentPreset(ornament);
  if (preset.count === 0 || preset.glyphs.length === 0) return [];

  const seed =
    typeof seedKey === "number"
      ? seedKey
      : Array.from(String(seedKey)).reduce(
          (acc, ch) => acc + ch.charCodeAt(0),
          0,
        );

  return Array.from({ length: preset.count }, (_, i) => {
    const base = seed * 17 + i * 97;
    const side = hash01(base + 1);
    // Prefer edges around the text box so glyphs don't cover the lyric.
    const left =
      side < 0.5
        ? hash01(base + 2) * 22 - 6
        : 78 + hash01(base + 3) * 28;
    const top = hash01(base + 4) * 110 - 8;
    return {
      id: `${ornament}-${i}`,
      glyph: preset.glyphs[i % preset.glyphs.length],
      left,
      top,
      size: 0.7 + hash01(base + 5) * 0.85,
      delay: hash01(base + 6) * 2.4,
      duration: 2.4 + hash01(base + 7) * 2.8,
      driftX: (hash01(base + 8) - 0.5) * 28,
      rotate: (hash01(base + 9) - 0.5) * 40,
    };
  });
}

export function LyricOrnaments({
  ornament,
  seedKey = 0,
  active = true,
}: LyricOrnamentsProps) {
  const preset = getOrnamentPreset(ornament);
  const particles = useMemo(
    () => buildParticles(ornament, seedKey),
    [ornament, seedKey],
  );

  if (!active || particles.length === 0) return null;

  const motionClass =
    preset.motion === "flutter"
      ? "lyric-ornament-flutter"
      : preset.motion === "twinkle"
        ? "lyric-ornament-twinkle"
        : preset.motion === "drift"
          ? "lyric-ornament-drift"
          : "lyric-ornament-float";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={`lyric-ornament ${motionClass}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // CSS variables for motion keyframes
            ["--ornament-dx" as string]: `${p.driftX}px`,
            ["--ornament-rot" as string]: `${p.rotate}deg`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
