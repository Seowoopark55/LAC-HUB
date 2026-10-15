// LAC COOK company-only companion. Does not alter HUB COOK's shared engine.
// Each company work tab is a complete v1 COOK workspace draft. We switch the
// active draft via the calculator's existing autosave/restore contract.
const ACTIVE_WORK_KEY = 'lac-cook-current-auto-v1';
const DECK_KEY = 'lac-company-cook-task-deck-v1';
const LEGACY_BACKUP_KEY = 'lac-company-cook-before-tabs-backup-v1';
const FAVORITES_KEY = 'lac-cook-favorite-foods-v1';
const GROUPS_KEY = 'lac-company-cook-favorite-groups-v1';
const DEFAULT_GROUPS = ['음료','배고픔','전투','기타'];
const PER_PAGE = 6;
const MAX_CUSTOM_GROUPS = 3;
const TASK_NAMES_KEY = 'lac-company-cook-task-names-v1';
// The iframe's public catalogue has stable display names for built-in dishes.
// Names are presentation-only: saved workspace IDs remain unchanged.
let catalogueNamesPromise;
function loadCatalogueNames() {
  if (!catalogueNamesPromise) {
    // The catalogue lives under Vite publicDir, not in Vite's module graph.
    // Resolve its same-origin URL at runtime, as companyCookEntry.js already does.
    const catalogueUrl = new URL('/cook-preview/data/catalog.js', window.location.origin).href;
    catalogueNamesPromise = import(/* @vite-ignore */ catalogueUrl)
      .then(mod => new Map((mod.default?.foods || [])
        .filter(row => typeof row?.food_id === 'string' && typeof row.food_name === 'string')
        .map(row => [row.food_id, row.food_name])))
      .catch(() => new Map());
  }
  return catalogueNamesPromise;
}

function parseJson(input, fallback) {
  try { return JSON.parse(input); } catch { return fallback; }
}
function getWorkspace(storage) {
  const raw = parseJson(storage.getItem(ACTIVE_WORK_KEY), null);
  return raw && raw.version === 1 && Array.isArray(raw.orders) && typeof raw.revision === 'string' ? raw : null;
}
function singleWorkspace(snapshot, id) {
  const found = snapshot.orders.find(row => row?.id === id);
  if (!found) return null;
  return {...snapshot, orders:[{id,batches:found.batches}], checked:[],
    // Buying/fishing preferences may be shared safely. Checkmarks are not:
    // each prior combined requirement differs from its per-food requirement.
    choices:{offers:{...(snapshot.choices?.offers||{})},fish:{...(snapshot.choices?.fish||{})}}};
}
function readDeck(storage) {
  const d = parseJson(storage.getItem(DECK_KEY), null);
  if (!d || d.version !== 1 || !Array.isArray(d.ids) || d.ids.length > 100 ||
      !d.snapshots || typeof d.snapshots !== 'object' || Array.isArray(d.snapshots)) return null;
  const ids = [...new Set(d.ids.filter(id => typeof id === 'string' && id.length < 180))];
  const valid = ids.filter(id => {
    const snap = d.snapshots[id];
    return snap?.version===1 && Array.isArray(snap.orders) && snap.orders.length===1 && snap.orders[0].id===id;
  });
  return {version:1,ids:valid,active:valid.includes(d.active)?d.active:(valid[0]||''),
    snapshots:Object.fromEntries(valid.map(id=>[id,d.snapshots[id]]))};
}
function emptyDeck(){return {version:1,ids:[],active:'',snapshots:{}};}
function store(storage, key, data) { storage.setItem(key, JSON.stringify(data)); }
function backupIfMissing(storage, raw) {
  if (raw && !storage.getItem(LEGACY_BACKUP_KEY)) storage.setItem(LEGACY_BACKUP_KEY,raw);
}
function reloadFrame(iframe) {
  iframe.style.visibility='hidden';
  iframe.dataset.ccTabReloading='1';
  // replace() prevents every tab switch from adding another browser history entry.
  iframe.contentWindow.location.replace('/cook-preview/index.html?lacCookHostPreview=1');
}

export function mountCompanyTaskTabs(doc, iframe) {
  const win = iframe.contentWindow;
  const storage = win?.localStorage;
  const panel = doc.querySelector('.orders-panel');
  const orderList = doc.getElementById('orders');
  if (!storage || !panel || !orderList) return true;
  let deck = readDeck(storage);
  const live = getWorkspace(storage);
  // On the first launch convert a prior combined workspace into independent
  // tabs, preserving its original bytes as a permanent rollback reference.
  if (!deck) {
    // Preserve readable tab labels even when converting the old multi-food
    // workspace before the first tab is mounted.
    if (live?.orders.length) {
      const names={...(parseJson(storage.getItem('lac-company-cook-task-names-v1'),{})||{})};
      const rows=[...orderList.querySelectorAll('.order-row')];
      for(const [index,work] of live.orders.entries()){
        const label=rows[index]?.querySelector('.food-text strong')?.textContent?.trim();
        if(work?.id && label)names[work.id]=label;
      }
      try{store(storage,'lac-company-cook-task-names-v1',names);}catch{}
    }
    deck=emptyDeck();
    if (live?.orders.length) {
      if (live.orders.length>1) backupIfMissing(storage,storage.getItem(ACTIVE_WORK_KEY));
      for (const row of live.orders) {
        if (!row?.id || deck.ids.includes(row.id)) continue;
        const snapshot = live.orders.length===1 ? live : singleWorkspace(live,row.id);
        if (snapshot) {deck.ids.push(row.id);deck.snapshots[row.id]=snapshot;}
      }
      deck.active=deck.ids[0]||'';
    }
    try {
      store(storage,DECK_KEY,deck);
      if (deck.ids.length>1 && deck.active) {
        store(storage,ACTIVE_WORK_KEY,deck.snapshots[deck.active]);
        reloadFrame(iframe);return false;
      }
    }catch(error) { console.warn('요리 탭 초기 저장을 수행할 수 없습니다.',error);return true; }
  }
  // A previously selected tab must be loaded before exposing the calculator.
  const liveId=live?.orders.length===1 ? live.orders[0].id : '';
  if (deck.active && (liveId!==deck.active || live?.orders.length!==1)) {
    try {store(storage,ACTIVE_WORK_KEY,deck.snapshots[deck.active]);reloadFrame(iframe);return false;}
    catch {return true;}
  }
  delete iframe.dataset.ccTabReloading;
  const title = panel.querySelector('.panel-title');
  const tabs = doc.createElement('nav');tabs.className='cc-task-tabs';tabs.setAttribute('aria-label','요리별 작업 전환');
  tabs.setAttribute('role','tablist');
  // Keep task selection and batch quantity on the SAME line. The calculator
  // still owns the stepper and input handlers; no duplicate state is created.
  const taskLine = doc.createElement('div');taskLine.className='cc-task-line';
  orderList.before(taskLine);taskLine.append(tabs,orderList);
  const feedback=doc.createElement('span');feedback.className='cc-task-feedback';feedback.setAttribute('role','status');
  taskLine.after(feedback);
  const clearButton=doc.getElementById('clear');
  let nameCache = parseJson(storage.getItem(TASK_NAMES_KEY),{});
  if (!nameCache || typeof nameCache!=='object' || Array.isArray(nameCache))nameCache={};
  let catalogueNames = new Map();
  const rememberName=(id,name)=>{
    if(typeof id!=='string' || !id || typeof name!=='string' || !name.trim() || name.length>90)return;
    const clean=name.trim();
    if(nameCache[id]===clean)return;
    nameCache[id]=clean;
    try {store(storage,TASK_NAMES_KEY,nameCache);}catch{/* Labels can still render this session. */}
  };
  const visibleActiveName=()=>{
    const id=deck.active;
    if(!id)return;
    const label=orderList.querySelector('.order-row .food-text strong')?.textContent?.trim();
    if(label && label!==id)rememberName(id,label);
  };
  visibleActiveName();
  const getName=id=>{
    const cached=nameCache[id];
    if(typeof cached==='string' && cached.trim() && cached!==id)return cached;
    return catalogueNames.get(id)||'요리 이름 확인 중';
  };
  const captureLive=()=>{
    const current=getWorkspace(storage);
    if (deck.active && current?.orders.length===1 && current.orders[0].id===deck.active) {
      deck.snapshots[deck.active]=current;
      try {store(storage,DECK_KEY,deck);} catch {feedback.textContent='작업 자동 저장에 실패했습니다.';}
    }
  };
  function display() {
    tabs.replaceChildren();
    for(const id of deck.ids){
      const tab=doc.createElement('span');tab.className='cc-task-tab';
      tab.classList.toggle('is-active',deck.active===id);
      const choose=doc.createElement('button');choose.type='button';choose.className='cc-task-choose';
      choose.textContent=getName(id);choose.title=getName(id);choose.setAttribute('role','tab');
      choose.setAttribute('aria-selected',String(deck.active===id));
      choose.addEventListener('click',()=>switchTo(id));
      const remove=doc.createElement('button');remove.type='button';remove.className='cc-task-remove';
      remove.textContent='×';remove.setAttribute('aria-label',`${getName(id)} 작업 제거`);
      remove.addEventListener('click',()=>removeOne(id));
      tab.append(choose,remove);tabs.append(tab);
    }
    tabs.hidden=deck.ids.length===0;
    if(title)title.querySelector('h3')?.setAttribute('title','요리별로 한 가지씩 계산합니다.');
  }
  function goTo(id) {
    const snap = deck.snapshots[id];
    if(!snap)return;
    captureLive();
    deck.active=id;
    try {store(storage,DECK_KEY,deck);store(storage,ACTIVE_WORK_KEY,snap);}catch{
      feedback.textContent='작업 전환을 저장하지 못했습니다.';return;
    }
    reloadFrame(iframe);
  }
  function switchTo(id) {if(id && id!==deck.active && deck.ids.includes(id))goTo(id);}
  function removeOne(id) {
    if(!deck.ids.includes(id))return;
    if(id!==deck.active)captureLive();
    deck.ids=deck.ids.filter(x=>x!==id);delete deck.snapshots[id];
    const next=deck.ids.includes(deck.active)?deck.active:(deck.ids[0]||'');
    deck.active=next;
    try {
      store(storage,DECK_KEY,deck);
      if(next && id!==next) {store(storage,ACTIVE_WORK_KEY,deck.snapshots[next]);reloadFrame(iframe);return;}
      if(!next){const cur=getWorkspace(storage);if(cur){store(storage,ACTIVE_WORK_KEY,{...cur,orders:[],checked:[],choices:{offers:{},fish:{}}});reloadFrame(iframe);return;}}
    }catch {feedback.textContent='목록 변경을 저장하지 못했습니다.';return;}
    display();
  }
  display();
  // Existing saved decks may contain only cook_### IDs. Resolve names from
  // the public source once without changing orders, checks, or favourite data.
  void loadCatalogueNames().then(names=>{
    catalogueNames=names;
    for(const id of deck.ids){
      if((!nameCache[id] || nameCache[id]===id) && names.has(id))rememberName(id,names.get(id));
    }
    if(tabs.isConnected)display();
  });
  let adding=false;
  // The native calculator adds to its Map and autosaves before the click
  // returns. Capture the existing tab first, then split the new recipe away.
  const beginAdd=e=>{
    const button=e.target.closest('#results button.accent,.favorites-panel button.favorite-add');
    if(!button)return;
    captureLive();adding=true;
    const row=button.closest('.food-row,.favorite-row');
    const dish= row?.querySelector('.food-text strong,.favorite-name')?.textContent?.trim() || '';
    win.setTimeout(()=>{
      adding=false;
      const after=getWorkspace(storage);
      if(!after)return;
      const added=after.orders.find(x=>x?.id && x.id!==deck.active) || after.orders[0];
      if(!added)return;
      const id=added.id;
      rememberName(id,dish);
      if(deck.ids.includes(id)) {
        if(id===deck.active) {deck.snapshots[id]=after;try{store(storage,DECK_KEY,deck);}catch{};display();return;}
        goTo(id);return;
      }
      const newSnap=singleWorkspace(after,id);
      if(!newSnap)return;
      if(deck.ids.length>=100){
        feedback.textContent='작업 목록은 최대 100가지까지 저장할 수 있습니다.';
        try{store(storage,ACTIVE_WORK_KEY,deck.snapshots[deck.active]);reloadFrame(iframe);}catch{}
        return;
      }
      deck.ids.push(id);deck.snapshots[id]=newSnap;
      try{store(storage,DECK_KEY,deck);store(storage,ACTIVE_WORK_KEY,newSnap);deck.active=id;store(storage,DECK_KEY,deck);}catch{
        feedback.textContent='추가한 요리를 보관하지 못했습니다.';return;
      }
      reloadFrame(iframe);
    },0);
  };
  doc.addEventListener('click',beginAdd,true);
  // Existing 'remove' acts only on the current tab; other tasks stay intact.
  const nativeRemove=e=>{
    if(!e.target.closest('#orders .order-row button.remove'))return;
    const id=deck.active;
    win.setTimeout(()=>{const cur=getWorkspace(storage);
      if(!cur || cur.orders.some(row=>row.id===id))return;
      removeOne(id);
    },0);
  };
  doc.addEventListener('click',nativeRemove,true);
  const clearAll=e=>{
    e.preventDefault();e.stopImmediatePropagation();
    if(!deck.ids.length)return;
    if(!win.confirm('등록된 작업을 모두 제거할까요? 즐겨찾기와 주문 기록은 유지됩니다.'))return;
    const cur=getWorkspace(storage);
    const next=cur?{...cur,orders:[],checked:[],choices:{offers:{},fish:{}}}:null;
    try{
      deck=emptyDeck();store(storage,DECK_KEY,deck);
      if(next)store(storage,ACTIVE_WORK_KEY,next);
    }catch{feedback.textContent='전체 목록을 비우지 못했습니다.';return;}
    reloadFrame(iframe);
  };
  clearButton?.addEventListener('click',clearAll,true);
  // The original calculator's other controls continue to handle quantities,
  // checklists and purchases. Their latest saved snapshot is read on a switch.
  return true;
}

function loadGroups(storage) {
  const raw=parseJson(storage.getItem(GROUPS_KEY),{});
  const extra=Array.isArray(raw?.custom)?raw.custom.filter(x=>typeof x==='string'&&x.trim()&&x.length<=12).slice(0,MAX_CUSTOM_GROUPS):[];
  const custom=[...new Set(extra)].filter(x=>!DEFAULT_GROUPS.includes(x)&&x!=='전체');
  const categories=[...DEFAULT_GROUPS,...custom];
  const assignments=raw?.assignments&&typeof raw.assignments==='object'&&!Array.isArray(raw.assignments)?raw.assignments:{};
  // Legacy '전체' view is intentionally retired; unclassified favourites live in '기타'.
  const selected=categories.includes(raw?.selected)?raw.selected:'기타';
  return {custom,assignments,selected,page:Number.isInteger(raw?.page)&&raw.page>=0?raw.page:0};
}
export function mountCompanyFavoriteGroups(doc,iframe) {
  const win=iframe.contentWindow, storage=win?.localStorage;
  const panel=doc.querySelector('.favorites-panel'), root=doc.getElementById('favorites');
  if(!storage || !panel || !root)return;
  const group=loadGroups(storage);
  const catNav=doc.createElement('nav');catNav.className='cc-favorite-groups';catNav.setAttribute('aria-label','즐겨찾기 카테고리');
  const pager=doc.createElement('div');pager.className='cc-favorite-pager';
  const count=doc.createElement('span');count.className='cc-favorite-count';
  const prev=doc.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label','이전 즐겨찾기 페이지');
  const next=doc.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label','다음 즐겨찾기 페이지');
  pager.append(prev,count,next);
  const title=panel.querySelector('.panel-title');
  const manage=doc.createElement('button');manage.type='button';manage.className='cc-favorite-manage';
  manage.textContent='분류 설정';
  if(title)title.append(manage);
  root.before(catNav);root.after(pager);
  const dialog=doc.createElement('dialog');dialog.className='cc-favorite-dialog';
  const dlgBody=doc.createElement('div');dlgBody.className='cc-favorite-dialog-body';
  dialog.append(dlgBody);doc.body.append(dialog);
  const save=()=>{try{store(storage,GROUPS_KEY,group);return true;}catch{return false;}};
  // Preserve existing classification data while migrating the retired '전체' tab.
  if(parseJson(storage.getItem(GROUPS_KEY),{})?.selected==='전체')save();
  function listRows(){return [...root.querySelectorAll(':scope > .favorite-row')];}
  function refresh(){
    const cats=[...DEFAULT_GROUPS,...group.custom];
    catNav.replaceChildren();
    for(const c of cats){
      const b=doc.createElement('button');b.type='button';b.textContent=c;b.className='cc-favorite-group';
      b.classList.toggle('is-active',group.selected===c);
      b.setAttribute('aria-pressed',String(group.selected===c));
      b.addEventListener('click',()=>{group.selected=c;group.page=0;save();refresh();});catNav.append(b);
    }
    const rows=listRows();
    const matching=rows.filter(row=>{
      const name=row.querySelector('.favorite-name')?.textContent?.trim()||'';
      return (group.assignments[name]||'기타')===group.selected;
    });
    const pages=Math.max(1,Math.ceil(matching.length/PER_PAGE));
    group.page=Math.max(0,Math.min(group.page,pages-1));
    const visible=new Set(matching.slice(group.page*PER_PAGE,(group.page+1)*PER_PAGE));
    for(const row of rows)row.hidden=!visible.has(row);
    pager.hidden=matching.length<=PER_PAGE;
    count.textContent=`${group.page+1} / ${pages}`;
    prev.disabled=group.page===0;next.disabled=group.page>=pages-1;
  }
  prev.addEventListener('click',()=>{group.page=Math.max(0,group.page-1);save();refresh();});
  next.addEventListener('click',()=>{group.page++;save();refresh();});
  const editGroups=()=>{
    dlgBody.replaceChildren();
    const head=doc.createElement('header');head.className='cc-favorite-dialog-title';
    const h=doc.createElement('h3');h.textContent='즐겨찾기 분류';
    const close=doc.createElement('button');close.type='button';close.textContent='닫기';
    close.addEventListener('click',()=>dialog.close());head.append(h,close);dlgBody.append(head);
    const hint=doc.createElement('p');hint.textContent='요리를 카테고리로 분류합니다. 선택한 카테고리는 한 번에 최대 6개씩 표시됩니다.';dlgBody.append(hint);
    const names=listRows().map(row=>row.querySelector('.favorite-name')?.textContent?.trim()).filter(Boolean);
    const list=doc.createElement('div');list.className='cc-favorite-group-editor';
    for(const name of names){
      const line=doc.createElement('label');line.className='cc-favorite-editor-item';
      const span=doc.createElement('span');span.textContent=name;span.title=name;
      const select=doc.createElement('select');select.setAttribute('aria-label',`${name} 카테고리`);
      for(const cat of [...DEFAULT_GROUPS,...group.custom]){
        const option=doc.createElement('option');option.value=cat;option.textContent=cat;select.append(option);
      }
      select.value=group.assignments[name]||'기타';
      select.addEventListener('change',()=>{group.assignments[name]=select.value;group.page=0;save();refresh();});
      line.append(span,select);list.append(line);
    }
    if(!names.length)list.textContent='등록된 즐겨찾기가 없습니다.';
    dlgBody.append(list);
    const custom=doc.createElement('section');custom.className='cc-favorite-custom';
    const heading=doc.createElement('strong');heading.textContent=`사용자 카테고리 (${group.custom.length}/${MAX_CUSTOM_GROUPS})`;
    custom.append(heading);
    for(const cat of group.custom){
      const row=doc.createElement('div');row.className='cc-favorite-custom-item';
      const name=doc.createElement('span');name.textContent=cat;
      const remove=doc.createElement('button');remove.type='button';remove.textContent='삭제';
      remove.addEventListener('click',()=>{
        if(!win.confirm(`‘${cat}’ 카테고리를 삭제할까요? 해당 즐겨찾기는 기타로 이동합니다.`))return;
        group.custom=group.custom.filter(x=>x!==cat);
        for(const [food,old] of Object.entries(group.assignments))if(old===cat)group.assignments[food]='기타';
        if(group.selected===cat)group.selected='기타';group.page=0;save();refresh();editGroups();
      });row.append(name,remove);custom.append(row);
    }
    const add=doc.createElement('div');add.className='cc-favorite-custom-add';
    const input=doc.createElement('input');input.type='text';input.maxLength=12;input.placeholder='카테고리 이름';
    const create=doc.createElement('button');create.type='button';create.textContent='+ 추가';
    const message=doc.createElement('span');message.setAttribute('role','status');
    create.disabled=group.custom.length>=MAX_CUSTOM_GROUPS;
    create.addEventListener('click',()=>{
      const name=input.value.trim();
      if(!name||name.length>12||['전체',...DEFAULT_GROUPS,...group.custom].includes(name)){
        message.textContent='다른 이름으로 1~12자 입력하세요.';return;
      }
      if(group.custom.length>=MAX_CUSTOM_GROUPS)return;
      group.custom.push(name);save();refresh();editGroups();
    });add.append(input,create);custom.append(add,message);dlgBody.append(custom);
  };
  manage.addEventListener('click',()=>{editGroups();dialog.showModal();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  // Re-paint favourite cards each time the built-in search star changes state.
  const observer=new win.MutationObserver(refresh);
  observer.observe(root,{childList:true});
  refresh();
}

// '물' is sold with 5-piece price/bundle data, but buyers enter piece counts.
// This is a display-only adapter. The planner's cost and bundle math stay intact.
export function mountCompanyWaterUnits(doc,iframe) {
  const purchases=doc.getElementById('purchases'),win=iframe.contentWindow;
  if(!purchases||!win)return;
  const render=()=>{
    for(const card of purchases.querySelectorAll('.supply-card')) {
      const name=card.querySelector('.check-name strong')?.textContent?.trim();
      if(name!=='물')continue;
      const detail=card.querySelector('.check-copy small');
      const qty=card.querySelector('.check-amount,.bundle-pill');
      if(!detail||!qty)continue;
      const text=detail.textContent||'';
      // The 5-piece row is a *pricing unit*, not a bundle buyers can order.
      // Remove that misleading prefix only for water, not for other products.
      const clean=text.replace(/^1묶음\s*[\d,]+개\s*·\s*/, '');
      if(clean!==text)detail.textContent=clean;
      const matched=clean.match(/구매\s*([\d,]+)개/);
      if(!matched)continue;
      const pieces=matched[1];
      if(qty.textContent!==`${pieces}개`)qty.textContent=`${pieces}개`;
      qty.title='실제 구매 입력 수량 · '+pieces+'개';
    }
  };
  const observer=new win.MutationObserver(render);
  observer.observe(purchases,{childList:true,subtree:true});
  render();
}
