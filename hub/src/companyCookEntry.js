// COMPANY COOK: standalone online-only PWA. HUB authentication and pass boot are
// intentionally not invoked on this route. No privileged company data is loaded.
import {envReady, supabase} from './lib/supabase.js';

const app = document.getElementById('app');
document.title = '요리계산기';
document.documentElement.style.colorScheme = 'dark';
if(!document.querySelector('link[rel=manifest]')) {
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = '/company-cook/manifest.webmanifest';
  document.head.append(manifest);
}
const theme = document.createElement('meta');
theme.name = 'theme-color';
theme.content = '#0c1015';
document.head.append(theme);
const styles = document.createElement('style');
styles.textContent = `
  html,body,#app {margin:0;min-height:100%;background:#090d12;color:#f3f5f7;font-family:Inter,Pretendard,system-ui,sans-serif}
  * {box-sizing:border-box}
  #app {min-height:100dvh}
  /* The background belongs to the stage, not an oversized iframe. */
  .cc-layout {
    min-height:100dvh;display:flex;flex-direction:column;align-items:center;
    padding:0 0 28px;
    background:
      radial-gradient(ellipse 42% 34% at 50% 76%,rgba(195,141,73,.09),transparent 78%),
      radial-gradient(ellipse 36% 45% at 90% 56%,rgba(61,94,112,.10),transparent 80%),
      linear-gradient(180deg,rgba(7,10,14,.46) 0%,rgba(7,11,15,.65) 52%,rgba(5,9,13,.88) 100%),
      url('/brand/lac-one-shell-clean.png') center center / cover fixed no-repeat,
      #090d12;
  }
  /* A full workbench, like the previous cooking app: content fills the stage. */
  .cc-panel {
    flex:none;width:min(1460px,calc(100% - 32px));margin:12px auto 0;overflow:hidden;
    background:#101519;border:1px solid rgba(192,146,79,.28);border-radius:15px;
    box-shadow:0 20px 65px #0009,0 0 0 1px #ffffff04;
  }
  .cc-header {
    width:100%;min-height:68px;display:grid;grid-template-columns:minmax(160px,1fr) auto minmax(160px,1fr);
    align-items:center;gap:12px;padding:9px max(18px,calc((100vw - 1460px)/2));
    background:linear-gradient(180deg,#0f141a,#0b1015);border-bottom:1px solid #27313a;
  }
  .cc-header-title{display:flex;gap:12px;align-items:center;min-width:0}
  .cc-header-title b{font-size:19px;color:#f1f3f5;white-space:nowrap}
  .cc-header-icon{width:35px;height:35px;flex:none;display:grid;place-items:center;background:#dba956;
    border-radius:9px;color:#181715;font-size:19px;font-weight:900;box-shadow:0 0 22px #b879302a}
  .cc-nav{display:flex;justify-content:center;align-items:center;gap:5px;border:1px solid #303842;
    border-radius:999px;padding:4px;background:#14191f;min-width:0}
  .cc-nav-button{border:0;border-radius:999px;background:transparent;color:#aebbc9;font-size:12px;font-weight:800;
    padding:9px 15px;cursor:pointer;white-space:nowrap}
  .cc-nav-button:hover{background:#252e38;color:#fff}
  .cc-nav-button[aria-current="page"]{background:#e9b452;color:#151617}
  .cc-nav-button:focus-visible{outline:2px solid #ecc37c;outline-offset:2px}
  .cc-view{padding:25px;min-height:450px;color:#dce5ed}
  .cc-view[hidden],.cc-frame[hidden]{display:none!important}
  .cc-view-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .cc-view h2{font-size:19px;margin:0;color:#fff}
  .cc-view p{font-size:12px;line-height:1.7;color:#a9b8c6}
  .cc-view-card{background:#151c23;border:1px solid #34404b;border-radius:13px;padding:19px;margin:0 0 12px}
  .cc-view-card h3{font-size:15px;margin:0 0 10px;color:#f2eee5}
  .cc-view-filters{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}
  .cc-view-filters input,.cc-view-filters select{padding:9px 11px;border-radius:8px;border:1px solid #465362;
    background:#0d141b;color:#eef2f5;font:inherit;font-size:12px}
  .cc-view-filters input{flex:1 1 240px}
  .cc-data-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:490px;overflow:auto}
  .cc-data-item{border:1px solid #34404b;border-radius:9px;padding:12px;background:#10161c}
  .cc-data-item strong{display:block;font-size:12px;color:#f1e5d2}
  .cc-data-item small{display:block;font-size:10px;color:#92a4b4;margin-top:5px;line-height:1.6}
  .cc-link{display:inline-flex;align-items:center;text-decoration:none;padding:9px 13px;border-radius:9px;
    border:1px solid #af8a51;background:#302515;color:#f3d09a;font-size:12px;font-weight:800}
  .cc-link:hover{background:#48341b}
  .cc-hero-text{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;color:#f6d89a;text-shadow:0 2px 12px #020304,0 2px 4px #020304;padding:8px 15px}
  .cc-hero-mark{font-size:31px;line-height:1;margin-bottom:1px;font-weight:900}
  .cc-hero-text strong{font-size:clamp(25px,3.2vw,43px);font-weight:900;letter-spacing:-.045em;line-height:1.18}
  .cc-hero-text em{font-style:normal;font-size:11px;font-weight:800;letter-spacing:.5em;margin:3px 0 7px}
  .cc-hero-text small{font-size:12px;font-weight:750;color:#f6e5ca}

  /* Decorative brand-neutral kitchen hero inside the unified calculator card. */
  .cc-hero {
    height:clamp(160px,12.2vw,205px);
    background:
      linear-gradient(90deg,rgba(7,10,13,.05) 0%,transparent 20%,transparent 80%,rgba(7,10,13,.05) 100%),
      url('/company-cook/hero-kitchen.webp') center center / cover no-repeat,
      #12171b;
    border-bottom:1px solid rgba(194,147,80,.26);
  }
  .cc-brand {display:flex;align-items:center;gap:9px;min-width:0}
  .cc-logo {width:24px;height:24px;flex:none;display:grid;place-items:center;border:1px solid #705732;
    border-radius:7px;background:#2e261a;color:#ffce80;font-size:12px;font-weight:900}
  .cc-brand strong {display:block;font-size:13px;line-height:1.1;letter-spacing:.01em}
  .cc-brand small {display:block;margin-top:2px;color:#8e9eab;font-size:9px}
  .cc-actions {display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}
  .cc-button {min-height:29px;padding:5px 10px;border-radius:7px;border:1px solid #45515d;
    background:#1d252e;color:#e6edf3;font-size:11px;font-weight:750;cursor:pointer}
  .cc-button:hover {background:#273340}
  .cc-button:focus-visible {outline:2px solid #f0bf76;outline-offset:3px}
  .cc-button--primary {border-color:#bd904e;background:#d5ad68;color:#151616}
  .cc-button--primary:hover {background:#ecc782}
  /* Resized to the calculator's real height; never an internally scrolling viewport. */
  .cc-frame {width:100%;height:1px;border:0;display:block;overflow:hidden;background:#101519}
  .cc-status {min-height:100dvh;display:grid;place-items:center;padding:22px}
  .cc-box {width:min(465px,100%);padding:28px;border:1px solid #354152;border-radius:16px;background:#151c24;text-align:center}
  .cc-box h1 {font-size:20px;margin:0 0 10px}
  .cc-box p {font-size:13px;line-height:1.7;color:#b0becc;margin:0 0 16px}
  .cc-dialog {border:1px solid #44515f;border-radius:16px;width:min(440px,calc(100vw - 32px));
    padding:22px;background:#19212a;color:#e9eff5;box-shadow:0 24px 70px #000a}
  .cc-dialog::backdrop {background:#000b}
  .cc-dialog h2 {font-size:17px;margin:0 0 12px}
  .cc-dialog p,.cc-dialog li {font-size:12px;line-height:1.8;color:#c0ccd7}
  .cc-dialog ol {padding-left:21px}
  .cc-dialog button {float:right;margin-top:10px}
  /* Desktop PWA: controls remain within the page, never under OS buttons. */
  /* Keep the hero when possible; narrow/tiny windows favour actual controls. */
  @media(max-height:680px) and (min-width:751px){
    .cc-hero{height:112px}
  }
  @media(max-height:500px){.cc-hero{display:none}}
  @media(max-width:720px){.cc-hero{height:114px}.cc-hero-text strong{font-size:25px}.cc-hero-text small{font-size:10px}}
  @media(max-width:970px){
    .cc-header{grid-template-columns:1fr auto;gap:7px;padding:10px 14px}
    .cc-nav{grid-column:1/-1;grid-row:2;justify-self:center}
    .cc-actions{grid-column:2;grid-row:1}
  }
  @media(max-width:620px){
    .cc-panel{width:calc(100% - 16px);border-radius:11px}
    .cc-header{padding:9px}
    .cc-header-title b{font-size:15px}
    .cc-header-icon{width:28px;height:28px;font-size:14px}
    .cc-nav-button{padding:8px 10px;font-size:11px}
    .cc-button{padding:5px 8px}
    .cc-data-list{grid-template-columns:1fr}
    .cc-view{padding:13px;min-height:330px}
  }

`;
document.head.append(styles);

let frame = null;
let seq = 0;
let statusInFlight = false;
let pendingInstallEvent = null;
let frameResizeObserver = null;
let frameResizeCleanup = null;
let currentView = 'home';
let dataLoaded = false;
let dataLoadInFlight = false;
let dataCache = [];
let dataError = '';
let viewHost = null;
let navButtons = null;

function resetView(){
  frameResizeObserver?.disconnect();
  frameResizeObserver = null;
  frameResizeCleanup?.();
  frameResizeCleanup = null;
  frame = null;
  viewHost = null;
  navButtons = null;
  currentView = 'home';
  app.replaceChildren();
}
function showStatus(title, detail, retry = false){
  resetView();
  const outer = document.createElement('main');
  outer.className = 'cc-status';
  const box = document.createElement('section');
  box.className = 'cc-box';
  const heading = document.createElement('h1'); heading.textContent = title;
  const message = document.createElement('p'); message.textContent = detail;
  box.append(heading, message);
  if(retry){
    const button = document.createElement('button');
    button.className = 'cc-button cc-button--primary';
    button.type = 'button'; button.textContent = '다시 확인';
    button.addEventListener('click', () => void checkStatus());
    box.append(button);
  }
  outer.append(box); app.append(outer);
}
function installedMode(){
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true;
}
// Installed apps use the same balanced workbench; only the install button differs.
function syncDisplayMode(){
  const compact = installedMode();
  document.documentElement.classList.toggle('cc-compact-mode',compact);
  try {
    frame?.contentDocument?.documentElement?.classList.toggle('cc-compact-mode',compact);
  } catch { /* Only same-origin COOK is mounted. */ }
  updateInstallButton();
}
for(const mode of ['standalone','window-controls-overlay']){
  window.matchMedia(`(display-mode: ${mode})`).addEventListener?.('change',syncDisplayMode);
}
function openInstallGuide(){
  const dialog = document.createElement('dialog');
  dialog.className = 'cc-dialog';
  dialog.innerHTML = `<h2>요리계산기 설치</h2>
    <p>설치 버튼이 브라우저에서 지원되지 않으면 아래 방법으로 설치할 수 있습니다.</p>
    <ol><li>Chrome: 주소창의 설치 아이콘 또는 메뉴에서 <b>앱 설치</b></li>
    <li>Edge: 메뉴 → <b>앱</b> → <b>이 사이트를 앱으로 설치</b></li>
    <li>설치 뒤에는 바탕화면 또는 시작 메뉴의 요리계산기 아이콘으로 실행</li></ol>
    <button class="cc-button cc-button--primary" type="button">확인</button>`;
  dialog.querySelector('button').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => dialog.remove(),{once:true});
  document.body.append(dialog);
  dialog.showModal();
}
function updateInstallButton(){
  const button = document.getElementById('cc-install');
  if(button) button.hidden = installedMode();
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstallEvent = event;
  updateInstallButton();
});
window.addEventListener('appinstalled', () => {
  pendingInstallEvent = null;
  updateInstallButton();
});
async function handleInstall(){
  if(installedMode()) return;
  if(!pendingInstallEvent){openInstallGuide();return;}
  const event = pendingInstallEvent;
  pendingInstallEvent = null;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {openInstallGuide();}
  updateInstallButton();
}
function createAppShell(){
  const layout = document.createElement('main');layout.className = 'cc-layout';
  const header = document.createElement('header');header.className = 'cc-header';
  const identity = document.createElement('div');identity.className='cc-header-title';
  const logo=document.createElement('span');logo.className='cc-header-icon';logo.innerHTML='<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 13a4 4 0 0 1-1-7.87 5 5 0 0 1 9.5-1.1A4 4 0 0 1 19 11v9H5v-7"/><path d="M8 20v-4m8 4v-4"/></svg>';logo.setAttribute('aria-hidden','true');
  const title=document.createElement('b');title.textContent='요리계산기';identity.append(logo,title);
  const nav=document.createElement('nav');nav.className='cc-nav';nav.setAttribute('aria-label','요리계산기 메뉴');
  navButtons=new Map();
  const addNav=(key,text,handler)=>{
    const button=document.createElement('button');button.type='button';button.className='cc-nav-button';
    button.textContent=text;button.addEventListener('click',handler);nav.append(button);navButtons.set(key,button);
  };
  addNav('home','⌂  홈',()=>switchAppView('home'));
  addNav('data','▦  데이터',()=>switchAppView('data'));
  addNav('edit','✎  레시피 수정 ↗',()=>{
    // Deliberately use the existing authenticated HUB route for editing.
    // The public PWA never receives write capabilities, credentials, or role bypasses.
    window.open('/cook','_blank','noopener,noreferrer');
  });
  addNav('settings','⚙  설정',()=>switchAppView('settings'));
  const actions=document.createElement('div');actions.className='cc-actions';
  const install=document.createElement('button');install.id='cc-install';install.type='button';
  install.className='cc-button cc-button--primary';install.textContent='앱 설치';
  install.addEventListener('click',()=>void handleInstall());
  const refresh=document.createElement('button');refresh.type='button';refresh.className='cc-button';
  refresh.textContent='새로고침';refresh.addEventListener('click',()=>window.location.reload());
  actions.append(install,refresh);header.append(identity,nav,actions);
  const panel=document.createElement('section');panel.className='cc-panel';
  panel.setAttribute('aria-label','요리계산기');
  const hero=document.createElement('div');hero.className='cc-hero';
  hero.setAttribute('aria-label','요리계산기 · LAC COOK');
  const text=document.createElement('div');text.className='cc-hero-text';
  const mark=document.createElement('span');mark.className='cc-hero-mark';mark.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 13a4 4 0 0 1-1-7.87 5 5 0 0 1 9.5-1.1A4 4 0 0 1 19 11v9H5v-7"/><path d="M8 20v-4m8 4v-4"/></svg>';mark.setAttribute('aria-hidden','true');
  const main=document.createElement('strong');main.textContent='요리계산기';
  const sub=document.createElement('em');sub.textContent='LAC COOK';
  const detail=document.createElement('small');detail.textContent='요리 계산부터 재료 준비까지, 더 빠르고 편하게';
  text.append(mark,main,sub,detail);hero.append(text);
  viewHost=document.createElement('section');viewHost.className='cc-view';viewHost.hidden=true;
  viewHost.setAttribute('aria-live','polite');
  panel.append(hero,viewHost);layout.append(header,panel);app.replaceChildren(layout);
  switchAppView('home');updateInstallButton();return panel;
}
function switchAppView(view){
  if(!['home','data','settings'].includes(view) || !viewHost)return;
  currentView=view;
  for(const [name,button] of navButtons||[]){
    if(name===view)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  const hero=app.querySelector('.cc-hero');
  if(hero) hero.hidden=view!=='home';
  viewHost.hidden=view==='home';
  if(frame){frame.hidden=view!=='home';
    if(view==='home')requestAnimationFrame(()=>frame?.contentWindow?.dispatchEvent(new Event('resize')));
  }
  if(view==='home')return;
  if(view==='settings')paintAppSettings();
  if(view==='data'){
    paintAppData();
    if(!dataLoaded && !dataLoadInFlight)void loadAppData();
  }
}
function makeText(tag,className,text){
  const item=document.createElement(tag);if(className)item.className=className;
  if(text!=null)item.textContent=text;return item;
}
function paintAppSettings(){
  if(!viewHost)return;
  viewHost.replaceChildren();
  const heading=makeText('h2','','앱 설정');
  const intro=makeText('p','','설치·데이터 보관·운영 안내를 확인할 수 있습니다. 요리계산기의 공통 레시피는 이 화면에서 수정할 수 없습니다.');
  const install=makeText('div','cc-view-card',null);
  install.append(makeText('h3','','설치형 요리계산기'),makeText('p','',installedMode()?'현재 설치형 앱으로 실행 중입니다.':'브라우저의 설치 기능을 이용하면 바탕화면 아이콘으로 실행할 수 있습니다.'));
  const installButton=makeText('button','cc-button cc-button--primary','앱 설치 / 설치 안내');
  installButton.type='button';installButton.addEventListener('click',()=>void handleInstall());
  install.append(installButton);
  const storage=makeText('div','cc-view-card',null);
  storage.append(makeText('h3','','작업 정보 보관'),makeText('p','','작업 목록·즐겨찾기·작업 메모는 현재 브라우저에 저장됩니다. 브라우저 사이트 데이터를 삭제하면 사라질 수 있습니다.'));
  const management=makeText('div','cc-view-card',null);
  management.append(makeText('h3','','레시피 수정 및 운영 관리'),makeText('p','','공통 레시피 수정은 기존 LAC HUB 로그인과 편집 권한이 필요합니다. 요리계산기 앱은 공개 읽기 전용입니다.'));
  const link=makeText('a','cc-link','보호된 HUB COOK 열기 ↗');link.href='/cook';link.target='_blank';link.rel='noopener noreferrer';management.append(link);
  viewHost.append(heading,intro,install,storage,management);
}
async function loadAppData(){
  dataLoadInFlight=true;dataError='';
  try {
    const {default:catalog}=await import('/cook-preview/data/catalog.js');
    // This tab is informational; public database reads never enable mutations.
    const [recipes,processes]=await Promise.all([
      supabase.from('lac_cook_recipe_entries').select('food_id,food_name,set_qty,cook_time,source_kind,version'),
      supabase.from('lac_cook_process_entries').select('process_material_name,result_qty,process_time,source_kind,version'),
    ]);
    if(recipes.error || processes.error)throw new Error('공통 DB 조회 실패');
    const foodMap=new Map((catalog.foods||[]).filter(x=>x.is_active==='TRUE').map(x=>[x.food_id,{name:x.food_name,time:x.cook_time,qty:x.set_qty,kind:'food'}]));
    for(const item of recipes.data||[]){
      if(item.source_kind==='new')foodMap.set(item.food_id,{name:item.food_name,time:item.cook_time,qty:item.set_qty,kind:'food'});
      else if(foodMap.has(item.food_id))foodMap.set(item.food_id,{...foodMap.get(item.food_id),name:item.food_name||foodMap.get(item.food_id).name,time:item.cook_time??foodMap.get(item.food_id).time,qty:item.set_qty??foodMap.get(item.food_id).qty});
    }
    const processMap=new Map((catalog.processes||[]).filter(x=>x.is_active==='TRUE').map(x=>[x.result_material_name||x.material_name||x.process_material_name,{name:x.result_material_name||x.material_name||x.process_material_name,qty:x.result_qty,time:x.process_time,kind:'process'}]));
    for(const item of processes.data||[]){
      processMap.set(item.process_material_name,{name:item.process_material_name,time:item.process_time,qty:item.result_qty,kind:'process'});
    }
    dataCache=[...foodMap.values(),...processMap.values()].filter(x=>x.name).sort((a,b)=>xname(a).localeCompare(xname(b),'ko'));
    dataLoaded=true;
  }catch{
    dataError='데이터를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
  }finally{
    dataLoadInFlight=false;if(currentView==='data')paintAppData();
  }
}
function xname(item){return String(item.name||'');}
function paintAppData(){
  if(!viewHost)return;
  viewHost.replaceChildren();
  const head=makeText('div','cc-view-head',null);
  head.append(makeText('h2','','레시피 데이터'),makeText('span','',dataLoaded?'읽기 전용 · 공통 데이터 연동':'조회 중'));
  const intro=makeText('p','','요리와 가공 데이터의 이름·제작시간·생산량을 확인할 수 있습니다. 등록·수정은 기존 HUB COOK에서 관리자 권한으로 진행하세요.');
  const box=makeText('div','cc-view-card',null);
  if(dataError){box.append(makeText('p','',dataError));const retry=makeText('button','cc-button','다시 확인');retry.addEventListener('click',()=>void loadAppData());box.append(retry);viewHost.append(head,intro,box);return;}
  if(!dataLoaded){box.append(makeText('p','','데이터를 불러오는 중입니다…'));viewHost.append(head,intro,box);return;}
  const controls=makeText('div','cc-view-filters',null);
  const query=makeText('input');query.type='search';query.placeholder='레시피 이름 검색';query.setAttribute('aria-label','레시피 데이터 검색');
  const kind=makeText('select');kind.setAttribute('aria-label','데이터 종류');
  for(const [value,label] of [['all','전체'],['food','요리'],['process','가공']]){const option=makeText('option','',label);option.value=value;kind.append(option);}
  controls.append(query,kind);
  const count=makeText('p','','');const list=makeText('div','cc-data-list',null);
  const filter=()=>{
    const needle=query.value.trim().toLocaleLowerCase('ko');
    const entries=dataCache.filter(x=>(kind.value==='all'||x.kind===kind.value)&&xname(x).toLocaleLowerCase('ko').includes(needle)).slice(0,160);
    list.replaceChildren();
    for(const item of entries){
      const card=makeText('div','cc-data-item',null);
      const note=item.kind==='food'?'요리 · ':'가공 · ';
      card.append(makeText('strong','',item.name),makeText('small','',note+'시간 '+(item.time||'미확인')+' · 생산량 '+(item.qty||'미확인')));
      list.append(card);
    }
    count.textContent=`${entries.length}건 표시 · 전체 ${dataCache.length}건`;
    if(!entries.length)list.append(makeText('p','','검색 결과가 없습니다.'));
  };
  query.addEventListener('input',filter);kind.addEventListener('change',filter);
  box.append(controls,count,list);viewHost.append(head,intro,box);filter();
}

function sizeCompanyFrame(iframe, doc){
  if(frame!==iframe || !iframe.isConnected)return;
  const content = doc.querySelector('.frame');
  const shell = doc.querySelector('.shell');
  if(!content || !shell)throw new Error('COOK 화면 높이를 계산할 수 없습니다.');
  const childWindow = iframe.contentWindow;
  const measure = () => {
    if(frame!==iframe || !iframe.isConnected)return;
    // The company stylesheet removes all viewport-height rules inside the iframe.
    // Content grows with recipes, checklists and expanded detail sections.
    const measured = Math.ceil(Math.max(content.scrollHeight, shell.getBoundingClientRect().bottom - content.getBoundingClientRect().top));
    const nextHeight = `${Math.max(1,measured + 1)}px`;
    if(iframe.style.height!==nextHeight) iframe.style.height = nextHeight;
  };
  if(typeof childWindow.ResizeObserver==='function'){
    frameResizeObserver = new childWindow.ResizeObserver(measure);
    frameResizeObserver.observe(content);
    frameResizeObserver.observe(shell);
  } else if(typeof childWindow.MutationObserver==='function'){
    const observer = new childWindow.MutationObserver(measure);
    observer.observe(shell,{subtree:true,childList:true,characterData:true,attributes:true});
    frameResizeCleanup = () => observer.disconnect();
  }
  childWindow.addEventListener('resize',measure);
  const priorCleanup = frameResizeCleanup;
  frameResizeCleanup = () => {
    childWindow.removeEventListener('resize',measure);
    priorCleanup?.();
  };
  measure();
  childWindow.document.fonts?.ready?.then(() => measure()).catch(()=>{});
}

const COMPANY_MEMO_KEY = 'lac-company-cook-private-memo-v1';
function mountCompanyMemo(doc, iframe){
  if(frame!==iframe || !iframe.isConnected) return;
  const sidebar=doc.querySelector('.cook-sidebar');
  if(!sidebar || sidebar.querySelector('#cc-memo'))return;
  const section=doc.createElement('section');
  section.id='cc-memo';section.className='panel cc-memo-panel';
  const heading=doc.createElement('div');heading.className='panel-title';
  const h=doc.createElement('h3');h.textContent='✎ 작업 메모';
  const hint=doc.createElement('small');hint.textContent='이 브라우저에만 저장';
  heading.append(h,hint);
  const label=doc.createElement('label');label.className='sr-only';label.htmlFor='cc-memo-text';label.textContent='작업 메모';
  const memo=doc.createElement('textarea');memo.id='cc-memo-text';memo.maxLength=3000;
  memo.placeholder='주문자, 전달 위치, 제작 순서 등 필요한 내용을 기록해 주세요.';
  memo.setAttribute('aria-label','작업 메모');
  const state=doc.createElement('p');state.className='cc-memo-state';state.setAttribute('role','status');
  try { memo.value=iframe.contentWindow.localStorage.getItem(COMPANY_MEMO_KEY)||''; }
  catch { state.textContent='현재 브라우저에서 메모 저장을 사용할 수 없습니다.'; }
  memo.addEventListener('input',()=>{
    try {
      iframe.contentWindow.localStorage.setItem(COMPANY_MEMO_KEY,memo.value);
      state.textContent='이 브라우저에 저장됨';
    }catch{state.textContent='메모 저장 실패 · 저장 공간을 확인해 주세요.';}
  });
  section.append(heading,label,memo,state);
  sidebar.append(section);
}

function installCompanyWorkspace(iframe){
  if(frame!==iframe || !iframe.isConnected) return;
  const doc = iframe.contentDocument;
  if(!doc?.head || !doc.querySelector('.workspace')) return;
  doc.title = '요리계산기';
  doc.documentElement.classList.toggle('cc-compact-mode',installedMode());
  const innerTitle = doc.querySelector('.header h1');
  if(innerTitle) innerTitle.textContent = '요리계산기';
  // Content styles are ONLY injected into the company iframe. Original HUB COOK is unaffected.
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/company-cook/company-style.css';
  stylesheet.onload = () => {
    if(frame!==iframe) return;
    try {
      // Companion UI stays company-only and is never loaded by the HUB COOK route.
      mountCompanyMemo(doc, iframe);
      sizeCompanyFrame(iframe, doc);
    } catch (error) {
      console.error('요리계산기 화면 크기 조정 실패',error);
      // A sizing issue must not hide the functional calculator.
      iframe.style.height = 'max(460px,80dvh)';
    } finally {
      if(frame===iframe) iframe.style.visibility = 'visible';
    }
  };
  stylesheet.onerror = () => {
    if(frame===iframe) showStatus('화면 스타일을 불러오지 못했습니다','잠시 후 다시 접속해 주세요.',true);
  };
  doc.head.append(stylesheet);
}
async function checkStatus(){
  // Never briefly show an unauthorised/offline app while checking its ON/OFF state.
  if(statusInFlight)return;
  statusInFlight = true;
  const current = ++seq;
  let timeoutId = null;
  try {
    if(!envReady || !supabase){showStatus('연결 설정 확인 필요','앱 서버 연결 설정이 없습니다.');return;}
    if(!navigator.onLine){showStatus('인터넷 연결 필요','온라인에서만 요리계산기를 이용할 수 있습니다.',true);return;}
    const {data,error} = await Promise.race([
      supabase.rpc('my_apps_company_cook_status'),
      new Promise((_,reject) => {timeoutId = window.setTimeout(() => reject(new Error('status timeout')),10000);}),
    ]);
    if(current!==seq)return;
    if(error){showStatus('운영 상태 조회 실패','인터넷 연결을 확인한 뒤 다시 시도해 주세요.',true);return;}
    if(data!==true){showStatus('요리계산기 이용 중지','운영자가 앱 이용을 중지했습니다.');return;}
    if(!frame){
      const layout = createAppShell();
      const iframe = document.createElement('iframe');
      iframe.className = 'cc-frame';iframe.title = '요리계산기';
      iframe.style.visibility = 'hidden';
      iframe.src = '/cook-preview/index.html?lacCookHostPreview=1';
      iframe.setAttribute('referrerpolicy','same-origin');
      iframe.addEventListener('load',() => installCompanyWorkspace(iframe));
      frame = iframe;
      layout.append(iframe);
    }
  } catch {
    if(current===seq)showStatus('연결 확인 실패','앱 상태를 확인할 수 없습니다.',true);
  } finally {
    if(timeoutId!==null) window.clearTimeout(timeoutId);
    statusInFlight = false;
  }
}

// Read-only bridge: same public recipe/process tables as HUB COOK, with no OAuth or writes.
window.addEventListener('message',async event => {
  if(!frame || event.origin!==window.location.origin || event.source!==frame.contentWindow ||
    !event.data || typeof event.data!=='object' || Array.isArray(event.data) ||
    event.data.type!=='lac-cook:recipes:request:v1')return;
  const {requestId,action} = event.data;
  if(typeof requestId!=='string' || !requestId || requestId.length>80)return;
  const sourceFrame = frame;
  const respond = result => {
    if(frame===sourceFrame && sourceFrame.contentWindow===event.source)
      event.source.postMessage({type:'lac-cook:recipes:response:v1',requestId,...result},event.origin);
  };
  if(action!=='list'){
    respond({ok:false,error:'요리계산기 앱에서는 레시피를 수정할 수 없습니다.'});return;
  }
  try {
    const [recipes,processes] = await Promise.all([
      supabase.from('lac_cook_recipe_entries').select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').order('food_name'),
      supabase.from('lac_cook_process_entries').select('process_material_name,result_qty,process_time,ingredients,source_kind,version').order('process_material_name'),
    ]);
    if(frame!==sourceFrame)return;
    if(recipes.error || processes.error)throw new Error('공통 데이터 조회 실패');
    respond({ok:true,entries:recipes.data||[],canEdit:false,processReady:true,processEntries:processes.data||[]});
  } catch {
    respond({ok:false,error:'공통 요리·가공 DB 조회 실패'});
    if(frame===sourceFrame)showStatus('공통 데이터 연결 실패','최신 요리·가공 데이터를 불러오지 못했습니다. 다시 시도해 주세요.',true);
  }
});

function tick(){if(document.visibilityState==='visible')void checkStatus();}
document.addEventListener('visibilitychange',tick);
window.addEventListener('focus',tick);
window.addEventListener('online',tick);
window.addEventListener('offline',() => {seq++;showStatus('인터넷 연결 필요','온라인에서만 이용할 수 있습니다.',true);});
window.setInterval(tick,15000);
// Apply PWA layout before first paint; do not show the HUB logo or login screen.
syncDisplayMode();
// No logo/status flash on fast connections: leave neutral background until the check resolves.
void checkStatus();
