/**
 * Records inspect-studio-demo.mp4 by driving the real built content UI
 * against the local fixture (same React inspector shipped in dist/content.js).
 */
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const framesDir = resolve(root, "qa-output/demo-frames");
const contentJs = readFileSync(resolve(root, "dist/content.js"), "utf8");
const fixture = readFileSync(resolve(root, "test-fixture/index.html"));

if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
mkdirSync(framesDir, { recursive: true });

const server = await new Promise((resolvePromise) => {
  const s = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fixture);
  });
  s.listen(0, "127.0.0.1", () => resolvePromise(s));
});
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  window.chrome = {
    runtime: {
      id: "inspect-studio-demo",
      onMessage: { addListener() {} },
      sendMessage() {
        return Promise.resolve({ ok: true });
      },
      lastError: null,
    },
  };
});
await page.addScriptTag({ content: contentJs });
await sleep(300);

let frame = 0;
async function shot(label) {
  frame += 1;
  const path = resolve(framesDir, `frame-${String(frame).padStart(3, "0")}.png`);
  await page.screenshot({ path });
  console.log(`frame ${frame}: ${label}`);
  return path;
}

// 1. Open site
await shot("site open");
await sleep(400);

// 2. Activate
await page.evaluate(() => window.__INSPECT_STUDIO__.mount());
await page.waitForSelector("#inspect-studio-root");
await sleep(400);
await shot("activated toolbar");

// 3. Hover several elements
for (const sel of ["nav a", "#title", ".lead", "#cta", "button.ghost"]) {
  const box = await page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y, { steps: 8 });
  await sleep(350);
  await shot(`hover ${sel}`);
}

// 4. Select heading
const title = await page.$eval("#title", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(title.x, title.y);
await sleep(500);
await shot("selected heading + panel");

// 5. Scroll panel sections by selecting button and viewing props
const cta = await page.$eval("#cta", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(cta.x, cta.y);
await sleep(450);
await shot("selected button properties");

// 6. Copy a property
await page.evaluate(() => {
  const root = document.getElementById("inspect-studio-root")?.shadowRoot;
  root?.querySelector(".copy-btn")?.click();
});
await sleep(400);
await shot("copied property");

// 7. Measure — Alt+hover
const ghost = await page.$eval("button.ghost", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.keyboard.down("Alt");
await page.mouse.move(ghost.x, ghost.y, { steps: 10 });
await sleep(500);
await shot("alt measurement guides");
await page.keyboard.up("Alt");
await sleep(300);

// 7b. Measure mode (toolbar) + nested insets
await page.evaluate(() => {
  const root = document.getElementById("inspect-studio-root")?.shadowRoot;
  const measureBtn = [...(root?.querySelectorAll(".toolbar-btn") ?? [])].find(
    (b) => b.getAttribute("aria-label") === "Measure tool",
  );
  measureBtn?.click();
});
await sleep(300);
await page.evaluate(() =>
  document.querySelector("#cards")?.scrollIntoView({ block: "center", inline: "nearest" }),
);
await sleep(200);
const card = await page.$eval("#cards", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + 16, y: r.top + 16 };
});
await page.mouse.click(card.x, card.y);
await sleep(350);
await shot("measure mode base set");
const chip = await page.$eval("#cards .chip", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(chip.x, chip.y, { steps: 12 });
await sleep(550);
await shot("nested inset guides");
await page.evaluate(() => {
  const root = document.getElementById("inspect-studio-root")?.shadowRoot;
  const selectBtn = [...(root?.querySelectorAll(".toolbar-btn") ?? [])].find(
    (b) => b.getAttribute("aria-label") === "Select tool",
  );
  selectBtn?.click();
});
await sleep(250);
await page.mouse.click(cta.x, cta.y);
await sleep(400);

// 8. Edit
await page.evaluate(() => {
  const input = document
    .getElementById("inspect-studio-root")
    ?.shadowRoot?.querySelector("#is-font-size");
  if (!(input instanceof HTMLInputElement)) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, "28");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
await sleep(500);
await shot("live edit font size");

// 9. Reset
await page.evaluate(() => {
  const root = document.getElementById("inspect-studio-root")?.shadowRoot;
  [...(root?.querySelectorAll("button") ?? [])]
    .find((b) => b.textContent?.includes("Reset changes"))
    ?.click();
});
await sleep(500);
await shot("reset changes");

// 10. Close
await page.evaluate(() => window.__INSPECT_STUDIO__.unmount());
await sleep(400);
await shot("closed inspector");

await browser.close();
server.close();

const outMp4 = resolve(root, "inspect-studio-demo.mp4");
const artifactMp4 = "/opt/cursor/artifacts/inspect-studio-demo.mp4";
if (existsSync(outMp4)) rmSync(outMp4);

await new Promise((resolvePromise, reject) => {
  const ff = spawn(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "1.2",
      "-i",
      resolve(framesDir, "frame-%03d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      outMp4,
    ],
    { stdio: "inherit" },
  );
  ff.on("exit", (code) => (code === 0 ? resolvePromise() : reject(new Error(`ffmpeg ${code}`))));
});

writeFileSync(artifactMp4, readFileSync(outMp4));
console.log(
  `Wrote ${outMp4} (${readdirSync(framesDir).length} frames) and ${artifactMp4}`,
);
