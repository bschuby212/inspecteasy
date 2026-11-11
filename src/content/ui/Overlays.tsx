import type { ReactNode } from "react";
import type { ElementGeometry, MeasurementResult } from "../../shared/types";
import { elementLabel, px } from "../../shared/format";

interface OverlaysProps {
  hoverEl: Element | null;
  selectedEl: Element | null;
  hoverRect: ElementGeometry | null;
  selectedRect: ElementGeometry | null;
  measurement: MeasurementResult | null;
}

function Box({
  rect,
  kind,
  label,
}: {
  rect: ElementGeometry;
  kind: "hover" | "selected";
  label?: string;
}) {
  return (
    <div
      className={`box ${kind}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: Math.max(rect.width, 0),
        height: Math.max(rect.height, 0),
      }}
    >
      {label ? <div className="box-label">{label}</div> : null}
    </div>
  );
}

function MeasureGuides({ measurement }: { measurement: MeasurementResult }) {
  const { from, to, horizontal, vertical, overlap } = measurement;
  if (overlap) return null;

  const guides: ReactNode[] = [];

  if (horizontal != null) {
    const y = Math.min(from.bottom, to.bottom) - 8;
    const left = from.right <= to.left ? from.right : to.right;
    const width = horizontal;
    guides.push(
      <div
        key="h-line"
        className="measure-line horizontal"
        style={{ left, top: y, width }}
      />,
      <div
        key="h-label"
        className="measure-label"
        style={{ left: left + width / 2, top: y }}
      >
        {px(horizontal)}
      </div>,
    );
  }

  if (vertical != null) {
    const x = Math.min(from.right, to.right) - 8;
    const top = from.bottom <= to.top ? from.bottom : to.bottom;
    const height = vertical;
    guides.push(
      <div
        key="v-line"
        className="measure-line vertical"
        style={{ left: x, top, height }}
      />,
      <div
        key="v-label"
        className="measure-label"
        style={{ left: x, top: top + height / 2 }}
      >
        {px(vertical)}
      </div>,
    );
  }

  // When only one axis has a gap, still show the other element's outline via Boxes.
  return <>{guides}</>;
}

export function Overlays({
  hoverEl,
  selectedEl,
  hoverRect,
  selectedRect,
  measurement,
}: OverlaysProps) {
  return (
    <div className="overlay-layer" aria-hidden="true">
      {hoverRect && hoverEl && hoverEl !== selectedEl ? (
        <Box rect={hoverRect} kind="hover" label={elementLabel(hoverEl)} />
      ) : null}
      {selectedRect && selectedEl ? (
        <Box rect={selectedRect} kind="selected" label={elementLabel(selectedEl)} />
      ) : null}
      {measurement ? <MeasureGuides measurement={measurement} /> : null}
      {measurement ? (
        <>
          <Box rect={measurement.from} kind="selected" />
          <Box rect={measurement.to} kind="hover" />
        </>
      ) : null}
    </div>
  );
}
