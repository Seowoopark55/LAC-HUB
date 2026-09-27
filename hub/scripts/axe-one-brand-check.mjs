import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=[
  'index.html','src/ui/render.js','src/main.js',
  'api/discord/setup/channels.js','api/support/notify.js','api/suggestions/notify.js'
].map(p=>[p,read(p)]);
const failures=[];
for(const [p,s] of runtime){
  if(/AXE (?:PRODUCT|ONE|TEST|멤버|기능|권한|관리자)/.test(s)) failures.push(`${p}: legacy customer brand remains`);
}
const render=read('src/ui/render.js');
const main=read('src/main.js');
const html=read('index.html');
const supabase=read('src/lib/supabase.js');
const server=read('server/supabaseUser.js');
if(!html.includes('<title>LAC HUB</title>')) failures.push('browser title is not LAC HUB');
if(!render.includes('<strong>LAC HUB</strong>') || !render.includes("platformScreen?'서비스 관리':'회사 관리'")) failures.push('app shell brand is not LAC HUB');
if(!main.includes('대표·관리자에게 멤버 등록 요청')) failures.push('registration copy is not company management');
if(!/schema:\s*['\"]axe_product['\"]/.test(supabase)) failures.push('internal Supabase schema changed unexpectedly');
if(!server.includes("'Accept-Profile': 'axe_product'")) failures.push('internal API schema profile changed unexpectedly');
if(!html.includes('/icons/lac-one.svg')) failures.push('legacy browser icon is still linked');
if(!read('src/styles.css').includes("url('/brand/lac-one-shell-clean.png')")) failures.push('original-style cleaned side wallpaper is not active');
if(!read('src/styles/access-gate.css').includes("url('/brand/lac-one-login-calm.png')")) failures.push('original-style cleaned login wallpaper is not active');
if(failures.length){console.error('LAC HUB BRAND CHECK: FAIL');for(const f of failures)console.error(' - '+f);process.exit(1);}
console.log('LAC HUB BRAND CHECK: PASS');
