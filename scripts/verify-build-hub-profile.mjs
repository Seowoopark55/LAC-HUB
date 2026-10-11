// Pre-build integration guard for the embedded BUILD identity transition.
// This checks source wiring, NOT live auth, SQL, RLS, or user data.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const build = read('build/src/App.jsx');
const hub = read('hub/src/main.js');
const client = read('build/src/lib/hubIdentity.js');
const runner = read('scripts/deploy-build.mjs');
assert.ok(build.includes('loadBuildHubIdentity') && build.includes('hub_identity_mode'), 'BUILD must use HUB profile identity for embedded displays.');
assert.ok(build.includes("lac:open-account-menu") && build.includes('onProfile={openProfile}'), 'BUILD account buttons must open the common HUB account menu.');
assert.ok(hub.includes("lac:open-account-menu") && hub.includes('renderHubAccountControl') && hub.includes('openHubPlayerProfile()'), 'HUB must own the shared BUILD account menu and profile dialog.');
const buildAccountHandler = hub.split("window.addEventListener('lac:open-account-menu'")[1]?.split('});')[0] || '';
assert.ok(buildAccountHandler.includes('renderAccountPortal()'), 'BUILD account action must open the existing HUB menu without changing route.');
assert.ok(!buildAccountHandler.includes('navigatePrimaryScreen') && !buildAccountHandler.includes('switchVisibleApp'), 'The account menu must not leave BUILD or reset its screen.');
assert.ok(hub.includes("root.insertAdjacentElement('afterend', playerProfileHost)") && hub.includes('function renderPlayerProfilePortal()'), 'Player profile dialog must mount outside hidden #app.');
assert.ok(hub.includes("playerProfileHost.addEventListener('click'") && hub.includes("playerProfileHost.addEventListener('submit'"), 'Profile portal close and submit events must be wired.');
assert.ok(hub.includes('async function submitPlayerProfileForm(form)') && hub.includes('upsertPlayerProfile(userId,payload)'), 'The profile must retain its existing Supabase save path.');
assert.ok(hub.includes("lac:player-profile-updated") && build.includes("lac:player-profile-updated"), 'Profile updates must refresh embedded BUILD labels.');
assert.ok(client.includes("from('company_memberships')") && client.includes(".eq('user_id', userId)") && client.includes(".eq('status', 'active')"), 'Company labels must only come from a real active membership.');
assert.ok(client.includes('loadPlayerProfile') && client.includes('hubSupabase'), 'BUILD must read the shared HUB profile, not rewrite legacy accounts.');
assert.ok(build.includes('profile?.is_admin') && build.includes('author_name:'), 'Legacy admin permissions and historical build ownership must stay intact.');
for (const name of ['nickname_requests','company_requests','modbook_reports','approve_modbook_report','reject_modbook_report']) {
  assert.ok(build.includes(name), `Legacy data/review flow unexpectedly removed: ${name}`);
}
assert.ok(runner.includes("scripts/verify-build-hub-profile.mjs"), 'Integration verification must run before production build.');
assert.ok(existsSync(resolve(root, 'hub/src/lib/playerProfileApi.js')));
console.log('PASS: BUILD uses the HUB shared account menu, HUB player name and company membership; historic author, admin and report data retained.');
console.log('NOTE: DB RLS, sessions, nickname changes and live BUILD posting need deployed runtime tests.');
// The same HUB menu renderer must drive HUB, company and embedded BUILD; no
// independent company/BUILD profile panel should be revived accidentally.
const home=read('hub/src/ui/hubHome.js');
const company=read('hub/src/ui/render.js');
const accountCss=read('hub/src/styles/unifiedAccount.css');
assert.ok(home.includes('export function renderHubAccountControl') && home.includes('renderHubAccountControl(state);'), 'HUB home must reuse the shared account menu renderer.');
assert.ok(company.includes('renderHubAccountControl(state)') && !company.includes('runtime-account-menu" role="menu"'), 'Company header must use the HUB account menu, not its legacy account menu.');
assert.ok(hub.includes("accountMenuHost.addEventListener('click',handlePrimaryClick)") && hub.includes('renderHubAccountControl(state,{expanded:true})'), 'BUILD account portal must reuse HUB markup and actions.');
assert.ok(hub.includes("import './styles/unifiedAccount.css'") && accountCss.includes('.lac-hub-account-portal'), 'HUB account portal stylesheet must be connected.');
assert.ok(build.includes('내 계정 ▾') && build.includes('!onHubReturn && <button onClick={onLogout}>'), 'Embedded BUILD must not show a second logout action outside the shared menu.');
console.log('PASS: one HUB account renderer reused in company header and BUILD overlay, with shared account actions.');
