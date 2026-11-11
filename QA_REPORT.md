# Inspect Studio QA report

Date: 2026-11-10 (America/New_York)

## Build verification

| Check | Result |
| --- | --- |
| `npm install` | Pass |
| `npm run build` (`tsc` + Vite + zip) | Pass |
| `dist/` contains manifest, background.js, content.js, icons | Pass |
| `inspect-studio-extension.zip` generated | Pass |

## Automated functional QA

Harness: `node scripts/qa-content-harness.mjs`  
(Injects built `content.js` with a `chrome.runtime` mock — validates inspector UI/behavior. Real icon toggle uses the same bundle via `chrome.scripting`.)

| Requirement | Result |
| --- | --- |
| Activate mounts floating toolbar | Pass |
| Shadow DOM isolation | Pass |
| Hover highlight + label | Pass |
| Click selects element and updates panel | Pass |
| Typography / color / dimensions shown | Pass |
| Design panel sections present | Pass |
| Clicks do not navigate while active | Pass |
| Live font-size edit | Pass |
| Reset restores original styles | Pass |
| Alt measurement guides | Pass |
| Measurement clears on Alt release | Pass |
| Selection overlay tracks scroll | Pass |
| Deactivate removes overlays | Pass |
| Inactive page interactions restored | Pass |

Unit helpers: `node scripts/qa-unit.mjs` — 5/5 pass.

## Multi-site smoke

Harness: `node scripts/qa-multisite.mjs`

| Site | Result |
| --- | --- |
| Local fixture (`test-fixture/`) | Pass |
| example.com (simple static) | Pass |
| Wikipedia Design article (content-heavy) | Pass |
| css-tricks.com (modern interactive) | Pass |

Screenshots saved under `qa-output/`.

## Visual review notes

- Toolbar is compact, pill-shaped, with clear active states
- Design panel ~320px with section hierarchy and copy affordances
- Blue selection/hover overlays are restrained; measurement labels use a distinct rose accent
- Long values truncate with ellipsis; panel scrolls independently
- Toast confirms reset

## Known limitations (verified / documented)

- Chrome internal pages and the Web Store are unsupported (badge `!`)
- Cross-origin iframes are not inspectable from the parent document
- Closed shadow roots in the host page may not be selectable
- Page CSP can block *page-world* script tags; the real extension injection path is not subject to that limitation
- Google Chrome automation cannot use `--load-extension` in this environment; unpacked install via `chrome://extensions` is the supported path

## Demo video

`inspect-studio-demo.mp4` (~12s) shows the real built inspector UI on the local fixture: activate, hover, select, properties, copy, Alt measurement, live edit, reset, and close.

Limitation: this VM’s Google Chrome ignores `--load-extension`, so the recording drives `dist/content.js` directly (same bundle the extension injects) rather than clicking the toolbar icon after Load unpacked. To record the icon path locally: Load unpacked → open a site → click Inspect Studio → perform the same steps → save as `inspect-studio-demo.mp4`.
