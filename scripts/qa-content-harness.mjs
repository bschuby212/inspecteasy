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
    const val = (sel) => root?.querySelector(sel)?.value ?? null;
    return {
      label: root?.querySelector(".element-chip")?.textContent?.trim(),
      width: val("#is-width"),
      size: val("#is-font-size"),
      color: val("#is-color"),
      padT: Boolean(root?.querySelector("#is-pad-t")),
      sections: [...(root?.querySelectorAll(".section-title") ?? [])].map((s) => s.textContent),
    };
  });
  check("Selection updates panel", selected.label?.includes("h1"), selected.label || "");
  check("Dimensions editable", Boolean(selected.width), selected.width || "");
  check("Typography size editable", Boolean(selected.size), selected.size || "");
  check("Text color editable", Boolean(selected.color), selected.color || "");
  check("Spacing controls present", selected.padT);
  check(
    "Panel sections present",
    ["Frame", "Spacing", "Typography", "Fill", "Effects"].every((s) =>
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

  // Figma-like spacing / radius / fill / shadow edits
  async function setInput(sel, value) {
    await page.evaluate(
      ({ sel, value }) => {
        const input = document
          .getElementById("inspect-studio-root")
          ?.shadowRoot?.querySelector(sel);
        if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLSelectElement)) {
          throw new Error(`missing ${sel}`);
        }
        const proto = Object.getOwnPropertyDescriptor(
          input instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype,
          "value",
        )?.set;
        proto?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      { sel, value },
    );
    await sleep(120);
  }

  await setInput("#is-pad-t", "32");
  const padTop = await page.$eval("#title", (el) => getComputedStyle(el).paddingTop);
  check("Live padding edit", padTop === "32px", padTop);

  await setInput("#is-radius", "20");
  const radius = await page.$eval("#title", (el) => getComputedStyle(el).borderTopLeftRadius);
  check("Live radius edit", radius === "20px", radius);

  await setInput("#is-bg", "#112233");
  // color input may need direct onChange via React - also try fill hex sibling
  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const hex = root?.querySelector("#is-bg")?.parentElement?.querySelector(".fig-hex");
    if (!(hex instanceof HTMLInputElement)) return;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    proto?.call(hex, "#112233");
    hex.dispatchEvent(new Event("input", { bubbles: true }));
    hex.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(150);
  const bg = await page.$eval("#title", (el) => getComputedStyle(el).backgroundColor);
  check("Live fill color edit", bg.includes("17, 34, 51") || bg === "rgb(17, 34, 51)", bg);

  await setInput("#is-shadow-preset", "0px 4px 12px 0px #00000026");
  const shadow = await page.$eval("#title", (el) => getComputedStyle(el).boxShadow);
  check("Live shadow edit", shadow !== "none", shadow);

  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    [...(root?.querySelectorAll("button") ?? [])]
      .find((b) => (b.textContent || "").trim() === "Reset")
      ?.click();
  });
  await sleep(200);
  const afterReset = await page.$eval("#title", (el) => getComputedStyle(el).fontSize);
  const padAfter = await page.$eval("#title", (el) => getComputedStyle(el).paddingTop);
  check("Reset restores styles", afterReset !== "48px" && padAfter !== "32px", `${afterReset}/${padAfter}`);

  // Flag / comment
  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const btn = [...(root?.querySelectorAll("button") ?? [])].find((b) =>
      b.textContent?.includes("Flag issue"),
    );
    btn?.click();
  });
  await sleep(200);
  const composerOpen = await page.evaluate(() =>
    Boolean(
      document
        .getElementById("inspect-studio-root")
        ?.shadowRoot?.querySelector(".comment-composer"),
    ),
  );
  check("Flag opens comment composer", composerOpen);

  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const area = root?.querySelector("#is-comment-note");
    if (!(area instanceof HTMLTextAreaElement)) throw new Error("missing textarea");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(area, "Spacing feels too tight next to Secondary");
    area.dispatchEvent(new Event("input", { bubbles: true }));
    area.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(100);
  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    [...(root?.querySelectorAll("button") ?? [])]
      .find((b) => b.textContent?.includes("Pin comment"))
      ?.click();
  });
  await sleep(250);
  const pinVisible = await page.evaluate(() =>
    Boolean(
      document
        .getElementById("inspect-studio-root")
        ?.shadowRoot?.querySelector(".comment-pin-btn"),
    ),
  );
  check("Pinned comment marker appears", pinVisible);

  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const toggle = [...(root?.querySelectorAll(".toolbar-btn") ?? [])].find(
      (b) => b.getAttribute("aria-label")?.includes("comments"),
    );
    toggle?.click();
  });
  await sleep(150);
  const pinsHidden = await page.evaluate(() => {
    const layer = document
      .getElementById("inspect-studio-root")
      ?.shadowRoot?.querySelector(".comment-layer");
    return Boolean(layer?.classList.contains("is-hidden"));
  });
  check("Toolbar toggles comments off", pinsHidden);

  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const toggle = [...(root?.querySelectorAll(".toolbar-btn") ?? [])].find(
      (b) => b.getAttribute("aria-label")?.includes("comments"),
    );
    toggle?.click();
  });
  await sleep(150);
  const pinsShown = await page.evaluate(() => {
    const layer = document
      .getElementById("inspect-studio-root")
      ?.shadowRoot?.querySelector(".comment-layer");
    return Boolean(layer && !layer.classList.contains("is-hidden"));
  });
  check("Toolbar toggles comments on", pinsShown);

  // Measurement — Alt+hover in select mode
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

  // Measurement — dedicated Measure mode (no Alt required)
  await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    const measureBtn = [...(root?.querySelectorAll(".toolbar-btn") ?? [])].find(
      (b) => b.getAttribute("aria-label") === "Measure tool",
    );
    measureBtn?.click();
  });
  await sleep(150);
  await page.mouse.click(cta.x, cta.y);
  await sleep(150);
  await page.mouse.move(ghost.x, ghost.y);
  await sleep(300);
  const measureModeVisible = await page.evaluate(() => {
    const root = document.getElementById("inspect-studio-root")?.shadowRoot;
    return Boolean(root?.querySelector(".measure-label") && root?.querySelector(".measure-layer"));
  });
  check("Measure mode guides without Alt", measureModeVisible);

  // Nested insets: left card → flex chip (avoids sticky nav + right-side panel)
  await page.evaluate(() =>
    document.querySelector("#cards")?.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  await sleep(150);
  const cardPt = await page.$eval("#cards", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + 16, y: r.top + 16 };
  });
  const chipPt = await page.$eval("#cards .chip", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(cardPt.x, cardPt.y);
  await sleep(150);
  await page.mouse.move(chipPt.x, chipPt.y);
  await sleep(300);
  const nestedLabelCount = await page.evaluate(
    () =>
      document
        .getElementById("inspect-studio-root")
        ?.shadowRoot?.querySelectorAll(".measure-label").length ?? 0,
  );
  check("Nested inset guides (>=2 labels)", nestedLabelCount >= 2);

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
