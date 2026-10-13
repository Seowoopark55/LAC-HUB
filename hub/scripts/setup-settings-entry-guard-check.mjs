import assert from 'node:assert/strict';
import {companySetupComplete} from '../src/platform/contentPolicy.js';
import {readFileSync} from 'node:fs';

const company=(created_at='2026-10-13T04:00:00Z')=>({id:'c1',created_at});
function scenario({created_at, guided, connected=true, roles=true, onboarding='ready'}={}){
 return {companyId:'c1',companies:[company(created_at)],companyAccessStatus:'ready',companyAccess:{company_id:'c1',can_use:true},
 companySettings:{settings:guided===undefined?{}:{guided_setup:guided}},
 discordConnection:{status:connected?'connected':'disconnected'},discordCompanyConfig:roles?{admin_role_id:'r1',member_role_id:'r2'}:{},onboardingStatus:{status:onboarding}};
}
assert.equal(companySetupComplete(scenario({guided:{step:3,completed:false}})),false,'unfinished guide must block');
assert.equal(companySetupComplete(scenario({guided:{step:6,completed:false}})),false,'step six alone is not completion');
assert.equal(companySetupComplete(scenario({guided:{step:6,completed:true}})),true,'explicit finish opens settings');
assert.equal(companySetupComplete(scenario()),false,'new company without progress must not bypass guide');
assert.equal(companySetupComplete(scenario({created_at:'2026-10-12T00:00:00Z'})),true,'previously configured legacy company stays open');
assert.equal(companySetupComplete(scenario({created_at:'2026-10-12T00:00:00Z',guided:{step:3,completed:false}})),false,'legacy company with unfinished guide must resume');
assert.equal(companySetupComplete(scenario({created_at:'2026-10-12T00:00:00Z',roles:false})),false,'legacy company still requires roles');
assert.equal(companySetupComplete(scenario({created_at:'unknown'})),false,'unknown created date fails closed');
assert.equal(companySetupComplete(scenario({guided:{completed:true},connected:false})),true,'reconnection does not erase completed setup');
const render=readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
assert.match(render,/state\.page==='settings' && state\.modal\?\.type!=='setup-guide' \? renderSetupCompletionPrompt\(state\)/);
assert.match(render,/data-action="open-setup-guide"/);
assert.match(render,/회사 초기설정이 완료되지 않았습니다/);
console.log('Setup settings entry guard: 12/12 PASS');
