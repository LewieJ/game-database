/**
 * Writes root sitemap.xml: https://gdb.gg/ + /pages/* + all marathon routes (index-based + lone .html files).
 * Omits duplicate legacy .html when a matching .../name/ index route exists.
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const marathonRoot = path.join(repoRoot, "marathon");
const pagesRoot = path.join(repoRoot, "pages");
const outFile = path.join(repoRoot, "sitemap.xml");
const origin = "https://gdb.gg";

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, callback);
    else callback(full);
  }
}

const indexFiles = [];
const looseHtml = [];
walk(marathonRoot, (full) => {
  if (!full.endsWith(".html")) return;
  if (path.basename(full) === "index.html") indexFiles.push(full);
  else looseHtml.push(full);
});

const urls = new Set();
urls.add(`${origin}/`);

function indexToUrl(fullPath) {
  let rel = path.relative(marathonRoot, fullPath).split(path.sep).join("/");
  if (rel === "index.html") return `${origin}/marathon/`;
  const dir = rel.replace(/\/index\.html$/i, "");
  return `${origin}/marathon/${dir}/`;
}

for (const f of indexFiles) {
  urls.add(indexToUrl(f));
}

for (const f of looseHtml) {
  let rel = path.relative(marathonRoot, f).split(path.sep).join("/");
  const dirOfPage = path.dirname(rel).split(path.sep).join("/");
  const baseName = path.basename(rel, ".html");
  const siblingIndex = path.join(marathonRoot, dirOfPage, baseName, "index.html");
  if (fs.existsSync(siblingIndex)) continue;
  urls.add(`${origin}/marathon/${rel}`);
}

if (fs.existsSync(pagesRoot)) {
  walk(pagesRoot, (full) => {
    if (!full.endsWith(".html") || path.basename(full) !== "index.html") return;
    const rel = path.relative(pagesRoot, full).split(path.sep).join("/");
    const dir = rel.replace(/\/index\.html$/i, "");
    const slug = dir || "";
    urls.add(`${origin}/pages/${slug ? `${slug}/` : ""}`);
  });
}

const sorted = [...urls].sort();
const today = new Date().toISOString().slice(0, 10);

const body = sorted
  .map((loc) => {
    const pri =
      loc === `${origin}/`
        ? "1.0"
        : loc.endsWith("/marathon/")
          ? "0.95"
          : loc.includes("/pages/")
            ? "0.65"
            : "0.8";
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${pri}</priority>
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Canonical: https://gdb.gg (apex). Homepage + /pages/ + /marathon/. Re-run: node scripts/build-sitemap.js -->
${body}
</urlset>
`;

fs.writeFileSync(outFile, xml, "utf8");
console.log("Wrote", outFile, "with", sorted.length, "URLs");
