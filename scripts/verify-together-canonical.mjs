import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const cwd=process.cwd();
const main=fs.readFileSync(path.join(cwd,'hub/src/main.js'),'utf8');
const cssFile=path.join(cwd,'hub/src/styles/togetherCanonicalV214.css');
assert.ok(fs.existsSync(cssFile),'Canonical Together CSS missing');
const css=fs.readFileSync(cssFile,'utf8');
const imported=[...main.matchAll(/import\s+['"]\.\/styles\/(together[^'"\s]+\.css)['"]/g)].map(m=>m[1]);
assert.deepEqual(imported,['togetherCanonicalV214.css'],'Exactly one Together CSS import is permitted');
assert.ok(!css.includes('@import'),'Together CSS must not import old styles');
assert.ok(!css.includes('!important'),'Together canonical style must not depend on important overrides');
const assets=[...css.matchAll(/url\(\s*['"]?(\/[^)'"\s]+)['"]?\s*\)/g)].map(m=>m[1]);
for (const asset of new Set(assets)) {
  assert.ok(fs.existsSync(path.join(cwd,'hub/public',asset.slice(1))),`Missing asset: ${asset}`);
}
const feature=fs.readFileSync(path.join(cwd,'hub/src/features/together.js'),'utf8');
for (const marker of ["rpc('get_post'","rpc('send_message'","rpc('get_roster'",'data-together-form="chat"','togetherRemainingTime','lac-together__raid-hero']) {
 assert.ok(feature.includes(marker),`Existing Together feature missing: ${marker}`);
}
execFileSync(process.execPath,['--check',path.join(cwd,'hub/src/main.js')],{stdio:'pipe'});
execFileSync(process.execPath,['--check',path.join(cwd,'hub/src/features/together.js')],{stdio:'pipe'});
console.log(`PASS: Together uses one canonical CSS, zero @imports, zero !important, ${new Set(assets).size} assets resolve, core feature markers present, JS syntax valid.`);
console.log('NOTE: Static checks do not verify live Supabase permissions, Vercel deploy, or Discord OAuth.');
