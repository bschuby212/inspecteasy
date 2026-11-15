import { MessageSquarePlus, RotateCcw, X } from "lucide-react";
import type { EditableStyles, ElementSnapshot } from "../../shared/types";
import { px } from "../../shared/format";
import {
  ALIGN_ITEMS_OPTIONS,
  ALIGN_OPTIONS,
  ColorField,
  DIRECTION_OPTIONS,
  DISPLAY_OPTIONS,
  FONT_OPTIONS,
  JUSTIFY_OPTIONS,
  NumField,
  PairRow,
  QuadEdit,
  SHADOW_PRESETS,
  SelectField,
  SegmentedField,
  WEIGHT_OPTIONS,
  matchFontOption,
} from "./EditControls";
import { formatShadow, parseShadow } from "./shadow";

interface PropertiesPanelProps {
  open: boolean;
  snapshot: ElementSnapshot | null;
  hasEdits: boolean;
  canComment: boolean;
  onClose: () => void;
  onReset: () => void;
  onEdit: (styles: EditableStyles) => void;
  onFlag: () => void;
}

function opacityPercent(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "100";
  return String(Math.round(n * 100));
}

function borderWidthPx(value: string): string {
  if (!value || value === "—") return "0px";
  const first = value.split("/")[0]?.trim() ?? value;
  return first.endsWith("px") ? first : `${Number.parseFloat(first) || 0}px`;
}

export function PropertiesPanel({
  open,
  snapshot,
  hasEdits,
  canComment,
  onClose,
  onReset,
  onEdit,
  onFlag,
}: PropertiesPanelProps) {
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
              Click any element to inspect and edit it like a Figma layer — size, spacing,
              type, fill, and stroke update live on the page.
            </p>
          </div>
        ) : (
          <>
            <div className="section">
              <div className="element-chip" title={snapshot.label}>
                {snapshot.label}
              </div>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={!canComment}
                  onClick={onFlag}
                  title="Pin a comment on this element"
                >
                  <MessageSquarePlus size={14} />
                  Flag issue
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={onReset}
                  disabled={!hasEdits}
                  title="Reset temporary edits"
                >
                  Reset
                </button>
              </div>
              {hasEdits ? (
                <p className="edit-hint">Temporary edits — refresh or Reset restores the page.</p>
              ) : null}
            </div>

            <section className="section">
              <h2 className="section-title">Frame</h2>
              <PairRow>
                <NumField
                  id="is-width"
                  label="W"
                  value={px(snapshot.geometry.width)}
                  min={1}
                  onCommit={(width) => onEdit({ width })}
                />
                <NumField
                  id="is-height"
                  label="H"
                  value={px(snapshot.geometry.height)}
                  min={1}
                  onCommit={(height) => onEdit({ height })}
                />
              </PairRow>
              <p className="fig-meta">
                X {px(snapshot.geometry.x)} · Y {px(snapshot.geometry.y)}
              </p>
              <SelectField
                id="is-display"
                label="Display"
                value={snapshot.layout.display}
                options={DISPLAY_OPTIONS}
                onCommit={(display) => onEdit({ display })}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Spacing</h2>
              <div className="fig-spacing">
                <QuadEdit
                  title="Padding"
                  values={snapshot.spacing.padding}
                  ids={{
                    top: "is-pad-t",
                    right: "is-pad-r",
                    bottom: "is-pad-b",
                    left: "is-pad-l",
                  }}
                  onChange={(side, value) => {
                    if (side === "top") onEdit({ paddingTop: value });
                    if (side === "right") onEdit({ paddingRight: value });
                    if (side === "bottom") onEdit({ paddingBottom: value });
                    if (side === "left") onEdit({ paddingLeft: value });
                  }}
                />
                <QuadEdit
                  title="Margin"
                  values={snapshot.spacing.margin}
                  ids={{
                    top: "is-mar-t",
                    right: "is-mar-r",
                    bottom: "is-mar-b",
                    left: "is-mar-l",
                  }}
                  onChange={(side, value) => {
                    if (side === "top") onEdit({ marginTop: value });
                    if (side === "right") onEdit({ marginRight: value });
                    if (side === "bottom") onEdit({ marginBottom: value });
                    if (side === "left") onEdit({ marginLeft: value });
                  }}
                />
              </div>
              <NumField
                id="is-gap"
                label="Gap"
                value={snapshot.layout.gap ?? "0px"}
                onCommit={(gap) => onEdit({ gap })}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Auto layout</h2>
              <SelectField
                id="is-direction"
                label="Direction"
                value={snapshot.layout.flexDirection ?? "row"}
                options={DIRECTION_OPTIONS}
                onCommit={(flexDirection) => onEdit({ display: "flex", flexDirection })}
              />
              <SelectField
                id="is-justify"
                label="Justify"
                value={snapshot.layout.justifyContent ?? "flex-start"}
                options={JUSTIFY_OPTIONS}
                onCommit={(justifyContent) => onEdit({ justifyContent })}
              />
              <SelectField
                id="is-align-items"
                label="Align"
                value={snapshot.layout.alignItems ?? "stretch"}
                options={ALIGN_ITEMS_OPTIONS}
                onCommit={(alignItems) => onEdit({ alignItems })}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Typography</h2>
              <SelectField
                id="is-font"
                label="Font"
                value={matchFontOption(snapshot.typography.fontFamily)}
                options={[
                  ...FONT_OPTIONS,
                  {
                    value: snapshot.typography.fontFamily,
                    label: snapshot.typography.fontFamily,
                  },
                ].filter(
                  (opt, i, arr) => arr.findIndex((o) => o.value === opt.value) === i,
                )}
                onCommit={(fontFamily) => onEdit({ fontFamily })}
              />
              <PairRow>
                <NumField
                  id="is-font-size"
                  label="Size"
                  value={snapshot.typography.fontSize}
                  min={1}
                  onCommit={(fontSize) => onEdit({ fontSize })}
                />
                <SelectField
                  id="is-weight"
                  label="Weight"
                  value={snapshot.typography.fontWeight}
                  options={WEIGHT_OPTIONS}
                  onCommit={(fontWeight) => onEdit({ fontWeight })}
                />
              </PairRow>
              <PairRow>
                <NumField
                  id="is-line-height"
                  label="Line"
                  value={
                    snapshot.typography.lineHeight === "normal"
                      ? ""
                      : snapshot.typography.lineHeight
                  }
                  min={0}
                  step={0.1}
                  onCommit={(lineHeight) => onEdit({ lineHeight })}
                />
                <NumField
                  id="is-letter-spacing"
                  label="Letter"
                  value={
                    snapshot.typography.letterSpacing === "normal"
                      ? "0px"
                      : snapshot.typography.letterSpacing
                  }
                  min={-10}
                  step={0.1}
                  onCommit={(letterSpacing) => onEdit({ letterSpacing })}
                />
              </PairRow>
              <SegmentedField
                label="Align"
                value={snapshot.typography.textAlign}
                options={ALIGN_OPTIONS}
                onCommit={(textAlign) => onEdit({ textAlign })}
              />
              <ColorField
                id="is-color"
                label="Color"
                value={snapshot.typography.color}
                onCommit={(color) => onEdit({ color })}
              />
            </section>

            <section className="section">
              <h2 className="section-title">Fill & stroke</h2>
              <ColorField
                id="is-bg"
                label="Fill"
                value={
                  snapshot.appearance.backgroundColor === "transparent"
                    ? "#ffffff"
                    : snapshot.appearance.backgroundColor
                }
                onCommit={(backgroundColor) => onEdit({ backgroundColor })}
              />
              <ColorField
                id="is-border-color"
                label="Stroke"
                value={
                  snapshot.appearance.borderColor === "—"
                    ? "#000000"
                    : snapshot.appearance.borderColor
                }
                onCommit={(borderColor) =>
                  onEdit({ borderColor, borderStyle: "solid" })
                }
              />
              <PairRow>
                <NumField
                  id="is-border-width"
                  label="Weight"
                  value={borderWidthPx(snapshot.appearance.borderWidth)}
                  onCommit={(borderWidth) =>
                    onEdit({ borderWidth, borderStyle: "solid" })
                  }
                />
                <NumField
                  id="is-radius"
                  label="Radius"
                  value={snapshot.appearance.borderRadius}
                  onCommit={(borderRadius) => onEdit({ borderRadius })}
                />
              </PairRow>
            </section>

            <section className="section">
              <h2 className="section-title">Effects</h2>
              <NumField
                id="is-opacity"
                label="Opacity"
                value={`${opacityPercent(snapshot.appearance.opacity)}%`}
                min={0}
                step={1}
                suffix="%"
                onCommit={(raw) => {
                  const pct = Number.parseFloat(raw);
                  if (!Number.isFinite(pct)) return;
                  onEdit({ opacity: String(Math.max(0, Math.min(100, pct)) / 100) });
                }}
              />
              <SelectField
                id="is-shadow-preset"
                label="Shadow"
                value={
                  snapshot.appearance.boxShadow === "—"
                    ? "none"
                    : SHADOW_PRESETS.some((p) => p.value === snapshot.appearance.boxShadow)
                      ? snapshot.appearance.boxShadow
                      : "custom"
                }
                options={[
                  ...SHADOW_PRESETS,
                  { value: "custom", label: "Custom" },
                ]}
                onCommit={(boxShadow) => {
                  if (boxShadow === "custom") {
                    const parts = parseShadow(snapshot.appearance.boxShadow);
                    onEdit({ boxShadow: formatShadow({ ...parts, enabled: true }) });
                    return;
                  }
                  onEdit({ boxShadow });
                }}
              />
              {(() => {
                const shadow = parseShadow(snapshot.appearance.boxShadow);
                if (!shadow.enabled && snapshot.appearance.boxShadow === "—") return null;
                if (snapshot.appearance.boxShadow === "none" || snapshot.appearance.boxShadow === "—") {
                  return null;
                }
                return (
                  <div className="fig-shadow-controls">
                    <PairRow>
                      <NumField
                        id="is-shadow-x"
                        label="X"
                        value={`${shadow.x}px`}
                        min={-200}
                        onCommit={(v) =>
                          onEdit({
                            boxShadow: formatShadow({
                              ...shadow,
                              enabled: true,
                              x: Number.parseFloat(v) || 0,
                            }),
                          })
                        }
                      />
                      <NumField
                        id="is-shadow-y"
                        label="Y"
                        value={`${shadow.y}px`}
                        min={-200}
                        onCommit={(v) =>
                          onEdit({
                            boxShadow: formatShadow({
                              ...shadow,
                              enabled: true,
                              y: Number.parseFloat(v) || 0,
                            }),
                          })
                        }
                      />
                    </PairRow>
                    <PairRow>
                      <NumField
                        id="is-shadow-blur"
                        label="Blur"
                        value={`${shadow.blur}px`}
                        onCommit={(v) =>
                          onEdit({
                            boxShadow: formatShadow({
                              ...shadow,
                              enabled: true,
                              blur: Number.parseFloat(v) || 0,
                            }),
                          })
                        }
                      />
                      <NumField
                        id="is-shadow-spread"
                        label="Spread"
                        value={`${shadow.spread}px`}
                        min={-100}
                        onCommit={(v) =>
                          onEdit({
                            boxShadow: formatShadow({
                              ...shadow,
                              enabled: true,
                              spread: Number.parseFloat(v) || 0,
                            }),
                          })
                        }
                      />
                    </PairRow>
                    <ColorField
                      id="is-shadow-color"
                      label="Color"
                      value={shadow.color.startsWith("#") ? shadow.color : "#000000"}
                      onCommit={(color) =>
                        onEdit({
                          boxShadow: formatShadow({
                            ...shadow,
                            enabled: true,
                            color,
                          }),
                        })
                      }
                    />
                  </div>
                );
              })()}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
