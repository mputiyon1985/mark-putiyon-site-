// Site checks for a static site. Exits non-zero on any failure, which blocks deployment.
// Run: node scripts/check-site.mjs
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

// 2. Every HTML page must have the basics (index.html is required)
if (!existsSync(join(root, "index.html"))) fail("index.html is missing");
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  const tag = `[${page}]`;

  if (!/<title>[^<]{3,}<\/title>/i.test(html)) fail(`${tag} has no <title>`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) fail(`${tag} has no meta description`);
  if (!/<html[^>]+lang=/i.test(html)) fail(`${tag} <html> tag has no lang attribute`);
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) fail(`${tag} has no canonical link`);
  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s !== 1) fail(`${tag} must have exactly one <h1> (found ${h1s})`);

  // Every <img> needs alt text
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=/i.test(m[0])) fail(`${tag} <img> without alt: ${m[0].slice(0, 80)}`);
  }

  // JSON-LD blocks must be valid JSON
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(m[1]); } catch (e) { fail(`${tag} invalid JSON-LD: ${e.message}`); }
  }

  // 3. Every local file referenced from the page must exist
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href|poster)\s*=\s*["']([^"'#?]+)/gi)) refs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')#?]+)/gi)) refs.add(m[1]);

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/i.test(ref)) continue;
    if (ref.startsWith("/_vercel/")) continue; // provided by Vercel at runtime
    const rel = ref.replace(/^\//, "");
    if (!rel) continue;
    const full = join(root, rel);
    // Pretty URLs (cleanUrls): "/foo" may be foo.html
    if (!existsSync(full) && !existsSync(full + ".html")) {
      fail(`${tag} referenced file not found: ${ref}`);
    }
  }
}

// Sitemap: every listed URL must exist, and every page must be listed
if (existsSync(join(root, "sitemap.xml"))) {
  const sm = readFileSync(join(root, "sitemap.xml"), "utf8");
  const locs = [...sm.matchAll(/<loc>https:\/\/mark\.putiyon\.net\/([^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const l of locs) {
    const f = l === "" ? "index.html" : l + ".html";
    if (!existsSync(join(root, f))) fail(`sitemap lists a page that does not exist: /${l}`);
  }
  for (const page of pages) {
    const l = page === "index.html" ? "" : page.replace(/\.html$/, "");
    if (!locs.includes(l)) fail(`page missing from sitemap.xml: ${page}`);
  }
} else {
  fail("sitemap.xml is missing");
}

// 4. Guard against huge assets slowing the site (limit 2 MB each).
// The dated source portrait is a reusable original, not a page asset, and is
// listed in .vercelignore so it is not uploaded with the site.
const MAX = 2 * 1024 * 1024;
const SOURCE_OVERSIZE_OK = new Set([
  "assets/mark/mark-putiyon-headshot-2026-11-07-original.png",
]);
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".github") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (s.size > MAX) {
      const rel = p.slice(root.length + 1).split("\\").join("/");
      if (SOURCE_OVERSIZE_OK.has(rel)) continue;
      fail(`File over 2 MB: ${rel} (${(s.size / 1048576).toFixed(1)} MB)`);
    }
  }
};
walk(root);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("All site checks passed.");
