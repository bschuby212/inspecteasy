import type { ElementGeometry, MeasurementResult } from "../../shared/types";
import { elementLabel, px } from "../../shared/format";
import { buildMeasurementGuides } from "../measure/distances";

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
  const guides = buildMeasurementGuides(measurement.from, measurement.to);
  if (guides.length === 0) return null;

  return (
    <div className="measure-layer" aria-hidden="true">
      {guides.map((guide, index) => (
        <div key={`${guide.orientation}-${index}`}>
          <div
            className={`measure-line ${guide.orientation}`}
            style={
              guide.orientation === "horizontal"
                ? { left: guide.left, top: guide.top, width: guide.length }
                : { left: guide.left, top: guide.top, height: guide.length }
            }
          />
          <div
            className="measure-label"
            style={{ left: guide.labelLeft, top: guide.labelTop }}
          >
            {px(guide.label)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Overlays({
  hoverEl,
  selectedEl,
  hoverRect,
  selectedRect,
  measurement,
}: OverlaysProps) {
  return (
    <>
      <div className="overlay-layer" aria-hidden="true">
        {hoverRect && hoverEl && hoverEl !== selectedEl ? (
          <Box rect={hoverRect} kind="hover" label={elementLabel(hoverEl)} />
        ) : null}
        {selectedRect && selectedEl ? (
          <Box rect={selectedRect} kind="selected" label={elementLabel(selectedEl)} />
        ) : null}
        {measurement ? (
          <>
            <Box rect={measurement.from} kind="selected" />
            <Box rect={measurement.to} kind="hover" />
          </>
        ) : null}
      </div>
      {measurement ? <MeasureGuides measurement={measurement} /> : null}
    </>
  );
}
