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

  /* Public catalog and protected editor live together in Data, not in another app route. */
  .cc-view-head .cc-manage-status{font-size:11px;color:#b8c8d5}
  .cc-data-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:9px 0 12px}
  .cc-data-toolbar .cc-button{min-height:33px}
  .cc-data-item{display:flex;gap:9px;align-items:center;justify-content:space-between;min-width:0}
  .cc-data-select{min-width:0;flex:1;text-align:left;cursor:pointer;border:0;padding:0;background:none;color:inherit}
  .cc-data-select strong{font-size:12px}
  .cc-data-select:hover strong,.cc-data-select:focus-visible strong{color:#f3c57c}
  .cc-data-select:focus-visible{outline:2px solid #ecc37c;outline-offset:3px}
  .cc-data-active{border-color:#b08a52;background:#1c2024}
  .cc-data-detail{padding:16px;border:1px solid #695335;border-radius:11px;background:#121a20;margin-top:12px}
  .cc-data-detail h3{margin:0 0 7px;font-size:16px;color:#f1e8d9}
  .cc-data-detail .cc-data-meta{font-size:11px;color:#a9b9c5;margin:0 0 9px}
  .cc-data-parts{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 14px}
  .cc-data-part{border:1px solid #3b4853;border-radius:8px;padding:6px 9px;background:#1a242b;color:#dfe9f0;font-size:11px}
  .cc-data-toolbar .cc-link{font-size:11px}
  .cc-editor-dialog{max-width:min(660px,calc(100vw - 28px));width:100%;max-height:min(85dvh,800px);
    overflow-y:auto;border:1px solid #8b6c40;border-radius:14px;background:#171f27;color:#eef3f8;
    box-shadow:0 25px 70px #000b;padding:21px}
  .cc-editor-dialog::backdrop{background:#000c}
  .cc-editor-dialog h2{font-size:18px;margin:0 0 12px}
  .cc-editor-dialog label{display:grid;gap:5px;font-size:11px;font-weight:750;color:#c4d0dd}
  .cc-editor-dialog input,.cc-editor-dialog select{width:100%;min-width:0;background:#0e151b;color:#f4f5f5;border:1px solid #485461;
    border-radius:8px;padding:9px;font-size:12px}
  .cc-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
  .cc-editor-grid .cc-span-all{grid-column:1/-1}
  .cc-editor-ingredients{display:grid;gap:8px;margin:10px 0}
  .cc-editor-ingredient-row{display:grid;grid-template-columns:minmax(0,1fr) 100px 32px;gap:6px;align-items:center}
  .cc-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:13px}
  .cc-editor-status{font-size:11px;min-height:20px;color:#f0be83}
  .cc-data-help{font-size:11px;color:#9fb1c0;margin:8px 0}
  @media(max-width:600px){.cc-editor-dialog{padding:13px}.cc-editor-grid{grid-template-columns:1fr}
    .cc-editor-ingredient-row{grid-template-columns:minmax(0,1fr) 74px 30px}}
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
const studioStyles = document.createElement('link');
studioStyles.rel='stylesheet';
studioStyles.href='/company-cook/data-studio.css';
document.head.append(studioStyles);

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
let catalogSnapshot = null;
let adminStatus = 'unknown';
let dataSelectedKey = '';
let dataFilterText = '';
let dataKind = 'food';
let dataModifiedOnly = false;
let dataEditing = null;
let studioRefs = null;
let dataNotice = '';
let dataFetchEpoch = 0;
let pendingHomeRefresh = false;
let fishDbReady = false;
let fishDbError = '';
let fishSourceError = '';
let fishAreaFilter = 'all';
let fishResearchOnly = false;


function resetView(){
  frameResizeObserver?.disconnect();
  frameResizeObserver = null;
  frameResizeCleanup?.();
  frameResizeCleanup = null;
  frame = null;
  dataEditing = null;studioRefs = null;
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
  if(view===currentView && dataEditing)return;
  if(currentView==='data'&&view!=='data'&&!studioConfirmExit())return;
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
  if(view==='home'){
    if(pendingHomeRefresh && frame){
      pendingHomeRefresh=false;
      frame.style.visibility='hidden';
      // Local recipe workspace is autosaved by the existing calculator.
      frame.src='/cook-preview/index.html?lacCookHostPreview=1';
    }
    return;
  }
  if(view==='settings')paintAppSettings();
  if(view==='data'){
    paintAppData();
    if(!dataLoaded && !dataLoadInFlight)void loadAppData();
    if(adminStatus==='unknown')void checkEditorAdmin().then(()=>{if(currentView==='data')paintAppData();});
  }
}
function makeText(tag,className,text){
  const item=document.createElement(tag);if(className)item.className=className;
  if(text!=null)item.textContent=text;return item;
}
function paintAppSettings(){
  if(!viewHost)return;
  viewHost.replaceChildren();
  const heading=makeText('h2','','설정');
  const box=makeText('div','cc-view-card',null);
  box.append(makeText('h3','','준비 중'),makeText('p','','필요한 설정이 생기면 이곳에 추가할 예정입니다. 지금은 기존 계산기와 저장 방식을 유지합니다.'));
  viewHost.append(heading,box);
}
// Same public catalog snapshot + DB overlays that the HUB calculator uses.
// All edits are in this parent context. The anonymous iframe never receives credentials.
const dataKey=item=>`${item.kind}:${item.id}`;
const normName=value=>String(value||'').trim().toLocaleLowerCase('ko');
const validPosInt=(value,max)=>String(value).trim()!==''&&Number.isSafeInteger(Number(value))&&Number(value)>0&&Number(value)<=max;
function baselineProcessRows(name){
  return (catalogSnapshot?.processes||[]).filter(row=>row.is_active==='TRUE'&&row.process_material_name===name);
}
function ingredientNames(){
  const rows=catalogSnapshot||{};
  return [...new Set([
    ...(rows.materials||[]).map(row=>row.material_name),
    ...(rows.farms||[]).map(row=>row.material_name),
    ...(rows.fish||[]).map(row=>row.result_material_name),
    ...(rows.processes||[]).flatMap(row=>[row.input_material_name,row.process_material_name]),
    ...(rows.recipes||[]).map(row=>row.material_name),
  ].filter(Boolean))];
}
function normalizeData(catalog,recipeRows,processRows){
  const foods=new Map();
  for(const row of catalog.foods||[]){
    if(row.is_active!=='TRUE')continue;
    const ingredients=(catalog.recipes||[]).filter(part=>part.is_active==='TRUE'&&part.food_name===row.food_name)
      .map(part=>({name:part.material_name,qty:Number(part.required_qty)})).filter(p=>p.name&&validPosInt(p.qty,999999));
    foods.set(row.food_id,{id:row.food_id,kind:'food',name:row.food_name,time:row.cook_time,qty:row.set_qty,
      ingredients,version:null,sourceKind:'baseline'});
  }
  for(const row of recipeRows){
    const previous=foods.get(row.food_id);
    foods.set(row.food_id,{...previous,id:row.food_id,kind:'food',name:row.food_name,time:row.cook_time,
      qty:row.set_qty,ingredients:row.ingredients||[],version:row.version,sourceKind:row.source_kind});
  }
  const processes=new Map();
  for(const row of catalog.processes||[]){
    if(row.is_active!=='TRUE'||!row.process_material_name)continue;
    const name=row.process_material_name;
    const record=processes.get(name)||{id:name,kind:'process',name,time:row.process_time,qty:row.result_qty,
      ingredients:[],version:null,sourceKind:'baseline'};
    if(row.input_material_name&&validPosInt(row.required_qty,999999))
      record.ingredients.push({name:row.input_material_name,qty:Number(row.required_qty)});
    processes.set(name,record);
  }
  for(const row of processRows){
    const previous=processes.get(row.process_material_name);
    processes.set(row.process_material_name,{...previous,id:row.process_material_name,kind:'process',name:row.process_material_name,
      time:row.process_time||previous?.time||'',qty:row.result_qty,
      ingredients:row.ingredients===null?(previous?.ingredients||[]):row.ingredients||[],
      dbIngredients:row.ingredients,version:row.version,sourceKind:row.source_kind});
  }
  return [...foods.values(),...processes.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
// Fish processing is its own data family, NOT a cooking or general processing recipe.
// The coastal baseline comes from the existing COOK catalog; freshwater successes and
// failed experiments are maintained as separate research records.
function normalizeFishData(coastalRows,freshwaterRows,storedRows){
  const fish=new Map();
  const key=(area,name)=>`${area}:${name}`;
  for(const row of coastalRows||[]){
    if(row.is_active!=='TRUE'||!row.fish_name)continue;
    const name=String(row.fish_name);
    fish.set(key('general',name),{
      id:key('general',name),kind:'fish',name,area:'general',status:'confirmed',
      inputQty:Number(row.input_qty),outputQty:Number(row.result_qty),
      outputMaterial:String(row.result_material_name||''),time:String(row.process_time||'10초'),
      failedAttempts:[],note:'',version:null,sourceKind:'baseline'
    });
  }
  for(const row of freshwaterRows||[]){
    if(!row||typeof row.fish_name!=='string')continue;
    const name=row.fish_name.trim();if(!name)continue;
    fish.set(key('freshwater',name),{
      id:key('freshwater',name),kind:'fish',name,area:'freshwater',
      status:row.status==='confirmed'?'confirmed':'research',
      inputQty:row.input_qty==null?null:Number(row.input_qty),
      outputQty:row.output_qty==null?null:Number(row.output_qty),
      outputMaterial:row.output_material||'',time:row.process_time||'10초',
      failedAttempts:Array.isArray(row.failed_attempts)?row.failed_attempts:[],
      note:String(row.note||''),version:null,sourceKind:'baseline'
    });
  }
  for(const row of storedRows||[]){
    if(!row||!['general','freshwater'].includes(row.area)||typeof row.fish_name!=='string')continue;
    const name=row.fish_name;
    fish.set(key(row.area,name),{
      id:key(row.area,name),kind:'fish',name,area:row.area,
      status:row.status==='confirmed'?'confirmed':'research',
      inputQty:row.input_qty==null?null:Number(row.input_qty),
      outputQty:row.output_qty==null?null:Number(row.output_qty),
      outputMaterial:row.output_material||'',time:row.process_time||'10초',
      failedAttempts:Array.isArray(row.failed_attempts)?row.failed_attempts:[],
      note:String(row.note||''),version:row.version,sourceKind:'override'
    });
  }
  return [...fish.values()].sort((a,b)=>a.area===b.area?a.name.localeCompare(b.name,'ko'):(a.area==='general'?-1:1));
}
async function checkEditorAdmin(){
  adminStatus='checking';
  try{
    const {data:user,error:userError}=await supabase.auth.getUser();
    if(userError||!user?.user){adminStatus='guest';return false;}
    const {data,error}=await supabase.rpc('platform_is_admin');
    adminStatus=(!error&&data===true)?'admin':'denied';
  }catch{adminStatus='denied';}
  return adminStatus==='admin';
}
async function refreshAdminButton(button){
  if(button)button.disabled=true;
  await checkEditorAdmin();
  if(currentView==='data')paintAppData();
}
async function loadAppData(){
  if(dataLoadInFlight)return;
  const epoch=++dataFetchEpoch;
  dataLoadInFlight=true;dataError='';
  try{
    const catalogUrl = new URL('/cook-preview/data/catalog.js',window.location.origin).href;
    const {default:catalog} = await import(/* @vite-ignore */ catalogUrl);
    const [recipes,processes,fishSource,fishRows]=await Promise.all([
      supabase.from('lac_cook_recipe_entries').select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').order('food_name'),
      supabase.from('lac_cook_process_entries').select('process_material_name,result_qty,process_time,ingredients,source_kind,version').order('process_material_name'),
      fetch('/company-cook/freshwater-fishing.json',{cache:'no-store'}).then(r=>{
        if(!r.ok)throw Error('민물 연구 자료를 불러올 수 없습니다.');return r.json();
      }).catch(error=>({error:String(error?.message||error),entries:[]})),
      supabase.from('lac_cook_fish_entries').select('area,fish_name,status,input_qty,output_material,output_qty,process_time,failed_attempts,note,version').order('fish_name'),
    ]);
    if(recipes.error||processes.error)throw Error('공통 DB 조회 실패');
    if(epoch!==dataFetchEpoch)return;
    fishDbReady=!fishRows.error;
    fishDbError=fishRows.error?'생선 전용 DB 연결 전입니다. 확정된 기존 자료는 조회할 수 있지만, 앱에서 수정하려면 생선 SQL을 먼저 적용해야 합니다.':'';
    fishSourceError=fishSource?.error||'';
    catalogSnapshot=catalog;
    dataCache=[...normalizeData(catalog,recipes.data||[],processes.data||[]),
      ...normalizeFishData(catalog.fish||[],fishSource.entries||[],fishDbReady?(fishRows.data||[]):[])];
    dataLoaded=true;
  }catch(error){
    if(epoch!==dataFetchEpoch)return;
    dataError='데이터를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
    console.warn('COOK 데이터 로딩:',error?.message||error);
  }finally{
    if(epoch===dataFetchEpoch){dataLoadInFlight=false;if(currentView==='data')paintAppData();}
  }
}
/* Company-only recipe library. The HUB calculator and its editor remain untouched. */
function studioPartName(kind){return kind==='food'?'요리 레시피':kind==='process'?'가공 재료':'생선 가공';}
function studioTime(item){return item.kind==='food'?`${item.time??'미확인'}초`:(item.time||'미확인');}
function studioStatus(item){return item.kind==='fish'?(item.status==='confirmed'?'확인됨':'연구 중'):(item.sourceKind==='new'?'신규 등록':item.version!=null?'수정됨':'기본 데이터');}
function studioElement(tag,className='',value=null){return makeText(tag,className,value);}
function studioButton(label,className='cc-studio-btn',fn){
  const button=studioElement('button',className,label);button.type='button';
  if(fn)button.addEventListener('click',fn);
  return button;
}
function studioConfirmExit(){
  if(!dataEditing)return true;
  if(dataEditing.saving)return false;
  if(dataEditing.dirty&&!window.confirm('저장하지 않은 레시피 변경 내용이 있습니다. 버리고 이동할까요?'))return false;
  dataEditing=null;return true;
}
function studioCancelEdit(){
  const returnKey=dataEditing?.returnKey||'';
  if(!studioConfirmExit())return;
  if(returnKey)dataSelectedKey=returnKey;
  studioRefs?.renderList?.();
}
function studioChoose(kind,item){
  if(!studioConfirmExit())return;
  dataKind=kind;
  dataSelectedKey=item?dataKey(item):'';
  studioRefs?.renderList?.();
  if(item&&window.matchMedia('(max-width: 760px)').matches){
    requestAnimationFrame(()=>viewHost?.querySelector('.cc-studio-content')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
}
function studioBeginEdit(kind,item=null){
  if(adminStatus!=='admin'||!dataLoaded)return;
  if(!studioConfirmExit())return;
  const returnKey=dataSelectedKey;
  if(kind==='fish'&&!fishDbReady)return;
  dataKind=kind;dataSelectedKey=item?dataKey(item):'';
  dataEditing={kind,item,returnKey,dirty:false,saving:false};
  studioRefs?.renderList?.();
}
function paintAppData(){
  if(!viewHost||currentView!=='data')return;
  studioRefs=null;viewHost.replaceChildren();
  viewHost.classList.add('cc-studio-host');
  const root=studioElement('div','cc-studio');
  const heading=studioElement('div','cc-studio-heading');
  const identity=studioElement('div','cc-studio-identity');
  identity.append(studioElement('span','cc-studio-eyebrow','LAC COOK  /  LIBRARY'),
    studioElement('h2','','데이터 라이브러리'),
    studioElement('p','','요리·가공·생선 자료를 각각 관리합니다. 낚시로 얻는 생선 가공은 일반 레시피와 별도로 표시됩니다.'));
  const headActions=studioElement('div','cc-studio-head-actions');
  const roleText=adminStatus==='admin'?'관리자 · 편집 가능':adminStatus==='checking'?'권한 확인 중':adminStatus==='guest'?'일반 이용 · 읽기 전용':adminStatus==='denied'?'일반 이용 · 읽기 전용':'읽기 전용';
  headActions.append(studioElement('span',`cc-studio-role ${adminStatus==='admin'?'is-admin':''}`,roleText));
  const authBtn=studioButton('권한 확인','cc-studio-btn cc-studio-btn-quiet',()=>{
    if(!studioConfirmExit())return;
    authBtn.disabled=true;
    void checkEditorAdmin().then(()=>{if(currentView==='data')paintAppData();});
  });
  headActions.append(authBtn);
  heading.append(identity,headActions);root.append(heading);

  const toolbar=studioElement('div','cc-studio-toolbar');
  const tabs=studioElement('div','cc-studio-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','데이터 종류');
  const categoryButtons=new Map();
  const foodTotal=dataCache.filter(item=>item.kind==='food').length;
  const processTotal=dataCache.filter(item=>item.kind==='process').length;
  const fishTotal=dataCache.filter(item=>item.kind==='fish').length;
  for(const [kind,label,count] of [['food','요리 레시피',foodTotal],['process','가공 재료',processTotal],['fish','생선 가공',fishTotal]]){
    const button=studioButton('',`cc-studio-tab ${kind===dataKind?'is-active':''}`,()=>{
      if(kind===dataKind)return;
      if(!studioConfirmExit())return;
      dataKind=kind;dataSelectedKey='';dataFilterText='';dataModifiedOnly=false;fishResearchOnly=false;paintAppData();
    });
    button.setAttribute('role','tab');button.setAttribute('aria-selected',String(kind===dataKind));
    const icon=studioElement('span','cc-studio-tab-icon',kind==='food'?'♨':kind==='process'?'⚙':'♧');icon.setAttribute('aria-hidden','true');
    const name=studioElement('span','',label);const countEl=studioElement('span','cc-studio-tab-count',String(count));
    button.append(icon,name,countEl);tabs.append(button);categoryButtons.set(kind,button);
  }
  const right=studioElement('div','cc-studio-toolbar-right');
  const refresh=studioButton('↻  데이터 새로고침','cc-studio-btn cc-studio-btn-quiet',()=>{
    if(!studioConfirmExit())return;
    if(dataLoadInFlight)return;
    refresh.disabled=true;void loadAppData();
  });
  right.append(refresh);
  if(adminStatus==='admin'&&(dataKind!=='fish'||fishDbReady)){
    right.append(studioButton(dataKind==='food'?'+  새 요리 등록':dataKind==='process'?'+  새 가공 재료':'+  생선 기록 등록',
      'cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit(dataKind)));
  }
  toolbar.append(tabs,right);root.append(toolbar);
  if(dataNotice){const notice=studioElement('div','cc-studio-success',dataNotice);root.append(notice);dataNotice='';}
  if(dataKind==='fish'){
    const meta=studioElement('div','cc-studio-fish-summary');
    const coastCount=dataCache.filter(item=>item.kind==='fish'&&item.area==='general').length;
    const riverCount=dataCache.filter(item=>item.kind==='fish'&&item.area==='freshwater').length;
    const researchCount=dataCache.filter(item=>item.kind==='fish'&&item.status==='research').length;
    meta.append(studioElement('span','','일반 낚시터  '+coastCount+'종'),studioElement('span','','민물 낚시터  '+riverCount+'종'),studioElement('span','is-research','연구 중  '+researchCount+'종'));
    root.append(meta);
    const expl=studioElement('p','cc-studio-fish-info',
      '생선 가공은 낚시한 물고기 → 생선살 산출량을 기록하는 별도 자료입니다. 일반 요리·가공식에 중복 등록되지 않으며, 기존 자동 제작 계산에는 아직 반영되지 않습니다.');
    root.append(expl);
    if(fishDbError||fishSourceError)root.append(studioElement('p','cc-studio-fish-warning',[fishDbError,fishSourceError].filter(Boolean).join(' ')));
  }
  if(adminStatus!=='admin'){
    const tip=studioElement('div','cc-studio-tip');
    tip.append(studioElement('span','',dataKind==='fish'?'생선 자료는 누구나 볼 수 있으며, 등록·수정은 플랫폼 관리자만 가능합니다.':'레시피는 자유롭게 조회할 수 있습니다. 추가·수정은 플랫폼 관리자만 가능합니다.'));
    const login=studioElement('a','cc-studio-tip-link','HUB 관리자 로그인 ↗');login.href='/';login.target='_blank';login.rel='noopener noreferrer';tip.append(login);
    root.append(tip);
  }
  if(dataError){
    const error=studioElement('div','cc-studio-feedback');error.append(studioElement('strong','','데이터 연결 실패'),
      studioElement('p','',dataError),studioButton('다시 불러오기','cc-studio-btn cc-studio-btn-accent',()=>void loadAppData()));
    root.append(error);viewHost.append(root);return;
  }
  if(!dataLoaded){
    const loading=studioElement('div','cc-studio-feedback');loading.append(studioElement('strong','','레시피를 불러오는 중입니다'),studioElement('p','','공통 요리·가공 데이터를 확인하고 있습니다.'));
    root.append(loading);viewHost.append(root);return;
  }

  const workspace=studioElement('div','cc-studio-workspace');
  const browser=studioElement('aside','cc-studio-browser');browser.setAttribute('aria-label','레시피 목록');
  const browserTop=studioElement('div','cc-studio-browser-top');
  const searchLabel=studioElement('label','cc-studio-search-label');
  const searchSymbol=studioElement('span','','⌕');searchSymbol.setAttribute('aria-hidden','true');
  const search=studioElement('input','cc-studio-search');search.type='search';search.value=dataFilterText;
  search.placeholder=dataKind==='food'?'요리 이름으로 검색':dataKind==='process'?'가공 재료 이름으로 검색':'물고기 이름으로 검색';search.setAttribute('aria-label','레시피 검색');
  searchLabel.append(searchSymbol,search);browserTop.append(searchLabel);
  if(dataKind==='fish'){
    const areaFilter=studioElement('select','cc-studio-fish-area');areaFilter.setAttribute('aria-label','낚시터 구분');
    for(const [value,label] of [['all','전체 낚시터'],['general','일반 낚시터'],['freshwater','민물 낚시터']]){
      const option=studioElement('option','',label);option.value=value;areaFilter.append(option);
    }
    areaFilter.value=fishAreaFilter;
    areaFilter.addEventListener('change',()=>{fishAreaFilter=areaFilter.value;dataSelectedKey='';renderList();});
    browserTop.append(areaFilter);
  }
  const filterBar=studioElement('div','cc-studio-filter-line');
  const quantity=studioElement('span','cc-studio-count','');
  const modified=studioElement('label','cc-studio-modified');const modifiedCheck=studioElement('input');modifiedCheck.type='checkbox';modifiedCheck.checked=dataKind==='fish'?fishResearchOnly:dataModifiedOnly;
  modified.append(modifiedCheck,studioElement('span','',dataKind==='fish'?'연구 중만':'수정된 데이터만'));filterBar.append(quantity,modified);
  browserTop.append(filterBar);
  const list=studioElement('div','cc-studio-list');list.setAttribute('role','list');list.setAttribute('aria-label',studioPartName(dataKind));
  browser.append(browserTop,list);
  const content=studioElement('section','cc-studio-content');content.setAttribute('aria-label','레시피 상세 및 편집');
  workspace.append(browser,content);root.append(workspace);viewHost.append(root);

  const shown=()=>dataCache.filter(item=>item.kind===dataKind &&
    (dataKind==='fish'?((fishAreaFilter==='all'||item.area===fishAreaFilter)&&(!fishResearchOnly||item.status==='research')):
      (!dataModifiedOnly||item.version!=null)) &&
    normName(item.name).includes(normName(dataFilterText)));
  const renderList=()=>{
    const entries=shown();list.replaceChildren();
    quantity.textContent=`${entries.length.toLocaleString('ko-KR')}개 항목`;
    if(!dataEditing && !entries.some(item=>dataKey(item)===dataSelectedKey))
      dataSelectedKey=entries[0]?dataKey(entries[0]):'';
    if(!entries.length){
      const empty=studioElement('div','cc-studio-list-empty');empty.append(studioElement('strong','','검색 결과가 없습니다'),
        studioElement('p','','검색어 또는 필터를 변경해 주세요.'));
      list.append(empty);
    }
    for(const item of entries){
      const selected=dataKey(item)===dataSelectedKey;
      const tile=studioButton('',`cc-studio-list-item ${selected?'is-selected':''}`,()=>studioChoose(dataKind,item));
      tile.setAttribute('aria-pressed',String(selected));
      const top=studioElement('span','cc-studio-list-main');top.append(studioElement('strong','',item.name));
      const tag=studioElement('span',`cc-studio-tag ${item.kind==='fish'?(item.status==='research'?'is-research':'is-revised'):(item.version!=null?'is-revised':'')}`,studioStatus(item));top.append(tag);
      const bottom=studioElement('span','cc-studio-list-meta');
      bottom.textContent=item.kind==='fish'
        ?`${item.area==='general'?'일반':'민물'} 낚시터 · ${item.status==='confirmed'?`${item.inputQty}마리 → ${item.outputMaterial} ${item.outputQty}개`:'성공 조합 미확정'}`
        :`생산 ${item.qty||'미확인'}  ·  ${studioTime(item)}  ·  재료 ${(item.ingredients||[]).length}종`;
      tile.append(top,bottom);list.append(tile);
    }
    renderDetail();
  };
  const renderDetail=()=>{
    if(dataEditing && content.firstElementChild?.__editing===dataEditing)return;
    content.replaceChildren();
    if(dataEditing){renderStudioEditor(content,dataEditing);return;}
    const item=dataCache.find(row=>dataKey(row)===dataSelectedKey && row.kind===dataKind);
    if(!item){
      const empty=studioElement('div','cc-studio-detail-empty');empty.append(studioElement('span','cc-studio-empty-icon','♨'),
        studioElement('h3','','레시피를 선택해 주세요'),studioElement('p','','왼쪽 목록에서 요리나 가공 재료를 선택하면 상세 정보가 표시됩니다.'));
      content.append(empty);return;
    }
    if(item.kind==='fish'){renderFishDetail(content,item);return;}
    const detailTop=studioElement('div','cc-studio-detail-top');
    const text=studioElement('div','cc-studio-detail-title');
    text.append(studioElement('span','cc-studio-eyebrow',item.kind==='food'?'COOKING RECIPE':'PROCESSING RECIPE'),
      studioElement('h3','',item.name));
    const meta=studioElement('div','cc-studio-detail-tags');
    meta.append(studioElement('span','cc-studio-label-chip',studioPartName(item.kind)),
      studioElement('span',`cc-studio-label-chip ${item.version!=null?'is-accent':''}`,studioStatus(item)));
    text.append(meta);detailTop.append(text);
    if(adminStatus==='admin'){
      detailTop.append(studioButton('✎  레시피 수정','cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit(item.kind,item)));
    }
    content.append(detailTop);
    const metrics=studioElement('div','cc-studio-metrics');
    const addMetric=(label,value,icon)=>{
      const cell=studioElement('div','cc-studio-metric');cell.append(studioElement('span','',`${icon}  ${label}`),studioElement('strong','',String(value)));metrics.append(cell);
    };
    addMetric(item.kind==='food'?'1세트 완성 수량':'1회 가공 생산량',item.qty||'미확인','◈');
    addMetric(item.kind==='food'?'조리 시간':'가공 소요시간',studioTime(item),'◷');
    addMetric('투입 재료',`${(item.ingredients||[]).length}종`,'▤');
    content.append(metrics);
    const section=studioElement('div','cc-studio-ingredient-section');
    const title=studioElement('div','cc-studio-section-title');
    title.append(studioElement('div','',null));title.firstChild.append(studioElement('span','cc-studio-section-index','01'),studioElement('strong','','필요 재료'));
    title.append(studioElement('span','cc-studio-section-note',item.kind==='food'?'1세트 제작 기준':'1회 가공 기준'));
    section.append(title);
    const ingredients=studioElement('div','cc-studio-ingredient-list');
    if((item.ingredients||[]).length){
      for(const [i,part] of item.ingredients.entries()){
        const row=studioElement('div','cc-studio-ingredient-display');
        row.append(studioElement('span','cc-studio-ingredient-index',String(i+1).padStart(2,'0')),
          studioElement('strong','',part.name),studioElement('span','cc-studio-ingredient-qty',`× ${part.qty}`));
        ingredients.append(row);
      }
    }else{ingredients.append(studioElement('p','cc-studio-no-ingredients','등록된 재료 정보가 없습니다.'));}
    section.append(ingredients);content.append(section);
    const foot=studioElement('div','cc-studio-detail-foot');
    foot.append(studioElement('span','','공통 데이터 · 변경 사항은 HUB COOK과 공유됩니다.'));
    if(item.version!=null)foot.append(studioElement('span','',`버전 ${item.version}`));
    content.append(foot);
  };
  studioRefs={renderList,renderDetail};
  search.addEventListener('input',()=>{dataFilterText=search.value;renderList();});
  modifiedCheck.addEventListener('change',()=>{
    if(dataKind==='fish')fishResearchOnly=modifiedCheck.checked;
    else dataModifiedOnly=modifiedCheck.checked;
    dataSelectedKey='';renderList();
  });
  renderList();
}
// Fish-only library detail. No food/process catalog mutation and no fish auto-crafting recipes.
function renderFishDetail(content,item){
  const head=studioElement('div','cc-studio-detail-top');
  const info=studioElement('div','cc-studio-detail-title');
  info.append(studioElement('span','cc-studio-eyebrow',item.area==='general'?'GENERAL FISHING':'FRESHWATER RESEARCH'),
    studioElement('h3','',item.name));
  const tags=studioElement('div','cc-studio-detail-tags');
  tags.append(studioElement('span','cc-studio-label-chip',item.area==='general'?'일반 낚시터':'민물 낚시터'),
    studioElement('span',`cc-studio-label-chip ${item.status==='confirmed'?'is-accent':''}`,studioStatus(item)));
  info.append(tags);head.append(info);
  if(adminStatus==='admin'&&fishDbReady)head.append(studioButton('✎  생선 기록 수정','cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit('fish',item)));
  content.append(head);
  if(item.status!=='confirmed'){
    const research=studioElement('div','cc-studio-fish-research');
    research.append(studioElement('strong','','가공 성공 조합 미확정'),studioElement('p','','민물낚시 연구가 진행 중입니다. 실패한 투입 마릿수를 확정된 레시피처럼 계산에 사용하지 않습니다.'));
    if(item.failedAttempts?.length)research.append(studioElement('div','cc-studio-fish-failures','가공 실패 기록  ·  '+item.failedAttempts.map(n=>`${n}마리`).join(' / ')));
    if(item.note)research.append(studioElement('p','',item.note));
    content.append(research);
  }else{
    const flow=studioElement('section','cc-studio-fish-flow');
    const from=studioElement('div','cc-studio-fish-step');
    from.append(studioElement('span','cc-studio-fish-step-label','투입 물고기'),
      studioElement('strong','',`${item.inputQty}마리`),studioElement('small','',item.name));
    const arrow=studioElement('span','cc-studio-fish-arrow','➜');arrow.setAttribute('aria-hidden','true');
    const to=studioElement('div','cc-studio-fish-step is-output');
    to.append(studioElement('span','cc-studio-fish-step-label','가공 결과'),
      studioElement('strong','',`${item.outputQty}개`),studioElement('small','',item.outputMaterial));
    flow.append(from,arrow,to);content.append(flow);
    const metrics=studioElement('div','cc-studio-fish-stats');
    metrics.append(studioElement('span','','1회 투입 '+item.inputQty+'마리'),
      studioElement('span','','가공시간 '+studioTime(item)),
      studioElement('span','','1회 산출 '+item.outputQty+'개'));
    content.append(metrics);
    const calc=studioElement('section','cc-studio-fish-calc');
    calc.append(studioElement('strong','','보유 생선 수량 계산'));
    const row=studioElement('div','cc-studio-fish-calc-row');
    const label=studioElement('label');label.append(studioElement('span','','보유 마릿수'));
    const input=studioElement('input');input.type='number';input.min='0';input.step='1';input.max='999999';
    input.value=String(item.inputQty);input.setAttribute('aria-label','보유 생선 마릿수');label.append(input);
    const output=studioElement('div','cc-studio-fish-calc-out');
    const recalc=()=>{
      const valid=/^\d+$/.test(input.value)&&Number.isSafeInteger(Number(input.value))&&Number(input.value)<=999999;
      if(!valid){output.textContent='0 이상의 정수 마릿수를 입력해 주세요.';return;}
      const amount=Number(input.value),runs=Math.floor(amount/item.inputQty),remain=amount%item.inputQty;
      output.replaceChildren(studioElement('strong','',`${item.outputMaterial} ${(runs*item.outputQty).toLocaleString('ko-KR')}개`),
        studioElement('small','',`가공 ${runs.toLocaleString('ko-KR')}회 · 생선 ${remain}마리 남음`));
    };
    input.addEventListener('input',recalc);row.append(label,output);calc.append(row);content.append(calc);recalc();
  }
  const foot=studioElement('div','cc-studio-detail-foot');
  foot.append(studioElement('span','','생선 전용 자료 · 일반 요리/가공 레시피에는 추가되지 않습니다.'));
  if(item.version!=null)foot.append(studioElement('span','',`생선 기록 버전 ${item.version}`));
  content.append(foot);
}
function renderFishEditor(content,editing){
  const item=editing.item;
  const form=studioElement('form','cc-studio-editor cc-studio-fish-editor');form.noValidate=true;
  const top=studioElement('div','cc-studio-editor-heading');
  const title=studioElement('div');title.append(studioElement('span','cc-studio-eyebrow',item?'EDIT FISH':'NEW FISH RECORD'),
    studioElement('h3','',item?'생선 가공 정보 수정':'새 생선 기록 등록'),
    studioElement('p','','가공 투입량과 생선살 산출량을 저장합니다. 연구 중인 조합은 성공 결과를 비워두세요.'));
  top.append(title,studioButton('←  상세로 돌아가기','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit));form.append(top);
  const card=studioElement('div','cc-studio-form-block');
  const grid=studioElement('div','cc-studio-form-grid');
  const field=(label,value,type='text')=>{
    const wrap=studioElement('label','cc-studio-field');wrap.append(studioElement('span','',label));
    const input=studioElement('input');input.type=type;input.value=value==null?'':String(value);
    if(type==='number'){input.min='1';input.max='100000';input.step='1';input.inputMode='numeric';}
    if(type==='text')input.maxLength=100;
    wrap.append(input);return {wrap,input};
  };
  const name=field('물고기 이름',item?.name||'');if(item)name.input.readOnly=true;
  const areaWrap=studioElement('label','cc-studio-field');areaWrap.append(studioElement('span','','낚시터'));
  const area=studioElement('select');area.className='cc-studio-fish-select';
  for(const [value,label] of [['general','일반 낚시터'],['freshwater','민물 낚시터']]){
    const option=studioElement('option','',label);option.value=value;area.append(option);
  }
  area.value=item?.area||'general';area.disabled=Boolean(item);areaWrap.append(area);
  const statusWrap=studioElement('label','cc-studio-field');statusWrap.append(studioElement('span','','연구 상태'));
  const status=studioElement('select');status.className='cc-studio-fish-select';
  for(const [value,label] of [['confirmed','가공 결과 확인'],['research','연구 중 / 미확정']]){
    const option=studioElement('option','',label);option.value=value;status.append(option);
  }
  status.value=item?.status||'research';statusWrap.append(status);
  const inputQty=field('1회 투입 생선 수',''+(item?.inputQty??''),'number');
  const material=field('생선살 종류',item?.outputMaterial||'');
  const choices=studioElement('datalist');choices.id='cc-fish-material-options';
  for(const n of ['흰살생선','분홍살생선','민물 생선살']){const opt=studioElement('option');opt.value=n;choices.append(opt);}
  material.input.setAttribute('list',choices.id);
  const outputQty=field('1회 획득 생선살 수',item?.outputQty,'number');
  const time=field('가공 소요시간',item?.time||'10초');
  grid.append(name.wrap,areaWrap,statusWrap,inputQty.wrap,material.wrap,outputQty.wrap,time.wrap,choices);
  card.append(grid);
  const extra=studioElement('div','cc-studio-fish-experiment');
  const failed=field('실패한 투입 마릿수',item?.failedAttempts?.join(', ')||'');
  failed.input.placeholder='예: 1, 2, 3, 5';extra.append(failed.wrap);
  const note=studioElement('label','cc-studio-field');note.append(studioElement('span','','연구 메모'));
  const memo=studioElement('textarea');memo.maxLength=500;memo.placeholder='가공 실패나 추가 연구 정보를 기록하세요.';memo.value=item?.note||'';
  note.append(memo);extra.append(note);card.append(extra);
  const toggle=()=>{
    const isResearch=status.value==='research';
    for(const input of [inputQty.input,material.input,outputQty.input]){
      input.disabled=isResearch;input.closest('label')?.classList.toggle('cc-studio-fish-muted',isResearch);
    }
    extra.hidden=!isResearch;
  };
  status.addEventListener('change',toggle);toggle();form.append(card);
  const error=studioElement('p','cc-studio-form-status','');error.setAttribute('role','status');
  const actions=studioElement('div','cc-studio-form-actions');
  actions.append(studioElement('span','','생선 라이브러리 전용 기록으로 저장되며 기존 COOK 자동 제작 계산은 변경하지 않습니다.'));
  const buttons=studioElement('div');
  buttons.append(studioButton('취소','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit));
  const save=studioButton(item?'변경사항 저장':'생선 기록 등록','cc-studio-btn cc-studio-btn-accent');save.type='submit';buttons.append(save);
  actions.append(buttons);form.append(error,actions);
  const track=()=>{editing.dirty=true;};
  form.addEventListener('input',track);form.addEventListener('change',track);
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();if(editing.saving||!fishDbReady)return;
    const fishName=name.input.value.trim(),sp=area.value,st=status.value;
    const int=(raw,max=100000)=>/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))&&Number(raw)>=1&&Number(raw)<=max?Number(raw):null;
    const input=int(inputQty.input.value),output=int(outputQty.input.value);
    const outputMaterial=material.input.value.trim();const processTime=time.input.value.trim();
    let attempts=[];
    if(st==='research'){
      const raw=failed.input.value.trim();
      if(raw){
        if(!/^\d+(\s*,\s*\d+)*$/.test(raw)){error.textContent='실패 마릿수는 숫자를 쉼표로 구분해 입력해 주세요.';return;}
        attempts=[...new Set(raw.split(',').map(x=>Number(x.trim())))];
        if(attempts.length>30||attempts.some(n=>!Number.isSafeInteger(n)||n<1||n>100000)){
          error.textContent='실패한 마릿수는 1~100000 범위에서 최대 30개입니다.';return;
        }
      }
    }
    if(!fishName||fishName.length>90||!['general','freshwater'].includes(sp)||!processTime||processTime.length>40){
      error.textContent='물고기 이름과 낚시터·가공시간을 확인해 주세요.';return;
    }
    if(st==='confirmed'&&(!input||!output||!outputMaterial||outputMaterial.length>90)){
      error.textContent='확정된 가공식에는 투입 마릿수, 생선살 종류, 산출량이 모두 필요합니다.';return;
    }
    if(!item&&dataCache.some(x=>x.kind==='fish'&&x.area===sp&&normName(x.name)===normName(fishName))){
      error.textContent='이미 등록된 생선입니다. 목록에서 기존 기록을 수정해 주세요.';return;
    }
    const record={area:sp,fish_name:fishName,status:st,input_qty:st==='confirmed'?input:null,
      output_material:st==='confirmed'?outputMaterial:null,output_qty:st==='confirmed'?output:null,
      process_time:processTime,failed_attempts:st==='research'?attempts:[],note:st==='research'?memo.value.trim():''};
    editing.saving=true;save.disabled=true;error.textContent='생선 기록을 저장하고 있습니다…';
    try{
      if(!(await checkEditorAdmin()))throw Error('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
      let result;
      if(item?.version!=null){
        const version=Number(item.version);
        if(!Number.isSafeInteger(version)||version<1)throw Error('생선 기록의 버전 정보가 올바르지 않습니다.');
        result=await supabase.from('lac_cook_fish_entries').update({...record,version:version+1,updated_at:new Date().toISOString()})
          .eq('area',item.area).eq('fish_name',item.name).eq('version',version)
          .select('area,fish_name,version').maybeSingle();
        if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 최신 자료를 불러온 후 다시 시도해 주세요.');
      }else{
        result=await supabase.from('lac_cook_fish_entries').insert(record).select('area,fish_name,version').single();
      }
      if(result.error)throw result.error;
      dataEditing=null;dataNotice='생선 기록을 안전하게 저장했습니다.';
      dataSelectedKey=`fish:${sp}:${fishName}`;fishAreaFilter=sp;fishResearchOnly=false;dataLoaded=false;
      await loadAppData();
    }catch(ex){error.textContent='저장하지 못했습니다. '+String(ex?.message||ex);}
    finally{editing.saving=false;if(save.isConnected)save.disabled=false;}
  });
  content.append(form);form.__editing=editing;
}
function renderStudioEditor(content,editing){
  if(editing.kind==='fish'){renderFishEditor(content,editing);return;}
  const kind=editing.kind,item=editing.item,edit=Boolean(item);
  const form=studioElement('form','cc-studio-editor');form.noValidate=true;
  const top=studioElement('div','cc-studio-editor-heading');
  const titleArea=studioElement('div');titleArea.append(studioElement('span','cc-studio-eyebrow',edit?'EDIT RECIPE':'NEW RECIPE'),
    studioElement('h3','',`${kind==='food'?'요리':'가공 재료'} ${edit?'수정':'등록'}`),
    studioElement('p','',edit?'기본 정보와 투입 재료를 확인한 뒤 필요한 부분만 변경하세요.':'제작 정보와 투입 재료를 입력해 새 레시피를 등록하세요.'));
  const back=studioButton('←  상세로 돌아가기','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit);
  top.append(titleArea,back);form.append(top);
  const core=studioElement('section','cc-studio-form-block');
  const head=studioElement('div','cc-studio-section-title');head.append(studioElement('div','',null));
  head.firstChild.append(studioElement('span','cc-studio-section-index','01'),studioElement('strong','','기본 정보'));
  head.append(studioElement('span','cc-studio-section-note','필수 입력'));
  core.append(head);
  const fields=studioElement('div','cc-studio-form-grid');
  const field=(label,type,value,description='')=>{
    const wrapper=studioElement('label','cc-studio-field');wrapper.append(studioElement('span','',label));
    const input=studioElement('input');input.type=type;input.value=value==null?'':String(value);
    if(type==='text')input.maxLength=90;
    if(type==='number'){input.min='1';input.step='1';input.inputMode='numeric';}
    if(description)input.placeholder=description;
    wrapper.append(input);return {wrapper,input};
  };
  const name=field(kind==='food'?'요리 이름':'가공 결과물 이름','text',item?.name||'','이름을 입력해 주세요');
  if(edit&&kind==='process'){
    name.input.readOnly=true;
    name.wrapper.append(studioElement('small','cc-studio-readonly-note','기존 가공 결과물의 이름은 변경할 수 없습니다.'));
  }
  const qty=field(kind==='food'?'1세트 생산량':'1회 생산량','number',item?.qty??'','생산 수량');
  const time=field(kind==='food'?'조리시간 · 초':'가공 소요시간','text',item?.time??'','가공시간 예: 10초');
  if(kind==='food')time.input.placeholder='예: 13.5';
  fields.append(name.wrapper,qty.wrapper,time.wrapper);core.append(fields);form.append(core);
  const ingredientsBlock=studioElement('section','cc-studio-form-block');
  const ingHead=studioElement('div','cc-studio-section-title');ingHead.append(studioElement('div','',null));
  ingHead.firstChild.append(studioElement('span','cc-studio-section-index','02'),studioElement('strong','','투입 재료'));
  const ingredientCount=studioElement('span','cc-studio-section-note','');ingHead.append(ingredientCount);ingredientsBlock.append(ingHead);
  const preservation=kind==='process'&&edit&&item.sourceKind!=='new';
  const preserveLabel=studioElement('label','cc-studio-preserve');
  const keep=studioElement('input');keep.type='checkbox';keep.checked=preservation;
  if(preservation){
    const words=studioElement('span');words.append(studioElement('strong','','기존 가공 재료 구성 유지'),
      studioElement('small','','투입 재료는 유지하고 생산량·시간만 변경합니다. 필요하면 체크를 해제하고 재료를 직접 수정하세요.'));
    preserveLabel.append(keep,words);ingredientsBlock.append(preserveLabel);
  }
  const list=studioElement('div','cc-studio-edit-parts');
  const candidates=ingredientNames();
  const datalist=studioElement('datalist');datalist.id='cc-studio-part-options';
  for(const candidate of candidates){const o=studioElement('option');o.value=candidate;datalist.append(o);}
  const updateCount=()=>{
    const n=list.querySelectorAll('.cc-studio-edit-part').length;
    ingredientCount.textContent=`${n} / 24종`;
    const addButton=ingredientsBlock.querySelector('.cc-studio-add-part');
    if(addButton)addButton.disabled=n>=24;
    for(const button of list.querySelectorAll('.cc-studio-remove-part'))button.disabled=n<=1;
  };
  const createPart=(existing='')=>{
    if(list.querySelectorAll('.cc-studio-edit-part').length>=24)return null;
    const row=studioElement('div','cc-studio-edit-part');
    const index=studioElement('span','cc-studio-ingredient-index','');
    const material=studioElement('input');material.type='text';material.maxLength=90;material.placeholder='재료 선택 또는 입력';
    material.value=existing?.name||'';material.setAttribute('list',datalist.id);material.setAttribute('aria-label','투입 재료 이름');
    const amount=studioElement('input');amount.type='number';amount.min='1';amount.max='999999';amount.step='1';amount.inputMode='numeric';
    amount.value=existing?.qty==null?'':String(existing.qty);amount.placeholder='수량';amount.setAttribute('aria-label','투입 수량');
    const remove=studioButton('×','cc-studio-remove-part',()=>{row.remove();renumber();editing.dirty=true;});remove.setAttribute('aria-label','이 재료 삭제');
    row.append(index,material,amount,remove);list.append(row);renumber();return material;
  };
  const renumber=()=>{
    [...list.children].forEach((row,i)=>{row.firstChild.textContent=String(i+1).padStart(2,'0');});updateCount();
  };
  const initial=item?.ingredients||[];
  for(const part of initial.slice(0,24))createPart(part);
  if(!list.childElementCount)createPart();
  const add=studioButton('+  재료 추가','cc-studio-btn cc-studio-add-part',()=>{
    if(editing.saving)return;
    const input=createPart();if(input){editing.dirty=true;input.focus();}
  });
  const showPreservation=()=>{
    const on=preservation&&keep.checked;
    list.hidden=on;add.hidden=on;
    if(on){
      const msg=ingredientsBlock.querySelector('.cc-studio-preserved-data');
      if(!msg){
        const reminder=studioElement('div','cc-studio-preserved-data');
        reminder.append(studioElement('strong','','기존 투입 재료 보존 중'));
        for(const part of item.ingredients||[]){
          reminder.append(studioElement('span','',`${part.name}  × ${part.qty}`));
        }
        if(!(item.ingredients||[]).length)reminder.append(studioElement('span','','기존 기본 가공식을 유지합니다.'));
        preserveLabel.insertAdjacentElement('afterend',reminder);
      }
    }else{ingredientsBlock.querySelector('.cc-studio-preserved-data')?.remove();}
  };
  ingredientsBlock.append(list,datalist,add);
  if(preservation)keep.addEventListener('change',()=>{editing.dirty=true;showPreservation();});
  showPreservation();updateCount();form.append(ingredientsBlock);
  const status=studioElement('p','cc-studio-form-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actionRow=studioElement('div','cc-studio-form-actions');
  actionRow.append(studioElement('span','','이 변경은 공통 DB에 저장되고 HUB COOK에도 반영됩니다.'));
  const buttons=studioElement('div');
  const cancel=studioButton('취소','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit);
  const save=studioElement('button','cc-studio-btn cc-studio-btn-accent',edit?'변경사항 저장':'새 레시피 등록');save.type='submit';
  buttons.append(cancel,save);actionRow.append(buttons);form.append(status,actionRow);
  form.addEventListener('input',()=>{if(!editing.saving)editing.dirty=true;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(editing.saving)return;
    editing.saving=true;save.disabled=true;cancel.disabled=true;back.disabled=true;
    for(const control of form.querySelectorAll('input'))control.disabled=true;
    status.textContent='저장 권한과 입력 내용을 확인하고 있습니다…';status.dataset.kind='info';
    try{
      if(!await checkEditorAdmin())throw Error('관리자 권한을 확인하지 못했습니다. HUB에서 로그인한 뒤 다시 확인하세요.');
      const on=await supabase.rpc('my_apps_company_cook_status');
      if(on.error||on.data!==true)throw Error('운영자가 요리계산기를 중지해 현재 저장할 수 없습니다.');
      const title=name.input.value.trim(),count=qty.input.value.trim(),timeText=time.input.value.trim();
      if(!title||title.length>90)throw Error('레시피 이름은 1~90자로 입력하세요.');
      if(!validPosInt(count,100000))throw Error('생산량은 1~100000 사이 정수여야 합니다.');
      if(kind==='food'&&(timeText===''||!Number.isFinite(Number(timeText))||Number(timeText)<0||Number(timeText)>86400||
        Math.abs(Math.round(Number(timeText)*100)-Number(timeText)*100)>1e-6))throw Error('조리시간은 0~86400초, 소수점 둘째 자리까지 입력하세요.');
      if(kind==='process'&&timeText.length>40)throw Error('가공시간은 40자 이내로 입력하세요.');
      const preserve=preservation&&keep.checked;
      const parts=preserve?(Array.isArray(item.dbIngredients)?item.dbIngredients:null):
        [...list.querySelectorAll('.cc-studio-edit-part')].map(row=>({name:row.children[1].value.trim(),qty:Number(row.children[2].value)}));
      if(!preserve){
        if(!parts.length||parts.length>24||parts.some(p=>!p.name||p.name.length>90||!validPosInt(p.qty,999999)))
          throw Error('재료 1~24종의 이름과 수량을 확인하세요.');
        if(new Set(parts.map(p=>normName(p.name))).size!==parts.length)throw Error('같은 재료가 중복되어 있습니다.');
        const known=new Set(candidates.map(normName));
        if(parts.some(p=>!known.has(normName(p.name))))throw Error('등록된 재료명만 사용할 수 있습니다. 검색 목록에서 선택해 주세요.');
        if(kind==='process'&&parts.some(p=>normName(p.name)===normName(title)))throw Error('가공 결과물 자신을 투입 재료로 사용할 수 없습니다.');
      }
      if(kind==='process'&&!edit&&(catalogSnapshot?.materials||[]).concat(catalogSnapshot?.farms||[])
        .some(row=>normName(row.material_name)===normName(title)))throw Error('기존 구매·농장 재료와 이름이 겹칩니다.');
      if(dataCache.some(row=>row.kind===kind&&normName(row.name)===normName(title)&&(!edit||dataKey(row)!==dataKey(item))))
        throw Error('동일한 이름의 레시피가 있습니다. 기존 항목을 수정해 주세요.');
      const sourceKind=edit?(item.sourceKind==='new'?'new':'override'):'new';
      let result;
      if(kind==='food'){
        const entry={food_id:edit?item.id:`lac_new_${crypto.randomUUID().replace(/-/g,'')}`,
          food_name:title,set_qty:Number(count),cook_time:Number(timeText),ingredients:parts,source_kind:sourceKind};
        if(edit&&item.version!=null){
          result=await supabase.from('lac_cook_recipe_entries').update(entry)
            .eq('food_id',item.id).eq('version',item.version).select('food_id,version').maybeSingle();
          if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 데이터 새로고침 후 다시 시도하세요.');
        }else result=await supabase.from('lac_cook_recipe_entries').insert(entry).select('food_id,version').single();
      }else{
        const entry={process_material_name:title,result_qty:Number(count),process_time:timeText,ingredients:parts,source_kind:sourceKind};
        if(edit&&item.version!=null){
          const version=Number(item.version);
          if(!Number.isSafeInteger(version)||version<1||version>=2147483645)throw Error('수정 버전이 올바르지 않습니다.');
          result=await supabase.from('lac_cook_process_entries')
            .update({...entry,version:version+1,updated_at:new Date().toISOString()})
            .eq('process_material_name',item.id).eq('version',version).select('process_material_name,version').maybeSingle();
          if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 데이터 새로고침 후 다시 시도하세요.');
        }else result=await supabase.from('lac_cook_process_entries').insert(entry).select('process_material_name,version').single();
      }
      if(result.error)throw result.error;
      const selected=`${kind}:${kind==='food'?(edit?item.id:result.data?.food_id):title}`;
      dataEditing=null;dataSelectedKey=selected;dataKind=kind;dataNotice='공통 데이터에 정상 저장했습니다.';
      dataLoaded=false;pendingHomeRefresh=true;
      await loadAppData();
    }catch(error){
      status.textContent=`저장하지 못했습니다 · ${String(error?.message||error)}`;
      status.dataset.kind='error';
    }finally{
      editing.saving=false;save.disabled=false;cancel.disabled=false;back.disabled=false;
      for(const control of form.querySelectorAll('input'))control.disabled=false;
    }
  });
  form.__editing=editing;
  content.append(form);
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
