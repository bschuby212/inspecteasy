export function px(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = digits === 0 ? Math.round(value) : Number(value.toFixed(digits));
  return `${rounded}px`;
}

export function formatCssLength(value: string): string {
  if (!value || value === "normal" || value === "auto" || value === "none") return value || "—";
  const num = Number.parseFloat(value);
  if (Number.isFinite(num) && value.endsWith("px")) {
    return `${Math.round(num * 100) / 100}px`.replace(/\.0+px$/, "px");
  }
  return value;
}

export function shortenFontFamily(family: string): string {
  const first = family.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || family;
}

export function elementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const className =
    typeof (el as HTMLElement).className === "string"
      ? (el as HTMLElement).className
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join("")
      : "";
  const label = `${tag}${id}${className}`;
  return label.length > 42 ? `${label.slice(0, 39)}…` : label;
}

export function niceWeight(weight: string): string {
  const map: Record<string, string> = {
    normal: "400",
    bold: "700",
  };
  return map[weight] ?? weight;
}
