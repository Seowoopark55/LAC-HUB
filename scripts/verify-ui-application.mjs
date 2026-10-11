// LAC HUB · pre-build integrity guard for the company application UI.
// This is a source/dependency check, not a browser or live authorization test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const main = read('hub/src/main.js');
const globalCSS = read('hub/src/styles.css');
const passCSS = read('hub/src/styles/passApplication.css');
const renderer = read('hub/src/ui/render.js');

const baseImport = "import './styles.css';";
const applicationImport = "import './styles/passApplication.css';";
const basePosition = main.indexOf(baseImport);
const applicationPosition = main.indexOf(applicationImport);
assert.ok(basePosition >= 0, 'UI CHECK: main.js does not import the shared stylesheet.');
assert.ok(applicationPosition > basePosition, 'UI CHECK: the company application stylesheet must be imported AFTER the shared stylesheet in main.js.');
assert.equal(main.split(applicationImport).length - 1, 1, 'UI CHECK: application stylesheet import must occur exactly once.');
assert.ok(!globalCSS.includes('Company application hybrid visual assets (desktop-first, scoped)'),
  'UI CHECK: old hybrid application CSS is still duplicated in styles.css.');
assert.ok(!globalCSS.includes("@import './styles/passApplication.css'"),
  'UI CHECK: do not import the application stylesheet twice (main.js already imports it).');
assert.ok(renderer.includes("'lac-pass-application-modal'"),
  'UI CHECK: customer application modal no longer carries its scoped class.');
assert.ok(renderer.includes('lac-pass-form__main-columns') && renderer.includes('lac-pass-form__bottom'),
  'UI CHECK: hybrid application markup changed; review the corresponding stylesheet.');
assert.ok(renderer.includes('data-form="admin-pass-application"'),
  'UI CHECK: shared admin application edit view appears to be missing.');
assert.ok(main.includes('form[data-form="pass-application"] select[name="requester_role"]')
  && main.includes('[data-pass-representative-field]'),
  'UI CHECK: role-dependent representative field listener is missing.');
for (const name of ['request_id', 'requester_role', 'ingame_nickname', 'representative_ingame_nickname', 'ingame_phone', 'available_time', 'note', 'consent']) {
  assert.ok(renderer.includes(`name="${name}"`), `UI CHECK: application field ${name} is missing from the renderer.`);
}
for (const selector of ['.runtime-modal.lac-pass-application-modal', '.lac-pass-application-modal .lac-pass-form__main',
  '.lac-pass-application-modal .lac-pass-form__bottom', '.lac-pass-application-modal .lac-pass-form__field[hidden]']) {
  assert.ok(passCSS.includes(selector), `UI CHECK: application CSS missing required selector: ${selector}`);
}
for (const name of ['summary', 'notice', 'form', 'actions']) {
  const path = `/ui/pass/${name}-surface.webp`;
  const file = resolve(root, `hub/public${path}`);
  assert.ok(existsSync(file) && statSync(file).size > 0,
    `UI CHECK: application visual asset missing or empty: ${path}`);
}
for (const match of passCSS.matchAll(/url\(['"]?(\/ui\/pass\/[^)'"\s]+)['"]?\)/g)) {
  const path = resolve(root, `hub/public${match[1]}`);
  assert.ok(existsSync(path), `UI CHECK: CSS references an unavailable image: ${match[1]}`);
}
console.log('PASS: application stylesheet is connected after shared CSS; duplicate hybrid CSS removed; application/admin markup, field controls and image assets present.');
console.log('NOTE: live browser cache, build output, OAuth, RLS and form submissions still need separate runtime checks.');
