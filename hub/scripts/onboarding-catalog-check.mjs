import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const check=(ok,label)=>{if(!ok){console.error(`FAIL ${label}`);process.exitCode=1;}else console.log(`PASS ${label}`);};

check(pkg.version==='1.7.41-web-ui.79','web patch version');
check(main.includes('startCatalogStatusPoll'),'catalog readiness polling exists');
const catalogPoll = main.split('function startCatalogStatusPoll() {')[1]?.split('function startReconnectStatusPoll() {')[0] || '';
check(/if\s*\(\s*status\?\.catalog_ready\s*===\s*true\s*\)/.test(catalogPoll) && catalogPoll.includes('getDiscordRoles(companyId)') && catalogPoll.includes('getDiscordChannels(companyId)'),'poll waits for DB catalog readiness and refreshes stored Discord catalog');
check(main.includes('discordCatalogPending()'),'role flow guards catalog readiness');
check(main.includes('startCatalogStatusPoll();return;'),'module navigation restarts readiness poll');
check(render.includes('Discord 역할·채널 정보를 불러오는 중입니다.'),'pending catalog UX is rendered');
check(render.includes("state.onboardingStatus?.catalog_ready===false"),'settings derive catalog pending from DB status');
check(render.includes("catalogPending&&state.settingsTab==='basic'"),'save is disabled while role catalog is pending');
check(render.includes("${catalogPending?'disabled':''}"),'module tab is disabled while catalog is pending');
check(render.includes("Discord 정보 불러오는 중..."),'role selects do not look empty while syncing');

if(!process.exitCode) console.log('LAC ONE WEB onboarding catalog readiness check: PASS');
