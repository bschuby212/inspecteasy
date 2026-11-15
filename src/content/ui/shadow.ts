export interface ShadowParts {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  enabled: boolean;
}

const SHADOW_RE =
  /^(?:(inset)\s+)?(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?(?:\s+(.+))?$/i;

export function parseShadow(value: string): ShadowParts {
  if (!value || value === "—" || value === "none") {
    return { x: 0, y: 4, blur: 12, spread: 0, color: "#00000040", enabled: false };
  }

  // Use the first layer if multiple shadows are present.
  const first = value.split(/,(?![^(]*\))/)[0]?.trim() ?? value;
  const match = first.match(SHADOW_RE);
  if (!match) {
    return { x: 0, y: 4, blur: 12, spread: 0, color: "#00000040", enabled: true };
  }

  return {
    x: Number(match[2]),
    y: Number(match[3]),
    blur: Number(match[4]),
    spread: Number(match[5] ?? 0),
    color: (match[6] || "#00000040").trim(),
    enabled: true,
  };
}

export function formatShadow(parts: ShadowParts): string {
  if (!parts.enabled) return "none";
  return `${parts.x}px ${parts.y}px ${parts.blur}px ${parts.spread}px ${parts.color}`;
}
