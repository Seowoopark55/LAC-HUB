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
assert.ok(build.includes("lac:open-player-profile") && build.includes('onProfile={openProfile}'), 'BUILD profile actions must open the HUB profile UI.');
assert.ok(hub.includes("lac:open-player-profile") && hub.includes('openHubPlayerProfile()'), 'HUB must own the embedded BUILD profile action.');
const buildProfileHandler = hub.split("window.addEventListener('lac:open-player-profile'")[1]?.split('});')[0] || '';
assert.ok(buildProfileHandler.includes('openHubPlayerProfile()'), 'BUILD must request the existing HUB player profile dialog.');
assert.ok(!buildProfileHandler.includes('navigatePrimaryScreen') && !buildProfileHandler.includes('switchVisibleApp'), 'Profile must not leave BUILD or reset its screen.');
assert.ok(hub.includes("root.insertAdjacentElement('afterend', playerProfileHost)") && hub.includes('function renderPlayerProfilePortal()'), 'Profile must mount outside hidden #app.');
assert.ok(hub.includes('playerProfileHost.addEventListener(\'click\'') && hub.includes('playerProfileHost.addEventListener(\'submit\''), 'Portal close and submit events must be wired.');
assert.ok(hub.includes('async function submitPlayerProfileForm(form)') && hub.includes('upsertPlayerProfile(userId,payload)'), 'The unified dialog must retain the original Supabase save path.');

assert.ok(hub.includes("lac:player-profile-updated") && build.includes("lac:player-profile-updated"), 'Profile updates must refresh embedded BUILD labels.');
assert.ok(client.includes("from('company_memberships')") && client.includes(".eq('user_id', userId)") && client.includes(".eq('status', 'active')"), 'Company labels must only come from a real active membership.');
assert.ok(client.includes('loadPlayerProfile') && client.includes('hubSupabase'), 'BUILD must read the shared HUB profile, not rewrite legacy accounts.');
assert.ok(build.includes('profile?.is_admin') && build.includes('author_name:'), 'Legacy admin permissions and historical build ownership must stay intact.');
for (const name of ['nickname_requests','company_requests','modbook_reports','approve_modbook_report','reject_modbook_report']) {
  assert.ok(build.includes(name), `Legacy data/review flow unexpectedly removed: ${name}`);
}
assert.ok(runner.includes("scripts/verify-build-hub-profile.mjs"), 'Integration verification must run before production build.');
assert.ok(existsSync(resolve(root, 'hub/src/lib/playerProfileApi.js')));
console.log('PASS: embedded BUILD shares HUB player name and company membership; profile opens without route changes; historic author, admin and report data retained.');
console.log('NOTE: DB RLS, sessions, nickname changes and live BUILD posting need deployed runtime tests.');
