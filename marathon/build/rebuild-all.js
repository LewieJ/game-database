#!/usr/bin/env node
/**
 * Runs all Marathon prebuild / SSG scripts that pull from MarathonDB APIs.
 * Execute from repo root:  node marathon/build/rebuild-all.js
 * Or from marathon/:         node build/rebuild-all.js
 *
 * Skips marathon/build/ssg.js --sitemap so root gdb.gg sitemap (npm run build:sitemap) stays authoritative.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const marathonRoot = path.resolve(__dirname, '..');

const steps = [
  { title: 'Implants listing (prebuild)', args: ['build/prebuild-implants.js'] },
  { title: 'Cores listing (prebuild)', args: ['build/prebuild-cores.js'] },
  { title: 'Runners listing (prebuild)', args: ['build/prebuild-runners.js'] },
  { title: 'Mods listing (prebuild)', args: ['build/prebuild-mods.js'] },
  { title: 'Items listing (prebuild)', args: ['build/prebuild-items.js'] },
  { title: 'Background detail pages', args: ['build/ssg-backgrounds.js'] },
  { title: 'Sticker detail pages', args: ['build/ssg-stickers.js'] },
  { title: 'Weapon skin stubs + hub data', args: ['build/ssg-weapon-skins.js'] },
  { title: 'Per-weapon skin listing pages', args: ['build/ssg-weapon-filter-pages.js'] },
  { title: 'Per-runner core listing pages', args: ['build/ssg-runner-cores.js'] },
  {
    title: 'Core SSG (items, weapons, factions, contracts, maps, news, redirects)',
    args: [
      'build/ssg.js',
      '--items',
      '--weapons',
      '--factions',
      '--contracts',
      '--maps',
      '--news',
      '--redirects',
    ],
  },
];

console.log('═══════════════════════════════════════════');
console.log('  Marathon rebuild-all (API → static HTML)');
console.log('═══════════════════════════════════════════\n');

for (const step of steps) {
  console.log(`▶ ${step.title}`);
  console.log(`  node ${step.args.join(' ')}\n`);
  const r = spawnSync(process.execPath, step.args, {
    cwd: marathonRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log('\n═══════════════════════════════════════════');
console.log('  Done. Regenerate gdb.gg sitemap if needed:');
console.log('    npm run build:sitemap');
console.log('═══════════════════════════════════════════\n');
