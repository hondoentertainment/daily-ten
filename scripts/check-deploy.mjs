#!/usr/bin/env node
/**
 * Sanity-check Vite/Supabase env before a production-like build.
 * Usage: load vars then run, e.g. `node --env-file=web/.env scripts/check-deploy.mjs` (Node 20+)
 * or paste Vercel env into web/.env temporarily.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "web", ".env");

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadDotEnv(envPath);

const url = process.env.VITE_SUPABASE_URL?.trim();
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const site = process.env.VITE_SITE_URL?.trim();

let ok = true;
if (!url) {
  console.error("Missing VITE_SUPABASE_URL (set in Vercel + web/.env for local check).");
  ok = false;
} else if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(url.replace(/\/$/, ""))) {
  console.warn("VITE_SUPABASE_URL should look like https://<ref>.supabase.co");
}

if (!anon) {
  console.error("Missing VITE_SUPABASE_ANON_KEY.");
  ok = false;
} else if (anon.length < 20) {
  console.warn("VITE_SUPABASE_ANON_KEY looks too short — double-check.");
}

if (ok) {
  console.log("Vercel/Vite web env: OK (Supabase URL + anon key present).");
} else {
  console.error(`\nTip: copy Production env from Vercel into ${path.relative(root, envPath)} and re-run.`);
  process.exit(1);
}

if (site) {
  console.log(`VITE_SITE_URL set → canonical/og:url will use: ${site.replace(/\/$/, "")}/`);
} else {
  console.log(
    "VITE_SITE_URL unset → on Vercel, build will use VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (see web/vite.config.ts).",
  );
}

console.log("\nManual Supabase Dashboard (cannot be checked from this script):");
console.log("  • Auth → URL configuration: Site URL + Redirect URLs for your Vercel origin(s).");
console.log("  • Edge Functions → Secrets: ALLOWED_ORIGINS (comma-separated exact origins).");
console.log("  • Published puzzle for today (UTC) in public.puzzles.\n");
