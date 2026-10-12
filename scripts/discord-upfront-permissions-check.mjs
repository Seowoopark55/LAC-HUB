import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
const ok=(name,pass)=>checks.push([name,Boolean(pass)]);

const security=read('server/discordSecurity.js');
const start=read('api/discord/start.js');
const reapprove=read('api/discord/reapprove.js');
const render=read('src/ui/render.js');
const css=read('src/styles.css');

ok('baseline permission bitfield is defined', security.includes("DISCORD_BOT_BASE_PERMISSIONS = '93200'"));
ok('administrator permission is explicitly excluded', security.includes('Administrator (8) is intentionally not included'));
ok('initial Discord connect uses baseline permissions', start.includes('permissions: DISCORD_BOT_BASE_PERMISSIONS'));
ok('reapproval restores the same baseline permissions', reapprove.includes('permissions: DISCORD_BOT_BASE_PERMISSIONS'));
ok('initial guide explains one-time permission approval', render.includes('처음 연결할 때 Discord 봇 설치와 기본 운영 권한 승인을 한 번에 진행합니다.'));
ok('guide lists channel and message permissions', render.includes('채널 보기') && render.includes('메시지 전송') && render.includes('임베드 표시') && render.includes('메시지 기록 보기') && render.includes('메시지 관리') && render.includes('채널 관리'));
ok('guide explicitly says no administrator permission', render.includes('관리자 전체 권한은 요청하지 않습니다.'));
ok('connect CTA describes server/bot/permission flow', render.includes('서버 선택 · 봇 추가 · 권한 승인'));
ok('settings disconnected copy describes upfront approval', render.includes('기본 운영 권한을 한 번에 승인합니다.'));
ok('permission disclosure styling exists', css.includes('.setup-guide-connect-permissions'));

const failed=checks.filter(([,pass])=>!pass);
for(const [name,pass] of checks) console.log(`${pass?'PASS':'FAIL'} · ${name}`);
if(failed.length) process.exit(1);
console.log(`Discord Upfront Permissions: ${checks.length}/${checks.length} PASS`);
