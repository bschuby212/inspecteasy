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

export function measureBetween(fromEl: Element, toEl: Element): MeasurementResult {
  const from = toGeometry(fromEl.getBoundingClientRect());
  const to = toGeometry(toEl.getBoundingClientRect());

  const horizontal = gapBetween(from.left, from.right, to.left, to.right);
  const vertical = gapBetween(from.top, from.bottom, to.top, to.bottom);
  const overlap = horizontal === null && vertical === null;

  return { from, to, horizontal, vertical, overlap };
}
