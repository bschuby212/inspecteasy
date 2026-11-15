import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
} from "lucide-react";

function stripUnit(value: string): string {
  if (!value || value === "—" || value === "normal" || value === "auto") return "";
  return value.replace(/(px|%)$/i, "").split(" ")[0] ?? "";
}

function toColor(value: string, fallback: string): string {
  if (value.startsWith("#") && (value.length === 7 || value.length === 9)) {
    return value.slice(0, 7);
  }
  return fallback;
}

interface NumProps {
  id: string;
  label: string;
  value: string;
  min?: number;
  step?: number;
  suffix?: string;
  onCommit: (cssValue: string) => void;
}

export function NumField({
  id,
  label,
  value,
  min = 0,
  step = 1,
  suffix = "px",
  onCommit,
}: NumProps) {
  const external = stripUnit(value);
  const [draft, setDraft] = useState(external);

  useEffect(() => {
    setDraft(external);
  }, [external]);

  function commit(raw: string) {
    if (raw === "") return;
    onCommit(suffix ? `${raw}${suffix}` : raw);
  }

  return (
    <label className="fig-field" htmlFor={id}>
      <span className="fig-field-label">{label}</span>
      <input
        id={id}
        className="fig-input"
        type="number"
        min={min}
        step={step}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          commit(next);
        }}
        onBlur={() => commit(draft)}
      />
    </label>
  );
}

interface ColorProps {
  id: string;
  label: string;
  value: string;
  onCommit: (cssValue: string) => void;
}

export function ColorField({ id, label, value, onCommit }: ColorProps) {
  const normalized = value === "—" || value === "transparent" ? "" : value;
  const hex = toColor(normalized, "#000000");
  const [text, setText] = useState(normalized || hex);

  useEffect(() => {
    setText(normalized || hex);
  }, [normalized, hex]);

  return (
    <label className="fig-field fig-field-color" htmlFor={id}>
      <span className="fig-field-label">{label}</span>
      <span className="fig-color-wrap">
        <input
          id={id}
          className="fig-color"
          type="color"
          value={hex}
          onChange={(e) => {
            setText(e.target.value);
            onCommit(e.target.value);
          }}
        />
        <input
          className="fig-input fig-hex"
          type="text"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(next) || next === "transparent") {
              onCommit(next);
            }
          }}
        />
      </span>
    </label>
  );
}

interface SelectProps {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onCommit: (cssValue: string) => void;
}

export function SelectField({ id, label, value, options, onCommit }: SelectProps) {
  return (
    <label className="fig-field" htmlFor={id}>
      <span className="fig-field-label">{label}</span>
      <select
        id={id}
        className="fig-input fig-select"
        value={value}
        onChange={(e) => onCommit(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SegmentProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
  onCommit: (cssValue: string) => void;
}

export function SegmentedField({ label, value, options, onCommit }: SegmentProps) {
  return (
    <div className="fig-field fig-field-segment">
      <span className="fig-field-label">{label}</span>
      <div className="fig-segment" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`fig-segment-btn${value === opt.value ? " active" : ""}`}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={value === opt.value}
            onClick={() => onCommit(opt.value)}
          >
            {opt.icon ?? opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PairRow({ children }: { children: ReactNode }) {
  return <div className="fig-pair">{children}</div>;
}

export function QuadEdit({
  title,
  values,
  ids,
  onChange,
}: {
  title: string;
  values: { top: string; right: string; bottom: string; left: string };
  ids: { top: string; right: string; bottom: string; left: string };
  onChange: (side: "top" | "right" | "bottom" | "left", cssValue: string) => void;
}) {
  return (
    <div className="fig-quad">
      <div className="fig-quad-title">{title}</div>
      <div className="fig-quad-grid">
        <NumField id={ids.top} label="T" value={values.top} onCommit={(v) => onChange("top", v)} />
        <NumField
          id={ids.right}
          label="R"
          value={values.right}
          onCommit={(v) => onChange("right", v)}
        />
        <NumField
          id={ids.bottom}
          label="B"
          value={values.bottom}
          onCommit={(v) => onChange("bottom", v)}
        />
        <NumField
          id={ids.left}
          label="L"
          value={values.left}
          onCommit={(v) => onChange("left", v)}
        />
      </div>
    </div>
  );
}

export const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Geist, sans-serif", label: "Geist" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica Neue, Helvetica, sans-serif", label: "Helvetica" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, Times, serif", label: "Times" },
  { value: "ui-monospace, SFMono-Regular, Menlo, monospace", label: "Mono" },
  { value: "system-ui, sans-serif", label: "System" },
];

export const WEIGHT_OPTIONS = [
  { value: "100", label: "Thin 100" },
  { value: "200", label: "Extra light 200" },
  { value: "300", label: "Light 300" },
  { value: "400", label: "Regular 400" },
  { value: "500", label: "Medium 500" },
  { value: "600", label: "Semibold 600" },
  { value: "700", label: "Bold 700" },
  { value: "800", label: "Extra bold 800" },
  { value: "900", label: "Black 900" },
];

export const ALIGN_OPTIONS = [
  { value: "left", label: "Left", icon: <AlignLeft size={13} /> },
  { value: "center", label: "Center", icon: <AlignCenter size={13} /> },
  { value: "right", label: "Right", icon: <AlignRight size={13} /> },
  { value: "justify", label: "Justify", icon: <AlignJustify size={13} /> },
];

export const DISPLAY_OPTIONS = [
  { value: "block", label: "Block" },
  { value: "flex", label: "Flex" },
  { value: "grid", label: "Grid" },
  { value: "inline-flex", label: "Inline flex" },
  { value: "inline-block", label: "Inline block" },
  { value: "none", label: "None" },
];

export const DIRECTION_OPTIONS = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
  { value: "row-reverse", label: "Row reverse" },
  { value: "column-reverse", label: "Column reverse" },
];

export const JUSTIFY_OPTIONS = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space between" },
  { value: "space-around", label: "Space around" },
  { value: "space-evenly", label: "Space evenly" },
];

export const ALIGN_ITEMS_OPTIONS = [
  { value: "stretch", label: "Stretch" },
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "baseline", label: "Baseline" },
];

export const SHADOW_PRESETS = [
  { value: "none", label: "None" },
  { value: "0px 1px 2px 0px #0000001F", label: "Soft" },
  { value: "0px 4px 12px 0px #00000026", label: "Medium" },
  { value: "0px 12px 28px 0px #0000002E", label: "Large" },
  { value: "0px 0px 0px 1px #00000014", label: "Hairline" },
];

export function matchFontOption(family: string): string {
  const lower = family.toLowerCase();
  const found = FONT_OPTIONS.find((f) => lower.includes(f.label.toLowerCase()));
  return found?.value ?? family;
}
