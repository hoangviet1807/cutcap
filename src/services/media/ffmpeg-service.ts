import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { Project } from "../../shared/types/project";
import type {
  ExportProgress,
  ExportResult,
  RenderPlan,
} from "../../shared/types/render";
import { getMediaBlob } from "../storage/media-blob-store";
import { resolveEncoderProfile } from "./encoder-settings";
import { buildRenderPlan } from "./render-planner";
import {
  buildDrawtextFiltergraph,
  generateAssSubtitles,
} from "./subtitle-generator";

/** Locally vendored core (see public/ffmpeg) — avoids CDN flakiness. */
const CORE_JS = "/ffmpeg/ffmpeg-core.js";
const CORE_WASM = "/ffmpeg/ffmpeg-core.wasm";
const FONT_PATH = "/fonts/NotoSans-Regular.ttf";
const FONT_NAME = "NotoSans-Regular.ttf";

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(
  onProgress?: (ratio: number) => void,
): Promise<FFmpeg> {
  if (!ffmpegSingleton?.loaded) {
    if (!loadPromise) {
      loadPromise = (async () => {
        const ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => {
          if (import.meta.env.DEV) {
            console.debug("[ffmpeg]", message);
          }
        });
        await ffmpeg.load({
          coreURL: await toBlobURL(CORE_JS, "text/javascript"),
          wasmURL: await toBlobURL(CORE_WASM, "application/wasm"),
        });
        ffmpegSingleton = ffmpeg;
        return ffmpeg;
      })().catch((err) => {
        loadPromise = null;
        ffmpegSingleton = null;
        throw err;
      });
    }
    await loadPromise;
  }

  const ffmpeg = ffmpegSingleton!;
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    });
  }
  return ffmpeg;
}

function resetFFmpegSingleton(): void {
  ffmpegSingleton = null;
  loadPromise = null;
}

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}

export interface ExportMediaBlobs {
  image: Blob;
  audio: Blob;
}

export async function resolveExportMedia(
  project: Project,
): Promise<ExportMediaBlobs> {
  const image = await getMediaBlob(project.id, "image");
  const audio = await getMediaBlob(project.id, "audio");
  if (!image) throw new Error("Background image blob is missing. Re-import the image.");
  if (!audio) throw new Error("Audio blob is missing. Re-import the audio.");
  return { image, audio };
}

async function writeFont(ffmpeg: FFmpeg): Promise<string> {
  const response = await fetch(FONT_PATH);
  if (!response.ok) {
    throw new Error(
      "Bundled font missing. Ensure public/fonts/NotoSans-Regular.ttf exists.",
    );
  }
  await ffmpeg.writeFile(FONT_NAME, new Uint8Array(await response.arrayBuffer()));
  return FONT_NAME;
}

async function tryExec(
  ffmpeg: FFmpeg,
  args: string[],
): Promise<{ ok: boolean; logs: string }> {
  const logs: string[] = [];
  const logger = ({ message }: { message: string }) => {
    logs.push(message);
  };
  ffmpeg.on("log", logger);
  try {
    await ffmpeg.exec(args);
    return { ok: true, logs: logs.join("\n") };
  } catch (e) {
    logs.push(e instanceof Error ? e.message : String(e));
    return { ok: false, logs: logs.join("\n") };
  } finally {
    ffmpeg.on("log", () => undefined);
  }
}

async function safeDelete(ffmpeg: FFmpeg, name: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    /* ignore */
  }
}

function durationSeconds(plan: RenderPlan): string {
  // Small pad so the last cue/audio tail is not clipped.
  const sec = Math.max(0.1, plan.audioDurationMs / 1000 + 0.05);
  return sec.toFixed(3);
}

/**
 * Export a lyric video MP4 in the browser via ffmpeg.wasm.
 * Uses drawtext + bundled Noto Sans (reliable). Tries ASS only if previously known to work.
 */
export async function exportLyricVideo(options: {
  project: Project;
  signal?: AbortSignal;
  onProgress?: (progress: ExportProgress) => void;
}): Promise<ExportResult> {
  const { project, signal, onProgress } = options;
  const started = performance.now();

  const report = (partial: ExportProgress) => onProgress?.(partial);

  const throwIfAborted = () => {
    if (signal?.aborted) throw new ExportCancelledError();
  };

  report({ phase: "validating", ratio: null, message: "Validating project…" });
  const plan = buildRenderPlan(project);
  throwIfAborted();

  report({
    phase: "loading-encoder",
    ratio: null,
    message: "Loading FFmpeg encoder…",
  });

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg((ratio) => {
      report({
        phase: "encoding",
        ratio,
        message: `Encoding… ${Math.round(ratio * 100)}%`,
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not load FFmpeg WASM. Check that /ffmpeg/ffmpeg-core.wasm is served.\n${msg}`,
    );
  }
  throwIfAborted();

  const abortHandler = () => {
    void ffmpeg.terminate();
    resetFFmpegSingleton();
  };
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    report({ phase: "preparing", ratio: null, message: "Preparing media…" });
    const media = await resolveExportMedia(project);
    const profile = resolveEncoderProfile(plan.canvas, plan.quality);
    const style = scaleStyleForProfile(plan, profile.width);
    const t = durationSeconds(plan);

    await ffmpeg.writeFile(plan.imageFileName, await fetchFile(media.image));
    await ffmpeg.writeFile(plan.audioFileName, await fetchFile(media.audio));

    const ass = generateAssSubtitles({
      width: profile.width,
      height: profile.height,
      style,
      cues: plan.cues,
    });
    await ffmpeg.writeFile(plan.subtitleFileName, ass);

    const volume =
      plan.audioVolume === 1 ? [] : ["-filter:a", `volume=${plan.audioVolume}`];

    const commonInput = [
      "-loop",
      "1",
      "-framerate",
      String(profile.fps),
      "-t",
      t,
      "-i",
      plan.imageFileName,
      "-i",
      plan.audioFileName,
      "-t",
      t,
    ];

    const commonTail = [
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-preset",
      profile.videoPreset,
      "-crf",
      String(profile.crf),
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(profile.fps),
      "-c:a",
      "aac",
      "-b:a",
      profile.audioBitrate,
      ...volume,
      "-shortest",
      "-movflags",
      "+faststart",
      plan.outputFileName,
    ];

    throwIfAborted();
    report({
      phase: "encoding",
      ratio: 0,
      message: "Burning lyrics + encoding…",
    });

    // Browser @ffmpeg/core has no libass — burn with drawtext + bundled font.
    // ASS is still written for native FFmpeg later.
    const fontFile = await writeFont(ffmpeg);
    const vf = buildDrawtextFiltergraph({
      width: profile.width,
      height: profile.height,
      style,
      cues: plan.cues,
      fontFile,
    });

    let lastLogs = "";
    const drawResult = await tryExec(ffmpeg, [
      ...commonInput,
      "-vf",
      vf,
      ...commonTail,
    ]);
    lastLogs = drawResult.logs;

    if (!drawResult.ok) {
      await safeDelete(ffmpeg, plan.outputFileName);
      report({
        phase: "encoding",
        ratio: 0,
        message: "Subtitle burn failed — exporting image+audio only…",
      });
      const plainVf = `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=increase,crop=${profile.width}:${profile.height},setsar=1`;
      const plain = await tryExec(ffmpeg, [
        ...commonInput,
        "-vf",
        plainVf,
        ...commonTail,
      ]);
      lastLogs = plain.logs;
      if (!plain.ok) {
        throw new Error(`FFmpeg encode failed.\n${summarizeLogs(lastLogs)}`);
      }
      report({
        phase: "finalizing",
        ratio: 1,
        message:
          "Exported without burned lyrics (drawtext failed). Check font/cues.",
      });
    }

    throwIfAborted();
    report({ phase: "finalizing", ratio: 1, message: "Reading output…" });

    const data = await ffmpeg.readFile(plan.outputFileName);
    const bytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);

    if (bytes.byteLength < 1000) {
      throw new Error(
        `Output MP4 looks empty (${bytes.byteLength} bytes).\n${summarizeLogs(lastLogs)}`,
      );
    }

    const blob = new Blob([bytes], { type: "video/mp4" });

    await cleanupVirtualFiles(ffmpeg, plan, [FONT_NAME]);

    report({ phase: "done", ratio: 1, message: "Export complete" });

    return {
      blob,
      fileName: plan.outputFileName,
      durationMs: Math.round(performance.now() - started),
      width: profile.width,
      height: profile.height,
    };
  } catch (e) {
    if (signal?.aborted || e instanceof ExportCancelledError) {
      report({ phase: "cancelled", ratio: null, message: "Export cancelled" });
      throw new ExportCancelledError();
    }
    const message = e instanceof Error ? e.message : String(e);
    report({ phase: "error", ratio: null, message });
    throw e;
  } finally {
    signal?.removeEventListener("abort", abortHandler);
  }
}

function scaleStyleForProfile(
  plan: RenderPlan,
  width: number,
): RenderPlan["style"] {
  const scale = width / plan.canvas.width;
  return {
    ...plan.style,
    fontSize: Math.max(12, Math.round(plan.style.fontSize * scale)),
  };
}

function summarizeLogs(logs: string): string {
  const lines = logs.split("\n").filter(Boolean);
  return lines.slice(-16).join("\n");
}

async function cleanupVirtualFiles(
  ffmpeg: FFmpeg,
  plan: RenderPlan,
  extras: string[],
): Promise<void> {
  const files = [
    plan.imageFileName,
    plan.audioFileName,
    plan.subtitleFileName,
    plan.outputFileName,
    ...extras,
  ];
  for (const file of files) {
    await safeDelete(ffmpeg, file);
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
