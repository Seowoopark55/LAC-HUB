import {supabase} from '../lib/supabase.js';
import {loadPlayerProfile} from '../lib/playerProfileApi.js';
import {renderHubAccountControl} from '../ui/hubHome.js';

const CATEGORIES=['전체','보스','범죄','WWE','자유 활동','기타'];
const DURATIONS=[{value:30,label:'30분'},{value:60,label:'1시간'},{value:120,label:'2시간'},{value:240,label:'4시간'},{value:360,label:'6시간'}];
const ui={mode:'list',category:'전체',items:[],detail:null,messages:[],id:null,loading:false,busy:false,error:'',chatDraft:'',profileUser:null,profile:null,profileChecked:false,formDraft:{},lastSync:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const when=v=>{try{return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(v));}catch{return '시간 미확인';}};
const pad=n=>String(n).padStart(2,'0');
const timeOptions=Array.from({length:48},(_,i)=>`${pad(Math.floor(i/2))}:${i%2?'30':'00'}`);
const localDate=t=>`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
const today=()=>localDate(new Date());
function defaultStart(){const d=new Date(Date.now()+60*60_000);d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0);return {date:localDate(d),time:`${pad(d.getHours())}:${pad(d.getMinutes())}`};}
function check(){if(!supabase)throw Error('Supabase 연결이 필요합니다.');return supabase;}
async function rpc(method,params={}){const {data,error}=await check().rpc(`together_${method}`,params);if(error)throw error;return data;}
function displayError(e){return String(e?.message||e||'잠시 후 다시 시도해 주세요.').replace(/^Error:\s*/, '');}
function statusBadge(status){const kind=status==='모집 중'?'open':status==='모집 마감'?'full':status==='진행 중'?'active':'ended';return `<span class="lac-together__badge lac-together__badge--${kind}">${esc(status||'모집 중')}</span>`;}
function pageTop(state){const account=state.session?.user && state.ready
    ? `<div class="hub-account">${renderHubAccountControl(state)}</div>`
    : `<button type="button" class="lac-together__head-login" data-together-action="login">Discord 로그인</button>`;
  return `<header class="lac-together__head"><a href="/" class="lac-together__brand" aria-label="HUB 메인으로 돌아가기">← &nbsp; LAC HUB</a><div class="lac-together__head-right"><span class="lac-together__eyebrow">PLAY TOGETHER</span>${account}</div></header>`;}
function empty(message){return `<div class="lac-together__empty">${esc(message)}</div>`;}
function controlState(state){return {loggedIn:Boolean(state.session?.user),profile:Boolean(ui.profile && ui.profile.user_id===state.session?.user?.id),busy:ui.busy};}
function listCards(){let rows=ui.items.filter(row=>ui.category==='전체'||row.category===ui.category);
  return rows.length?rows.map(row=>`<button type="button" class="lac-together__item" data-together-action="detail" data-id="${esc(row.id)}">
    <span class="lac-together__item-top"><span class="lac-together__category">${esc(row.category)}</span>${statusBadge(row.status)}</span>
    <strong>${esc(row.title)}</strong><span class="lac-together__item-desc">${esc(row.description||'함께할 플레이어를 모집합니다.')}</span>
    <span class="lac-together__item-footer"><span>◷ ${esc(when(row.starts_at))} 시작</span><span>♙ ${Number(row.confirmed_count)||1} / ${Number(row.capacity)||2}명</span></span>
  </button>`).join(''):empty('해당 카테고리에 등록된 활동이 없습니다.');}
function renderCreate(){const defaults=defaultStart(),d=today(),f=ui.formDraft||{};return `<form class="lac-together__create" data-together-form="create">
  <div class="lac-together__form-grid"><label>활동 카테고리<select name="category" required>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${f.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <label>모집 인원 <small>모집자 포함</small><select name="capacity" required>${Array.from({length:9},(_,i)=>`<option value="${i+2}" ${Number(f.capacity||5)===i+2?'selected':''}>${i+2}명</option>`).join('')}</select></label></div>
  <label>모집 제목<input name="title" maxlength="90" minlength="5" value="${esc(f.title||'')}" placeholder="어떤 활동을 함께할 예정인가요?" required></label>
  <label>상세 내용 <small>선택</small><textarea name="description" maxlength="600" rows="3" placeholder="준비 사항, 참가 조건 등을 자유롭게 작성해 주세요.">${esc(f.description||'')}</textarea></label>
  <div class="lac-together__form-grid"><label>활동 날짜<input type="date" name="date" value="${esc(f.date||defaults.date)}" min="${d}" required></label>
  <label>시작 시각<select name="time" required>${timeOptions.map(v=>`<option value="${v}" ${v===(f.time||defaults.time)?'selected':''}>${v}</option>`).join('')}</select></label></div>
  <label>시작 후 유지 시간<select name="duration">${DURATIONS.map(d=>`<option value="${d.value}" ${Number(f.duration||60)===d.value?'selected':''}>${d.label}</option>`).join('')}</select></label>
  <p class="lac-together__tip">시작 시각에 모집이 자동 마감되고, 선택한 시간이 지나면 채팅도 종료됩니다. 이후 15분 유예를 두고 기록을 삭제합니다.</p>
  <div class="lac-together__actions"><button class="lac-together__ghost" type="button" data-together-action="back">취소</button><button type="submit" class="lac-together__primary" ${ui.busy?'disabled':''}>${ui.busy?'등록 중…':'모집 등록'}</button></div>
  </form>`;}
function renderDetail(state){const p=ui.detail;if(!p)return empty('모집 정보를 찾을 수 없거나 보관 기간이 종료되었습니다.');
  const isHost=Boolean(p.is_host), logged=Boolean(state.session?.user), active=p.status==='모집 중';
  const canMessage=Boolean(p.can_chat)&&p.status!=='종료';
  const canApply=active&&!isHost&&!['pending','accepted'].includes(p.my_status);
  const canWithdraw=['pending','accepted'].includes(p.my_status)&&p.status!=='종료';
  const requests=isHost&&p.requests?.length?`<section class="lac-together__panel"><h3>참가 신청 관리</h3><div class="lac-together__requests">${p.requests.map(r=>`<div class="lac-together__request"><span><b>${esc(r.nickname)}</b><small>${r.status==='pending'?'승인 대기':'참가 확정'}</small></span>${r.status==='pending'&&active?`<span class="lac-together__request-actions"><button type="button" data-together-action="approve" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>승인</button><button type="button" data-together-action="reject" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>거절</button></span>`:''}</div>`).join('')}</div></section>`:'';
  const roster=p.can_chat?`<section class="lac-together__panel"><h3>확정 참가자 <small>${Number(p.confirmed_count)}명</small></h3><div class="lac-together__roster">${(p.members||[]).map(n=>`<span>${esc(n)}</span>`).join('')}</div></section>`:'';
  const chat=p.can_chat?`<section class="lac-together__panel lac-together__chat"><h3>참가자 채팅 <small>확정 참가자 전용</small></h3><div class="lac-together__messages" aria-label="채팅 메시지">${ui.messages.length?ui.messages.map(m=>`<div class="lac-together__message${m.mine?' is-mine':''}"><span>${esc(m.nickname)} · ${esc(when(m.created_at))}</span><p>${esc(m.body)}</p></div>`).join(''):empty('아직 메시지가 없습니다. 먼저 인사해 보세요.')}</div>${canMessage?`<form data-together-form="chat" class="lac-together__chat-form"><input type="text" name="body" maxlength="500" placeholder="모이는 장소나 준비 사항을 이야기해 보세요." value="${esc(ui.chatDraft)}" required aria-label="채팅 메시지"><button class="lac-together__primary" type="submit" ${ui.busy?'disabled':''}>전송</button></form>`:'<p class="lac-together__tip">활동이 종료되어 채팅이 읽기 전용으로 전환됐습니다.</p>'}</section>`:'';
  const participantAction=!logged?`<button type="button" class="lac-together__primary" data-together-action="login">참가하려면 Discord 로그인</button>`:!controlState(state).profile?`<button type="button" class="lac-together__primary" data-together-action="profile">프로필 등록 후 참여</button>`:canApply?`<button type="button" class="lac-together__primary" data-together-action="apply" ${ui.busy?'disabled':''}>참가 신청</button>`:canWithdraw?`<button type="button" class="lac-together__ghost" data-together-action="withdraw" ${ui.busy?'disabled':''}>${p.my_status==='pending'?'신청 취소':'참가 취소'}</button>`:p.my_status==='rejected'?'<span class="lac-together__tip">참가 신청이 거절되었습니다.</span>':'';
  return `<div class="lac-together__detail"><div class="lac-together__detail-head"><div class="lac-together__item-top"><span class="lac-together__category">${esc(p.category)}</span>${statusBadge(p.status)}</div><h2>${esc(p.title)}</h2><p>${esc(p.description||'상세 안내가 없습니다.')}</p><div class="lac-together__facts"><span>◷ ${esc(when(p.starts_at))}</span><span>♙ ${Number(p.confirmed_count)} / ${Number(p.capacity)}명</span><span>모집자 ${esc(p.host_nickname)}</span></div></div><div class="lac-together__actions">${participantAction}${isHost&&p.status!=='종료'?`<button class="lac-together__ghost" data-together-action="finish" ${ui.busy?'disabled':''}>활동 종료</button>`:''}${p.my_status==='pending'?'<span class="lac-together__tip">모집자의 승인을 기다리는 중입니다.</span>':''}</div>${requests}${roster}${chat}</div>`;}
export function renderTogetherPage(state){const {loggedIn,profile}=controlState(state);
  return `<div class="lac-together" id="lac-together">${pageTop(state)}<main class="lac-together__main"><div class="lac-together__hero"><div><span class="lac-together__eyebrow">LAC HUB COMMUNITY</span><h1>함께하기</h1><p>다양한 활동에 함께할 플레이어를 찾아보세요.</p></div><div class="lac-together__hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-2c0-2.4 2-4.2 5.5-4.2s5.5 1.8 5.5 4.2v2"/><circle cx="17.2" cy="8.7" r="2.4"/><path d="M16 13.7c2.9-.3 4.8 1 4.8 3.3v2"/></svg></div></div><div class="lac-together__toolbar"><div class="lac-together__toolbar-left">${ui.mode==='list'?`<label for="lac-together-filter">활동 카테고리</label><select id="lac-together-filter" data-together-filter><option value="전체">전체 활동</option>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${ui.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<button class="lac-together__ghost" type="button" data-together-action="back">← 모집 목록</button>`}</div><div>${ui.mode==='list'?`<button type="button" class="lac-together__primary" data-together-action="create">+ 모집하기</button>`:''}</div></div>
  ${ui.error?`<div class="lac-together__error" role="alert">${esc(ui.error)}</div>`:''}
  ${ui.mode==='create'?renderCreate():ui.mode==='detail'?renderDetail(state):`<div class="lac-together__grid">${listCards()}</div>`}
  ${ui.mode==='list'?`<p class="lac-together__foot">모집 목록은 로그인 없이 볼 수 있습니다. 모집·참가·채팅에는 Discord 로그인과 인게임 프로필이 필요합니다.${!loggedIn?' <button type="button" data-together-action="login">Discord 로그인</button>':!profile?' <button type="button" data-together-action="profile">인게임 프로필 등록</button>':''}</p>`:''}
  </main></div>`;
}
async function fetchList(){ui.items=await rpc('list_posts',{p_category:null})||[];}
async function fetchDetail(){if(!ui.id)return;const data=await rpc('get_post',{p_id:ui.id});ui.detail=data||null;if(data?.can_chat){ui.messages=await rpc('get_messages',{p_post_id:ui.id})||[];}else{ui.messages=[];}}
export async function refreshTogether(state,render,{quiet=false}={}){
  if(state.page!=='together'||ui.mode==='create'||ui.loading||ui.busy)return;
  ui.loading=true;
  try{
    if(ui.mode==='detail')await fetchDetail();else await fetchList();
    if(ui.profileUser!==state.session?.user?.id){ui.profile=null;ui.profileChecked=false;ui.profileUser=state.session?.user?.id||null;}
    if(ui.profileUser && !ui.profileChecked){ui.profile=await loadPlayerProfile(ui.profileUser).catch(()=>null);ui.profileChecked=true;}
    ui.error='';ui.lastSync=Date.now();
  }catch(e){if(!quiet)ui.error=`함께하기 데이터를 불러오지 못했습니다: ${displayError(e)}`;}
  finally{ui.loading=false;
    // Background polling must not steal focus from chat typing or collapse the shared account menu.
    const active=typeof document!=='undefined'?document.activeElement:null;
    const editing=quiet && typeof document!=='undefined' && ((active?.closest?.('#lac-together') && active?.matches?.('input,textarea,select')) || document.querySelector('#lac-together .hub-account__profile[open]'));
    if(state.page==='together'&&!editing)render();
  }
}
export function togetherOnFilter(value,render){if(!CATEGORIES.includes(value))return;ui.category=value;render();}
export function togetherOnInput(target){if(target?.closest('form[data-together-form="chat"]')&&target.name==='body')ui.chatDraft=target.value;
  if(target?.closest('form[data-together-form="create"]')&&target.name)ui.formDraft[target.name]=target.value;}
async function ensureProfile(state,openProfile){if(!state.session?.user)return false;
  if(!ui.profile||ui.profileUser!==state.session.user.id){ui.profileUser=state.session.user.id;ui.profile=await loadPlayerProfile(ui.profileUser).catch(()=>null);ui.profileChecked=true;}
  if(ui.profile)return true;
  await openProfile();return false;
}
async function runMutation(task,state,render){if(ui.busy)return;ui.busy=true;ui.error='';render();try{await task();if(ui.mode==='detail')await fetchDetail();else await fetchList();}catch(e){ui.error=displayError(e);}finally{ui.busy=false;render();}}
export async function togetherAction(button,state,{render,openProfile,login}){
  const action=button.dataset.togetherAction;
  if(action==='login'){await login();return;}
  if(action==='profile'){await openProfile();return;}
  if(action==='back'){ui.formDraft={};ui.mode='list';ui.id=null;ui.detail=null;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='detail'){ui.mode='detail';ui.id=button.dataset.id;ui.detail=null;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='create'){
    if(!state.session?.user){await login();return;}
    if(!await ensureProfile(state,openProfile)){render();return;}
    ui.formDraft={};ui.mode='create';ui.error='';render();return;
  }
  if(!ui.id||!['apply','approve','reject','withdraw','finish'].includes(action))return;
  if(!await ensureProfile(state,openProfile)){render();return;}
  if(action==='finish'&&!window.confirm('활동을 지금 종료할까요? 종료 후 채팅은 읽기 전용이 됩니다.'))return;
  if(action==='withdraw'&&!window.confirm('참가 신청 또는 확정 참가를 취소할까요?'))return;
  await runMutation(async()=>{
    if(action==='apply')await rpc('apply',{p_post_id:ui.id});
    if(action==='approve'||action==='reject')await rpc('review',{p_post_id:ui.id,p_user_id:button.dataset.userId,p_accept:action==='approve'});
    if(action==='withdraw')await rpc('withdraw',{p_post_id:ui.id});
    if(action==='finish')await rpc('finish',{p_post_id:ui.id});
  },state,render);
}
export async function togetherSubmit(form,state,{render,openProfile}){
  if(!await ensureProfile(state,openProfile)){render();return;}
  const data=new FormData(form);
  if(form.dataset.togetherForm==='create'){
    const date=String(data.get('date')||''),time=String(data.get('time')||'');
    const starts=new Date(`${date}T${time}:00`);
    if(!Number.isFinite(starts.getTime())){ui.error='활동 날짜와 시각을 확인해 주세요.';render();return;}
    // Do not pass a fabricated timezone; Date preserves the browser's local input time.
    await runMutation(async()=>{
      const id=await rpc('create_post',{p_category:data.get('category'),p_title:String(data.get('title')||'').trim(),p_description:String(data.get('description')||'').trim(),p_capacity:Number(data.get('capacity')),p_starts_at:starts.toISOString(),p_duration_minutes:Number(data.get('duration'))});
      ui.id=id;ui.mode='detail';ui.detail=null;ui.messages=[];ui.formDraft={};
    },state,render);
  }else if(form.dataset.togetherForm==='chat'){
    const body=String(data.get('body')||'').trim();if(!body)return;
    await runMutation(async()=>{await rpc('send_message',{p_post_id:ui.id,p_body:body});ui.chatDraft='';},state,render);
  }
}
export function togetherProfileUpdated(state){if(state.session?.user){ui.profile=null;ui.profileChecked=false;ui.profileUser=null;}}
