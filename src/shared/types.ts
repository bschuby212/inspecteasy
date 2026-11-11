export type ToolMode = "select" | "measure";

export interface ElementGeometry {
  width: number;
  height: number;
  x: number;
  y: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface SpacingBox {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface LayoutInfo {
  display: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  flexWrap?: string;
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  placeContent?: string;
  placeItems?: string;
}

export interface TypographyInfo {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  color: string;
}

export interface AppearanceInfo {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  opacity: string;
  boxShadow: string;
}

export interface ElementSnapshot {
  tagName: string;
  label: string;
  geometry: ElementGeometry;
  layout: LayoutInfo;
  spacing: {
    padding: SpacingBox;
    margin: SpacingBox;
  };
  typography: TypographyInfo;
  appearance: AppearanceInfo;
}

export interface MeasurementResult {
  from: ElementGeometry;
  to: ElementGeometry;
  horizontal: number | null;
  vertical: number | null;
  overlap: boolean;
}

export interface EditableStyles {
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
}

export type MessageToBackground =
  | { type: "GET_ACTIVE_STATE" }
  | { type: "SET_ACTIVE_STATE"; active: boolean }
  | { type: "CONTENT_READY" };

export type MessageToContent =
  | { type: "ACTIVATE" }
  | { type: "DEACTIVATE" }
  | { type: "TOGGLE" }
  | { type: "PING" };
