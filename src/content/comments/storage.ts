import type { DesignComment } from "../../shared/types";

const VISIBILITY_KEY = "inspect-studio:comments-visible";

/** Stable page key: same path keeps comments; query/hash ignored. */
export function pageUrlKey(url: string = location.href): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function commentsKey(pageUrl: string): string {
  return `inspect-studio:comments:${pageUrl}`;
}

function canUseChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

async function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (canUseChromeStorage()) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function storageSet(key: string, value: unknown): Promise<void> {
  if (canUseChromeStorage()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/**
 * Comments are retained only in this browser profile, on this device.
 * They are keyed by page origin + path. They do not sync across accounts,
 * devices, or Chrome profiles, and they are not uploaded anywhere.
 */
export async function loadComments(pageUrl: string = pageUrlKey()): Promise<DesignComment[]> {
  const value = await storageGet<DesignComment[]>(commentsKey(pageUrl), []);
  return Array.isArray(value) ? value.filter((c) => c && typeof c.id === "string") : [];
}

export async function saveComments(
  comments: DesignComment[],
  pageUrl: string = pageUrlKey(),
): Promise<void> {
  await storageSet(commentsKey(pageUrl), comments);
}

export async function loadCommentsVisible(): Promise<boolean> {
  return storageGet<boolean>(VISIBILITY_KEY, true);
}

export async function saveCommentsVisible(visible: boolean): Promise<void> {
  await storageSet(VISIBILITY_KEY, visible);
}

export function createCommentId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
