import {
  FONT_OPTIONS,
  TEXT_ANIMATION_OPTIONS,
  TEXT_ORNAMENT_OPTIONS,
  clampBoxPercent,
} from "../../shared/constants/typography";
import type { AspectRatio, Project } from "../../shared/types/project";
import { CANVAS_PRESETS } from "../../shared/types/project";
import { clampOpacity } from "./box-background";
import { clampTextPercent } from "./text-position";

interface StylePanelProps {
  project: Project;
  onChange: (project: Project) => void;
}

export function StylePanel({ project, onChange }: StylePanelProps) {
  const aspect: AspectRatio =
    project.canvas.width > project.canvas.height ? "16:9" : "9:16";
  const style = project.style;

  function patchStyle(patch: Partial<Project["style"]>) {
    onChange({
      ...project,
      style: { ...project.style, ...patch },
    });
  }

  function setAspect(ratio: AspectRatio) {
    onChange({
      ...project,
      canvas: { ...CANVAS_PRESETS[ratio] },
    });
  }

  function setAnchor(textX: number, textY: number) {
    patchStyle({
      textX: clampTextPercent(textX),
      textY: clampTextPercent(textY),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3 font-medium text-stone-800">Canvas</h2>
        <div className="flex gap-2">
          {(["16:9", "9:16"] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setAspect(ratio)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                aspect === ratio
                  ? "bg-stone-900 text-stone-50"
                  : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium text-stone-800">Text box</h2>
        <p className="mb-2 text-xs text-stone-500">
          Kéo chữ trên preview, hoặc chỉnh tọa độ / kích thước khung (% canvas).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-0.5 text-xs text-stone-600">
            X %
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(style.textX)}
              onChange={(e) => setAnchor(Number(e.target.value), style.textY)}
              className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-stone-900"
            />
          </label>
          <label className="space-y-0.5 text-xs text-stone-600">
            Y %
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(style.textY)}
              onChange={(e) => setAnchor(style.textX, Number(e.target.value))}
              className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-stone-900"
            />
          </label>
          <label className="space-y-0.5 text-xs text-stone-600">
            Width %
            <input
              type="range"
              min={20}
              max={100}
              step={1}
              value={style.boxWidthPct}
              onChange={(e) =>
                patchStyle({
                  boxWidthPct: clampBoxPercent(Number(e.target.value)),
                })
              }
              className="w-full"
            />
            <span className="font-mono text-stone-900">{style.boxWidthPct}%</span>
          </label>
          <label className="space-y-0.5 text-xs text-stone-600">
            Height %
            <input
              type="range"
              min={8}
              max={50}
              step={1}
              value={style.boxHeightPct}
              onChange={(e) =>
                patchStyle({
                  boxHeightPct: clampBoxPercent(Number(e.target.value), 6, 60),
                })
              }
              className="w-full"
            />
            <span className="font-mono text-stone-900">
              {style.boxHeightPct}%
            </span>
          </label>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-stone-600">Box background</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "none" as const, label: "None" },
                { id: "color" as const, label: "Color" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patchStyle({ boxBgMode: opt.id })}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  (style.boxBgMode ?? "none") === opt.id
                    ? "bg-stone-900 text-stone-50"
                    : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {(style.boxBgMode ?? "none") === "color" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-0.5 text-xs text-stone-600">
                Color
                <input
                  type="color"
                  value={style.boxBgColor || "#000000"}
                  onChange={(e) => patchStyle({ boxBgColor: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded border border-stone-300 bg-white"
                />
              </label>
              <label className="space-y-0.5 text-xs text-stone-600">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={style.boxBgOpacity ?? 45}
                  onChange={(e) =>
                    patchStyle({
                      boxBgOpacity: clampOpacity(Number(e.target.value)),
                    })
                  }
                  className="w-full"
                />
                <span className="font-mono text-stone-900">
                  {style.boxBgOpacity ?? 45}%
                </span>
              </label>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            patchStyle({
              textX: 50,
              textY: 82,
              boxWidthPct: 80,
              boxHeightPct: 18,
              boxBgMode: "none",
              boxBgColor: "#000000",
              boxBgOpacity: 45,
            })
          }
          className="mt-2 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 hover:bg-stone-50"
        >
          Reset box
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium text-stone-800">Typography</h2>
        <label className="block space-y-1 text-xs text-stone-600">
          Font
          <select
            value={style.fontFamily}
            onChange={(e) => patchStyle({ fontFamily: e.target.value })}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900"
            style={{ fontFamily: `"${style.fontFamily}", system-ui, sans-serif` }}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.family} style={{ fontFamily: f.family }}>
                {f.label}
              </option>
            ))}
            {!FONT_OPTIONS.some((f) => f.family === style.fontFamily) && (
              <option value={style.fontFamily}>{style.fontFamily}</option>
            )}
          </select>
        </label>
        <label className="block space-y-1 text-xs text-stone-600">
          Size
          <input
            type="range"
            min={24}
            max={96}
            step={2}
            value={style.fontSize}
            onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
            className="w-full"
          />
          <span className="text-stone-900">{style.fontSize}px</span>
        </label>
        <label className="block space-y-1 text-xs text-stone-600">
          Color
          <input
            type="color"
            value={style.color}
            onChange={(e) => patchStyle({ color: e.target.value })}
            className="h-8 w-full cursor-pointer rounded border border-stone-300 bg-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={style.shadow}
            onChange={(e) => patchStyle({ shadow: e.target.checked })}
          />
          Shadow / outline
        </label>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium text-stone-800">Appear animation</h2>
        <div className="flex flex-wrap gap-1.5">
          {TEXT_ANIMATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.hint}
              onClick={() => patchStyle({ textAnimation: opt.id })}
              className={`rounded-md px-2.5 py-1 text-xs ${
                style.textAnimation === opt.id
                  ? "bg-stone-900 text-stone-50"
                  : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-0.5 text-xs text-stone-600">
            Fade in
            <input
              type="range"
              min={0}
              max={1500}
              step={50}
              value={style.fadeInMs}
              onChange={(e) =>
                patchStyle({ fadeInMs: Number(e.target.value) })
              }
              className="w-full"
            />
            <span className="font-mono text-stone-900">{style.fadeInMs}ms</span>
          </label>
          <label className="space-y-0.5 text-xs text-stone-600">
            Fade out
            <input
              type="range"
              min={0}
              max={1500}
              step={50}
              value={style.fadeOutMs}
              onChange={(e) =>
                patchStyle({ fadeOutMs: Number(e.target.value) })
              }
              className="w-full"
            />
            <span className="font-mono text-stone-900">{style.fadeOutMs}ms</span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium text-stone-800">Ornaments</h2>
        <p className="text-xs text-stone-500">
          Tim, bướm, sparkle… bay quanh khung chữ khi cue hiện.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEXT_ORNAMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              onClick={() => patchStyle({ textOrnament: opt.id })}
              className={`rounded-md px-2.5 py-1 text-xs ${
                (style.textOrnament ?? "none") === opt.id
                  ? "bg-stone-900 text-stone-50"
                  : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              {opt.id === "none"
                ? "None"
                : `${opt.glyphs[0] ?? ""} ${opt.label}`}
            </button>
          ))}
        </div>
      </div>

      <dl className="space-y-2 text-xs text-stone-600">
        <div className="flex justify-between gap-2">
          <dt>Cues</dt>
          <dd className="text-stone-900">{project.lyrics.cues.length}</dd>
        </div>
      </dl>
    </div>
  );
}
