import type { ElementGeometry, MeasurementResult } from "../../shared/types";

export function toGeometry(rect: DOMRect): ElementGeometry {
  return {
    width: rect.width,
    height: rect.height,
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function gapBetween(a1: number, a2: number, b1: number, b2: number): number | null {
  if (a2 <= b1) return b1 - a2;
  if (b2 <= a1) return a1 - b2;
  return null;
}

function contains(outer: ElementGeometry, inner: ElementGeometry): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  );
}

export interface MeasurementGuide {
  orientation: "horizontal" | "vertical";
  /** Viewport pixels for the guide line */
  left: number;
  top: number;
  length: number;
  label: number;
  /** Midpoint for the label */
  labelLeft: number;
  labelTop: number;
}

/**
 * Build Figma-like spacing guides between two elements.
 * - Separate elements: outer gap(s)
 * - Nested elements: inset distances from child to parent edges
 */
export function buildMeasurementGuides(
  from: ElementGeometry,
  to: ElementGeometry,
): MeasurementGuide[] {
  const guides: MeasurementGuide[] = [];

  const pushH = (left: number, right: number, y: number, value: number) => {
    if (value <= 0 || !Number.isFinite(value)) return;
    const width = right - left;
    guides.push({
      orientation: "horizontal",
      left,
      top: y,
      length: width,
      label: value,
      labelLeft: left + width / 2,
      labelTop: y,
    });
  };

  const pushV = (top: number, bottom: number, x: number, value: number) => {
    if (value <= 0 || !Number.isFinite(value)) return;
    const height = bottom - top;
    guides.push({
      orientation: "vertical",
      left: x,
      top,
      length: height,
      label: value,
      labelLeft: x,
      labelTop: top + height / 2,
    });
  };

  // Nested: measure insets from inner → outer on all sides that have space.
  if (contains(from, to) || contains(to, from)) {
    const outer = contains(from, to) ? from : to;
    const inner = contains(from, to) ? to : from;
    const midY = (inner.top + inner.bottom) / 2;
    const midX = (inner.left + inner.right) / 2;

    pushH(outer.left, inner.left, midY, inner.left - outer.left);
    pushH(inner.right, outer.right, midY, outer.right - inner.right);
    pushV(outer.top, inner.top, midX, inner.top - outer.top);
    pushV(inner.bottom, outer.bottom, midX, outer.bottom - inner.bottom);
    return guides;
  }

  const horizontal = gapBetween(from.left, from.right, to.left, to.right);
  const vertical = gapBetween(from.top, from.bottom, to.top, to.bottom);

  if (horizontal != null) {
    const left = from.right <= to.left ? from.right : to.right;
    const right = left + horizontal;
    // Place the line in the overlapping vertical band when possible.
    const overlapTop = Math.max(from.top, to.top);
    const overlapBottom = Math.min(from.bottom, to.bottom);
    const y =
      overlapBottom > overlapTop
        ? (overlapTop + overlapBottom) / 2
        : (Math.min(from.top, to.top) + Math.max(from.bottom, to.bottom)) / 2;
    pushH(left, right, y, horizontal);
  }

  if (vertical != null) {
    const top = from.bottom <= to.top ? from.bottom : to.bottom;
    const bottom = top + vertical;
    const overlapLeft = Math.max(from.left, to.left);
    const overlapRight = Math.min(from.right, to.right);
    const x =
      overlapRight > overlapLeft
        ? (overlapLeft + overlapRight) / 2
        : (Math.min(from.left, to.left) + Math.max(from.right, to.right)) / 2;
    pushV(top, bottom, x, vertical);
  }

  // Aligned / overlapping on both axes with no outer gap: still show center-to-center deltas
  // so the tool never looks "dead".
  if (guides.length === 0) {
    const dx = Math.round(to.left + to.width / 2 - (from.left + from.width / 2));
    const dy = Math.round(to.top + to.height / 2 - (from.top + from.height / 2));
    const fromCx = from.left + from.width / 2;
    const fromCy = from.top + from.height / 2;
    const toCx = to.left + to.width / 2;
    const toCy = to.top + to.height / 2;

    if (dx !== 0) {
      const left = Math.min(fromCx, toCx);
      const right = Math.max(fromCx, toCx);
      pushH(left, right, (fromCy + toCy) / 2, Math.abs(dx));
    }
    if (dy !== 0) {
      const top = Math.min(fromCy, toCy);
      const bottom = Math.max(fromCy, toCy);
      pushV(top, bottom, (fromCx + toCx) / 2, Math.abs(dy));
    }
  }

  return guides;
}

export function measureBetween(fromEl: Element, toEl: Element): MeasurementResult {
  const from = toGeometry(fromEl.getBoundingClientRect());
  const to = toGeometry(toEl.getBoundingClientRect());

  const horizontal = gapBetween(from.left, from.right, to.left, to.right);
  const vertical = gapBetween(from.top, from.bottom, to.top, to.bottom);
  const nested = contains(from, to) || contains(to, from);
  const overlap = horizontal === null && vertical === null && !nested;

  return { from, to, horizontal, vertical, overlap };
}
