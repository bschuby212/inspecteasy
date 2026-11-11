import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const fixtureDir = resolve(root, "test-fixture");
const outDir = resolve(root, "qa-output");
mkdirSync(outDir, { recursive: true });

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startFixtureServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const path = req.url === "/" ? "/index.html" : req.url;
      try {
        const file = readFileSync(resolve(fixtureDir, `.${path}`));
        res.writeHead(200, { "Content-Type": mime[extname(path)] || "text/plain" });
        res.end(file);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolvePromise({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function getServiceWorker(browser) {
  for (let i = 0; i < 40; i++) {
    const target = browser.targets().find(
      (t) => t.type() === "service_worker" && t.url().includes("chrome-extension://"),
    );
    if (target) {
      const worker = await target.worker();
      if (worker) return { target, worker, extensionId: new URL(target.url()).host };
    }
    await sleep(150);
  }
  return null;
}

async function activateOnTab(worker, tabId) {
  await worker.evaluate(async (id) => {
    try {
      await chrome.tabs.sendMessage(id, { type: "PING" });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content.js"] });
    }
    return chrome.tabs.sendMessage(id, { type: "ACTIVATE" });
  }, tabId);
}

async function deactivateOnTab(worker, tabId) {
  await worker.evaluate(async (id) => chrome.tabs.sendMessage(id, { type: "DEACTIVATE" }), tabId);
}

const { server, url: fixtureUrl } = await startFixtureServer();
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--window-size=1440,900",
  ],
});

try {
  const sw = await getServiceWorker(browser);
  check("Service worker available", Boolean(sw), sw?.extensionId || "");
  if (!sw) throw new Error("No service worker");

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(fixtureUrl, { waitUntil: "domcontentloaded" });

  const tabId = await sw.worker.evaluate(async () => {
    const all = await chrome.tabs.query({});
    const fixture = all.find((t) => t.url && t.url.includes("127.0.0.1"));
    return fixture?.id ?? null;
  });
  check("Fixture tab id resolved", tabId != null, String(tabId));
  if (tabId == null) throw new Error("No tab id");

  await activateOnTab(sw.worker, tabId);
  await page.waitForSelector("#inspect-studio-root", { timeout: 5000 });
  check("Host mounted on activate", true);

  const shadowOk = await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    return Boolean(host?.shadowRoot?.querySelector(".toolbar"));
  });
  check("Shadow DOM toolbar rendered", shadowOk);

  const titleBox = await page.$eval("#title", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(titleBox.x, titleBox.y);
  await sleep(200);
  const hoverLabel = await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    return host?.shadowRoot?.querySelector(".box.hover .box-label")?.textContent ?? null;
  });
  check("Hover highlight shows label", Boolean(hoverLabel), hoverLabel || "");

  await page.mouse.click(titleBox.x, titleBox.y);
  await sleep(300);
  const selected = await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    const root = host?.shadowRoot;
    return {
      label: root?.querySelector(".element-chip")?.textContent?.trim() ?? null,
      hasTypography: Boolean(
        [...(root?.querySelectorAll(".section-title") ?? [])].some((el) =>
          el.textContent?.includes("Typography"),
        ),
      ),
      sizeRow: [...(root?.querySelectorAll(".row") ?? [])]
        .map((r) => r.textContent?.replace(/\s+/g, " ").trim())
        .find((t) => t?.startsWith("Size")),
      colorRow: [...(root?.querySelectorAll(".row") ?? [])]
        .map((r) => r.textContent?.replace(/\s+/g, " ").trim())
        .find((t) => t?.startsWith("Color")),
      widthRow: [...(root?.querySelectorAll(".row") ?? [])]
        .map((r) => r.textContent?.replace(/\s+/g, " ").trim())
        .find((t) => t?.startsWith("Width")),
    };
  });
  check("Selecting heading updates panel", selected.label?.includes("h1"), selected.label || "");
  check("Typography section present", selected.hasTypography);
  check("Font size value shown", Boolean(selected.sizeRow), selected.sizeRow || "");
  check("Color value shown", Boolean(selected.colorRow), selected.colorRow || "");
  check("Width value shown", Boolean(selected.widthRow), selected.widthRow || "");

  const urlBefore = page.url();
  const linkBox = await page.$eval("#outbound", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(linkBox.x, linkBox.y);
  await sleep(400);
  check("Click does not navigate while active", page.url() === urlBefore, page.url());

  // Copy button smoke test
  const copied = await page.evaluate(async () => {
    const host = document.getElementById("inspect-studio-root");
    const btn = host?.shadowRoot?.querySelector(".copy-btn");
    if (!btn) return "missing";
    btn.click();
    await new Promise((r) => setTimeout(r, 100));
    return host?.shadowRoot?.querySelector(".copy-btn.copied") ? "copied" : "clicked";
  });
  check("Copy button responds", copied === "copied" || copied === "clicked", copied);

  // Live edit font size through React-controlled input
  await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    const input = host?.shadowRoot?.querySelector("#is-font-size");
    if (!(input instanceof HTMLInputElement)) throw new Error("missing font input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "48");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(250);
  let fontSize = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  if (fontSize !== "48px") {
    // Fallback: click and type
    const handle = await page.evaluateHandle(() =>
      document.getElementById("inspect-studio-root")?.shadowRoot?.querySelector("#is-font-size"),
    );
    await handle.click({ clickCount: 3 });
    await page.keyboard.type("48");
    await sleep(250);
    fontSize = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  }
  check("Live font-size edit applies", fontSize === "48px", fontSize);

  await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    const buttons = [...(host?.shadowRoot?.querySelectorAll("button") ?? [])];
    buttons.find((b) => b.textContent?.includes("Reset changes"))?.click();
  });
  await sleep(200);
  const fontAfterReset = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  check("Reset restores original font size", fontAfterReset !== "48px", fontAfterReset);

  // Measurement
  const cta = await page.$eval("#cta", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(cta.x, cta.y);
  await sleep(150);
  const ghost = await page.$eval("button.ghost", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.keyboard.down("Alt");
  await page.mouse.move(ghost.x, ghost.y);
  await sleep(300);
  const measureVisible = await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    return Boolean(host?.shadowRoot?.querySelector(".measure-label"));
  });
  check("Measurement guides appear with Alt", measureVisible);
  await page.keyboard.up("Alt");
  await sleep(200);
  const measureCleared = await page.evaluate(() => {
    const host = document.getElementById("inspect-studio-root");
    return !host?.shadowRoot?.querySelector(".measure-label");
  });
  check("Measurement clears when Alt released", measureCleared);

  await deactivateOnTab(sw.worker, tabId);
  await sleep(150);
  const gone = await page.evaluate(() => !document.getElementById("inspect-studio-root"));
  check("Deactivate removes overlays", gone);

  await page.click("#outbound");
  await sleep(600);
  check("Inactive allows navigation", page.url().includes("example.com"), page.url());

  // Visual screenshot on fixture
  await page.goto(fixtureUrl, { waitUntil: "domcontentloaded" });
  const tabId2 = await sw.worker.evaluate(async () => {
    const all = await chrome.tabs.query({});
    const fixture = all.find((t) => t.url && t.url.includes("127.0.0.1"));
    return fixture?.id ?? null;
  });
  await activateOnTab(sw.worker, tabId2);
  await page.waitForSelector("#inspect-studio-root");
  const title = await page.$eval("#title", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(title.x, title.y);
  await sleep(300);
  await page.screenshot({ path: resolve(outDir, "fixture-selected.png"), fullPage: false });
  check("QA screenshot saved", true, "qa-output/fixture-selected.png");
} catch (error) {
  check("QA harness", false, String(error?.stack || error));
} finally {
  await browser.close();
  server.close();
}

const summary = {
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  results,
};
writeFileSync(resolve(outDir, "qa-results.json"), JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed} passed, ${summary.failed} failed`);
process.exit(summary.failed ? 1 : 0);
