import { createRoot, type Root } from "react-dom/client";
import { App } from "./ui/App";
import styles from "./ui/styles.css?inline";
import { HOST_ATTR, HOST_ID } from "../shared/dom";
import { resetAllEdits } from "./edit/styleEdits";

declare global {
  interface Window {
    __INSPECT_STUDIO__?: {
      active: boolean;
      root: Root | null;
      host: HTMLElement | null;
      mount: () => void;
      unmount: () => void;
      toggle: () => void;
    };
  }
}

function createHost(): HTMLElement {
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute(HOST_ATTR, "true");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.style.pointerEvents = "none";
  mountPoint.style.position = "fixed";
  mountPoint.style.inset = "0";
  shadow.appendChild(mountPoint);

  return host;
}

function getMountPoint(host: HTMLElement): HTMLElement {
  const shadow = host.shadowRoot;
  if (!shadow) throw new Error("Inspect Studio shadow root missing");
  const mount = shadow.querySelector("div");
  if (!mount) throw new Error("Inspect Studio mount point missing");
  return mount as HTMLElement;
}

function mount() {
  const api = ensureApi();
  if (api.active) return;

  const host = createHost();
  const mountPoint = getMountPoint(host);
  const root = createRoot(mountPoint);
  root.render(
    <App
      onClose={() => {
        unmount();
        void chrome.runtime.sendMessage({ type: "SET_ACTIVE_STATE", active: false });
      }}
    />,
  );

  api.host = host;
  api.root = root;
  api.active = true;
  document.documentElement.setAttribute("data-inspect-studio-active", "true");
}

function unmount() {
  const api = ensureApi();
  resetAllEdits();
  api.root?.unmount();
  api.host?.remove();
  api.root = null;
  api.host = null;
  api.active = false;
  document.documentElement.removeAttribute("data-inspect-studio-active");
}

function toggle() {
  const api = ensureApi();
  if (api.active) unmount();
  else mount();
}

function ensureApi() {
  if (!window.__INSPECT_STUDIO__) {
    window.__INSPECT_STUDIO__ = {
      active: false,
      root: null,
      host: null,
      mount,
      unmount,
      toggle,
    };
  }
  return window.__INSPECT_STUDIO__;
}

const api = ensureApi();

if (!(window as Window & { __INSPECT_STUDIO_LISTENING__?: boolean }).__INSPECT_STUDIO_LISTENING__) {
  (window as Window & { __INSPECT_STUDIO_LISTENING__?: boolean }).__INSPECT_STUDIO_LISTENING__ =
    true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;

    switch (message.type) {
      case "PING":
        sendResponse({ ok: true, active: api.active });
        break;
      case "ACTIVATE":
        mount();
        sendResponse({ ok: true, active: true });
        break;
      case "DEACTIVATE":
        unmount();
        sendResponse({ ok: true, active: false });
        break;
      case "TOGGLE":
        toggle();
        sendResponse({ ok: true, active: api.active });
        break;
      default:
        break;
    }

    return true;
  });
}

void chrome.runtime.sendMessage({ type: "CONTENT_READY" });
