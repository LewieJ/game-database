'use strict';
/**
 * One-off bulk updates: Marathon rail, nav wordmark, footer attribution.
 * Run from repo root: node marathon/scripts/patch-marathon-chrome.js
 */
const fs = require('fs');
const path = require('path');

const marathonRoot = path.join(__dirname, '..');

const RAIL_OLD =
  /<div class="rnk-site-rail"><a href="\/marathon\/" class="rnk-site-rail__brand">gdb\.gg<\/a><span class="rnk-site-rail__sep" aria-hidden="true">\/<\/span><span class="rnk-site-rail__here">Marathon<\/span><\/div>/g;
const RAIL_NEW =
  '<div class="rnk-site-rail"><a href="/marathon/" class="rnk-site-rail__brand">Marathon</a></div>';

const LOGO_OLD = /<span>gdb<span class="logo-accent">\.<\/span>gg<\/span>/g;
const LOGO_NEW = '<span>Marathon</span>';

const FOOTER_OLD =
  /<div class="footer-data-partner">[\s\S]*?<\/div>(?=\s*<div class="footer-legal">)/g;
const FOOTER_NEW =
  '<div class="footer-data-partner">\n                <p class="footer-data-partner-text">Powered by <a href="https://marathondb.gg/" rel="noopener noreferrer">MarathonDB.GG</a></p>\n            </div>';

function walk(dir, files) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'build' || name.name === 'node_modules') continue;
      walk(full, files);
    } else if (name.name.endsWith('.html')) files.push(full);
  }
}

const htmlFiles = [];
walk(marathonRoot, htmlFiles);

let changed = 0;
const FOOTER_BRAND_OLD =
  /<div class="footer-brand">\s*<span class="footer-logo">gdb\.gg<\/span>\s*<span class="footer-logo-sub">Marathon<\/span>\s*<\/div>|<div class="footer-brand">\s*<span class="footer-logo">gdb\.gg<\/span><span class="footer-logo-sub">Marathon<\/span>\s*<\/div>/g;
const FOOTER_BRAND_NEW =
  '<div class="footer-brand">\n                    <span class="footer-logo">Marathon</span>\n                </div>';

for (const file of htmlFiles) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  s = s.replace(RAIL_OLD, RAIL_NEW);
  s = s.replace(LOGO_OLD, LOGO_NEW);
  s = s.replace(FOOTER_OLD, FOOTER_NEW);
  s = s.replace(FOOTER_BRAND_OLD, FOOTER_BRAND_NEW);
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    changed++;
  }
}

console.log('Patched', changed, 'of', htmlFiles.length, 'HTML files under marathon/');
