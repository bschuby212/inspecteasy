import type { EditableStyles } from "../../shared/types";

type StyleBackup = {
  element: HTMLElement;
  inline: string;
};

const backups = new WeakMap<HTMLElement, StyleBackup>();
const touched = new Set<HTMLElement>();

const STYLE_MAP: Array<[keyof EditableStyles, keyof CSSStyleDeclaration]> = [
  ["width", "width"],
  ["height", "height"],
  ["fontFamily", "fontFamily"],
  ["fontSize", "fontSize"],
  ["fontWeight", "fontWeight"],
  ["lineHeight", "lineHeight"],
  ["letterSpacing", "letterSpacing"],
  ["textAlign", "textAlign"],
  ["color", "color"],
  ["backgroundColor", "backgroundColor"],
  ["borderColor", "borderColor"],
  ["borderWidth", "borderWidth"],
  ["borderStyle", "borderStyle"],
  ["borderRadius", "borderRadius"],
  ["opacity", "opacity"],
  ["boxShadow", "boxShadow"],
  ["paddingTop", "paddingTop"],
  ["paddingRight", "paddingRight"],
  ["paddingBottom", "paddingBottom"],
  ["paddingLeft", "paddingLeft"],
  ["marginTop", "marginTop"],
  ["marginRight", "marginRight"],
  ["marginBottom", "marginBottom"],
  ["marginLeft", "marginLeft"],
  ["gap", "gap"],
  ["display", "display"],
  ["flexDirection", "flexDirection"],
  ["justifyContent", "justifyContent"],
  ["alignItems", "alignItems"],
];

export function applyTemporaryStyles(el: Element, styles: EditableStyles): void {
  if (!(el instanceof HTMLElement)) return;

  if (!backups.has(el)) {
    backups.set(el, { element: el, inline: el.getAttribute("style") ?? "" });
    touched.add(el);
  }

  for (const [key, cssProp] of STYLE_MAP) {
    const value = styles[key];
    if (value === undefined) continue;
    // CSSStyleDeclaration index set
    (el.style as unknown as Record<string, string>)[cssProp as string] = value;
  }

  // If stroke width is set without style, ensure a visible border.
  if (styles.borderWidth !== undefined && styles.borderStyle === undefined) {
    const width = Number.parseFloat(styles.borderWidth);
    if (width > 0 && (!el.style.borderStyle || el.style.borderStyle === "none")) {
      el.style.borderStyle = "solid";
    }
  }
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
