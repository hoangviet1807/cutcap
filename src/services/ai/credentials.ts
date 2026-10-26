/**
 * BYOK credential helpers.
 * Keys never go into project JSON — only local browser storage / Vite env for now.
 * Desktop OS keychain can replace this later without changing call sites.
 */

export type CredentialProviderId = "groq";

const STORAGE_PREFIX = "cutcap.apiKey.";

function storageKey(provider: CredentialProviderId): string {
  return `${STORAGE_PREFIX}${provider}`;
}

function envKey(provider: CredentialProviderId): string | undefined {
  if (provider === "groq") {
    const fromVite = import.meta.env.VITE_GROQ_API_KEY;
    if (typeof fromVite === "string" && fromVite.trim()) return fromVite.trim();
  }
  return undefined;
}

export function getApiKey(provider: CredentialProviderId): string | null {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(storageKey(provider))?.trim();
    if (stored) return stored;
  }
  return envKey(provider) ?? null;
}

export function hasApiKey(provider: CredentialProviderId): boolean {
  return Boolean(getApiKey(provider));
}

export function setApiKey(
  provider: CredentialProviderId,
  key: string,
): void {
  const trimmed = key.trim();
  if (!trimmed) {
    clearApiKey(provider);
    return;
  }
  localStorage.setItem(storageKey(provider), trimmed);
}

export function clearApiKey(provider: CredentialProviderId): void {
  localStorage.removeItem(storageKey(provider));
}

/** Mask for UI display — never log the raw key. */
export function maskApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
