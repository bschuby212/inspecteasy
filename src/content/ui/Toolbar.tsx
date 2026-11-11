import {
  Crosshair,
  Eye,
  EyeOff,
  MousePointer2,
  Ruler,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ToolMode } from "../../shared/types";

interface ToolbarProps {
  mode: ToolMode;
  panelOpen: boolean;
  measuring: boolean;
  onModeChange: (mode: ToolMode) => void;
  onTogglePanel: () => void;
  onClose: () => void;
}

export function Toolbar({
  mode,
  panelOpen,
  measuring,
  onModeChange,
  onTogglePanel,
  onClose,
}: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ ox: number; oy: number; startX: number; startY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current) return;
      setPos({
        x: e.clientX - drag.current.ox,
        y: e.clientY - drag.current.oy,
      });
    }
    function onUp() {
      drag.current = null;
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const style =
    pos != null
      ? { left: `${pos.x}px`, top: `${pos.y}px`, transform: "none" }
      : undefined;

  return (
    <div
      ref={ref}
      className={`toolbar${dragging ? " dragging" : ""}`}
      style={style}
      role="toolbar"
      aria-label="Inspect Studio toolbar"
    >
      <div
        className="toolbar-brand"
        onMouseDown={(e) => {
          if (!ref.current) return;
          const rect = ref.current.getBoundingClientRect();
          drag.current = {
            ox: e.clientX - rect.left,
            oy: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY,
          };
          setDragging(true);
          if (pos == null) setPos({ x: rect.left, y: rect.top });
        }}
        title="Drag toolbar"
      >
        <Crosshair size={14} />
        Inspect Studio
      </div>

      <button
        type="button"
        className={`toolbar-btn${mode === "select" ? " active" : ""}`}
        onClick={() => onModeChange("select")}
        title="Select (V)"
        aria-label="Select tool"
        aria-pressed={mode === "select"}
      >
        <MousePointer2 size={15} />
      </button>

      <button
        type="button"
        className={`toolbar-btn${mode === "measure" || measuring ? " active" : ""}`}
        onClick={() => onModeChange("measure")}
        title="Measure — hold Alt while hovering (M)"
        aria-label="Measure tool"
        aria-pressed={mode === "measure" || measuring}
      >
        <Ruler size={15} />
      </button>

      <button
        type="button"
        className={`toolbar-btn${panelOpen ? " active" : ""}`}
        onClick={onTogglePanel}
        title={panelOpen ? "Hide properties" : "Show properties"}
        aria-label={panelOpen ? "Hide properties panel" : "Show properties panel"}
        aria-pressed={panelOpen}
      >
        {panelOpen ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>

      <span className="toolbar-hint">
        {measuring ? "Measuring…" : mode === "select" ? "Click to select · Esc exits" : "Alt + hover"}
      </span>

      <button
        type="button"
        className="toolbar-btn close"
        onClick={onClose}
        title="Close Inspect Studio"
        aria-label="Close Inspect Studio"
      >
        <X size={15} />
      </button>
    </div>
  );
}
