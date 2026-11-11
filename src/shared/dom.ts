export const HOST_ID = "inspect-studio-root";
export const HOST_ATTR = "data-inspect-studio";

export function isInspectStudioNode(node: EventTarget | null): boolean {
  if (!(node instanceof Node)) return false;
  const host = document.getElementById(HOST_ID);
  if (!host) return false;
  if (node === host) return true;
  if (host.contains(node)) return true;
  // Events from inside open shadow roots still have composedPath entries
  return false;
}

export function isFromInspectStudio(event: Event): boolean {
  const path = event.composedPath();
  const host = document.getElementById(HOST_ID);
  if (!host) return false;
  return path.includes(host);
}

export function isSelectableTarget(el: Element | null): el is Element {
  if (!el) return false;
  if (el === document.documentElement || el === document.body) return true;
  if (el.id === HOST_ID || el.closest?.(`#${HOST_ID}`)) return false;
  if (el.hasAttribute?.(HOST_ATTR)) return false;
  return true;
}

export function deepestElementFromPoint(x: number, y: number): Element | null {
  const stack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(x, y)
      : [document.elementFromPoint(x, y)].filter(Boolean);

  for (const el of stack) {
    if (!el) continue;
    if (el.id === HOST_ID || el.closest?.(`#${HOST_ID}`)) continue;
    if (el.hasAttribute?.(HOST_ATTR)) continue;
    return el;
  }
  return null;
}

export function getViewportRect(el: Element): DOMRect {
  return el.getBoundingClientRect();
}
