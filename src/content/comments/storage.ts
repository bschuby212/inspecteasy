import type { DesignComment } from "../../shared/types";

function storageKey(pageUrl: string): string {
  return `inspect-studio:comments:${pageUrl}`;
}

function canUseChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadComments(pageUrl: string): Promise<DesignComment[]> {
  const key = storageKey(pageUrl);

  if (canUseChromeStorage()) {
    const result = await chrome.storage.local.get(key);
    const value = result[key];
    return Array.isArray(value) ? (value as DesignComment[]) : [];
  }

  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DesignComment[]) : [];
  } catch {
    return [];
  }
}

export async function saveComments(
  pageUrl: string,
  comments: DesignComment[],
): Promise<void> {
  const key = storageKey(pageUrl);

  if (canUseChromeStorage()) {
    await chrome.storage.local.set({ [key]: comments });
    return;
  }

  try {
    sessionStorage.setItem(key, JSON.stringify(comments));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function createCommentId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
