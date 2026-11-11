import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const extId = readFileSync(resolve(root, ".extension-id"), "utf8").trim();
const profile = resolve("/tmp/inspect-studio-chrome-profile");
const port = Number(process.env.CDP_PORT || 9335);

if (existsSync(profile)) rmSync(profile, { recursive: true, force: true });
mkdirSync(resolve(profile, "Default"), { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
const settings = {
  [extId]: {
    account_extension_type: 0,
    active_permissions: {
      api: ["activeTab", "scripting", "storage"],
      explicit_host: [],
      manifest_permissions: [],
      scriptable_host: [],
    },
    commands: {},
    content_settings: [],
    creation_flags: 1,
    disable_reasons: [],
    from_webstore: false,
    granted_permissions: {
      api: ["activeTab", "scripting", "storage"],
      explicit_host: [],
      manifest_permissions: [],
      scriptable_host: [],
    },
    incognito_content_settings: [],
    incognito_preferences: {},
    last_update_time: String(Date.now()),
    location: 4,
    manifest,
    path: dist,
    preferences: {},
    was_installed_by_default: false,
    was_installed_by_oem: false,
    withholding_permissions: false,
    state: 1,
  },
};

writeFileSync(
  resolve(profile, "Default/Preferences"),
  JSON.stringify({
    extensions: { settings, ui: { developer_mode: true } },
    browser: { has_seen_welcome_page: true },
  }),
);

const child = spawn(
  "xvfb-run",
  [
    "-a",
    "google-chrome-stable",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "inherit", "inherit"], detached: true },
);

writeFileSync(
  resolve(root, "qa-output/chrome-launch.json"),
  JSON.stringify({ pid: child.pid, port, extId, profile }, null, 2),
);
child.unref();
console.log(JSON.stringify({ pid: child.pid, port, extId }));
