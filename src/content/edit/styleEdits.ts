import type { EditableStyles } from "../../shared/types";

type StyleBackup = {
  element: HTMLElement;
  inline: string;
};

const backups = new WeakMap<HTMLElement, StyleBackup>();
const touched = new Set<HTMLElement>();

export function applyTemporaryStyles(el: Element, styles: EditableStyles): void {
  if (!(el instanceof HTMLElement)) return;

  if (!backups.has(el)) {
    backups.set(el, { element: el, inline: el.getAttribute("style") ?? "" });
    touched.add(el);
  }

  if (styles.fontSize !== undefined) el.style.fontSize = styles.fontSize;
  if (styles.color !== undefined) el.style.color = styles.color;
  if (styles.backgroundColor !== undefined) el.style.backgroundColor = styles.backgroundColor;
  if (styles.borderRadius !== undefined) el.style.borderRadius = styles.borderRadius;
  if (styles.paddingTop !== undefined) el.style.paddingTop = styles.paddingTop;
  if (styles.paddingRight !== undefined) el.style.paddingRight = styles.paddingRight;
  if (styles.paddingBottom !== undefined) el.style.paddingBottom = styles.paddingBottom;
  if (styles.paddingLeft !== undefined) el.style.paddingLeft = styles.paddingLeft;
}

export function resetElement(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  const backup = backups.get(el);
  if (!backup) return;
  if (backup.inline) el.setAttribute("style", backup.inline);
  else el.removeAttribute("style");
  backups.delete(el);
  touched.delete(el);
}

export function resetAllEdits(): void {
  for (const el of [...touched]) {
    resetElement(el);
  }
  touched.clear();
}

export function hasEdits(): boolean {
  return touched.size > 0;
}
