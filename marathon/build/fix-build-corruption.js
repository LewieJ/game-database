'use strict';
/**
 * Reverts mistaken "//marathon" insertions that broke regex flags and SVG self-closing tags.
 * Safe for href="/marathon/..." (no `>` immediately after marathon).
 */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const skip = new Set(['fix-build-corruption.js', 'fix-prebuild-corruption.js']);

function fixFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const o = s;
  s = s.split(".replace(/'/marathon/g,").join(".replace(/'/g,");
  s = s.split('.replace(/"/marathon/g,').join('.replace(/"/g,');
  s = s.split('/marathon/>').join('/>');
  s = s.split("m[1] === '/marathon/'").join("m[1] === '/'");
  if (s !== o) {
    fs.writeFileSync(filePath, s);
    return true;
  }
  return false;
}

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || skip.has(f)) continue;
  const p = path.join(dir, f);
  if (fixFile(p)) console.log('fixed', f);
}
