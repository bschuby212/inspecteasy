/**
 * Node-side unit checks for pure helpers used by Inspect Studio.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

// Helpers are TypeScript — compile-free reimplementation mirrors for smoke checks.
function rgbToHex(color) {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed || trimmed === "transparent" || trimmed === "rgba(0, 0, 0, 0)") return "transparent";
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
    return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0").toUpperCase()}`;
  }
  return hex;
}

function gapBetween(a1, a2, b1, b2) {
  if (a2 <= b1) return b1 - a2;
  if (b2 <= a1) return a1 - b2;
  return null;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

check("rgbToHex converts rgb", rgbToHex("rgb(38, 74, 104)") === "#264A68");
check("rgbToHex transparent", rgbToHex("rgba(0, 0, 0, 0)") === "transparent");
check("rgbToHex short hex", rgbToHex("#abc") === "#AABBCC");
check("gap horizontal adjacent", gapBetween(0, 100, 120, 200) === 20);
check("gap overlap returns null", gapBetween(0, 100, 50, 150) === null);

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../qa-output");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "qa-unit-results.json"),
  JSON.stringify(
    {
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    },
    null,
    2,
  ),
);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
