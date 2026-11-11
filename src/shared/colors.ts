export function rgbToHex(color: string): string {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed || trimmed === "transparent" || trimmed === "rgba(0, 0, 0, 0)") {
    return "transparent";
  }

  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }

  const match = trimmed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!match) return color;

  const r = Math.round(Number(match[1]));
  const g = Math.round(Number(match[2]));
  const b = Math.round(Number(match[3]));
  const a = match[4] !== undefined ? Number(match[4]) : 1;

  if (a === 0) return "transparent";

  const hex = `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

  if (a < 1) {
    return `${hex}${Math.round(a * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()}`;
  }

  return hex;
}

export function isUsableColor(color: string): boolean {
  const value = rgbToHex(color);
  return value !== "transparent" && value !== "";
}
