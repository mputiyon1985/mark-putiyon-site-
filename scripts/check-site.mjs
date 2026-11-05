// Site checks for a static site. Exits non-zero on any failure, which blocks deployment.
// Run: node scripts/check-site.mjs
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const failures = [];
const fail = (msg) => failures.push(msg);

// 1. vercel.json must be valid JSON
if (existsSync(join(root, "vercel.json"))) {
  try {
    JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  } catch (e) {
    fail(`vercel.json is not valid JSON: ${e.message}`);
  }
} else {
  fail("vercel.json is missing");
}

// 2. Check each public HTML page and follow its local routes and fragments.
const pages = new Map();
const collect = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["node_modules", "scripts"].includes(entry.name)) continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.name.endsWith(".html")) {
      const html = readFileSync(file, "utf8");
      const ids = new Set();
      for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
        const id = /\s+id=["']([^"']+)["']/i.exec(tag[0])?.[1];
        if (!id) continue;
        if (ids.has(id)) fail(`${relative(root, file)}: duplicate id "${id}"`);
        ids.add(id);
      }
      pages.set(file, { html, ids });
    }
  }
};
collect(root);
if (!pages.has(join(root, "index.html"))) fail("index.html is missing");
for (const [file, { html }] of pages) {
  const label = relative(root, file);
  if (!/<title>[^<]{3,}<\/title>/i.test(html)) fail(`${label}: no page title`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) fail(`${label}: no meta description`);
  if (!/<html[^>]+lang=/i.test(html)) fail(`${label}: no page language`);
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=/i.test(tag[0])) fail(`${label}: <img> without alt: ${tag[0].slice(0, 80)}`);
  }

  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')#?]+)/gi)) refs.add(m[1].trim());
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/i.test(ref)) continue;
    const base = new URL(label, "https://site.test/");
    const url = new URL(ref, base);
    const local = resolve(root, "." + decodeURIComponent(url.pathname));
    const candidates = [local, local + ".html", join(local, "index.html")];
    const target = candidates.find((path) => existsSync(path) && statSync(path).isFile());
    if (!target) fail(`${label}: referenced file not found: ${ref}`);
    else if (url.hash && pages.has(target) && !pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) {
      fail(`${label}: referenced section not found: ${ref}`);
    }
  }
}

// 4. Guard against huge assets slowing the site (limit 2 MB each)
const MAX = 2 * 1024 * 1024;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".github") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (s.size > MAX) fail(`File over 2 MB: ${p.replace(root + "/", "")} (${(s.size / 1048576).toFixed(1)} MB)`);
  }
};
walk(root);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("All site checks passed.");
