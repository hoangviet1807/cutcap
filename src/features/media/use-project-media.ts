import { useEffect, useState } from "react";
import type { Project } from "../../shared/types/project";
import {
  getMediaBlob,
  isBrowserMediaPath,
} from "../../services/storage/media-blob-store";
import type { ResolvedMediaUrls } from "./media-types";

/**
 * Resolve browser-stored media blobs (or path URLs) into object URLs for preview/playback.
 */
export function useProjectMedia(project: Project): ResolvedMediaUrls {
  const [urls, setUrls] = useState<ResolvedMediaUrls>({
    imageUrl: null,
    audioUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function resolve() {
      let imageUrl: string | null = null;
      let audioUrl: string | null = null;

      if (isBrowserMediaPath(project.media.imagePath)) {
        const blob = await getMediaBlob(project.id, "image");
        if (blob) {
          imageUrl = URL.createObjectURL(blob);
          created.push(imageUrl);
        }
      } else if (project.media.imagePath) {
        imageUrl = project.media.imagePath;
      }

      if (isBrowserMediaPath(project.media.audioPath)) {
        const blob = await getMediaBlob(project.id, "audio");
        if (blob) {
          audioUrl = URL.createObjectURL(blob);
          created.push(audioUrl);
        }
      } else if (project.media.audioPath) {
        audioUrl = project.media.audioPath;
      }

      if (!cancelled) {
        setUrls({ imageUrl, audioUrl });
      } else {
        created.forEach((u) => URL.revokeObjectURL(u));
      }
    }

    void resolve();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [
    project.id,
    project.media.imagePath,
    project.media.audioPath,
    project.updatedAt,
  ]);

  return urls;
}
