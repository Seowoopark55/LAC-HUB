import fs from 'node:fs';
import assert from 'node:assert/strict';
import { routeForPathname, routePathForScreen, safeInternalReturnPath } from '../src/platform/screenHistory.js';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const supabase=fs.readFileSync(new URL('../src/lib/supabase.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/lib/productApi.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const checks=[];
function check(name,ok){checks.push([name,Boolean(ok)]);console.log(`${ok?'PASS':'FAIL'} · ${name}`);}

check('Supabase OAuth uses PKCE', /flowType:\s*['"]pkce['"]/.test(supabase));
check('session persistence and URL auth detection remain enabled', /persistSession:\s*true/.test(supabase)&&/detectSessionInUrl:\s*true/.test(supabase));
check('Discord OAuth callback stays same-origin root', /redirectTo:\s*`\$\{window\.location\.origin\}\/`/.test(api));
check('legacy token fragments are scrubbed from the visible URL', /access_token/.test(main)&&/refresh_token/.test(main)&&/cleanLegacySupabaseAuthFragment/.test(main));
check('auth return paths strip credentials', ['code','access_token','refresh_token','provider_token','provider_refresh_token'].every(key=>safeInternalReturnPath(`/game/skills/?${key}=secret`)==='/game/skills/'));
check('Vercel SPA fallback sends deep links to index.html', Array.isArray(vercel.rewrites)&&vercel.rewrites.some(r=>r.source==='/(.*)'&&r.destination==='/index.html'));
check('browser favicon uses LAC mark', /rel="icon"[^>]+\/hub\/mark\.png/.test(index));

const routes=[
  ['/', 'hub'],
  ['/game/crafting/','game-info'],['/game/processing/','game-info'],['/game/quests/','game-info'],['/game/skills/','game-info'],['/game/modbooks/','game-info'],
  ['/build/','hub'],['/cook/','hub'],
  ['/company/','dashboard'],['/company/members/','members'],['/company/accounts/','accounts'],['/company/combat/','combat'],
  ['/company/fund/','fund'],['/company/fund/weekly/','fund'],['/company/fund/review/','fund'],['/company/fund/balance/','fund'],['/company/fund/settings/','fund'],
  ['/company/assets/','assets'],['/company/assets/returns/','assets'],
  ['/company/settings/','settings'],['/company/settings/modules/','settings'],['/company/settings/cooking/','settings'],
  ['/admin/','platform'],['/admin/companies/','platform'],['/admin/applications/','platform'],['/admin/applications/recent/','platform'],['/admin/applications/history/','platform'],
  ['/admin/inbox/','platform'],['/admin/inbox/content/','platform'],['/admin/inbox/site/','platform'],['/admin/inbox/company/','platform'],['/admin/modbooks/','platform'],['/admin/content/','platform'],
];
for(const [path,page] of routes){const r=routeForPathname(path);check(`route ${path}`,r.kind!=='unknown'&&r.page===page);}
check('/game/ canonicalizes to crafting', routeForPathname('/game/').canonicalPath==='/game/crafting/');
check('unknown paths fail safely to HUB', routeForPathname('/definitely-not-a-route').kind==='unknown'&&routeForPathname('/definitely-not-a-route').canonicalPath==='/');

check('COOK on-page return is SPA-only', /data-action="cook-hub-return"/.test(main)&&!/lac-cook-gate__back[^>]+href="\/"/.test(main));
check('Back/Forward handles COOK without full navigation', /if \(route\.kind==='cook'\) \{ showCookPreview\(\); return; \}/.test(main));
check('company context has freshness cache', /COMPANY_CONTEXT_FRESH_MS=60_000/.test(main)&&/companyContextFreshForCurrentCompany/.test(main));
check('company data fetches are deduplicated', /companyDataLoadPromise/.test(main)&&/companyDataLoadCompanyId===companyId/.test(main));
const pageBlock=main.match(/const pageBtn=event\.target\.closest\('\[data-page\]'\);[\s\S]*?\n  const infoTab=/)?.[0]||'';
check('company sidebar reads load in background', /void queueCompanyPageData\(state\.page\)/.test(pageBlock)&&!/await withMutation\(loadFundSnapshot\)/.test(pageBlock));
check('Back/Forward queues company page reads without a blocking loader', /popstate[\s\S]*?void queueCompanyPageData\(state\.page\)/.test(main));
check('pass admin defaults to pending queue', /adminPassView:'pending'/.test(main));
check('pass admin has pending/recent/history tabs', /처리 필요/.test(render)&&/최근 처리/.test(render)&&/전체 기록/.test(render));
check('pass admin uses 15-row paging', /const pageSize=15/.test(render));
check('pass application edit/cancel/admin edit wiring exists', /edit-pass-application/.test(main)&&/cancel-pass-application/.test(main)&&/admin-edit-pass-application/.test(main));

const failed=checks.filter(([,ok])=>!ok);
console.log(`\nLAC HUB PUBLIC BETA PREDEPLOY: ${failed.length?'FAIL':'PASS'} · ${checks.length-failed.length}/${checks.length}`);
if(failed.length){console.log('Failed:',failed.map(([name])=>name).join(', '));process.exit(1);}
