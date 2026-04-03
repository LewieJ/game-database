/**
 * One-time migration: reorganize legacy RNK pages into css/js subfolders,
 * strip SEO meta/JSON-LD, normalize asset paths, extract PS/Xbox inline assets.
 * Run from repo root: node scripts/migrate-olsrnk.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    fs.rmSync(from, { force: true });
    return;
  }
  fs.renameSync(from, to);
}

function stripSeo(html) {
  let out = html;
  out = out.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");
  out = out.replace(/\s*<meta name="google-adsense-account"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta name="description"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta name="keywords"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta name="author"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta name="robots"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<link rel="canonical"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta property="og:[^"]*"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<meta name="twitter:[^"]*"[^>]*>\s*/gi, "");
  out = out.replace(/\s*<!--\s*SEO[^>]*-->\s*/gi, "");
  out = out.replace(/\s*<!--\s*Open Graph[^>]*-->\s*/gi, "");
  out = out.replace(/\s*<!--\s*Twitter[^>]*-->\s*/gi, "");
  out = out.replace(/\s*<!--\s*Structured Data[^>]*-->\s*/gi, "");
  out = out.replace(/\s*<!--\s*Canonical[^>]*-->\s*/gi, "");
  return out;
}

function fixSharedHtmlPaths(html) {
  let out = html;
  out = out.replace(/href="\/assets\/([^"?]+)(\?[^"]*)?"/g, (_, p) => `href="/assets/${p}"`);
  out = out.replace(/src="\/assets\/([^"?]+)(\?[^"]*)?"/g, (_, p) => `src="/assets/${p}"`);
  out = out.replace(/href="\.\.\/assets\/([^"?]+)(\?[^"]*)?"/g, (_, p) => `href="/assets/${p}"`);
  out = out.replace(/src="\.\.\/assets\/([^"?]+)(\?[^"]*)?"/g, (_, p) => `src="/assets/${p}"`);
  out = out.replace(/\/assets\/icons\/logo\.png/g, "/assets/icons/marathon.svg");
  out = out.replace(/steam\.css">>/g, 'css/steam.css">');
  out = out.replace(/href="steam\.css"/g, 'href="css/steam.css"');
  out = out.replace(/src="steam\.js"/g, 'src="js/steam.js"');
  out = out.replace(/\/twitch\/twitch-nav\.css(\?[^"']*)?/g, "/twitch/css/twitch-nav.css");
  out = out.replace(/\/twitch\/(twitch-nav|twitch|categories|category|leaderboards|profile)\.js(\?[^"']*)?/g, (_, base) => `/twitch/js/${base}.js`);
  return out;
}

function processHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = stripSeo(html);
  html = fixSharedHtmlPaths(html);
  fs.writeFileSync(filePath, html, "utf8");
}

function migrateSteamTwitchFolders() {
  const st = path.join(ROOT, "steam");
  if (fs.existsSync(st)) {
    fs.mkdirSync(path.join(st, "css"), { recursive: true });
    fs.mkdirSync(path.join(st, "js"), { recursive: true });
    moveIfExists(path.join(st, "steam.css"), path.join(st, "css", "steam.css"));
    moveIfExists(path.join(st, "steam.js"), path.join(st, "js", "steam.js"));
  }

  const tw = path.join(ROOT, "twitch");
  if (fs.existsSync(tw)) {
    fs.mkdirSync(path.join(tw, "css"), { recursive: true });
    fs.mkdirSync(path.join(tw, "js"), { recursive: true });
    moveIfExists(path.join(tw, "twitch-nav.css"), path.join(tw, "css", "twitch-nav.css"));
    for (const j of ["twitch-nav.js", "twitch.js", "categories.js", "category.js", "leaderboards.js", "profile.js"]) {
      moveIfExists(path.join(tw, j), path.join(tw, "js", j));
    }
  }
}

function extractSinglePageApp(project) {
  const dir = path.join(ROOT, project);
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, "utf8");
  if (html.includes(`/${project}/css/${project}.css`)) return;

  html = stripSeo(html);

  fs.mkdirSync(path.join(dir, "css"), { recursive: true });
  fs.mkdirSync(path.join(dir, "js"), { recursive: true });

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    fs.writeFileSync(path.join(dir, "css", `${project}.css`), styleMatch[1].trim() + "\n", "utf8");
    html = html.replace(/<style>[\s\S]*?<\/style>/, `  <link rel="stylesheet" href="/${project}/css/${project}.css">`);
  }

  const inlineBodies = [];
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
    if (/\bsrc\s*=/.test(attrs)) return full;
    const t = body.trim();
    if (!t) return "";
    inlineBodies.push(t);
    return "";
  });

  if (inlineBodies.length) {
    fs.writeFileSync(path.join(dir, "js", `${project}.js`), inlineBodies.join("\n\n") + "\n", "utf8");
    html = html.replace("</body>", `  <script src="/${project}/js/${project}.js"></script>\n</body>`);
  }

  html = fixSharedHtmlPaths(html);
  fs.writeFileSync(indexPath, html, "utf8");
}

function walkHtml(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkHtml(p, cb);
    else if (name.endsWith(".html")) cb(p);
  }
}

function patchGlobalJs() {
  const p = path.join(ROOT, "assets", "global.js");
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    /src="\/assets\/icons\/logo\.png"/,
    'src="/assets/icons/marathon.svg"'
  );
  fs.writeFileSync(p, s, "utf8");
}

function copyConfigJs() {
  const ex = path.join(ROOT, "assets", "config.example.js");
  const dest = path.join(ROOT, "assets", "config.js");
  if (fs.existsSync(ex) && !fs.existsSync(dest)) {
    fs.copyFileSync(ex, dest);
  }
}

migrateSteamTwitchFolders();

for (const sub of ["steam", "twitch"]) {
  walkHtml(path.join(ROOT, sub), processHtmlFile);
}

extractSinglePageApp("playstation");
extractSinglePageApp("xbox");

patchGlobalJs();
copyConfigJs();

console.log("migrate-olsrnk: done");
