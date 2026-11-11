import { RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EditableStyles, ElementSnapshot } from "../../shared/types";
import { px } from "../../shared/format";
import { PropertyRow } from "./PropertyRow";

interface PropertiesPanelProps {
  open: boolean;
  snapshot: ElementSnapshot | null;
  hasEdits: boolean;
  onClose: () => void;
  onReset: () => void;
  onEdit: (styles: EditableStyles) => void;
}

function toColorInput(value: string, fallback: string): string {
  if (value.startsWith("#") && (value.length === 7 || value.length === 9)) {
    return value.slice(0, 7);
  }
  return fallback;
}

export function PropertiesPanel({
  open,
  snapshot,
  hasEdits,
  onClose,
  onReset,
  onEdit,
}: PropertiesPanelProps) {
  const [draft, setDraft] = useState({
    fontSize: "",
    color: "#000000",
    backgroundColor: "#ffffff",
    borderRadius: "",
    padding: "",
  });

  useEffect(() => {
    if (!snapshot) return;
    setDraft({
      fontSize: snapshot.typography.fontSize.replace(/px$/i, ""),
      color: toColorInput(snapshot.typography.color, "#000000"),
      backgroundColor: toColorInput(snapshot.appearance.backgroundColor, "#ffffff"),
      borderRadius: snapshot.appearance.borderRadius.replace(/px$/i, "").split(" ")[0] ?? "",
      padding: snapshot.spacing.padding.top.replace(/px$/i, ""),
    });
  }, [snapshot]);

  return (
    <aside className={`panel${open ? "" : " collapsed"}`} aria-hidden={!open}>
      <div className="panel-header">
        <div className="panel-title">Design</div>
        <div className="panel-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onReset}
            disabled={!hasEdits}
            title="Reset changes"
            aria-label="Reset changes"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Hide panel"
            aria-label="Hide panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="panel-body">
        {!snapshot ? (
          <div className="empty-state">
            <h3>Select an element</h3>
            <p>
              Click any element on the page to inspect typography, spacing, colors, and layout —
              like selecting in Figma.
            </p>
          </div>
        ) : (
          <>
            <div className="section">
              <div className="element-chip" title={snapshot.label}>
                {snapshot.label}
              </div>
            </div>

            <section className="section">
              <h2 className="section-title">Element</h2>
              <PropertyRow label="Type" value={snapshot.tagName} />
              <PropertyRow label="Width" value={px(snapshot.geometry.width)} />
              <PropertyRow label="Height" value={px(snapshot.geometry.height)} />
              <PropertyRow label="X" value={px(snapshot.geometry.x)} />
              <PropertyRow label="Y" value={px(snapshot.geometry.y)} />
              <PropertyRow label="Display" value={snapshot.layout.display} />
            </section>

            <section className="section">
              <h2 className="section-title">Layout & spacing</h2>
              <div className="quad">
                <div className="quad-item">
                  <span className="row-label">Padding</span>
                  <PropertyRow label="T" value={snapshot.spacing.padding.top} />
                  <PropertyRow label="R" value={snapshot.spacing.padding.right} />
                  <PropertyRow label="B" value={snapshot.spacing.padding.bottom} />
                  <PropertyRow label="L" value={snapshot.spacing.padding.left} />
                </div>
                <div className="quad-item">
                  <span className="row-label">Margin</span>
                  <PropertyRow label="T" value={snapshot.spacing.margin.top} />
                  <PropertyRow label="R" value={snapshot.spacing.margin.right} />
                  <PropertyRow label="B" value={snapshot.spacing.margin.bottom} />
                  <PropertyRow label="L" value={snapshot.spacing.margin.left} />
                </div>
              </div>
              <PropertyRow label="Gap" value={snapshot.layout.gap ?? "—"} />
              <PropertyRow label="Direction" value={snapshot.layout.flexDirection ?? "—"} />
              <PropertyRow label="Justify" value={snapshot.layout.justifyContent ?? "—"} />
              <PropertyRow label="Align" value={snapshot.layout.alignItems ?? "—"} />
              <PropertyRow label="Wrap" value={snapshot.layout.flexWrap ?? "—"} />
              <PropertyRow
                label="Grid columns"
                value={snapshot.layout.gridTemplateColumns ?? "—"}
              />
              <PropertyRow label="Grid rows" value={snapshot.layout.gridTemplateRows ?? "—"} />
            </section>

            <section className="section">
              <h2 className="section-title">Typography</h2>
              <PropertyRow label="Font" value={snapshot.typography.fontFamily} />
              <PropertyRow label="Size" value={snapshot.typography.fontSize} />
              <PropertyRow label="Weight" value={snapshot.typography.fontWeight} />
              <PropertyRow label="Line height" value={snapshot.typography.lineHeight} />
              <PropertyRow label="Letter spacing" value={snapshot.typography.letterSpacing} />
              <PropertyRow label="Align" value={snapshot.typography.textAlign} />
              <PropertyRow
                label="Color"
                value={snapshot.typography.color}
                swatch={snapshot.typography.color}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Appearance</h2>
              <PropertyRow
                label="Fill"
                value={snapshot.appearance.backgroundColor}
                swatch={snapshot.appearance.backgroundColor}
              />
              <PropertyRow
                label="Border"
                value={snapshot.appearance.borderColor}
                swatch={
                  snapshot.appearance.borderColor !== "—"
                    ? snapshot.appearance.borderColor
                    : undefined
                }
              />
              <PropertyRow label="Border width" value={snapshot.appearance.borderWidth} />
              <PropertyRow label="Radius" value={snapshot.appearance.borderRadius} />
              <PropertyRow label="Opacity" value={snapshot.appearance.opacity} />
              <PropertyRow label="Shadow" value={snapshot.appearance.boxShadow} />
            </section>

            <section className="section">
              <h2 className="section-title">Edit</h2>
              <div className="edit-grid">
                <div className="field">
                  <label htmlFor="is-font-size">Font size</label>
                  <input
                    id="is-font-size"
                    type="number"
                    min={1}
                    value={draft.fontSize}
                    onChange={(e) => {
                      const fontSize = e.target.value;
                      setDraft((d) => ({ ...d, fontSize }));
                      if (fontSize) onEdit({ fontSize: `${fontSize}px` });
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="is-color">Text color</label>
                  <input
                    id="is-color"
                    type="color"
                    value={draft.color}
                    onChange={(e) => {
                      const color = e.target.value;
                      setDraft((d) => ({ ...d, color }));
                      onEdit({ color });
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="is-bg">Background</label>
                  <input
                    id="is-bg"
                    type="color"
                    value={draft.backgroundColor}
                    onChange={(e) => {
                      const backgroundColor = e.target.value;
                      setDraft((d) => ({ ...d, backgroundColor }));
                      onEdit({ backgroundColor });
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="is-radius">Radius</label>
                  <input
                    id="is-radius"
                    type="number"
                    min={0}
                    value={draft.borderRadius}
                    onChange={(e) => {
                      const borderRadius = e.target.value;
                      setDraft((d) => ({ ...d, borderRadius }));
                      if (borderRadius !== "") onEdit({ borderRadius: `${borderRadius}px` });
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="is-padding">Padding</label>
                  <input
                    id="is-padding"
                    type="number"
                    min={0}
                    value={draft.padding}
                    onChange={(e) => {
                      const padding = e.target.value;
                      setDraft((d) => ({ ...d, padding }));
                      if (padding !== "") {
                        const v = `${padding}px`;
                        onEdit({
                          paddingTop: v,
                          paddingRight: v,
                          paddingBottom: v,
                          paddingLeft: v,
                        });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn" onClick={onReset} disabled={!hasEdits}>
                  Reset changes
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
