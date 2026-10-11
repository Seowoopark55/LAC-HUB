// TEST PILOT ONLY. One SPA entrypoint (HUB) imports BUILD React as an internal view.
// BUILD public files remain at /build/assets/; BUILD has no second HTML entrypoint.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = resolve(root, 'node_modules/vite/bin/vite.js');
if (!existsSync(vite)) throw new Error('Root dependencies missing. Run npm install in the repository root.');
execFileSync(process.execPath, [resolve(root, 'scripts/verify.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'scripts/verify-deploy.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'scripts/verify-ui-application.mjs')], { cwd: root, stdio: 'inherit' });
console.log('Building one HUB entrypoint with embedded BUILD...');
execFileSync(process.execPath, [vite, 'build'], { cwd: resolve(root, 'hub'), stdio: 'inherit', env: process.env });
const publicAssets = resolve(root, 'build/public');
const to = resolve(root, 'hub/dist/build');
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(publicAssets, to, { recursive: true, force: true });
if (!existsSync(resolve(root, 'hub/dist/index.html')) || !existsSync(resolve(to, 'assets/equipment/top-team.webp'))) {
  throw new Error('Embedded HUB entrypoint or BUILD static assets missing.');
}
console.log('PASS: one HUB SPA, BUILD React bundled as an internal screen, public files at /build/assets/.');
