import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9335",
  defaultViewport: null,
});
const page = await browser.newPage();
await page.goto("chrome://extensions/", { waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 1500));
const info = await page.evaluate(() => {
  const mgr = document.querySelector("extensions-manager");
  if (!mgr?.shadowRoot) return { error: "no manager" };
  const list = mgr.shadowRoot.querySelector("extensions-item-list");
  if (!list?.shadowRoot) {
    return { error: "no list", html: mgr.shadowRoot.innerHTML.slice(0, 800) };
  }
  const items = [...list.shadowRoot.querySelectorAll("extensions-item")];
  return items.map((item) => {
    const sr = item.shadowRoot;
    return {
      id: item.getAttribute("id"),
      name: sr?.querySelector("#name")?.textContent?.trim(),
      errors: sr?.querySelector("#errors-button")?.textContent?.trim(),
      enabled: sr?.querySelector("#enableToggle")?.ariaPressed || sr?.querySelector("#enableToggle")?.checked,
      card: sr?.textContent?.replace(/\s+/g, " ").trim().slice(0, 400),
    };
  });
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "/workspace/qa-output/chrome-extensions-page.png" });
await browser.disconnect();
