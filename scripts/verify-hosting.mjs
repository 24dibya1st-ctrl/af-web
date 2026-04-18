#!/usr/bin/env node
/**
 * Fails fast if static files required for Firebase Hosting are missing
 * (avoids "deploy succeeded" but site 404 from empty/wrong directory).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const required = [
  "index.html",
  "login.html",
  "firebase-setup.html",
  "app.js",
  "auth.js",
  "firebase.js",
  "firebase-config-constants.js",
  "firebase-setup.js",
  "ai.js",
  "style.css",
];

const config = JSON.parse(readFileSync(join(root, "firebase.json"), "utf8"));
const publicDir = config?.hosting?.public || ".";
const publicPath = publicDir === "." ? root : join(root, publicDir);
const site = config?.hosting?.site || "(default)";

let bad = false;
for (const f of required) {
  const p = join(publicPath, f);
  try {
    if (!statSync(p).isFile()) {
      throw new Error("not a file");
    }
  } catch {
    console.error(`[verify-hosting] MISSING: ${f} (public: ${publicDir})`);
    bad = true;
  }
}

try {
  const listing = readdirSync(publicPath);
  const htmlCount = listing.filter((n) => n.endsWith(".html")).length;
  console.log(`[verify-hosting] OK — site="${site}", public="${publicDir}", ${htmlCount} HTML file(s)`);
} catch (e) {
  console.error("[verify-hosting] Cannot read public directory:", publicPath, e.message);
  process.exit(1);
}

if (bad) {
  console.error("[verify-hosting] Fix missing files before deploy.");
  process.exit(1);
}
