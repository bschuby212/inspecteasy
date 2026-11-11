/**
 * Functional QA for Inspect Studio content UI without requiring --load-extension.
 * Injects a chrome.runtime mock, then loads dist/content.js into the fixture page.
 */
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

function startServer(dir) {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      try {
        const file = readFileSync(resolve(dir, `.${path}`));
        res.writeHead(200, { "Content-Type": mime[extname(path)] || "text/plain" });
        res.end(file);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      resolvePromise({ server, url: `http://127.0.0.1:${server.address().port}/` });
    });
  });
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const contentJs = readFileSync(resolve(dist, "content.js"), "utf8");
const { server, url } = await startServer(fixtureDir);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.evaluateOnNewDocument(() => {});

  // Install chrome mock in the page before evaluating content script
  await page.evaluate(() => {
    const listeners = [];
    window.chrome = {
      runtime: {
        id: "inspect-studio-test",
        onMessage: {
          addListener(fn) {
            listeners.push(fn);
          },
        },
        sendMessage(message, cb) {
          if (cb) cb({ ok: true });
          return Promise.resolve({ ok: true });
        },
        lastError: null,
      },
    };
    window.__IS_TEST_LISTENERS__ = listeners;
  });

  // Content script expects isolated-world chrome; evaluate in page as classic script
  await page.addScriptTag({ content: contentJs });
  await sleep(300);

  const apiReady = await page.evaluate(() => Boolean(window.__INSPECT_STUDIO__));
  check("Content script API boots with chrome mock", apiReady);

  await page.evaluate(() => window.__INSPECT_STUDIO__.mount());
  await page.waitForSelector("#inspect-studio-root", { timeout: 3000 });
  check("Activate mounts host", true);

  const toolbar = await page.evaluate(() =>
    Boolean(document.getElementById("inspect-studio-root")?.shadowRoot?.querySelector(".toolbar")),
  );
  check("Toolbar rendered in Shadow DOM", toolbar);

  const titleBox = await page.$eval("#title", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(titleBox.x, titleBox.y);
  await sleep(200);
  const hover = await page.evaluate(() =>
    document
      .getElementById("inspect-studio-root")
      ?.shadowRoot?.querySelector(".box.hover .box-label")
      ?.textContent?.trim(),
  );
  check("Hover highlight works", Boolean(hover), hover || "");

  await page.mouse.click(titleBox.x, titleBox.y);
  await sleep(350);
  const selected = await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const rows = [...(root?.querySelectorAll(".row") ?? [])].map((r) =>
      r.textContent?.replace(/\s+/g, " ").trim(),
    );
    return {
      label: root?.querySelector(".element-chip")?.textContent?.trim(),
      size: rows.find((r) => r?.startsWith("Size")),
      color: rows.find((r) => r?.startsWith("Color")),
      width: rows.find((r) => r?.startsWith("Width")),
      padding: rows.find((r) => r === "T" || r?.startsWith("T ")),
      sections: [...(root?.querySelectorAll(".section-title") ?? [])].map((s) => s.textContent),
    };
  });
  check("Selection updates panel", selected.label?.includes("h1"), selected.label || "");
  check("Dimensions shown", Boolean(selected.width), selected.width || "");
  check("Typography size shown", Boolean(selected.size), selected.size || "");
  check("Text color shown", Boolean(selected.color), selected.color || "");
  check(
    "Panel sections present",
    ["Element", "Layout", "Typography", "Appearance", "Edit"].every((s) =>
      selected.sections.some((x) => x?.includes(s)),
    ),
    selected.sections.join(", "),
  );

  const urlBefore = page.url();
  const linkBox = await page.$eval("#outbound", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(linkBox.x, linkBox.y);
  await sleep(300);
  check("Blocks navigation while active", page.url() === urlBefore, page.url());

  // Re-select the heading after the navigation-prevention click changed selection
  await page.mouse.click(titleBox.x, titleBox.y);
  await sleep(250);

  // Live edit
  await page.evaluate(() => {
    const input = document
      .getElementById("inspect-studio-root")
      ?.shadowRoot?.querySelector("#is-font-size");
    if (!(input instanceof HTMLInputElement)) throw new Error("missing input");
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    proto?.call(input, "48");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(200);
  let fontSize = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  if (fontSize !== "48px") {
    const handle = await page.evaluateHandle(() =>
      document.getElementById("inspect-studio-root")?.shadowRoot?.querySelector("#is-font-size"),
    );
    await handle.click({ clickCount: 3 });
    await page.keyboard.type("48");
    await sleep(250);
    fontSize = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  }
  check("Live font-size edit", fontSize === "48px", fontSize);

  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    [...(root?.querySelectorAll("button") ?? [])]
      .find((b) => b.textContent?.includes("Reset changes"))
      ?.click();
  });
  await sleep(200);
  const afterReset = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  check("Reset restores styles", afterReset !== "48px", afterReset);

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
  const measureVisible = await page.evaluate(() =>
    Boolean(
      document.getElementById("inspect-studio-root")?.shadowRoot?.querySelector(".measure-label"),
    ),
  );
  check("Alt measurement guides", measureVisible);
  await page.keyboard.up("Alt");
  await sleep(200);
  const cleared = await page.evaluate(
    () =>
      !document.getElementById("inspect-studio-root")?.shadowRoot?.querySelector(".measure-label"),
  );
  check("Measurement clears on Alt release", cleared);

  // Scroll keeps selection overlay
  await page.evaluate(() => window.scrollBy(0, 120));
  await sleep(200);
  const overlayAfterScroll = await page.evaluate(() => {
    const box = document
      .getElementById("inspect-studio-root")
      ?.shadowRoot?.querySelector(".box.selected");
    if (!box) return null;
    const top = Number.parseFloat(box.style.top);
    return { top, hasBox: true };
  });
  check("Selection overlay after scroll", Boolean(overlayAfterScroll?.hasBox), JSON.stringify(overlayAfterScroll));

  await page.screenshot({ path: resolve(outDir, "fixture-selected.png") });
  check("Screenshot saved", true, "qa-output/fixture-selected.png");

  await page.evaluate(() => window.__INSPECT_STUDIO__.unmount());
  await sleep(100);
  check(
    "Deactivate removes host",
    await page.evaluate(() => !document.getElementById("inspect-studio-root")),
  );

  await page.click("#outbound");
  await sleep(500);
  check("Inactive allows navigation", page.url().includes("example.com"), page.url());
} catch (error) {
  check("Harness", false, String(error?.stack || error));
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
