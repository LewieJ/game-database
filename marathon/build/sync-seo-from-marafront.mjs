/**
 * Merge <head> SEO from marafront (marathondb.gg) into Gamedatabase marathon/*.html.
 * Keeps gdb.gg body/nav; rewrites URLs to https://gdb.gg/marathon/, paths to /marathon/css/, gdb favicons.
 *
 * Usage: node marathon/build/sync-seo-from-marafront.mjs [MARAFRONT_ROOT]
 * Default MARAFRONT: C:\Users\JYML9\Desktop\RNK Marathon API\marafront
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MARATHON_DIR = path.join(REPO_ROOT, 'marathon');

const DEFAULT_MARAFRONT = path.join(
  process.env.USERPROFILE || '',
  'Desktop',
  'RNK Marathon API',
  'marafront'
);

const MARAFRONT = path.resolve(process.argv[2] || DEFAULT_MARAFRONT);

const SITE_ORIGIN = 'https://gdb.gg';
const MARATHON_BASE = `${SITE_ORIGIN}/marathon`;
const OG_IMAGE = `${SITE_ORIGIN}/assets/icons/marathon.svg`;

const FAVICON_BLOCK = `    <link rel="icon" type="image/svg+xml" href="/assets/icons/gdb-mark.svg">
    <link rel="apple-touch-icon" href="/assets/icons/gdb-mark.svg">`;

function extractHeadInner(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : null;
}

function stripAdsense(headInner) {
  return headInner.replace(
    /<!--\s*Google AdSense\s*-->[\s\S]*?<\/script>\s*/gi,
    ''
  );
}

function transformHeadInner(inner) {
  let s = stripAdsense(inner);

  // Icon / tile image → gdb.gg assets (avoid /marathon/Icon.png)
  s = s.replace(/https:\/\/marathondb\.gg\/Icon\.png/gi, OG_IMAGE);
  s = s.replace(/content="Icon\.png"/gi, `content="${OG_IMAGE}"`);

  // Canonical domain + path
  s = s.replace(/https:\/\/marathondb\.gg\//g, `${MARATHON_BASE}/`);
  s = s.replace(/https:\/\/marathondb\.gg"/g, `${MARATHON_BASE}"`);
  s = s.replace(/https:\/\/marathondb\.gg'/g, `${MARATHON_BASE}'`);

  // og:site_name / branding
  s = s.replace(/content="MARATHON DB"/g, 'content="gdb.gg Marathon"');
  s = s.replace(/content="MarathonDB"/g, 'content="gdb.gg Marathon"');

  // Stylesheets: marafront uses css/ or /css/
  s = s.replace(/href="\/css\//g, 'href="/marathon/css/');
  s = s.replace(/href="css\//g, 'href="/marathon/css/');

  // Manifest
  s = s.replace(/href="manifest\.json"/g, 'href="/marathon/manifest.json"');
  s = s.replace(/href="\/manifest\.json"/g, 'href="/marathon/manifest.json"');

  // Favicon: replace mf Icon.png links with gdb-mark
  s = s.replace(
    /<link rel="icon"[^>]*>\s*\n?\s*<link rel="apple-touch-icon"[^>]*>/gi,
    FAVICON_BLOCK
  );
  // Single leftover icon lines
  s = s.replace(/<link rel="icon"[^>]*href="[^"]*Icon\.png"[^>]*>/gi, '');
  s = s.replace(/<link rel="apple-touch-icon"[^>]*href="[^"]*Icon\.png"[^>]*>/gi, '');

  // msapplication tile image
  s = s.replace(
    /<meta name="msapplication-TileImage" content="[^"]*"/gi,
    `<meta name="msapplication-TileImage" content="${SITE_ORIGIN}/assets/icons/gdb-mark.svg"`
  );

  // Title suffix branding
  s = s.replace(/MarathonDB - /g, 'gdb.gg Marathon — ');
  s = s.replace(/\| MarathonDB/g, '| gdb.gg');
  s = s.replace(/MARATHON DB - /g, 'gdb.gg Marathon — ');

  if (!/<link rel="icon"/i.test(s)) {
    s = s.replace(/(<meta charset="UTF-8">\s*\n)/i, `$1    ${FAVICON_BLOCK.trim()}\n`);
  }

  return s.trimStart();
}

/** Keep gdb.gg-only tail after marafront head (unified nav, rnk-theme, etc.). */
function extractGdbHeadTail(gdHeadInner) {
  const navIdx = gdHeadInner.search(/<script[^>]*unified-site-nav/i);
  if (navIdx >= 0) return '\n      ' + gdHeadInner.slice(navIdx).replace(/\s*<\/head>\s*$/i, '').trim();
  const themeIdx = gdHeadInner.search(/rnk-theme\.css/i);
  if (themeIdx >= 0) {
    const start = gdHeadInner.lastIndexOf('<link', themeIdx);
    const from = start >= 0 ? start : themeIdx;
    return '\n      ' + gdHeadInner.slice(from).replace(/\s*<\/head>\s*$/i, '').trim();
  }
  return '';
}

function marafrontPathForGamedatabaseHtml(relFromMarathon) {
  if (relFromMarathon === 'index.html' || relFromMarathon === path.join('', 'index.html')) {
    return path.join(MARAFRONT, 'index.html');
  }
  return path.join(MARAFRONT, relFromMarathon);
}

function walkHtml(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === 'build') continue;
      walkHtml(p, out);
    } else if (name.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(MARAFRONT)) {
    console.error('marafront not found:', MARAFRONT);
    console.error('Pass path: node marathon/build/sync-seo-from-marafront.mjs <marafront-root>');
    process.exit(1);
  }

  const files = walkHtml(MARATHON_DIR).filter((f) => !f.includes(`${path.sep}build${path.sep}`));
  let updated = 0;
  let skipped = 0;
  let noSource = 0;

  for (const gdPath of files) {
    const rel = path.relative(MARATHON_DIR, gdPath);
    const mfPath = marafrontPathForGamedatabaseHtml(rel);
    if (!fs.existsSync(mfPath)) {
      noSource++;
      continue;
    }

    const gdHtml = fs.readFileSync(gdPath, 'utf8');
    const mfHtml = fs.readFileSync(mfPath, 'utf8');

    const mfInner = extractHeadInner(mfHtml);
    if (!mfInner) {
      skipped++;
      continue;
    }

    const gdInner = extractHeadInner(gdHtml) || '';
    const gdbTail = extractGdbHeadTail(gdInner);
    const newInner = transformHeadInner(mfInner) + gdbTail;
    const newHead = `<head>\n${newInner}\n`;

    const replaced = gdHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/i, newHead + '</head>');
    if (replaced === gdHtml) {
      skipped++;
      continue;
    }

    fs.writeFileSync(gdPath, replaced, 'utf8');
    updated++;
  }

  console.log(
    JSON.stringify(
      { marafront: MARAFRONT, updated, skipped, noMarafrontSource: noSource },
      null,
      0
    )
  );
}

main();
