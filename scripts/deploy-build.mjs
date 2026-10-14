// TEST PILOT ONLY. One SPA entrypoint (HUB) imports BUILD React as an internal view.
// BUILD public files remain at /build/assets/; BUILD has no second HTML entrypoint.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = resolve(root, 'node_modules/vite/bin/vite.js');
if (!existsSync(vite)) throw new Error('Root dependencies missing. Run npm install in the repository root.');
execFileSync(process.execPath, [resolve(root, 'scripts/verify.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'scripts/verify-deploy.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'scripts/verify-ui-application.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'scripts/verify-build-hub-profile.mjs')], { cwd: root, stdio: 'inherit' });
// Release identifier is bundled into the PWA and published to an uncached JSON
// endpoint. Only after Vite builds successfully is the endpoint written to dist.
const versionFiles = [
  'hub/src/companyCookEntry.js',
  'hub/public/company-cook/company-style.css',
  'hub/public/company-cook/data-studio.css',
  'hub/public/company-cook/manifest.webmanifest',
  'hub/public/cook-preview/src/main.js',
  'hub/public/cook-preview/src/planner.js',
];
const digest = createHash('sha256');
for (const name of versionFiles) {
  const file = resolve(root, name);
  if (!existsSync(file)) throw new Error(`COOK release source is missing: ${name}`);
  digest.update(name);digest.update('\0');digest.update(readFileSync(file));
}
const sourceRevision=digest.digest('hex').slice(0,24);
const deploymentSha=process.env.VERCEL_GIT_COMMIT_SHA || '';
const cookRevision=/^[a-f0-9]{40}$/i.test(deploymentSha)
  ? deploymentSha.toLowerCase() : sourceRevision;
console.log('Building one HUB entrypoint with embedded BUILD...');
execFileSync(process.execPath, [vite, 'build'], { cwd: resolve(root, 'hub'), stdio: 'inherit', env: {...process.env, VITE_COMPANY_COOK_VERSION:cookRevision} });
const publicAssets = resolve(root, 'build/public');
const to = resolve(root, 'hub/dist/build');
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(publicAssets, to, { recursive: true, force: true });
if (!existsSync(resolve(root, 'hub/dist/index.html')) || !existsSync(resolve(to, 'assets/equipment/top-team.webp'))) {
  throw new Error('Embedded HUB entrypoint or BUILD static assets missing.');
}
const versionDir=resolve(root, 'hub/dist/company-cook');
mkdirSync(versionDir, { recursive:true });
writeFileSync(resolve(versionDir, 'version.json'), JSON.stringify({revision:cookRevision})+'\n');
console.log('PASS: one HUB SPA, BUILD React bundled as an internal screen, public files at /build/assets/.');
