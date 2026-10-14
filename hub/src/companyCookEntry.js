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
    padding:clamp(12px,3vh,32px) 16px;
    background:
      radial-gradient(ellipse 42% 34% at 50% 76%,rgba(195,141,73,.09),transparent 78%),
      radial-gradient(ellipse 36% 45% at 90% 56%,rgba(61,94,112,.10),transparent 80%),
      linear-gradient(180deg,rgba(7,10,14,.46) 0%,rgba(7,11,15,.65) 52%,rgba(5,9,13,.88) 100%),
      url('/brand/lac-one-shell-clean.png') center center / cover fixed no-repeat,
      #090d12;
  }
  /* Auto margins center a small workbench, but collapse when its content grows. */
  .cc-panel {
    flex:none;width:min(1240px,100%);margin:auto 0;overflow:hidden;
    background:#101519;border:1px solid rgba(192,146,79,.28);border-radius:15px;
    box-shadow:0 20px 65px #0009,0 0 0 1px #ffffff04;
  }
  .cc-header {
    min-height:43px;display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:6px 14px;border-bottom:1px solid #2d353b;background:#12181d;
  }
  .cc-brand {display:flex;align-items:center;gap:9px;min-width:0}
  .cc-logo {width:24px;height:24px;flex:none;display:grid;place-items:center;border:1px solid #705732;
    border-radius:7px;background:#2e261a;color:#ffce80;font-size:12px;font-weight:900}
  .cc-brand strong {display:block;font-size:13px;line-height:1.1;letter-spacing:.01em}
  .cc-brand small {display:block;margin-top:2px;color:#8e9eab;font-size:9px}
  .cc-actions {display:flex;align-items:center;gap:6px;flex-shrink:0}
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
  /* Keep the browser's native controls clear when a desktop PWA uses overlays. */
  @media(display-mode:window-controls-overlay) {
    .cc-layout {padding-top:max(34px,calc(env(titlebar-area-height,0px) + 8px))}
    .cc-header,.cc-actions,.cc-button{-webkit-app-region:no-drag}
  }
  @media(max-width:620px){
    .cc-layout{padding:9px}
    .cc-panel{border-radius:11px}
    .cc-header{padding:6px 9px}
    .cc-brand small{display:none}
    .cc-button{padding:5px 8px}
  }
`;
document.head.append(styles);

let frame = null;
let seq = 0;
let statusInFlight = false;
let pendingInstallEvent = null;
let frameResizeObserver = null;
let frameResizeCleanup = null;

function resetView(){
  frameResizeObserver?.disconnect();
  frameResizeObserver = null;
  frameResizeCleanup?.();
  frameResizeCleanup = null;
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
  const brand = document.createElement('div');brand.className = 'cc-brand';
  const logo = document.createElement('span');logo.className = 'cc-logo';logo.textContent = 'C';
  const name = document.createElement('div');
  const strong = document.createElement('strong');strong.textContent = '요리계산기';
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
  const panel = document.createElement('section');
  panel.className = 'cc-panel';
  panel.setAttribute('aria-label','요리계산기');
  panel.append(header);
  layout.append(panel);app.replaceChildren(layout);
  updateInstallButton();
  return panel;
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

function installCompanyWorkspace(iframe){
  if(frame!==iframe || !iframe.isConnected) return;
  const doc = iframe.contentDocument;
  if(!doc?.head || !doc.querySelector('.workspace')) return;
  doc.title = '요리계산기';
  const innerTitle = doc.querySelector('.header h1');
  if(innerTitle) innerTitle.textContent = '요리계산기';
  // Content styles are ONLY injected into the company iframe. Original HUB COOK is unaffected.
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/company-cook/company-style.css';
  stylesheet.onload = () => {
    if(frame!==iframe) return;
    try {
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
// No logo/status flash on fast connections: leave neutral background until the check resolves.
void checkStatus();
