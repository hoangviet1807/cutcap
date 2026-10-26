import type { Project } from "../../shared/types/project";
import {
  cuesToRenderCues,
  type RenderPlan,
} from "../../shared/types/render";
import { validateProjectForRender } from "./render-validation";

function extFromName(name: string | null, fallback: string): string {
  if (!name) return fallback;
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : fallback;
}

export function buildRenderPlan(project: Project): RenderPlan {
  const issues = validateProjectForRender(project);
  if (issues.length > 0) {
    throw new Error(issues.map((i) => i.message).join(" "));
  }

  const imageExt = extFromName(project.media.imageFileName, "png");
  const audioExt = extFromName(project.media.audioFileName, "mp3");
  const safeName =
    project.name.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "lyric-video";

  return {
    projectId: project.id,
    projectName: project.name,
    canvas: { ...project.canvas },
    style: { ...project.style },
    quality: project.export.quality,
    audioVolume: project.audio.volume,
    audioDurationMs: project.media.audioDurationMs!,
    cues: cuesToRenderCues(project.lyrics.cues),
    imageFileName: `background.${imageExt}`,
    audioFileName: `audio.${audioExt}`,
    subtitleFileName: "lyrics.ass",
    outputFileName: `${safeName}.mp4`,
  };
}
