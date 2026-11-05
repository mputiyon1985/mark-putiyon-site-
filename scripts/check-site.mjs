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

// 2. index.html must exist and have the basics
const indexPath = join(root, "index.html");
if (!existsSync(indexPath)) {
  fail("index.html is missing");
} else {
  const html = readFileSync(indexPath, "utf8");

  if (!/<title>[^<]{3,}<\/title>/i.test(html)) fail("index.html has no <title>");
  if (!/<meta[^>]+name=["']description["']/i.test(html)) fail("index.html has no meta description");
  if (!/<html[^>]+lang=/i.test(html)) fail('index.html <html> tag has no lang attribute');

  // Every <img> needs alt text
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=/i.test(m[0])) fail(`<img> without alt: ${m[0].slice(0, 80)}`);
  }

  // 3. Every local file referenced from the page must exist
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href|poster)\s*=\s*["']([^"'#?]+)/gi)) refs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')#?]+)/gi)) refs.add(m[1]);

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/i.test(ref)) continue;
    const rel = ref.replace(/^\//, "");
    if (!rel) continue;
    const full = join(root, rel);
    // Pretty URLs (cleanUrls): "/foo" may be foo.html
    if (!existsSync(full) && !existsSync(full + ".html")) {
      fail(`Referenced file not found: ${ref}`);
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
