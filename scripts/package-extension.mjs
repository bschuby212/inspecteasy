import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const publicDir = resolve(root, "public");
const staging = resolve(root, ".extension-zip-staging");

if (!existsSync(dist)) {
  throw new Error("dist/ missing — run vite build first");
}

cpSync(resolve(publicDir, "manifest.json"), resolve(dist, "manifest.json"));
cpSync(resolve(publicDir, "icons"), resolve(dist, "icons"), { recursive: true });

if (existsSync(resolve(publicDir, "fonts"))) {
  cpSync(resolve(publicDir, "fonts"), resolve(dist, "fonts"), { recursive: true });
}

// Wrap files in an `extension/` folder so unzipping creates one Load unpacked folder.
if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
mkdirSync(resolve(staging, "extension"), { recursive: true });
cpSync(dist, resolve(staging, "extension"), { recursive: true });

const zipNames = ["extension.zip", "inspect-studio-extension.zip"];
for (const name of zipNames) {
  const zipPath = resolve(root, name);
  if (existsSync(zipPath)) rmSync(zipPath);
  execSync(`cd "${staging}" && zip -r "${zipPath}" extension`, { stdio: "inherit" });
}

rmSync(staging, { recursive: true, force: true });

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
writeFileSync(
  resolve(root, "dist-build-info.json"),
  JSON.stringify(
    {
      name: manifest.name,
      version: manifest.version,
      builtAt: new Date().toISOString(),
      zip: "extension.zip",
      unzipFolder: "extension",
    },
    null,
    2,
  ),
);

console.log("Packaged extension.zip (contains extension/ folder)");
