import { useCallback, useEffect, useState } from "react";
import type { EditableStyles, ElementGeometry, ElementSnapshot, MeasurementResult, ToolMode } from "../../shared/types";
import { deepestElementFromPoint, isFromInspectStudio, isSelectableTarget } from "../../shared/dom";
import { extractElementSnapshot } from "../styles/extract";
import { measureBetween, toGeometry } from "../measure/distances";
import { applyTemporaryStyles, hasEdits as checkHasEdits, resetAllEdits, resetElement } from "../edit/styleEdits";
import { Toolbar } from "./Toolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { Overlays } from "./Overlays";

interface AppProps {
  onClose: () => void;
}

function readRect(el: Element | null): ElementGeometry | null {
  if (!el) return null;
  return toGeometry(el.getBoundingClientRect());
}

export function App({ onClose }: AppProps) {
  const [mode, setMode] = useState<ToolMode>("select");
  const [panelOpen, setPanelOpen] = useState(true);
  const [selecting, setSelecting] = useState(true);
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [selectedEl, setSelectedEl] = useState<Element | null>(null);
  const [hoverRect, setHoverRect] = useState<ElementGeometry | null>(null);
  const [selectedRect, setSelectedRect] = useState<ElementGeometry | null>(null);
  const [snapshot, setSnapshot] = useState<ElementSnapshot | null>(null);
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [edited, setEdited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshSelection = useCallback(() => {
    setHoverRect(readRect(hoverEl));
    setSelectedRect(readRect(selectedEl));
    if (selectedEl) {
      setSnapshot(extractElementSnapshot(selectedEl));
    }
  }, [hoverEl, selectedEl]);

  useEffect(() => {
    refreshSelection();
  }, [refreshSelection]);

  useEffect(() => {
    function onScrollOrResize() {
      setHoverRect(readRect(hoverEl));
      setSelectedRect(readRect(selectedEl));
      if (measuring && selectedEl && hoverEl && hoverEl !== selectedEl) {
        setMeasurement(measureBetween(selectedEl, hoverEl));
      }
    }

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [hoverEl, selectedEl, measuring]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isFromInspectStudio(e) && (e.target as HTMLElement)?.tagName === "INPUT") {
        return;
      }

      if (e.key === "Escape") {
        if (measuring) {
          setMeasuring(false);
          setMeasurement(null);
          return;
        }
        if (selecting) {
          setSelecting(false);
          setHoverEl(null);
          setHoverRect(null);
          setToast("Selection paused — click the pointer tool to resume");
          return;
        }
        onClose();
        return;
      }

      if (e.key === "v" || e.key === "V") {
        setMode("select");
        setSelecting(true);
      }
      if (e.key === "m" || e.key === "M") {
        setMode("measure");
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (isFromInspectStudio(e)) {
        setHoverEl(null);
        setHoverRect(null);
        if (!e.altKey && mode !== "measure") {
          setMeasuring(false);
          setMeasurement(null);
        }
        return;
      }

      const el = deepestElementFromPoint(e.clientX, e.clientY);
      if (!isSelectableTarget(el)) {
        setHoverEl(null);
        setHoverRect(null);
        return;
      }

      if (selecting || mode === "measure" || e.altKey) {
        setHoverEl(el);
        setHoverRect(toGeometry(el.getBoundingClientRect()));
      }

      const shouldMeasure =
        selectedEl &&
        el !== selectedEl &&
        (e.altKey || mode === "measure");

      if (shouldMeasure) {
        setMeasuring(true);
        setMeasurement(measureBetween(selectedEl, el));
      } else if (!e.altKey && mode !== "measure") {
        setMeasuring(false);
        setMeasurement(null);
      }
    }

    function onMouseDown(e: MouseEvent) {
      if (isFromInspectStudio(e)) return;
      if (!selecting && mode !== "measure") return;

      const el = deepestElementFromPoint(e.clientX, e.clientY);
      if (!isSelectableTarget(el)) return;

      // Prevent navigation / button activation while inspecting.
      e.preventDefault();
      e.stopPropagation();

      if (e.altKey || mode === "measure") {
        // Measuring does not change selection on click unless nothing selected.
        if (!selectedEl) {
          setSelectedEl(el);
          setSelectedRect(toGeometry(el.getBoundingClientRect()));
          setSnapshot(extractElementSnapshot(el));
          setPanelOpen(true);
        }
        return;
      }

      setSelectedEl(el);
      setSelectedRect(toGeometry(el.getBoundingClientRect()));
      setSnapshot(extractElementSnapshot(el));
      setPanelOpen(true);
      setMeasurement(null);
    }

    function onClick(e: MouseEvent) {
      if (isFromInspectStudio(e)) return;
      if (!selecting && mode !== "measure") return;
      e.preventDefault();
      e.stopPropagation();
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Alt" && mode !== "measure") {
        setMeasuring(false);
        setMeasurement(null);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [mode, selecting, selectedEl, measuring, onClose]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleEdit(styles: EditableStyles) {
    if (!selectedEl) return;
    applyTemporaryStyles(selectedEl, styles);
    setEdited(checkHasEdits());
    setSnapshot(extractElementSnapshot(selectedEl));
    setSelectedRect(readRect(selectedEl));
  }

  function handleReset() {
    if (selectedEl) resetElement(selectedEl);
    else resetAllEdits();
    setEdited(checkHasEdits());
    if (selectedEl) {
      setSnapshot(extractElementSnapshot(selectedEl));
      setSelectedRect(readRect(selectedEl));
    }
    setToast("Changes reset");
  }

  function handleModeChange(next: ToolMode) {
    setMode(next);
    if (next === "select") setSelecting(true);
  }

  return (
    <div className="inspect-studio-root">
      <Overlays
        hoverEl={hoverEl}
        selectedEl={selectedEl}
        hoverRect={hoverRect}
        selectedRect={selectedRect}
        measurement={measurement}
      />
      <Toolbar
        mode={mode}
        panelOpen={panelOpen}
        measuring={measuring}
        onModeChange={handleModeChange}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        onClose={onClose}
      />
      <PropertiesPanel
        open={panelOpen}
        snapshot={snapshot}
        hasEdits={edited}
        onClose={() => setPanelOpen(false)}
        onReset={handleReset}
        onEdit={handleEdit}
      />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
