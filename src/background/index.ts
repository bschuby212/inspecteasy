const UNSUPPORTED_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "devtools://",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
];

type TabState = {
  active: boolean;
};

const tabState = new Map<number, TabState>();

function isSupportedUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !UNSUPPORTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (ping?.ok) return true;
  } catch {
    // Not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return true;
  } catch (error) {
    console.warn("[Inspect Studio] Unable to inject content script", error);
    return false;
  }
}

async function setBadge(tabId: number, active: boolean) {
  await chrome.action.setBadgeText({ tabId, text: active ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563EB" });
  tabState.set(tabId, { active });
  await chrome.storage.session.set({ [`tab:${tabId}`]: active });
}

async function toggleTab(tab: chrome.tabs.Tab) {
  if (tab.id == null) return;

  if (!isSupportedUrl(tab.url)) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#DC2626" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "Inspect Studio cannot run on this page",
    });
    return;
  }

  const injected = await ensureContentScript(tab.id);
  if (!injected) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#DC2626" });
    return;
  }

  const response = await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE" });
  const active = Boolean(response?.active);
  await setBadge(tab.id, active);
  await chrome.action.setTitle({
    tabId: tab.id,
    title: active ? "Deactivate Inspect Studio" : "Activate Inspect Studio",
  });
}

chrome.action.onClicked.addListener((tab) => {
  void toggleTab(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "SET_ACTIVE_STATE" && sender.tab?.id != null) {
    void setBadge(sender.tab.id, Boolean(message.active));
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_ACTIVE_STATE" && sender.tab?.id != null) {
    sendResponse({ active: tabState.get(sender.tab.id)?.active ?? false });
    return true;
  }

  if (message.type === "CONTENT_READY" && sender.tab?.id != null) {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    // Page navigated — content script is gone; clear active badge.
    void setBadge(tabId, false);
  }
});

void (async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null) continue;
    const key = `tab:${tab.id}`;
    const stored = await chrome.storage.session.get(key);
    if (stored[key]) {
      // Do not auto-reactivate after service worker restart; just clear persisted flag.
      await chrome.storage.session.remove(key);
      await setBadge(tab.id, false);
    }
  }
})();
