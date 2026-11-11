import type { AppearanceInfo, ElementSnapshot, LayoutInfo, SpacingBox, TypographyInfo } from "../../shared/types";
import { rgbToHex, isUsableColor } from "../../shared/colors";
import { elementLabel, formatCssLength, niceWeight, px, shortenFontFamily } from "../../shared/format";

function spacingBox(style: CSSStyleDeclaration, prefix: "padding" | "margin"): SpacingBox {
  return {
    top: formatCssLength(style[`${prefix}Top` as keyof CSSStyleDeclaration] as string),
    right: formatCssLength(style[`${prefix}Right` as keyof CSSStyleDeclaration] as string),
    bottom: formatCssLength(style[`${prefix}Bottom` as keyof CSSStyleDeclaration] as string),
    left: formatCssLength(style[`${prefix}Left` as keyof CSSStyleDeclaration] as string),
  };
}

function extractLayout(style: CSSStyleDeclaration): LayoutInfo {
  const display = style.display;
  const info: LayoutInfo = { display };

  if (display.includes("flex")) {
    info.flexDirection = style.flexDirection;
    info.justifyContent = style.justifyContent;
    info.alignItems = style.alignItems;
    info.flexWrap = style.flexWrap;
    if (style.gap && style.gap !== "normal") info.gap = formatCssLength(style.gap);
  }

  if (display.includes("grid")) {
    info.gridTemplateColumns = style.gridTemplateColumns;
    info.gridTemplateRows = style.gridTemplateRows;
    info.justifyContent = style.justifyContent;
    info.alignItems = style.alignItems;
    if (style.gap && style.gap !== "normal") info.gap = formatCssLength(style.gap);
  }

  return info;
}

function extractTypography(style: CSSStyleDeclaration): TypographyInfo {
  return {
    fontFamily: shortenFontFamily(style.fontFamily),
    fontSize: formatCssLength(style.fontSize),
    fontWeight: niceWeight(style.fontWeight),
    lineHeight: formatCssLength(style.lineHeight),
    letterSpacing: formatCssLength(style.letterSpacing),
    textAlign: style.textAlign,
    color: rgbToHex(style.color),
  };
}

function extractAppearance(style: CSSStyleDeclaration): AppearanceInfo {
  const borderWidths = [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ];
  const hasBorder = borderWidths.some((w) => Number.parseFloat(w) > 0);

  const radii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ];
  const uniqueRadii = [...new Set(radii.map(formatCssLength))];

  return {
    backgroundColor: isUsableColor(style.backgroundColor)
      ? rgbToHex(style.backgroundColor)
      : "transparent",
    borderColor: hasBorder ? rgbToHex(style.borderTopColor) : "—",
    borderWidth: hasBorder
      ? [...new Set(borderWidths.map(formatCssLength))].join(" / ")
      : "0px",
    borderRadius: uniqueRadii.length === 1 ? uniqueRadii[0] : uniqueRadii.join(" "),
    opacity: style.opacity,
    boxShadow: style.boxShadow === "none" ? "—" : style.boxShadow,
  };
}

export function extractElementSnapshot(el: Element): ElementSnapshot {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return {
    tagName: el.tagName.toLowerCase(),
    label: elementLabel(el),
    geometry: {
      width: rect.width,
      height: rect.height,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    },
    layout: extractLayout(style),
    spacing: {
      padding: spacingBox(style, "padding"),
      margin: spacingBox(style, "margin"),
    },
    typography: extractTypography(style),
    appearance: extractAppearance(style),
  };
}

export function geometryLabel(width: number, height: number): string {
  return `${px(width)} × ${px(height)}`;
}
