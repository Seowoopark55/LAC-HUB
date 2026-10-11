import {supabase} from '../lib/supabase.js';
import {loadPlayerProfile} from '../lib/playerProfileApi.js';
import {renderHubAccountControl} from '../ui/hubHome.js';
import {formatStoredIngamePhone} from '../lib/ingamePhone.js';

const CATEGORIES=['전체','보스','범죄','WWE','자유 활동','기타'];
const DURATIONS=[{value:30,label:'30분'},{value:60,label:'1시간'},{value:120,label:'2시간'},{value:240,label:'4시간'},{value:360,label:'6시간'}];
const ui={mode:'list',category:'전체',items:[],detail:null,roster:[],rosterLoaded:false,messages:[],id:null,loading:false,busy:false,error:'',chatDraft:'',profileUser:null,profile:null,profileChecked:false,formDraft:{},lastSync:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const when=v=>{try{return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'}).format(new Date(v));}catch{return '시간 미확인';}};
const pad=n=>String(n).padStart(2,'0');
const localDate=t=>`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
const today=()=>localDate(new Date());
function defaultStart(){const d=new Date(Date.now()+60*60_000);d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0);return {date:localDate(d),period:d.getHours()>=12?'pm':'am',hour:String(d.getHours()%12||12),minute:pad(d.getMinutes())};}
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
  return rows.length?rows.map((row,index)=>{const capacity=Math.max(2,Number(row.capacity)||2),confirmed=Math.min(capacity,Math.max(1,Number(row.confirmed_count)||1));return `<button type="button" class="lac-together__item" data-together-category="${esc(row.category)}" data-together-action="detail" data-id="${esc(row.id)}">
    <span class="lac-together__item-top"><span class="lac-together__category">${esc(row.category)}</span>${statusBadge(row.status)}</span>
    <span class="lac-together__item-heading"><span class="lac-together__item-symbol" aria-hidden="true">${pad(index+1)}</span><strong>${esc(row.title)}</strong></span><span class="lac-together__item-desc">${esc(row.description||'함께할 플레이어를 모집합니다.')}</span>
    <span class="lac-together__item-progress"><i style="width:${(confirmed/capacity)*100}%"></i></span>
    <span class="lac-together__item-footer"><span class="lac-together__item-info"><span>◷ ${esc(when(row.starts_at))}</span><span>모집자 ${esc(row.host_nickname||'플레이어')}</span></span><span class="lac-together__item-count">${confirmed} / ${capacity}명 <b aria-hidden="true">↗</b></span></span>
  </button>`;}).join(''):empty('해당 카테고리에 등록된 활동이 없습니다.');}
function renderCreate(){const defaults=defaultStart(),d=today(),f=ui.formDraft||{},editing=ui.mode==='edit';return `<form class="lac-together__create" data-together-form="${editing?'edit':'create'}"><h2 class="lac-together__form-title">${editing?'모집글 수정':'모집 등록'}</h2>
  <div class="lac-together__form-grid lac-together__form-grid--basics">
    <label class="lac-together__field"><span class="lac-together__field-label">활동 카테고리</span><select name="category" required>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${f.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
    <label class="lac-together__field"><span class="lac-together__field-label">모집 인원 <small>모집자 포함</small></span><select name="capacity" required>${Array.from({length:9},(_,i)=>`<option value="${i+2}" ${Number(f.capacity||5)===i+2?'selected':''}>${i+2}명</option>`).join('')}</select></label>
  </div>
  <label class="lac-together__field"><span class="lac-together__field-label">모집 제목</span><input name="title" maxlength="90" minlength="5" value="${esc(f.title||'')}" placeholder="어떤 활동을 함께할 예정인가요?" required></label>
  <label class="lac-together__field"><span class="lac-together__field-label">상세 내용 <small>선택</small></span><textarea name="description" maxlength="600" rows="3" placeholder="준비 사항, 참가 조건 등을 자유롭게 작성해 주세요.">${esc(f.description||'')}</textarea></label>
  <div class="lac-together__form-grid lac-together__form-grid--schedule">
    <label class="lac-together__field"><span class="lac-together__field-label">활동 날짜</span><input type="date" name="date" value="${esc(f.date||defaults.date)}" min="${d}" required></label>
    <div class="lac-together__field lac-together__time-field" role="group" aria-label="시작 시각"><span class="lac-together__field-label">시작 시각</span>
      <div class="lac-together__time-inputs"><select name="period" aria-label="오전 오후"><option value="am" ${(f.period??defaults.period)==='am'?'selected':''}>오전</option><option value="pm" ${(f.period??defaults.period)==='pm'?'selected':''}>오후</option></select><label><input name="hour" type="number" inputmode="numeric" min="1" max="12" step="1" placeholder="시" value="${esc(f.hour??defaults.hour)}" required aria-label="시작 시간, 시"><span>시</span></label><span class="lac-together__time-sep">:</span><label><input name="minute" type="number" inputmode="numeric" min="0" max="59" step="1" placeholder="분" value="${esc(f.minute??defaults.minute)}" required aria-label="시작 시간, 분"><span>분</span></label></div>
    </div>
  </div>
  <label class="lac-together__field lac-together__duration-field"><span class="lac-together__field-label">시작 후 유지 시간</span><select name="duration">${DURATIONS.map(d=>`<option value="${d.value}" ${Number(f.duration||60)===d.value?'selected':''}>${d.label}</option>`).join('')}</select></label>
  <p class="lac-together__tip">시작 시각에 모집이 마감됩니다. 활동 종료 후 15분 유예를 두고 기록이 자동 정리됩니다.</p>
  <div class="lac-together__actions"><button class="lac-together__ghost" type="button" data-together-action="back">취소</button><button type="submit" class="lac-together__primary" ${ui.busy?'disabled':''}>${ui.busy?'저장 중…':editing?'변경 저장':'모집 등록'}</button></div>
  </form>`;}
function renderPartyMember(member,index){
  const host=member.role==='host',name=esc(member.nickname||'닉네임 미등록');
  const phone=member.ingame_phone?esc(formatStoredIngamePhone(member.ingame_phone)):'미등록';
  return `<li class="lac-together__person"><span class="lac-together__person-num">${pad(index+1)}</span><div class="lac-together__person-name"><strong>${name}</strong><small>${host?'모집자':'참가 확정'}</small></div><div class="lac-together__person-phone"><span>인게임 전화</span><strong>${phone}</strong></div></li>`;
}
function renderDetail(state){const p=ui.detail;if(!p)return empty('모집 정보를 찾을 수 없거나 보관 기간이 종료되었습니다.');
  const isHost=Boolean(p.is_host), logged=Boolean(state.session?.user), active=p.status==='모집 중';
  const canMessage=Boolean(p.can_chat)&&p.status!=='종료';
  const canApply=active&&!isHost&&!['pending','accepted'].includes(p.my_status);
  const canWithdraw=['pending','accepted'].includes(p.my_status)&&p.status!=='종료';
  const editAllowed=isHost&&Date.parse(p.starts_at)>Date.now()&&p.status!=='종료';
  const pending=isHost?(p.requests||[]).filter(r=>r.status==='pending'):[];
  const confirmedOthers=Math.max(0,Number(p.confirmed_count||1)-1);
  const capacity=Math.max(2,Number(p.capacity||2)),confirmed=Math.min(capacity,1+confirmedOthers),ratio=Math.min(100,(confirmed/capacity)*100);
  const roster=ui.rosterLoaded?ui.roster: (p.can_chat?(p.members||[]).map((name,index)=>({nickname:name,role:index===0?'host':'member',ingame_phone:null})):[]);
  const participantAction=!logged?`<button type="button" class="lac-together__primary" data-together-action="login">Discord 로그인 후 신청</button>`:!controlState(state).profile?`<button type="button" class="lac-together__primary" data-together-action="profile">인게임 프로필 등록</button>`:canApply?`<button type="button" class="lac-together__primary" data-together-action="apply" ${ui.busy?'disabled':''}>참가 신청</button>`:canWithdraw?`<button type="button" class="lac-together__ghost" data-together-action="withdraw" ${ui.busy?'disabled':''}>${p.my_status==='pending'?'신청 취소':'참가 취소'}</button>`:p.my_status==='rejected'?'<span class="lac-together__tip">신청이 거절되었습니다.</span>':'';
  const management=isHost?`<details class="lac-together__manage"><summary aria-label="모집글 관리">··· <span>관리</span></summary><div class="lac-together__manage-items">${editAllowed?`<button type="button" data-together-action="edit" ${ui.busy?'disabled':''}>모집글 수정</button>`:''}${p.status!=='종료'?`<button type="button" data-together-action="finish" ${ui.busy?'disabled':''}>활동 종료</button>`:''}<button type="button" class="is-danger" data-together-action="delete" ${ui.busy?'disabled':''}>모집글 삭제</button></div></details>`:'';
  const requests=pending.length?`<section class="lac-together__post-section lac-together__request-section"><div class="lac-together__section-heading"><h3>참가 신청 대기</h3><span>${pending.length}명</span></div><div class="lac-together__requests">${pending.map(r=>`<div class="lac-together__request"><span><b>${esc(r.nickname)}</b><small>승인 대기</small></span>${active?`<span class="lac-together__request-actions"><button type="button" data-together-action="approve" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>승인</button><button type="button" data-together-action="reject" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>거절</button></span>`:''}</div>`).join('')}</div></section>`:'';
  const people=p.can_chat?`<ol class="lac-together__people">${roster.map(renderPartyMember).join('')}</ol><p class="lac-together__privacy"><span aria-hidden="true">♧</span> 전화번호는 등록된 인게임 번호이며 모집자와 확정 참가자에게만 표시됩니다.</p>`:
    `<div class="lac-together__private-note"><span aria-hidden="true">♧</span><strong>파티원 정보는 비공개입니다.</strong><p>참가가 확정되면 닉네임과 인게임 연락처를 확인할 수 있습니다.</p></div>`;
  const chat=p.can_chat?`<div class="lac-together__messages" aria-label="참가자 채팅 메시지">${ui.messages.length?ui.messages.map(m=>`<div class="lac-together__message${m.mine?' is-mine':''}"><span>${esc(m.nickname)} · ${esc(when(m.created_at))}</span><p>${esc(m.body)}</p></div>`).join(''):empty('아직 메시지가 없습니다. 먼저 인사해 보세요.')}</div>${canMessage?`<form data-together-form="chat" class="lac-together__chat-form"><input type="text" name="body" maxlength="500" placeholder="파티원에게 메시지 보내기" value="${esc(ui.chatDraft)}" required aria-label="채팅 메시지"><button class="lac-together__primary" type="submit" ${ui.busy?'disabled':''}>전송</button></form>`:'<p class="lac-together__tip">종료된 활동입니다. 채팅은 읽기 전용입니다.</p>'}`:
    `<div class="lac-together__private-note lac-together__private-note--chat"><span aria-hidden="true">♧</span><strong>참가자 전용 대화 공간</strong><p>모집자와 참가가 확정된 사람만 채팅을 읽고 작성할 수 있습니다.</p></div>`;
  return `<div class="lac-together__detail"><article class="lac-together__post">
    <header class="lac-together__post-header">
      <div class="lac-together__post-top"><div class="lac-together__post-tags"><span class="lac-together__category">${esc(p.category)}</span>${statusBadge(p.status)}</div>${management}</div>
      <div class="lac-together__post-caption">TOGETHER / RECRUITMENT DETAIL</div><h2>${esc(p.title)}</h2><p class="lac-together__post-description">${esc(p.description||'상세 안내가 없습니다.')}</p>
      <div class="lac-together__post-meta"><div><span>활동 일시</span><strong>${esc(when(p.starts_at))}</strong></div><div><span>모집자</span><strong>${esc(p.host_nickname)}</strong></div><div><span>자동 종료</span><strong>${esc(when(p.ends_at))}</strong></div></div>
      <div class="lac-together__post-status"><div class="lac-together__post-status-top"><div><strong>모집 현황</strong><span>모집자 1명 · 확정 파티원 ${confirmedOthers}명</span></div><span class="lac-together__post-count"><b>${confirmed}</b> / ${capacity}명</span></div><div class="lac-together__progress" role="progressbar" aria-valuemin="0" aria-valuemax="${capacity}" aria-valuenow="${confirmed}" aria-label="현재 확정 인원"><i style="width:${ratio}%"></i></div>${participantAction?`<div class="lac-together__post-join">${participantAction}${p.my_status==='pending'?'<span class="lac-together__tip">모집자의 승인을 기다리는 중입니다.</span>':''}</div>`:''}</div>
    </header>
    <div class="lac-together__post-body"><div class="lac-together__post-side"><section class="lac-together__post-section"><div class="lac-together__section-heading"><h3>파티원 정보 <small>PARTY ROSTER</small></h3><span>${confirmed} / ${capacity}명</span></div>${people}</section>${requests}</div>
      <section class="lac-together__post-section lac-together__post-chat"><div class="lac-together__section-heading"><h3>파티 채팅 <small>PARTY LOUNGE</small></h3><span>${p.can_chat?'참가자 전용':'비공개'}</span></div>${chat}</section>
    </div>
  </article></div>`;
}
export function renderTogetherPage(state){const {loggedIn,profile}=controlState(state);
  return `<div class="lac-together lac-together--${esc(ui.mode)}" id="lac-together">${pageTop(state)}<main class="lac-together__main"><div class="lac-together__hero"><div><span class="lac-together__eyebrow">LAC HUB · PLAY TOGETHER</span><h1>함께하기 <span class="lac-together__hero-accent">/ 모집 광장</span></h1><p>다양한 활동의 동료를 모집하고, 게임 속에서 함께하세요.</p><span class="lac-together__hero-caption">RECRUIT · MEET · PLAY</span></div><div class="lac-together__hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-2c0-2.4 2-4.2 5.5-4.2s5.5 1.8 5.5 4.2v2"/><circle cx="17.2" cy="8.7" r="2.4"/><path d="M16 13.7c2.9-.3 4.8 1 4.8 3.3v2"/></svg></div></div><div class="lac-together__toolbar"><div class="lac-together__toolbar-left">${ui.mode==='list'?`<label for="lac-together-filter">활동 카테고리</label><select id="lac-together-filter" data-together-filter><option value="전체">전체 활동</option>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${ui.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<button class="lac-together__ghost" type="button" data-together-action="back">← 모집 목록</button>`}</div><div>${ui.mode==='list'?`<button type="button" class="lac-together__primary" data-together-action="create">+ 모집하기</button>`:''}</div></div>
  ${ui.error?`<div class="lac-together__error" role="alert">${esc(ui.error)}</div>`:''}
  ${ui.mode==='list'?`<div class="lac-together__list-heading"><h2>모집 목록</h2><span>총 ${ui.items.filter(row=>ui.category==='전체'||row.category===ui.category).length}개의 모집글</span></div>`:''}
  ${['create','edit'].includes(ui.mode)?renderCreate():ui.mode==='detail'?renderDetail(state):`<div class="lac-together__grid">${listCards()}</div>`}
  ${ui.mode==='list'?`<p class="lac-together__foot">모집 목록은 로그인 없이 볼 수 있습니다. 모집·참가·채팅에는 Discord 로그인과 인게임 프로필이 필요합니다.${!loggedIn?' <button type="button" data-together-action="login">Discord 로그인</button>':!profile?' <button type="button" data-together-action="profile">인게임 프로필 등록</button>':''}</p>`:''}
  </main></div>`;
}
async function fetchList(){ui.items=await rpc('list_posts',{p_category:null})||[];}
async function fetchDetail(){if(!ui.id)return;const data=await rpc('get_post',{p_id:ui.id});ui.detail=data||null;
  ui.roster=[];ui.rosterLoaded=false;
  if(data?.can_chat){
    const [messages,roster]=await Promise.allSettled([
      rpc('get_messages',{p_post_id:ui.id}),rpc('get_roster',{p_post_id:ui.id})
    ]);
    if(messages.status==='fulfilled')ui.messages=messages.value||[];
    else throw messages.reason;
    if(roster.status==='fulfilled'&&Array.isArray(roster.value)){ui.roster=roster.value;ui.rosterLoaded=true;}
  }else{ui.messages=[];}
}
export async function refreshTogether(state,render,{quiet=false}={}){
  if(state.page!=='together'||['create','edit'].includes(ui.mode)||ui.loading||ui.busy)return;
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
  if(target?.closest('form[data-together-form="create"],form[data-together-form="edit"]')&&target.name)ui.formDraft[target.name]=target.value;}
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
  if(action==='back'){ui.formDraft={};ui.mode='list';ui.id=null;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='detail'){ui.mode='detail';ui.id=button.dataset.id;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='edit'){
    if(!ui.detail?.is_host||Date.parse(ui.detail.starts_at)<=Date.now())return;
    const p=ui.detail,start=new Date(p.starts_at);
    ui.formDraft={category:p.category,title:p.title,description:p.description||'',capacity:String(p.capacity),date:localDate(start),period:start.getHours()>=12?'pm':'am',hour:String(start.getHours()%12||12),minute:pad(start.getMinutes()),duration:String(Math.round((Date.parse(p.ends_at)-Date.parse(p.starts_at))/60000))};
    ui.mode='edit';ui.error='';render();return;
  }
  if(action==='create'){
    if(!state.session?.user){await login();return;}
    if(!await ensureProfile(state,openProfile)){render();return;}
    ui.formDraft={};ui.mode='create';ui.error='';render();return;
  }
  if(!ui.id||!['apply','approve','reject','withdraw','finish','delete'].includes(action))return;
  if(!await ensureProfile(state,openProfile)){render();return;}
  if(action==='delete'&&!window.confirm('모집글과 참가 신청, 채팅 기록이 즉시 삭제됩니다. 복구할 수 없습니다. 삭제할까요?'))return;
  if(action==='finish'&&!window.confirm('활동을 지금 종료할까요? 종료 후 채팅은 읽기 전용이 됩니다.'))return;
  if(action==='withdraw'&&!window.confirm('참가 신청 또는 확정 참가를 취소할까요?'))return;
  await runMutation(async()=>{
    if(action==='apply')await rpc('apply',{p_post_id:ui.id});
    if(action==='approve'||action==='reject')await rpc('review',{p_post_id:ui.id,p_user_id:button.dataset.userId,p_accept:action==='approve'});
    if(action==='withdraw')await rpc('withdraw',{p_post_id:ui.id});
    if(action==='finish')await rpc('finish',{p_post_id:ui.id});
    if(action==='delete'){await rpc('delete_post',{p_post_id:ui.id});ui.mode='list';ui.id=null;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.chatDraft='';ui.error='';}
  },state,render);
}
export async function togetherSubmit(form,state,{render,openProfile}){
  if(!await ensureProfile(state,openProfile)){render();return;}
  const data=new FormData(form);
  if(['create','edit'].includes(form.dataset.togetherForm)){
    const date=String(data.get('date')||'');
    const hourText=String(data.get('hour')??'').trim(), minuteText=String(data.get('minute')??'').trim();
    const period=String(data.get('period')||'');
    const hour12=Number(hourText),minute=Number(minuteText);
    const hour=(hour12%12)+(period==='pm'?12:0);
    const validClock=/^\d{1,2}$/.test(hourText)&&/^\d{1,2}$/.test(minuteText)&&['am','pm'].includes(period)&&Number.isInteger(hour12)&&Number.isInteger(minute)&&hour12>=1&&hour12<=12&&minute>=0&&minute<=59;
    const starts=validClock&&/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(`${date}T${pad(hour)}:${pad(minute)}:00`):new Date(NaN);
    if(!Number.isFinite(starts.getTime())||localDate(starts)!==date||starts.getHours()!==hour||starts.getMinutes()!==minute){ui.error='활동 날짜와 시작 시각을 정확히 입력해 주세요. (오전/오후, 시 1~12, 분 0~59)';render();return;}
    // Do not pass a fabricated timezone; Date preserves the browser's local input time.
    await runMutation(async()=>{
      const fields={p_category:data.get('category'),p_title:String(data.get('title')||'').trim(),p_description:String(data.get('description')||'').trim(),p_capacity:Number(data.get('capacity')),p_starts_at:starts.toISOString(),p_duration_minutes:Number(data.get('duration'))};
      const id=form.dataset.togetherForm==='edit'?(await rpc('update_post',{p_post_id:ui.id,...fields}),ui.id):await rpc('create_post',fields);
      ui.id=id;ui.mode='detail';ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.formDraft={};
    },state,render);
  }else if(form.dataset.togetherForm==='chat'){
    const body=String(data.get('body')||'').trim();if(!body)return;
    await runMutation(async()=>{await rpc('send_message',{p_post_id:ui.id,p_body:body});ui.chatDraft='';},state,render);
    // Rendering replaces the chat form; restore keyboard focus for continuous conversation.
    if(state.page==='together'&&ui.mode==='detail'&&ui.detail?.can_chat){
      const input=typeof document!=='undefined'?document.querySelector('#lac-together form[data-together-form="chat"] input[name="body"]'):null;
      if(input){input.focus({preventScroll:true});const end=input.value.length;input.setSelectionRange?.(end,end);}
      const messages=document.querySelector('#lac-together .lac-together__messages');
      if(messages)messages.scrollTop=messages.scrollHeight;
    }
  }
}
export function togetherProfileUpdated(state){if(state.session?.user){ui.profile=null;ui.profileChecked=false;ui.profileUser=null;}}

// Shared account menus are independent. This listener only closes the Together host management menu.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', event => {
    const menu=document.querySelector('#lac-together .lac-together__manage[open]');
    if(menu && !menu.contains(event.target)) menu.open=false;
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const menu=document.querySelector('#lac-together .lac-together__manage[open]');
    if(menu){menu.open=false;menu.querySelector('summary')?.focus();}
  });
}
