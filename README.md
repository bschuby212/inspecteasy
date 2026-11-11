# Inspect Studio

A designer-friendly Chrome extension for inspecting websites visually — inspired by Figma’s selection and design panel, without opening DevTools.

## Features (MVP)

- Toggle Inspect Studio from the extension icon (off by default)
- Hover highlight and click-to-select with element labels
- Figma-like Design panel: dimensions, spacing, typography, appearance
- One-click copy for property values
- Alt/Option spacing measurement between two elements
- Temporary live edits (font size, colors, radius, padding) with reset
- Pin design comments (“why this is off”) on selected elements, with a toolbar toggle to show/hide pins
- Shadow DOM UI isolation so page styles do not leak into the inspector

All inspection stays local in the browser. No analytics, accounts, or network transmission of page content.

## Requirements

- Google Chrome (Manifest V3)
- Node.js 20+ (only required to build from source)

## Install from source

```bash
npm install
npm run build
```

Then load the unpacked extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder in this repository
5. Pin **Inspect Studio** to the Chrome toolbar
6. Open any ordinary HTTP/HTTPS website and click the extension icon to activate

A portable ZIP is also generated at `inspect-studio-extension.zip` (contents of `dist`).

## Usage

| Action | How |
| --- | --- |
| Activate / deactivate | Click the extension icon |
| Select an element | Click while Inspect Studio is active |
| Pause selection | `Esc` (pointer tool resumes) |
| Measure spacing | Select an element, hold `Alt`/`Option`, hover another |
| Hide / show panel | Eye button in the toolbar |
| Flag an issue | Select an element → **Flag issue** in the Design panel → write why → Pin comment |
| Show / hide comments | Message icon in the toolbar |
| Reset edits | Reset button in the Design panel |
| Close | Toolbar ✕ or deactivate via the extension icon |

Comments are stored locally in the browser for that page URL (not synced to the cloud).

Refreshing the page always restores the original site styles.

## Development

```bash
npm run build      # typecheck, bundle into dist/, zip package
npm run typecheck  # TypeScript only
npm run icons      # regenerate toolbar icons
node scripts/qa-unit.mjs
node scripts/qa-content-harness.mjs
node scripts/qa-multisite.mjs
```

### Project layout

```
src/
  background/     # MV3 service worker (toggle + injection)
  content/        # content script, selection, measure, edit, React UI
  shared/         # types and formatting helpers
public/
  manifest.json
  icons/
dist/             # installable extension output
test-fixture/     # local nested layout/forms QA page
```

## Privacy

- Uses `activeTab`, `scripting`, and `storage` only
- Injects on user gesture (extension icon), not on every page load
- Does not read cookies, passwords, or hidden form values
- Does not send inspected data anywhere

## Known limitations

- Cannot run on Chrome internal pages (`chrome://`, Web Store, etc.)
- Cross-origin iframes are not inspectable from the parent page
- Closed shadow roots inside the host page may not be selectable
- CSS transforms can make measurement overlays approximate
- Measurement shows gap distance; overlapping elements intentionally hide misleading distances

## License

MIT
