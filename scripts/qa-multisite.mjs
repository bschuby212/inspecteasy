/**
 * Smoke-test Inspect Studio content UI against multiple public pages + local fixture.
 */
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentJs = readFileSync(resolve(root, "dist/content.js"), "utf8");
const outDir = resolve(root, "qa-output");
mkdirSync(outDir, { recursive: true });

function startFixture() {
  const fixtureDir = resolve(root, "test-fixture");
  const mime = { ".html": "text/html" };
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      try {
        const file = readFileSync(resolve(fixtureDir, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(file);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      resolvePromise({ server, url: `http://127.0.0.1:${server.address().port}/` });
    });
  });
}

async function inject(page) {
  await page.evaluate(() => {
    window.chrome = {
      runtime: {
        id: "inspect-studio-test",
        onMessage: { addListener() {} },
        sendMessage() {
          return Promise.resolve({ ok: true });
        },
        lastError: null,
      },
    };
  });
  await page.addScriptTag({ content: contentJs });
  await sleep(200);
  await page.evaluate(() => window.__INSPECT_STUDIO__.mount());
  await page.waitForSelector("#inspect-studio-root", { timeout: 5000 });
}

async function smoke(page, name) {
  // Click near top-left content area
  await page.mouse.move(240, 220);
  await sleep(150);
  await page.mouse.click(240, 220);
  await sleep(350);
  const data = await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    return {
      toolbar: Boolean(root?.querySelector(".toolbar")),
      chip: root?.querySelector(".element-chip")?.textContent?.trim() ?? null,
      rows: [...(root?.querySelectorAll(".row") ?? [])].length,
    };
  });
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  await page.evaluate(() => window.__INSPECT_STUDIO__.unmount());
  return data;
}

const results = [];
const { server, url: fixtureUrl } = await startFixture();
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
});

const sites = [
  { name: "fixture", url: fixtureUrl },
  { name: "example-com", url: "https://example.com/" },
  { name: "wikipedia", url: "https://en.wikipedia.org/wiki/Design" },
  { name: "css-tricks", url: "https://css-tricks.com/" },
];

try {
  for (const site of sites) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    try {
      await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await inject(page);
      const data = await smoke(page, site.name);
      const ok = data.toolbar && data.rows > 0 && Boolean(data.chip);
      results.push({ site: site.name, ok, ...data });
      console.log(`${ok ? "PASS" : "FAIL"}  ${site.name} — ${data.chip || "no selection"} (${data.rows} rows)`);
    } catch (error) {
      results.push({ site: site.name, ok: false, error: String(error) });
      console.log(`FAIL  ${site.name} — ${error}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

writeFileSync(resolve(outDir, "qa-multisite.json"), JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
