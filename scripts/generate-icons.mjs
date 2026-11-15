/**
 * Renders crisp Lucide Crosshair icons for the Chrome extension.
 * Draws via canvas from the Lucide SVG so edges stay sharp at 16–128px.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];
const ACCENT = "#2563EB";

const LUCIDE_CROSSHAIR = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
  stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" />
  <line x1="22" x2="18" y1="12" y2="12" />
  <line x1="6" x2="2" y1="12" y2="12" />
  <line x1="12" x2="12" y1="6" y2="2" />
  <line x1="12" x2="12" y1="22" y2="18" />
</svg>`.trim();

const pageHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script type="module">
      const svg = ${JSON.stringify(LUCIDE_CROSSHAIR)};
      const sizes = ${JSON.stringify(SIZES)};

      async function render(size) {
        const scale = 4; // supersample then downscale for crisp edges
        const big = size * scale;
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        const hi = document.createElement("canvas");
        hi.width = big;
        hi.height = big;
        const hctx = hi.getContext("2d");
        hctx.clearRect(0, 0, big, big);
        // Slight inset so strokes aren't clipped
        const pad = Math.round(big * 0.08);
        hctx.drawImage(img, pad, pad, big - pad * 2, big - pad * 2);
        URL.revokeObjectURL(url);

        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        out.dataset.size = String(size);
        out.id = "icon-" + size;
        const octx = out.getContext("2d");
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = "high";
        octx.clearRect(0, 0, size, size);
        octx.drawImage(hi, 0, 0, size, size);
        document.body.appendChild(out);
      }

      for (const size of sizes) await render(size);
      document.body.dataset.ready = "1";
    </script>
  </body>
</html>`;

const server = await new Promise((resolvePromise) => {
  const s = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(pageHtml);
  });
  s.listen(0, "127.0.0.1", () => resolvePromise(s));
});

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => document.body.dataset.ready === "1");

  for (const size of SIZES) {
    const dataUrl = await page.$eval(`#icon-${size}`, (canvas) => canvas.toDataURL("image/png"));
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const file = resolve(outDir, `icon${size}.png`);
    writeFileSync(file, Buffer.from(base64, "base64"));
    console.log(`Wrote ${file}`);
  }
} finally {
  await browser.close();
  server.close();
}

console.log("Generated Lucide Crosshair icons in public/icons");
