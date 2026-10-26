/** Probe audio duration in milliseconds via HTMLAudioElement. */
export function probeAudioDurationMs(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationSec = audio.duration;
      cleanup();
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        reject(new Error("Could not read audio duration"));
        return;
      }
      resolve(Math.round(durationSec * 1000));
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Failed to load audio for metadata probing"));
    };
    audio.src = url;
  });
}

export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const AUDIO_ACCEPT = ".mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg";
export const LYRICS_ACCEPT = ".srt,.lrc,.txt,text/plain,application/x-subrip";
