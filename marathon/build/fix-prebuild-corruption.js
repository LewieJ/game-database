'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname;
for (const f of fs.readdirSync(dir).filter((x) => x.startsWith('prebuild') && x.endsWith('.js'))) {
  let s = fs.readFileSync(path.join(dir, f), 'utf8');
  const o = s;
  s = s.split(".replace(/'//marathon/g,").join(".replace(/'/g,");
  s = s.split('.replace(/"//marathon/g,').join('.replace(/"/g,');
  s = s.split('//marathon/>').join('/>');
  s = s.split("m[1] === '//marathon/'").join("m[1] === '/'");
  if (s !== o) {
    fs.writeFileSync(path.join(dir, f), s);
    console.log('fixed', f);
  }
}
