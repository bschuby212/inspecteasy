import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const publicDir = resolve(root, "public");

if (!existsSync(dist)) {
  throw new Error("dist/ missing — run vite build first");
}

cpSync(resolve(publicDir, "manifest.json"), resolve(dist, "manifest.json"));
cpSync(resolve(publicDir, "icons"), resolve(dist, "icons"), { recursive: true });

if (existsSync(resolve(publicDir, "fonts"))) {
  cpSync(resolve(publicDir, "fonts"), resolve(dist, "fonts"), { recursive: true });
}

const zipNames = ["extension.zip", "inspect-studio-extension.zip"];
for (const name of zipNames) {
  const zipPath = resolve(root, name);
  if (existsSync(zipPath)) rmSync(zipPath);
  execSync(`cd "${dist}" && zip -r "${zipPath}" .`, { stdio: "inherit" });
}

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
writeFileSync(
  resolve(root, "dist-build-info.json"),
  JSON.stringify(
    {
      name: manifest.name,
      version: manifest.version,
      builtAt: new Date().toISOString(),
      zip: "extension.zip",
    },
    null,
    2,
  ),
);

console.log("Packaged extension.zip and inspect-studio-extension.zip");
