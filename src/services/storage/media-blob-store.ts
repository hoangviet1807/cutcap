const DB_NAME = "cutcap-media";
const DB_VERSION = 1;
const STORE = "blobs";

export type MediaKind = "image" | "audio";

function mediaKey(projectId: string, kind: MediaKind): string {
  return `${projectId}:${kind}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function putMediaBlob(
  projectId: string,
  kind: MediaKind,
  blob: Blob,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB put failed"));
    tx.objectStore(STORE).put(blob, mediaKey(projectId, kind));
  });
  db.close();
}

export async function getMediaBlob(
  projectId: string,
  kind: MediaKind,
): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(mediaKey(projectId, kind));
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
  });
  db.close();
  return blob;
}

export async function deleteProjectMedia(projectId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
    const store = tx.objectStore(STORE);
    store.delete(mediaKey(projectId, "image"));
    store.delete(mediaKey(projectId, "audio"));
  });
  db.close();
}

/** Stable path marker stored in project JSON for browser-local media. */
export function browserMediaPath(projectId: string, kind: MediaKind): string {
  return `browser-media://${projectId}/${kind}`;
}

export function isBrowserMediaPath(path: string | null | undefined): boolean {
  return Boolean(path?.startsWith("browser-media://"));
}
