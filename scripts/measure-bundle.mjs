/**
 * Bundle-size fitness function.
 *
 * After `npm run build`, this script reports how much JavaScript the browser
 * must download before each page becomes interactive ("first-load JS"). It is
 * the shared framework runtime plus the route's own entry chunks, de-duplicated
 * and gzip-compressed (roughly what goes over the wire).
 *
 * Next.js 16 no longer prints these numbers, so we read them from the build
 * manifests. Use it to catch pages that quietly grow too heavy.
 *
 * Usage:
 *   node scripts/measure-bundle.mjs            # print a table
 *   node scripts/measure-bundle.mjs --json     # machine-readable output
 *   node scripts/measure-bundle.mjs --budget 200  # exit 1 if any route > 200 KB gz
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const NEXT_DIR = ".next";
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const budgetIndex = args.indexOf("--budget");
const budgetKb = budgetIndex >= 0 ? Number(args[budgetIndex + 1]) : null;

if (!existsSync(join(NEXT_DIR, "build-manifest.json"))) {
  console.error("No .next build found. Run `npm run build` first.");
  process.exit(1);
}

// Cache gzip sizes so shared chunks are only compressed once.
const gzCache = new Map();
function gzipKb(file) {
  if (!gzCache.has(file)) {
    const path = join(NEXT_DIR, file);
    gzCache.set(file, existsSync(path) ? gzipSync(readFileSync(path)).length / 1024 : 0);
  }
  return gzCache.get(file);
}

// Framework runtime every page loads (React, Next router, polyfills).
const buildManifest = JSON.parse(readFileSync(join(NEXT_DIR, "build-manifest.json"), "utf8"));
const sharedFiles = [...(buildManifest.rootMainFiles ?? []), ...(buildManifest.polyfillFiles ?? [])];

// Walk every page's client-reference manifest to find its entry chunks.
function findManifests(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findManifests(full));
    else if (name === "page_client-reference-manifest.js") out.push(full);
  }
  return out;
}

const appDir = join(NEXT_DIR, "server", "app");
const rows = [];
for (const manifestPath of findManifests(appDir)) {
  // The manifest is a tiny script that assigns to globalThis.__RSC_MANIFEST.
  const sandbox = { globalThis: {} };
  vm.runInNewContext(readFileSync(manifestPath, "utf8"), sandbox);
  const manifests = sandbox.globalThis.__RSC_MANIFEST ?? {};

  for (const [key, manifest] of Object.entries(manifests)) {
    const entryFiles = manifest.entryJSFiles ?? {};
    const pageEntry = Object.keys(entryFiles).find((k) => k.endsWith(`${key}`) || k.endsWith(`/app${key}`));
    if (!pageEntry) continue;

    const files = new Set([...sharedFiles, ...entryFiles[pageEntry]]);
    const totalKb = [...files].reduce((sum, f) => sum + gzipKb(f), 0);
    const routeOnlyKb = entryFiles[pageEntry]
      .filter((f) => !sharedFiles.includes(f))
      .reduce((sum, f) => sum + gzipKb(f), 0);

    // "/(root)/habits/[id]/page" -> "/habits/[id]"
    const route = key.replace(/\/page$/, "").replace(/\/\([^)]+\)/g, "") || "/";
    rows.push({ route, firstLoadKb: +totalKb.toFixed(1), routeKb: +routeOnlyKb.toFixed(1) });
  }
}

rows.sort((a, b) => b.firstLoadKb - a.firstLoadKb);
const sharedKb = +sharedFiles.reduce((s, f) => s + gzipKb(f), 0).toFixed(1);

if (asJson) {
  console.log(JSON.stringify({ sharedKb, routes: rows }, null, 2));
} else {
  console.log(`Shared framework JS (gz): ${sharedKb} KB`);
  console.log("Route".padEnd(24) + "First-load (gz KB)".padStart(20) + "Route-specific".padStart(18));
  for (const r of rows) {
    console.log(r.route.padEnd(24) + String(r.firstLoadKb).padStart(20) + String(r.routeKb).padStart(18));
  }
}

if (budgetKb !== null) {
  const over = rows.filter((r) => r.firstLoadKb > budgetKb);
  if (over.length > 0) {
    console.error(`\n${over.length} route(s) exceed the ${budgetKb} KB budget: ${over.map((r) => r.route).join(", ")}`);
    process.exit(1);
  }
}
