import {supabase} from '../lib/supabase.js';
import {loadPlayerProfile} from '../lib/playerProfileApi.js';
import {renderHubAccountControl} from '../ui/hubHome.js';
import {formatStoredIngamePhone} from '../lib/ingamePhone.js';

const CATEGORIES=['전체','보스','범죄','WWE','자유 활동','기타'];
const BOSS_NAMES=['멧돼지','화학자','메이드'];
const BOSS_DIFFICULTIES=['쉬움','보통','어려움'];
const DURATIONS=[{value:30,label:'30분'},{value:60,label:'1시간'},{value:120,label:'2시간'},{value:240,label:'4시간'},{value:360,label:'6시간'}];
const TOGETHER_PAGE_SIZE=6; // PC 3 columns × 2 rows; pagination is invisible until post 7.
let voiceRefreshTimer=null;
const ui={mode:'list',category:'전체',bossFilter:'전체',difficultyFilter:'전체',page:1,total:0,items:[],detail:null,roster:[],rosterLoaded:false,messages:[],id:null,loading:false,busy:false,error:'',chatDraft:'',profileUser:null,profile:null,profileChecked:false,formDraft:{},lastSync:0,voice:null,partyState:null};
let voiceGuideChannel=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const when=v=>{try{return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'}).format(new Date(v));}catch{return '시간 미확인';}};
// Show the real end deadline as a live countdown. This is presentation only:
// Supabase continues to own closing, posting, and cleanup authorization.
export function togetherRemainingTime(endsAt,status,now=Date.now()){
  if(status==='종료')return '활동 종료';
  const end=Date.parse(String(endsAt??''));
  if(!Number.isFinite(end))return '시간 확인';
  const seconds=Math.max(0,Math.ceil((end-now)/1000));
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60),secs=seconds%60;
  return hours ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
    : `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

const pad=n=>String(n).padStart(2,'0');
const localDate=t=>`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
const today=()=>localDate(new Date());
function defaultStart(){const d=new Date(Date.now()+60*60_000);d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0);return {date:localDate(d),period:d.getHours()>=12?'pm':'am',hour:String(d.getHours()%12||12),minute:pad(d.getMinutes())};}
function check(){if(!supabase)throw Error('Supabase 연결이 필요합니다.');return supabase;}
async function rpc(method,params={}){const {data,error}=await check().rpc(`together_${method}`,params);if(error)throw error;return data;}
function displayError(e){return String(e?.message||e||'잠시 후 다시 시도해 주세요.').replace(/^Error:\s*/, '');}
function bossTags(row){
  if(row?.category!=='보스')return '';
  // Legacy posts continue to show their original title; structured tags are optional.
  const kind=BOSS_NAMES.includes(row.boss_name)?row.boss_name:'';
  const level=BOSS_DIFFICULTIES.includes(row.boss_difficulty)?row.boss_difficulty:'';
  return (kind||level)?`<span class="lac-together__boss-tags" aria-label="보스 상세 정보">${kind?`<span class="lac-together__boss-name">${esc(bossPublicName(kind))}</span>`:''}${level?`<span class="lac-together__difficulty lac-together__difficulty--${level==='쉬움'?'easy':level==='보통'?'normal':'hard'}">${esc(level)}</span>`:''}</span>`:'';
}
function statusBadge(status){const kind=status==='모집 중'?'open':status==='모집 마감'?'full':status==='진행 중'?'active':'ended';const label=status==='진행 중'?'활동 중':status||'모집 중';return `<span class="lac-together__badge lac-together__badge--${kind}">${esc(label)}</span>`;}
function pageTop(state){const account=state.session?.user && state.ready
    ? `<div class="hub-account">${renderHubAccountControl(state)}</div>`
    : `<button type="button" class="lac-together__head-login" data-together-action="login">Discord 로그인</button>`;
  return `<header class="lac-together__head"><a href="/" class="lac-together__brand" aria-label="메인으로 이동"><span class="lac-together__brand-arrow" aria-hidden="true">←</span><span>메인으로</span></a><div class="lac-together__head-right"><span class="lac-together__eyebrow">PLAY TOGETHER</span>${account}</div></header>`;}
function empty(message){return `<div class="lac-together__empty">${esc(message)}</div>`;}
function controlState(state){return {loggedIn:Boolean(state.session?.user),profile:Boolean(ui.profile && ui.profile.user_id===state.session?.user?.id),busy:ui.busy};}
// Filtering + pagination happen in the DB, not in the browser's former 80-post snapshot.
function filteredRows(){return ui.items;}
function renderPagination(){
  const pages=Math.ceil(ui.total/TOGETHER_PAGE_SIZE);
  if(pages<=1 || ui.mode!=='list')return '';
  const current=Math.min(Math.max(1,ui.page),pages);
  const begin=Math.max(1,Math.min(current-2,pages-4));
  const end=Math.min(pages,begin+4);
  const button=(page,label,{currentPage=false,disabled=false,edge=false}={})=>
    `<button type="button" class="lac-together__page-button${currentPage?' is-current':''}${edge?' is-edge':''}" data-together-action="page" data-page="${page}" aria-label="${page}페이지${edge?' 이동':''}" ${currentPage?'aria-current="page"':''} ${disabled||ui.loading?'disabled':''}>${label}</button>`;
  const links=[];
  if(begin>1){links.push(button(1,'1'));if(begin>2)links.push('<span class="lac-together__page-ellipsis" aria-hidden="true">…</span>');}
  for(let n=begin;n<=end;n++)links.push(button(n,String(n),{currentPage:n===current}));
  if(end<pages){if(end<pages-1)links.push('<span class="lac-together__page-ellipsis" aria-hidden="true">…</span>');links.push(button(pages,String(pages)));}
  return `<nav class="lac-together__pagination" aria-label="모집 목록 페이지">
    <span class="lac-together__page-summary">총 ${ui.total}개 · ${current} / ${pages}페이지</span>
    <div class="lac-together__page-controls">${button(Math.max(1,current-1),'← 이전',{disabled:current===1,edge:true})}<span class="lac-together__page-links">${links.join('')}</span>${button(Math.min(pages,current+1),'다음 →',{disabled:current===pages,edge:true})}</div>
  </nav>`;
}
function bossFilterToolbar(){if(ui.mode!=='list'||ui.category!=='보스')return '';
  const options=(kind,values,current)=>`<div class="lac-together__boss-filter-row"><span>${kind==='name'?'보스 종류':'난이도'}</span><div class="lac-together__boss-filter-options">${values.map(v=>`<button type="button" data-together-action="${kind==='name'?'boss-filter':'difficulty-filter'}" data-value="${esc(v)}" class="lac-together__boss-filter ${current===v?'is-selected':''} ${kind==='difficulty'&&v!=='전체'?'lac-together__difficulty lac-together__difficulty--'+(v==='쉬움'?'easy':v==='보통'?'normal':'hard'):''}" aria-pressed="${current===v}">${esc(kind==='name'?bossPublicName(v):v)}</button>`).join('')}</div></div>`;
  return `<div class="lac-together__boss-filters" aria-label="보스 모집 세부 필터">${options('name',['전체',...BOSS_NAMES],ui.bossFilter)}${options('difficulty',['전체',...BOSS_DIFFICULTIES],ui.difficultyFilter)}</div>`;}
const bossPublicName=name=>name==='화학자'?'미친 화학자':name;
function personSymbol(kind){
  return kind==='host'
  ?`<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>`
  :`<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function bossRecruitmentCard(row,capacity,confirmed){
  const kind=row.boss_name;
  const level=row.boss_difficulty;
  const cssLevel=level==='쉬움'?'easy':level==='보통'?'normal':'hard';
  const cssBoss=kind==='멧돼지'?'boar':kind==='메이드'?'maid':'chemist';
  const visibleName=bossPublicName(kind);
  const label=`${visibleName} ${level} 보스 모집 · 모집자 ${row.host_nickname||'플레이어'} · 참가 현황 ${confirmed} / ${capacity}명 · ${row.status||'모집 중'}`;
  return `<button type="button" class="lac-together__item lac-together__item--art lac-together__item--boss" data-together-category="보스" data-boss="${cssBoss}" data-together-action="detail" data-id="${esc(row.id)}" aria-label="${esc(label)}">
    <span class="lac-together__boss-art" aria-hidden="true"></span>
    <span class="lac-together__item-top lac-together__boss-status-cluster"><span class="lac-together__category">보스</span>${statusBadge(row.status)}</span>
    <span class="lac-together__boss-info-skin"><span class="lac-together__boss-summary"><span class="lac-together__boss-title-group"><span class="lac-together__boss-primary">${esc(visibleName)}</span><span class="lac-together__difficulty lac-together__difficulty--${cssLevel}">${esc(level)}</span></span></span>
    <span class="lac-together__boss-bottom">
      <span class="lac-together__boss-stat">${personSymbol('host')}<span class="lac-together__boss-stat-copy"><small>모집자</small><strong>${esc(row.host_nickname||'플레이어')}</strong></span></span>
      <span class="lac-together__boss-stat lac-together__boss-stat--count">${personSymbol('group')}<span class="lac-together__boss-stat-copy"><small>참가 현황</small><strong><em>${confirmed}</em> / ${capacity}명</strong></span></span>
    </span></span>
  </button>`;
}
function listCards(){const rows=filteredRows();
  return rows.length?rows.map(row=>{
    const capacity=Math.max(2,Number(row.capacity)||2),confirmed=Math.min(capacity,Math.max(1,Number(row.confirmed_count)||1));
    // Historical boss posts without both structured fields retain their title and description.
    if(row.category==='보스'&&BOSS_NAMES.includes(row.boss_name)&&BOSS_DIFFICULTIES.includes(row.boss_difficulty))
      return bossRecruitmentCard(row,capacity,confirmed);
    const activityKey=row.category==='WWE'?'wwe':row.category==='범죄'?'crime':row.category==='자유 활동'?'free':'other';
    const aria=`${row.category} ${row.title} · ${row.status||'모집 중'} · 모집자 ${row.host_nickname||'플레이어'} · ${confirmed} / ${capacity}명`;
    return `<button type="button" class="lac-together__item lac-together__item--art lac-together__item--activity" data-together-category="${esc(row.category)}" data-activity="${activityKey}" data-together-action="detail" data-id="${esc(row.id)}" aria-label="${esc(aria)}">
      <span class="lac-together__boss-art" aria-hidden="true"></span>
      <span class="lac-together__item-top lac-together__boss-status-cluster"><span class="lac-together__category">${esc(row.category)}</span>${statusBadge(row.status)}</span>
      <span class="lac-together__boss-info-skin"><span class="lac-together__boss-summary"><span class="lac-together__boss-title-group lac-together__activity-title"><span class="lac-together__boss-primary" title="${esc(row.title)}">${esc(row.title)}</span></span></span>
      <span class="lac-together__boss-bottom"><span class="lac-together__boss-stat">${personSymbol('host')}<span class="lac-together__boss-stat-copy"><small>모집자</small><strong>${esc(row.host_nickname||'플레이어')}</strong></span></span>
      <span class="lac-together__boss-stat lac-together__boss-stat--count">${personSymbol('group')}<span class="lac-together__boss-stat-copy"><small>참가 현황</small><strong><em>${confirmed}</em> / ${capacity}명</strong></span></span></span></span>
    </button>`;
  }).join(''):empty('해당 카테고리에 등록된 활동이 없습니다.');
}
function renderCreate(){const defaults=defaultStart(),d=today(),f=ui.formDraft||{},editing=ui.mode==='edit';return `<form class="lac-together__create" data-together-form="${editing?'edit':'create'}"><h2 class="lac-together__form-title">${editing?'모집글 수정':'모집 등록'}</h2>
  <div class="lac-together__form-grid lac-together__form-grid--basics">
    <label class="lac-together__field"><span class="lac-together__field-label">활동 카테고리</span><select name="category" required>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${f.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
    <label class="lac-together__field"><span class="lac-together__field-label">모집 인원 <small>모집자 포함</small></span><input name="capacity" type="number" inputmode="numeric" min="2" max="10" step="1" value="${esc(f.capacity??'')}" placeholder="2~10명 직접 입력" required></label>
  </div>
  <div class="lac-together__boss-fields" data-together-boss-fields ${(!f.category||f.category==='보스')?'':'hidden'}>
    <div class="lac-together__boss-heading"><span>보스 세부 설정</span><small>선택한 보스와 난이도가 모집글에 표시됩니다.</small></div>
    <div class="lac-together__form-grid lac-together__form-grid--boss">
      <label class="lac-together__field"><span class="lac-together__field-label">보스 종류</span><select name="boss_name" ${(!f.category||f.category==='보스')?'required':''}>${BOSS_NAMES.map(v=>`<option value="${v}" ${f.boss_name===v?'selected':''}>${esc(bossPublicName(v))}</option>`).join('')}</select></label>
      <label class="lac-together__field"><span class="lac-together__field-label">난이도</span><select name="boss_difficulty" ${(!f.category||f.category==='보스')?'required':''}>${BOSS_DIFFICULTIES.map(v=>`<option value="${v}" ${f.boss_difficulty===v?'selected':''}>${v}</option>`).join('')}</select></label>
    </div>
    <div class="lac-together__boss-preview" aria-live="polite"><span data-together-boss-preview-name>${esc(bossPublicName(f.boss_name||'멧돼지'))}</span><span data-together-boss-preview-difficulty class="lac-together__difficulty lac-together__difficulty--${(f.boss_difficulty||'쉬움')==='쉬움'?'easy':(f.boss_difficulty||'쉬움')==='보통'?'normal':'hard'}">${esc(f.boss_difficulty||'쉬움')}</span></div>
  </div>
  <label class="lac-together__field" data-together-title-field ${(!f.category||f.category==='보스')?'hidden':''}><span class="lac-together__field-label">모집 제목</span><input name="title" maxlength="90" minlength="5" value="${esc(f.title||'')}" placeholder="어떤 활동을 함께할 예정인가요?" ${(!f.category||f.category==='보스')?'disabled':'required'}></label>
  <div class="lac-together__form-lower"><div class="lac-together__form-extras">
  <label class="lac-together__field"><span class="lac-together__field-label">상세 내용 <small>선택</small></span><textarea name="description" maxlength="600" rows="3" placeholder="준비 사항, 참가 조건 등을 자유롭게 작성해 주세요.">${esc(f.description||'')}</textarea></label>
  <label class="lac-together__field lac-together__duration-field"><span class="lac-together__field-label">시작 후 유지 시간</span><select name="duration">${DURATIONS.map(d=>`<option value="${d.value}" ${Number(f.duration||60)===d.value?'selected':''}>${d.label}</option>`).join('')}</select></label>
  </div>
  <div class="lac-together__form-grid lac-together__form-grid--schedule">
    <label class="lac-together__field"><span class="lac-together__field-label">활동 날짜</span><input type="date" name="date" value="${esc(f.date||defaults.date)}" min="${d}" required></label>
    <div class="lac-together__field lac-together__time-field" role="group" aria-label="시작 시각"><span class="lac-together__field-label">시작 시각</span>
      <div class="lac-together__time-inputs"><select name="period" aria-label="오전 오후"><option value="am" ${(f.period??defaults.period)==='am'?'selected':''}>오전</option><option value="pm" ${(f.period??defaults.period)==='pm'?'selected':''}>오후</option></select><label><input name="hour" type="number" inputmode="numeric" min="1" max="12" step="1" placeholder="시" value="${esc(f.hour??defaults.hour)}" required aria-label="시작 시간, 시"><span>시</span></label><span class="lac-together__time-sep">:</span><label><input name="minute" type="number" inputmode="numeric" min="0" max="59" step="1" placeholder="분" value="${esc(f.minute??defaults.minute)}" required aria-label="시작 시간, 분"><span>분</span></label></div>
    </div>
  </div>
  </div>
  <p class="lac-together__tip">시작 시각에 모집이 마감됩니다. 활동 종료 후 15분 유예를 두고 기록이 자동 정리됩니다.</p>
  <div class="lac-together__actions"><button class="lac-together__ghost" type="button" data-together-action="back">취소</button><button type="submit" class="lac-together__primary" ${ui.busy?'disabled':''}>${ui.busy?'저장 중…':editing?'변경 저장':'모집 등록'}</button></div>
  </form>`;}
function renderPartyMember(member,index){
  const host=member.role==='host',name=esc(member.nickname||'닉네임 미등록');
  const phone=member.ingame_phone?esc(formatStoredIngamePhone(member.ingame_phone)):'미등록';
  return `<li class="lac-together__person"><span class="lac-together__person-num">${pad(index+1)}</span><span class="lac-together__person-avatar" aria-hidden="true">${personSymbol('host')}</span><div class="lac-together__person-name"><strong>${name}</strong><small>${host?'모집자':'참가 확정'}</small></div><div class="lac-together__person-phone"><span>인게임 전화</span><strong>${phone}</strong></div></li>`;
}
function renderDetail(state){const p=ui.detail;if(!p)return empty('모집 정보를 찾을 수 없거나 보관 기간이 종료되었습니다.');
  const isHost=Boolean(p.is_host), logged=Boolean(state.session?.user), active=p.status==='모집 중';
  const canMessage=Boolean(p.can_chat)&&p.status!=='종료';
  const canApply=active&&!isHost&&!['pending','accepted'].includes(p.my_status)&&p.my_status!=='kicked';
  const canWithdraw=!isHost&&['pending','accepted'].includes(p.my_status)&&p.status!=='종료';
  const editAllowed=isHost&&Date.parse(p.starts_at)>Date.now()&&p.status!=='종료';
  const structuredBoss=p.category==='보스'&&BOSS_NAMES.includes(p.boss_name)&&BOSS_DIFFICULTIES.includes(p.boss_difficulty);
  const detailHeading=structuredBoss?bossPublicName(p.boss_name):p.title;
  const detailSubheading=structuredBoss?`<span class="lac-together__detail-level lac-together__difficulty lac-together__difficulty--${p.boss_difficulty==='쉬움'?'easy':p.boss_difficulty==='보통'?'normal':'hard'}">${esc(p.boss_difficulty)}</span>`:'';
  const pending=isHost?(p.requests||[]).filter(r=>r.status==='pending'):[];
  const confirmedOthers=Math.max(0,Number(p.confirmed_count||1)-1);
  const capacity=Math.max(2,Number(p.capacity||2)),confirmed=Math.min(capacity,1+confirmedOthers),ratio=Math.min(100,(confirmed/capacity)*100);
  const roster=ui.rosterLoaded?ui.roster: (p.can_chat?(p.members||[]).map((name,index)=>({nickname:name,role:index===0?'host':'member',ingame_phone:null})):[]);
  const participantAction=!logged?`<button type="button" class="lac-together__primary" data-together-action="login">Discord 로그인 후 신청</button>`:!controlState(state).profile?`<button type="button" class="lac-together__primary" data-together-action="profile">인게임 프로필 등록</button>`:canApply?`<button type="button" class="lac-together__primary" data-together-action="apply" ${ui.busy?'disabled':''}>참가 신청</button>`:canWithdraw?`<button type="button" class="lac-together__ghost" data-together-action="withdraw" ${ui.busy?'disabled':''}>${p.my_status==='pending'?'신청 취소':'파티 나가기'}</button>`:p.my_status==='kicked'?'<span class="lac-together__tip">모집자가 내보낸 파티에는 다시 신청할 수 없습니다.</span>':p.my_status==='rejected'?'<span class="lac-together__tip">신청이 거절되었습니다.</span>':'';
  const management=isHost?`<details class="lac-together__manage"><summary aria-label="모집글 관리">··· <span>관리</span></summary><div class="lac-together__manage-items">${editAllowed?`<button type="button" data-together-action="edit" ${ui.busy?'disabled':''}>모집글 수정</button>`:''}${p.status!=='종료'?`<button type="button" data-together-action="finish" ${ui.busy?'disabled':''}>활동 종료</button>`:''}<button type="button" class="is-danger" data-together-action="delete" ${ui.busy?'disabled':''}>모집글 삭제</button></div></details>`:'';
  const requests=pending.length?`<section class="lac-together__post-section lac-together__request-section"><div class="lac-together__section-heading"><h3>참가 신청 대기</h3><span>${pending.length}명</span></div><div class="lac-together__requests">${pending.map(r=>`<div class="lac-together__request"><span><b>${esc(r.nickname)}</b><small>승인 대기</small></span>${active?`<span class="lac-together__request-actions"><button type="button" data-together-action="approve" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>승인</button><button type="button" data-together-action="reject" data-user-id="${esc(r.user_id)}" ${ui.busy?'disabled':''}>거절</button></span>`:''}</div>`).join('')}</div></section>`:'';
  const ps=ui.partyState||{};
  const readyList=Array.isArray(ps.members)?ps.members:[];
  const readyCount=readyList.filter(x=>x.ready).length;
  const isReady=readyList.some(x=>x.mine&&x.ready);
  const readySlots=readyList.map(x=>`<span class="lac-together__ready-segment${x.ready?' is-ready':''}" aria-hidden="true"></span>`).join('');
  const readyBoard=p.can_chat?`<section class="lac-together__post-section lac-together__ready-section" aria-label="파티 준비 현황">
    <div class="lac-together__section-heading lac-together__ready-heading"><h3>파티 준비</h3><span class="lac-together__ready-count"><strong>${readyCount}</strong><span> / ${readyList.length}명 완료</span></span></div>
    <div class="lac-together__ready-progress" role="progressbar" aria-label="준비 완료 인원" aria-valuenow="${readyCount}" aria-valuemin="0" aria-valuemax="${readyList.length}">${readySlots}</div>
    <div class="lac-together__ready-list" role="list" aria-label="파티원 준비 상태">${readyList.map((x,i)=>`<div class="lac-together__ready-row${x.ready?' is-ready':' is-waiting'}${x.mine?' is-mine':''}" role="listitem"><span class="lac-together__ready-avatar" aria-hidden="true">${x.ready?'✓':String(i+1).padStart(2,'0')}</span><span class="lac-together__ready-member"><strong>${esc(x.nickname)}</strong>${x.is_host?'<em>모집자</em>':''}</span><span class="lac-together__ready-badge${x.ready?' is-ready':''}"><span class="lac-together__ready-badge-icon" aria-hidden="true">${x.ready?'✓':'·'}</span>${x.ready?'준비 완료':'대기 중'}</span>${isHost&&!x.is_host?`<button type="button" class="lac-together__ready-kick" data-together-action="kick" data-user-id="${esc(x.user_id)}" ${ui.busy?'disabled':''} aria-label="${esc(x.nickname)} 내보내기">내보내기</button>`:''}</div>`).join('')}</div>
    ${p.status!=='종료'&&(!isHost&&p.my_status==='accepted'||isHost)?`<button type="button" class="lac-together__ready-toggle${isReady?' is-ready':''}" data-together-action="ready" ${ui.busy?'disabled':''}><span class="lac-together__ready-toggle-icon" aria-hidden="true">${isReady?'↶':'✓'}</span><span>${isReady?'준비 상태 취소':'준비 완료하기'}</span></button>`:''}
  </section>`:'';
  const people=p.can_chat?`<ol class="lac-together__people">${roster.map(renderPartyMember).join('')}</ol><p class="lac-together__privacy"><span aria-hidden="true">♧</span> 전화번호는 등록된 인게임 번호이며 모집자와 확정 참가자에게만 표시됩니다.</p>`:
    `<div class="lac-together__private-note"><span aria-hidden="true">♧</span><strong>파티원 정보는 비공개입니다.</strong><p>참가가 확정되면 닉네임과 인게임 연락처를 확인할 수 있습니다.</p></div>`;
  const voice=p.can_chat?`<section class="lac-together__post-section lac-together__voice" aria-label="파티 음성채널"><div class="lac-together__section-heading"><h3>Discord 파티 음성</h3><span>승인된 파티원 전용</span></div>${ui.voice?.status==='active'&&/^\d{17,20}$/.test(String(ui.voice.channel_id||''))?`<p>음성방이 열려 있습니다. 파티원만 접속할 수 있습니다.</p><button type="button" class="lac-together__primary lac-together__voice-join" data-together-action="voice-guide-open" data-channel-id="${esc(ui.voice.channel_id)}">🎧 음성 참가 방법</button> <a class="lac-together__voice-web-link" href="https://discord.com/channels/1559104034798051328/${esc(ui.voice.channel_id)}" target="_blank" rel="noopener noreferrer">브라우저로 열기</a>`:ui.voice?.status==='pending'?'<p>음성채널을 생성하고 있습니다. 잠시 후 다시 확인해 주세요.</p>':isHost?`<p>모집자가 음성방을 만들 수 있습니다. 모집글이 종료되어도 이용자가 있으면 유지됩니다.</p><button type="button" class="lac-together__primary" data-together-action="voice-create" ${ui.busy?'disabled':''}>비공개 음성채널 만들기</button>`:'<p>모집자가 음성채널을 생성하면 이곳에 참여 버튼이 나타납니다.</p>'}</section>`:'';
  const chat=p.can_chat?`<div class="lac-together__messages" aria-label="참가자 채팅 메시지">${ui.messages.length?ui.messages.map(m=>`<div class="lac-together__message${m.mine?' is-mine':''}"><span>${esc(m.nickname)} · ${esc(when(m.created_at))}</span><p>${esc(m.body)}</p></div>`).join(''):empty('아직 메시지가 없습니다. 먼저 인사해 보세요.')}</div>${canMessage?`<form data-together-form="chat" class="lac-together__chat-form"><input type="text" name="body" maxlength="500" placeholder="파티원에게 메시지 보내기" value="${esc(ui.chatDraft)}" required aria-label="채팅 메시지"><button class="lac-together__primary" type="submit" ${ui.busy?'disabled':''}>전송</button></form>`:'<p class="lac-together__tip">종료된 활동입니다. 채팅은 읽기 전용입니다.</p>'}`:
    `<div class="lac-together__private-note lac-together__private-note--chat"><span aria-hidden="true">♧</span><strong>참가자 전용 대화 공간</strong><p>모집자와 참가가 확정된 사람만 채팅을 읽고 작성할 수 있습니다.</p></div>`;
  // All categories use the same app-style detail renderer, privacy rules and countdown.
  // Structured boss posts retain their original boss art; other categories use their v2.17 art.
  const bossKey=structuredBoss?(p.boss_name==='메이드'?'maid':p.boss_name==='멧돼지'?'boar':'chemist'):'';
  const activityKey=p.category==='WWE'?'wwe':p.category==='범죄'?'crime':p.category==='자유 활동'?'free':'other';
  const description=p.description?`<p class="lac-together__raid-note">${esc(p.description)}</p>`:'';
  const headingIntro=structuredBoss?'함께 도전할 파티원을 모집합니다.':'게임 속에서 함께할 플레이어를 모집합니다.';
  return `<div class="lac-together__detail"><article class="lac-together__post lac-together__post--raid" data-boss="${bossKey}" data-activity="${activityKey}" data-together-detail-category="${esc(p.category)}">
      <header class="lac-together__raid-header">
        <div class="lac-together__raid-hero">
          <div class="lac-together__raid-top"><div class="lac-together__post-tags"><span class="lac-together__category">${esc(p.category)}</span>${statusBadge(p.status)}</div>${management}</div>
          <div class="lac-together__raid-heading"><span class="lac-together__raid-eyebrow">PLAY TOGETHER <b aria-hidden="true">✦</b> RECRUITMENT DETAIL</span>
            <h2><span>${esc(detailHeading)}</span>${detailSubheading}</h2><p class="lac-together__raid-subtitle">${headingIntro}</p>${description}</div>
        </div>
        <div class="lac-together__raid-intel" aria-label="모집 정보">
          <div class="lac-together__raid-cell"><span class="lac-together__raid-icon" aria-hidden="true">◷</span><div><small>활동 일시</small><strong>${esc(when(p.starts_at))}</strong></div></div>
          <div class="lac-together__raid-cell"><span class="lac-together__raid-icon" aria-hidden="true">♙</span><div><small>모집자</small><strong>${esc(p.host_nickname)}</strong></div></div>
          <div class="lac-together__raid-cell lac-together__raid-cell--countdown"><span class="lac-together__raid-icon" aria-hidden="true">◴</span><div><small>남은 시간</small><strong class="lac-together__countdown" data-together-countdown="${esc(p.ends_at||'')}" data-status="${esc(p.status||'')}">${esc(togetherRemainingTime(p.ends_at,p.status))}</strong><span class="lac-together__countdown-deadline">종료 예정 ${esc(when(p.ends_at))}</span></div></div>
          <div class="lac-together__raid-cell lac-together__raid-cell--count"><span class="lac-together__raid-icon" aria-hidden="true">♧</span><div><small>참가 현황</small><strong><em>${confirmed}</em> / ${capacity}명</strong><span class="lac-together__raid-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${capacity}" aria-valuenow="${confirmed}" aria-label="현재 확정 인원"><i style="width:${ratio}%"></i></span></div></div>
        </div>
        ${participantAction?`<div class="lac-together__raid-actions">${participantAction}${p.my_status==='pending'?'<span class="lac-together__tip">모집자 승인 대기 중</span>':''}</div>`:''}
      </header>
      <div class="lac-together__post-body lac-together__raid-deck">
        <div class="lac-together__post-side"><section class="lac-together__post-section"><div class="lac-together__section-heading"><h3>파티원 정보 <small>PARTY ROSTER</small></h3><span>${confirmed} / ${capacity}명</span></div>${people}</section>${readyBoard}${requests}${voice}</div>
        <section class="lac-together__post-section lac-together__post-chat"><div class="lac-together__section-heading"><h3>파티 채팅 <small>PARTY LOUNGE</small></h3><span>${p.can_chat?'참가자 전용':'비공개'}</span></div>${chat}</section>
      </div>
    </article></div>`;

}
function voiceGuideMarkup(){
  if(!voiceGuideChannel||!/^\d{17,20}$/.test(voiceGuideChannel))return '';
  return `<div class="lac-together__voice-guide" role="presentation">
    <button class="lac-together__voice-guide-shade" type="button" data-together-action="voice-guide-close" aria-label="안내 닫기"></button>
    <section role="dialog" aria-modal="true" aria-labelledby="lac-voice-guide-heading" aria-describedby="lac-voice-guide-description" class="lac-together__voice-guide-dialog lac-together__voice-guide-dialog--simple">
      <button type="button" class="lac-together__voice-guide-close" data-together-action="voice-guide-close" aria-label="닫기">×</button>
      <span class="lac-together__voice-guide-eyebrow">PARTY VOICE</span>
      <h3 id="lac-voice-guide-heading">Discord 음성 참가</h3>
      <p id="lac-voice-guide-description" class="lac-together__voice-guide-lead">Discord 앱에서 직접 입장해 주세요.</p>
      <ol class="lac-together__voice-guide-steps">
        <li><span class="lac-together__voice-guide-step-no">01</span><span><strong>Discord 앱에서 파티방 선택</strong><small>LAC HUB 서버 → 함께하기 · 음성파티 → 해당 파티방</small></span></li>
        <li><span class="lac-together__voice-guide-step-no">02</span><span><strong>Discord 화면의 ‘음성 채널 참가하기’ 클릭</strong><small>이 버튼을 눌러야 음성에 연결됩니다.</small></span></li>
      </ol>
      <p class="lac-together__voice-guide-footnote">이 안내창은 음성을 연결하지 않아요. 별도 초대 알림도 오지 않습니다.</p>
      <button type="button" class="lac-together__voice-guide-done" data-together-action="voice-guide-close">알겠어요</button>
    </section>
  </div>`;
}
export function renderTogetherPage(state){const {loggedIn,profile}=controlState(state);
  return `<div class="lac-together lac-together--${esc(ui.mode)}" id="lac-together"><div class="lac-together__shell">${pageTop(state)}<main class="lac-together__main"><div class="lac-together__hero"><div><span class="lac-together__eyebrow">LAC HUB · PLAY TOGETHER</span><h1>함께하기</h1><p>다양한 활동을 함께할 플레이어를 찾아보세요.</p></div><div class="lac-together__hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-2c0-2.4 2-4.2 5.5-4.2s5.5 1.8 5.5 4.2v2"/><circle cx="17.2" cy="8.7" r="2.4"/><path d="M16 13.7c2.9-.3 4.8 1 4.8 3.3v2"/></svg></div></div><div class="lac-together__toolbar"><div class="lac-together__toolbar-left">${ui.mode==='list'?`<label for="lac-together-filter">활동 카테고리</label><select id="lac-together-filter" data-together-filter><option value="전체">전체 활동</option>${CATEGORIES.slice(1).map(v=>`<option value="${esc(v)}" ${ui.category===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<button class="lac-together__ghost lac-together__return-list" type="button" data-together-action="back" aria-label="모집 목록으로 돌아가기"><span class="lac-together__return-arrow" aria-hidden="true">←</span><span>모집 목록</span></button>`}</div><div>${ui.mode==='list'?`<button type="button" class="lac-together__primary" data-together-action="create">+ 모집하기</button>`:''}</div></div>
  ${bossFilterToolbar()}
  ${ui.error?`<div class="lac-together__error" role="alert">${esc(ui.error)}</div>`:''}
  ${ui.mode==='list'?`<div class="lac-together__list-heading"><h2>모집 목록</h2><span>총 ${ui.total}개의 모집글</span></div>`:''}
  ${['create','edit'].includes(ui.mode)?renderCreate():ui.mode==='detail'?renderDetail(state):`<div class="lac-together__grid">${ui.loading&&!ui.items.length?empty('모집글을 불러오는 중입니다…'):listCards()}</div>${renderPagination()}`}
  ${ui.mode==='list'?`<p class="lac-together__foot">모집 목록은 로그인 없이 볼 수 있습니다. 모집·참가·채팅에는 Discord 로그인과 인게임 프로필이 필요합니다.${!loggedIn?' <button type="button" data-together-action="login">Discord 로그인</button>':!profile?' <button type="button" data-together-action="profile">인게임 프로필 등록</button>':''}</p>`:''}
  </main></div>${voiceGuideMarkup()}</div>`;
}
async function hydrateBossDetails(rows){
  const targets=(rows||[]).filter(row=>row.category==='보스');
  if(!targets.length)return;
  const details=await rpc('get_boss_details',{p_post_ids:targets.map(row=>row.id)});
  const lookup=new Map((details||[]).map(row=>[row.id,row]));
  for(const row of targets){const detail=lookup.get(row.id);row.boss_name=detail?.boss_name||null;row.boss_difficulty=detail?.boss_difficulty||null;}
}
async function fetchList(){
  const params={p_category:ui.category==='전체'?null:ui.category,
    p_boss_name:ui.category==='보스'&&ui.bossFilter!=='전체'?ui.bossFilter:null,
    p_boss_difficulty:ui.category==='보스'&&ui.difficultyFilter!=='전체'?ui.difficultyFilter:null,
    p_page:ui.page,p_page_size:TOGETHER_PAGE_SIZE};
  let response=await rpc('list_page',params);
  if(!response||!Array.isArray(response.items)||!Number.isInteger(response.total)||response.total<0)
    throw Error('목록 조회 응답을 확인할 수 없습니다. 함께하기 v2.15 SQL 적용 여부를 확인해 주세요.');
  const maxPage=Math.max(1,Math.ceil(response.total/TOGETHER_PAGE_SIZE));
  if(ui.page>maxPage){
    ui.page=maxPage;
    response=await rpc('list_page',{...params,p_page:maxPage});
    if(!response||!Array.isArray(response.items))throw Error('목록 페이지를 불러올 수 없습니다.');
  }
  ui.items=response.items;ui.total=Number(response.total)||0;
  await hydrateBossDetails(ui.items);
}
async function fetchDetail(){if(!ui.id)return;const data=await rpc('get_post',{p_id:ui.id});ui.detail=data||null;
  if(ui.detail)await hydrateBossDetails([ui.detail]);
  ui.voice = data?.can_chat ? await rpc('voice_status',{p_post_id:ui.id}).catch(()=>null) : null;
  ui.partyState = data?.can_chat ? await rpc('party_state',{p_post_id:ui.id}).catch(()=>null) : null;
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
    const needsRefetch=Boolean(ui.refetchAfterCurrent);ui.refetchAfterCurrent=false;
    // Background polling must not steal focus from chat typing or collapse the shared account menu.
    const active=typeof document!=='undefined'?document.activeElement:null;
    const editing=quiet && typeof document!=='undefined' && ((active?.closest?.('#lac-together') && active?.matches?.('input,textarea,select')) || document.querySelector('#lac-together .hub-account__profile[open]'));
    if(state.page==='together'&&!editing)render();
    if(needsRefetch && state.page==='together' && ui.mode==='list')void refreshTogether(state,render);
    // While Discord creates the room, refresh only this page every 3 seconds.
    if(state.page==='together' && ui.mode==='detail' && ui.voice?.status==='pending' && !voiceRefreshTimer){
      voiceRefreshTimer=setTimeout(()=>{voiceRefreshTimer=null;if(document.visibilityState!=='hidden')void refreshTogether(state,render,{quiet:true});},3000);
    }
  }
}
export function togetherOnFilter(value,state,render){
  if(!CATEGORIES.includes(value)||ui.category===value)return;
  ui.category=value;ui.page=1;ui.items=[];ui.total=0;
  if(ui.loading){ui.refetchAfterCurrent=true;render();return;}
  render();void refreshTogether(state,render);
}
export function togetherOnInput(target){if(target?.closest('form[data-together-form="chat"]')&&target.name==='body')ui.chatDraft=target.value;
  const form=target?.closest('form[data-together-form="create"],form[data-together-form="edit"]');
  if(form&&target.name){
    ui.formDraft[target.name]=target.value;
    const section=form.querySelector('[data-together-boss-fields]');
    const isBoss=form.elements.category?.value==='보스';
    if(section){section.hidden=!isBoss;section.querySelectorAll('select').forEach(select=>{select.required=isBoss;select.disabled=!isBoss;});}
    const titleField=form.querySelector('[data-together-title-field]');if(titleField){titleField.hidden=isBoss;const title=titleField.querySelector('input');if(title){title.disabled=isBoss;title.required=!isBoss;}}
    if(isBoss){
      const name=form.querySelector('[data-together-boss-preview-name]');
      const difficulty=form.querySelector('[data-together-boss-preview-difficulty]');
      if(name)name.textContent=bossPublicName(form.elements.boss_name?.value||'멧돼지');
      if(difficulty){const level=form.elements.boss_difficulty?.value||'쉬움';difficulty.textContent=level;difficulty.className='lac-together__difficulty lac-together__difficulty--'+(level==='쉬움'?'easy':level==='보통'?'normal':'hard');}
    }
  }}
async function ensureProfile(state,openProfile){if(!state.session?.user)return false;
  if(!ui.profile||ui.profileUser!==state.session.user.id){ui.profileUser=state.session.user.id;ui.profile=await loadPlayerProfile(ui.profileUser).catch(()=>null);ui.profileChecked=true;}
  if(ui.profile)return true;
  await openProfile();return false;
}
async function runMutation(task,state,render){if(ui.busy)return;ui.busy=true;ui.error='';render();try{await task();if(ui.mode==='detail')await fetchDetail();else await fetchList();}catch(e){ui.error=displayError(e);}finally{ui.busy=false;render();}}
export async function togetherAction(button,state,{render,openProfile,login}){
  const action=button.dataset.togetherAction;
  if(action==='voice-guide-open'){
    const id=String(button.dataset.channelId||'');
    if(!/^\d{17,20}$/.test(id))return;
    voiceGuideChannel=id;render();
    if(typeof document!=='undefined')document.querySelector('#lac-together .lac-together__voice-guide-close')?.focus({preventScroll:true});
    return;
  }
  if(action==='voice-guide-close'){
    voiceGuideChannel=null;render();return;
  }

  if(action==='boss-filter'||action==='difficulty-filter'){
    const key=action==='boss-filter'?'bossFilter':'difficultyFilter';
    const valid=action==='boss-filter'?['전체',...BOSS_NAMES]:['전체',...BOSS_DIFFICULTIES];
    if(valid.includes(button.dataset.value)&&ui[key]!==button.dataset.value){
      ui[key]=button.dataset.value;ui.page=1;ui.items=[];ui.total=0;
      if(ui.loading)ui.refetchAfterCurrent=true;
      else void refreshTogether(state,render);
      render();
    }
    return;
  }
  if(action==='page'){
    const next=Number(button.dataset.page),last=Math.max(1,Math.ceil(ui.total/TOGETHER_PAGE_SIZE));
    if(ui.mode!=='list'||ui.loading||!Number.isInteger(next)||next<1||next>last||next===ui.page)return;
    ui.page=next;ui.items=[];render();await refreshTogether(state,render);
    // Returning users should see the new page rather than remain below the card grid.
    if(typeof document!=='undefined')document.querySelector('#lac-together .lac-together__list-heading')?.scrollIntoView?.({block:'start',behavior:'auto'});
    return;
  }
  if(action==='login'){await login();return;}
  if(action==='profile'){await openProfile();return;}
  if(action==='back'){voiceGuideChannel=null;ui.formDraft={};ui.mode='list';ui.id=null;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='detail'){ui.mode='detail';ui.id=button.dataset.id;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;ui.messages=[];ui.error='';render();await refreshTogether(state,render);return;}
  if(action==='edit'){
    if(!ui.detail?.is_host||Date.parse(ui.detail.starts_at)<=Date.now())return;
    const p=ui.detail,start=new Date(p.starts_at);
    ui.formDraft={category:p.category,boss_name:p.boss_name||'',boss_difficulty:p.boss_difficulty||'',title:p.title,description:p.description||'',capacity:String(p.capacity),date:localDate(start),period:start.getHours()>=12?'pm':'am',hour:String(start.getHours()%12||12),minute:pad(start.getMinutes()),duration:String(Math.round((Date.parse(p.ends_at)-Date.parse(p.starts_at))/60000))};
    ui.mode='edit';ui.error='';render();return;
  }
  if(action==='create'){
    if(!state.session?.user){await login();return;}
    if(!await ensureProfile(state,openProfile)){render();return;}
    ui.formDraft={};ui.mode='create';ui.error='';render();return;
  }
  if(!ui.id||!['apply','approve','reject','withdraw','finish','delete','voice-create','ready','kick'].includes(action))return;
  if(!await ensureProfile(state,openProfile)){render();return;}
  if(action==='delete'&&!window.confirm('모집글과 참가 신청, 채팅 기록이 즉시 삭제됩니다. 복구할 수 없습니다. 삭제할까요?'))return;
  if(action==='finish'&&!window.confirm('활동을 지금 종료할까요? 종료 후 채팅은 읽기 전용이 됩니다.'))return;
  if(action==='kick'&&!window.confirm('이 참가자를 내보낼까요? 해당 모집에 다시 신청할 수 없으며 음성방 권한도 회수됩니다.'))return;
  if(action==='withdraw'&&!window.confirm('참가 신청 또는 확정 참가를 취소할까요?'))return;
  await runMutation(async()=>{
    if(action==='voice-create')await rpc('voice_create',{p_post_id:ui.id});
    if(action==='ready')await rpc('party_set_ready',{p_post_id:ui.id,p_ready:!Boolean(ui.partyState?.members?.some(x=>x.mine&&x.ready))});
    if(action==='kick')await rpc('party_kick',{p_post_id:ui.id,p_user_id:button.dataset.userId});
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
      const boss=fields.p_category==='보스';
      const boss_name=boss?String(data.get('boss_name')||''):null;
      const boss_difficulty=boss?String(data.get('boss_difficulty')||''):null;
      if(boss)fields.p_title=`${boss_name==='화학자'?'미친 화학자':boss_name} 보스 모집`;
      if(!Number.isInteger(fields.p_capacity)||fields.p_capacity<2||fields.p_capacity>10)throw Error('모집 인원은 2~10명으로 직접 입력해 주세요.');
      if(boss&&(!BOSS_NAMES.includes(boss_name)||!BOSS_DIFFICULTIES.includes(boss_difficulty)))throw Error('보스 종류와 난이도를 선택해 주세요.');
      const id=await rpc('save_post_v28',{p_post_id:form.dataset.togetherForm==='edit'?ui.id:null,...fields,p_boss_name:boss_name,p_boss_difficulty:boss_difficulty});
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
/** Return to the Together entrance on every fresh navigation from a different HUB page.
 * No changes to persistent posts, membership or auth; page-internal Back remains intact. */
export function resetTogetherLanding(){
  voiceGuideChannel=null;
  if(voiceRefreshTimer){clearTimeout(voiceRefreshTimer);voiceRefreshTimer=null;}
  ui.mode='list';ui.id=null;ui.detail=null;ui.roster=[];ui.rosterLoaded=false;
  ui.messages=[];ui.chatDraft='';ui.formDraft={};ui.error='';
  ui.category='전체';ui.bossFilter='전체';ui.difficultyFilter='전체';
  ui.page=1;ui.total=0;ui.items=[];
  if(ui.loading)ui.refetchAfterCurrent=true;
}

export function togetherProfileUpdated(state){if(state.session?.user){ui.profile=null;ui.profileChecked=false;ui.profileUser=null;}}

// One timer for all Together detail views; rerenders reuse it rather than
// accumulating timers. No network traffic or server-side state is changed.
if(typeof window!=='undefined' && typeof document!=='undefined'){
  window.setInterval(()=>{
    if(document.visibilityState==='hidden')return;
    document.querySelectorAll('#lac-together [data-together-countdown]').forEach(node=>{
      const next=togetherRemainingTime(node.getAttribute('data-together-countdown'),node.getAttribute('data-status'));
      if(node.textContent!==next)node.textContent=next;
    });
  },1000);
}


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
