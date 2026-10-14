// COMPANY COOK: standalone online-only PWA. HUB authentication and pass boot are
// intentionally not invoked on this route. No privileged company data is loaded.
import {envReady, supabase} from './lib/supabase.js';

const app = document.getElementById('app');
document.title = 'COMPANY COOK';
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
  html,body,#app {margin:0;min-height:100%;background:#0c1015;color:#f3f5f7;font-family:Inter,Pretendard,system-ui,sans-serif}
  * {box-sizing:border-box}
  #app {min-height:100dvh}
  .cc-layout {display:flex;flex-direction:column;height:100dvh;min-height:420px}
  .cc-header {height:58px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;
    border-bottom:1px solid #28313c;background:#12171d;padding:0 20px}
  .cc-brand {display:flex;gap:10px;align-items:center;min-width:0}
  .cc-logo {width:32px;height:32px;display:grid;place-items:center;border:1px solid #6c5531;border-radius:9px;
    background:#2e261a;color:#ffce80;font-size:17px;font-weight:900}
  .cc-brand strong {display:block;font-size:14px;letter-spacing:.035em}
  .cc-brand small {display:block;color:#9caab8;font-size:10px;margin-top:2px}
  .cc-actions {display:flex;align-items:center;gap:8px;flex-shrink:0}
  .cc-button {min-height:33px;padding:7px 12px;border-radius:9px;border:1px solid #45515d;background:#1d252e;
    color:#e6edf3;font-size:12px;font-weight:750;cursor:pointer}
  .cc-button:hover {background:#273340}
  .cc-button:focus-visible {outline:2px solid #f0bf76;outline-offset:3px}
  .cc-button--primary {border-color:#bd904e;background:#d5ad68;color:#151616}
  .cc-button--primary:hover {background:#ecc782}
  .cc-frame {flex:1 1 auto;min-height:0;width:100%;border:0;display:block;background:#0c1015}
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
  /* On supporting desktop PWA browsers, use the native title-bar space.
     Keep controls clear of the system close/minimise buttons. */
  @media(display-mode:window-controls-overlay) {
    .cc-header{min-height:48px;height:max(48px,env(titlebar-area-height,48px));padding-right:150px;-webkit-app-region:drag}
    .cc-actions,.cc-button{-webkit-app-region:no-drag}
  }
  @media(max-width:530px){.cc-header{padding:0 10px;height:54px}.cc-brand small{display:none}.cc-button{padding:7px 9px;font-size:11px}.cc-actions{gap:5px}}
`;
document.head.append(styles);

const RECENTS_KEY = 'lac-company-cook-recent-foods-v1';
let frame = null;
let seq = 0;
let statusInFlight = false;
let pendingInstallEvent = null;

function resetView(){
  frame = null;
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
function openInstallGuide(){
  const dialog = document.createElement('dialog');
  dialog.className = 'cc-dialog';
  dialog.innerHTML = `<h2>COMPANY COOK 앱 설치</h2>
    <p>설치 버튼이 브라우저에서 지원되지 않으면 아래 방법으로 설치할 수 있습니다.</p>
    <ol><li>Chrome: 주소창의 설치 아이콘 또는 메뉴에서 <b>앱 설치</b></li>
    <li>Edge: 메뉴 → <b>앱</b> → <b>이 사이트를 앱으로 설치</b></li>
    <li>설치 뒤에는 바탕화면 또는 시작 메뉴의 COMPANY COOK 아이콘으로 실행</li></ol>
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
  const brand = document.createElement('div');brand.className = 'cc-brand';
  const logo = document.createElement('span');logo.className = 'cc-logo';logo.textContent = 'C';
  const name = document.createElement('div');
  const strong = document.createElement('strong');strong.textContent = 'COMPANY COOK';
  const small = document.createElement('small');small.textContent = '요리 제작 · 재료 계산';
  name.append(strong,small);brand.append(logo,name);
  const actions = document.createElement('div');actions.className = 'cc-actions';
  const install = document.createElement('button');
  install.id = 'cc-install'; install.type = 'button';
  install.className = 'cc-button cc-button--primary';install.textContent = '앱 설치';
  install.addEventListener('click',() => void handleInstall());
  const refresh = document.createElement('button');
  refresh.type = 'button';refresh.className = 'cc-button';refresh.textContent = '새로고침';
  refresh.addEventListener('click',() => window.location.reload());
  actions.append(install,refresh);header.append(brand,actions);
  layout.append(header);app.replaceChildren(layout);
  updateInstallButton();
  return layout;
}
function safeRecents(storage){
  try {
    const raw = JSON.parse(storage.getItem(RECENTS_KEY)||'[]');
    return Array.isArray(raw) ? raw.filter(v => typeof v==='string' && v.length>0 && v.length<=90).slice(0,8) : [];
  } catch {return [];}
}
function installCompanyWorkspace(iframe){
  if(frame!==iframe || !iframe.isConnected) return;
  const doc = iframe.contentDocument;
  if(!doc?.head || !doc.querySelector('.workspace')) return;
  // Content styles are ONLY injected into the company iframe. Original HUB COOK is unaffected.
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/company-cook/company-style.css';
  stylesheet.onload = () => {
    if(frame!==iframe) return;
    makeInsights(doc);
    iframe.style.visibility = 'visible';
  };
  stylesheet.onerror = () => {
    if(frame===iframe) showStatus('화면 스타일을 불러오지 못했습니다','잠시 후 다시 접속해 주세요.',true);
  };
  doc.head.append(stylesheet);
}
function makeInsights(doc){
  const work = doc.querySelector('.workspace');
  if(!work || doc.querySelector('#cc-insights')) return;
  const section = doc.createElement('section');
  section.className = 'cc-insights';section.id = 'cc-insights';
  section.setAttribute('aria-label','빠른 시작과 작업 현황');
  section.innerHTML = `
    <article class="cc-insight-card cc-insight-card--quick">
      <div class="cc-insight-head"><span>빠른 시작</span><small>자주 만드는 요리로 바로 이동</small></div>
      <p class="cc-insight-explain">요리를 검색하거나 최근 작업한 메뉴를 다시 찾아보세요.</p>
      <button type="button" class="cc-search-shortcut">＋ 요리 검색 시작</button>
      <div class="cc-recent-title">최근 작업 요리</div>
      <div class="cc-recent-list" id="cc-recents"><span class="cc-muted">최근 추가한 요리가 여기에 표시됩니다.</span></div>
    </article>
    <article class="cc-insight-card cc-insight-card--overview">
      <div class="cc-insight-head"><span>작업 현황</span><small>현재 브라우저 작업</small></div>
      <div class="cc-stats">
        <div><strong id="cc-menu-count">0</strong><span>선택 메뉴</span></div>
        <div><strong id="cc-batch-count">0</strong><span>제작 세트</span></div>
        <div><strong id="cc-progress-count">0 / 0</strong><span>준비 완료</span></div>
      </div>
      <div class="cc-steps"><b>이렇게 활용하세요</b>
        <p><span>01</span> 요리를 검색하고 작업 목록에 추가</p>
        <p><span>02</span> 재료 및 가공 수량을 확인</p>
        <p><span>03</span> 구매·준비 항목에 체크</p>
      </div>
      <div class="cc-local-note">작업 목록은 현재 브라우저에 자동 저장됩니다.</div>
    </article>`;
  const disclaimer = work.querySelector('.cook-disclaimer');
  if(disclaimer) work.insertBefore(section,disclaimer);
  else work.append(section);
  const search = doc.getElementById('search');
  const gotoSearch = (value='') => {
    if(!search)return;
    if(value){search.value=value;search.dispatchEvent(new iframe.contentWindow.Event('input',{bubbles:true}));}
    search.focus();search.scrollIntoView({behavior:'smooth',block:'center'});
  };
  section.querySelector('.cc-search-shortcut').addEventListener('click',() => gotoSearch());
  let storage = null;
  try { storage = iframe.contentWindow.localStorage; } catch { /* Private browsing may deny storage. */ }
  let priorOrderNames = new Set();
  const paintRecents = () => {
    const host = section.querySelector('#cc-recents');
    host.replaceChildren();
    const recents = safeRecents(storage);
    if(!recents.length){
      const msg = doc.createElement('span');msg.className='cc-muted';
      msg.textContent='첫 요리를 추가하면 최근 사용 메뉴가 표시됩니다.';
      host.append(msg);return;
    }
    for(const name of recents){
      const button=doc.createElement('button');
      button.type='button';button.className='cc-recent-chip';button.textContent=name;
      button.title=`${name} 검색`;
      button.addEventListener('click',() => gotoSearch(name));
      host.append(button);
    }
  };
  const update = () => {
    if(frame!==iframe || !section.isConnected) return;
    const rows = [...doc.querySelectorAll('#orders .order-row')];
    const newNames = rows.map(row => row.querySelector('.food-text strong')?.textContent?.trim()).filter(Boolean);
    const added = newNames.filter(name => !priorOrderNames.has(name));
    priorOrderNames = new Set(newNames);
    if(added.length){
      const recent = [...added.reverse(),...safeRecents(storage)];
      const deduped = [...new Set(recent)].slice(0,8);
      try{storage.setItem(RECENTS_KEY,JSON.stringify(deduped));}catch{}
      paintRecents();
    }
    const batches = rows.reduce((acc,row) => {
      const raw = Number(row.querySelector('input.qty')?.value || '0');
      return acc + (Number.isFinite(raw) && raw > 0 ? raw : 0);
    },0);
    section.querySelector('#cc-menu-count').textContent=String(rows.length);
    section.querySelector('#cc-batch-count').textContent=batches.toLocaleString('ko-KR');
    section.querySelector('#cc-progress-count').textContent=doc.getElementById('prep-progress')?.textContent?.trim()||'0 / 0';
  };
  paintRecents();update();
  // A single observer tracks the existing rendered workbench; no COOK engine modification.
  const workbench = doc.querySelector('.cook-workbench');
  if(workbench){
    const observer = new iframe.contentWindow.MutationObserver(update);
    observer.observe(workbench,{childList:true,subtree:true,characterData:true});
    iframe.addEventListener('load',() => observer.disconnect(),{once:true});
  }
}

async function checkStatus(){
  // Never briefly show an unauthorised/offline app while checking its ON/OFF state.
  if(statusInFlight)return;
  statusInFlight = true;
  const current = ++seq;
  let timeoutId = null;
  try {
    if(!envReady || !supabase){showStatus('연결 설정 확인 필요','앱 서버 연결 설정이 없습니다.');return;}
    if(!navigator.onLine){showStatus('인터넷 연결 필요','온라인에서만 COMPANY COOK을 이용할 수 있습니다.',true);return;}
    const {data,error} = await Promise.race([
      supabase.rpc('my_apps_company_cook_status'),
      new Promise((_,reject) => {timeoutId = window.setTimeout(() => reject(new Error('status timeout')),10000);}),
    ]);
    if(current!==seq)return;
    if(error){showStatus('운영 상태 조회 실패','인터넷 연결을 확인한 뒤 다시 시도해 주세요.',true);return;}
    if(data!==true){showStatus('COMPANY COOK 이용 중지','운영자가 앱 이용을 중지했습니다.');return;}
    if(!frame){
      const layout = createAppShell();
      const iframe = document.createElement('iframe');
      iframe.className = 'cc-frame';iframe.title = '요리 계산기';
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
    respond({ok:false,error:'COMPANY COOK에서는 레시피를 수정할 수 없습니다.'});return;
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
// No logo/status flash on fast connections: leave neutral background until the check resolves.
void checkStatus();
