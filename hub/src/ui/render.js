import { renderHubBoard } from './hubBoard.js';
import { renderInfoPage } from './infoPage.js';
import { renderGameInfoAdmin, renderPlatformModbookReview } from './gameInfoAdmin.js';
import { renderHubHome } from './hubHome.js';
import {canOpenWebContent,contentAccessPending,hasCompany,hasUnifiedPass,companySetupComplete} from '../platform/contentPolicy.js';
import {renderCompanyPassNotice} from '../platform/unifiedPassGuide.js';
import { hubReturnButton } from './hubReturnButton.js';
import { companyPlanName, companyStatusName, companySubscriptionEnd, companySubscriptionPeriod } from './subscriptionPresentation.js';
import { detectLayoutStudioPreset } from './layoutStudio.js';

const ROLE_LABEL = { owner: 'OWNER', admin: 'ADMIN', manager: 'MANAGER', member: 'MEMBER' };
const ROLE_KO = { owner: '대표', admin: '관리자', manager: '매니저', member: '멤버' };

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function icon(name) {
  const icons = {
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    fund:'<path d="M7 3v18M3 7h8M4 11h7M6 7v8M3 15h8"/>',
    members:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    assets:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2M3 10h18"/>',
    accounts:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 14h4"/>',
    combat:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 20.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1.6z"/>',
    platform:'<path d="M12 3l8 4v5c0 4.8-3.1 7.9-8 9-4.9-1.1-8-4.2-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
    feedback:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    suggestions:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    questions:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 8h8M8 12h6"/>',
    info:'<path d="M12 7v14M12 7C9 5.5 6 5 3 5v14c3 0 6 .5 9 2M12 7c3-1.5 6-2 9-2v14c-3 0-6 .5-9 2"/>',
    refresh:'<path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h8"/><path d="M8 17h8"/><path d="M9 9h6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    power:'<path d="M12 2v10"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>',
    logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/>',
    upload:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.settings}</svg>`;
}

function money(value) {
  const n = Number(value || 0);
  return `${Math.abs(n).toLocaleString('ko-KR')}원`;
}
function signedMoney(value) {
  const n = Number(value || 0);
  if (!n) return '0원';
  return `${n > 0 ? '+' : '-'}${Math.abs(n).toLocaleString('ko-KR')}원`;
}
function fmtDate(value, short = false) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('ko-KR', short ? { year:'numeric', month:'2-digit', day:'2-digit' } : {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
  }).format(d);
}
function dateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || '').slice(0,10);
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function currentCompany(state) { return (state.companies || []).find(c => c.id === state.companyId) || null; }
function currentMembership(state) { return (state.memberships || []).find(m => m.user_id === state.session?.user?.id) || null; }
function canAdmin(state) { return ['owner','admin'].includes(currentMembership(state)?.role); }
function moduleEnabled(state, key) { return (state.modules || []).some(m => m.module_key === key && Boolean(m.enabled)); }
function moduleRow(state, key) { return (state.modules || []).find(m => m.module_key === key) || null; }
function companyDisplayName(state) { return currentCompany(state)?.name || '회사'; }
function userDisplayName(state) {
  const m = currentMembership(state);
  return m?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.user_metadata?.name || '사용자';
}

export function renderShell(root, state) {
  const user = state.session?.user;
  const companyPages=['dashboard','fund','members','assets','accounts','questions','suggestions','settings','combat'];
  const companyGatePending=companyPages.includes(state.page)&&contentAccessPending(state,'company_management');
  const guideGatePending=state.page==='paid-content-guide'&&contentAccessPending(state,'company_management');
  const gameInfoGatePending=state.page==='game-info'&&contentAccessPending(state,'game_info');
  root.innerHTML = `
    ${state.error ? `<div class="runtime-banner runtime-banner--error"><span>${esc(state.error)}</span><button data-action="dismiss-error">×</button></div>` : ''}
    ${state.notice ? `<div class="runtime-banner runtime-banner--notice">${esc(state.notice)}</div>` : ''}
    ${!state.envReady ? renderEnvironmentMissing() : !user ? renderLogin(state) : !state.ready ? renderStartupLoading() : state.page === 'hub' ? renderHubHome(state) + renderModal(state) : state.page === 'hub-board' ? renderHubBoard(state) : gameInfoGatePending ? renderHubLoading('이용권을 확인하고 있습니다.') : state.page === 'game-info' ? (canOpenWebContent(state,'game_info') ? renderStandaloneGameInfo(state) : renderHubHome(state) + renderModal(state)) : (state.page === 'platform' || state.page === 'layout') ? (state.platformAdmin ? renderManagementCenter(state) : renderHubHome(state) + renderModal(state)) : !state.companies?.length ? state.platformAdmin && ['platform','layout'].includes(state.page) ? renderAuthed(state) : state.page === 'company-start' ? renderOnboarding(state) + renderModal(state) : renderHubHome(state) + renderModal(state) : companyGatePending || guideGatePending ? renderHubLoading(companyGatePending?'회사 관리 정보를 확인하고 있습니다.':'이용권을 확인하고 있습니다.') : state.page === 'paid-content-guide' || !hasUnifiedPass(state) ? renderCompanyPassLanding(state) : !companySetupComplete(state) ? renderCompanySetupRequired(state) : renderAuthed(state)}
  `;
}

function renderCompanyPassLanding(state){
  const target=state.page==='paid-content-guide'?state.requestedContent||'콘텐츠':'회사 관리';
  return `<div class="runtime-auth runtime-auth--first-run"><div class="runtime-first-run"><header class="lac-pass-landing__top"><button type="button" class="lac-pass-back" data-action="go-hub" aria-label="LAC HUB 메인으로 돌아가기"><span class="lac-pass-back__icon" aria-hidden="true">←</span><span>LAC HUB로 돌아가기</span></button><span class="lac-pass-landing__context">${esc(target)} <span aria-hidden="true">·</span> 이용 안내</span></header>${renderCompanyPassNotice(state,target)}${target==='회사 관리'?renderCompanyLedgerPreview():''}</div></div>`;
}
function renderCompanySetupRequired(state){
  const owner=currentMembership(state)?.role==='owner';
  const progress=state.companySettings?.settings?.guided_setup;
  const started=progress&&progress.completed!==true&&Number(progress.step||0)>0;
  const action=owner
    ? `<button type="button" class="lac-pass-application__submit" data-action="open-setup-guide"><span aria-hidden="true">⚙️</span><span>${started?'초기 설정 이어하기':'초기 설정 시작'}</span><span class="lac-pass-application__arrow" aria-hidden="true">→</span></button>`
    : '<span class="lac-pass-application__pending" role="status">회사 대표의 초기 설정을 기다리고 있습니다.</span>';
  return `<div class="runtime-auth runtime-auth--first-run"><div class="runtime-first-run"><header class="lac-pass-landing__top"><button type="button" class="lac-pass-back" data-action="go-hub" aria-label="LAC HUB 메인으로 돌아가기"><span class="lac-pass-back__icon" aria-hidden="true">←</span><span>LAC HUB로 돌아가기</span></button><span class="lac-pass-landing__context">회사 관리 <span aria-hidden="true">·</span> 이용 준비</span></header><section class="lac-company-pass-guide lac-pass-application lac-company-setup-required" aria-label="회사 관리 초기 설정"><div class="lac-pass-application__icon" aria-hidden="true">⚙️</div><div class="lac-pass-application__body"><span class="lac-pass-application__phase">회사 이용 승인 완료 <span aria-hidden="true">·</span> 초기 설정</span><strong>${started?'초기 설정을 이어서 완료해 주세요':'회사 관리 사용 준비가 필요합니다'}</strong><p>회사 이용 승인이 완료되었습니다. Discord 서버 연결과 회사 운영 설정을 마치면 회사 관리 기능이 열립니다.</p>${action}</div></section>${renderCompanyLedgerPreview()}</div></div>`;
}
function renderHubLoading(message='회사 정보를 불러오는 중입니다.') {
  return `<section class="runtime-auth runtime-auth--startup runtime-auth--hub-loading"><div class="hub-loading-card" role="status" aria-live="polite"><div class="hub-loading-mark" aria-hidden="true"><span></span><img src="/hub/mark.png" alt="" width="48" height="48"></div><div class="hub-loading-copy"><strong>LAC HUB</strong><p>${esc(message)}</p></div><div class="hub-loading-dots" aria-hidden="true"><i></i><i></i><i></i></div></div></section>`;
}
function renderStartupLoading() {
  return renderHubLoading('회사 정보를 불러오는 중입니다.');
}

function renderOfflineLoading() {
  return `<section class="runtime-auth runtime-auth--startup"><div class="runtime-startup-card runtime-startup-card--offline"><span class="runtime-offline-dot" aria-hidden="true"></span><div><strong>LAC HUB</strong><p>네트워크 연결이 없습니다. 운영 데이터는 오프라인에 저장하지 않습니다.</p></div><button class="runtime-btn-ghost" data-action="refresh">다시 연결</button></div></section>`;
}

function renderEnvironmentMissing() {
  return `<section class="runtime-auth"><div class="runtime-auth-card"><strong>LAC HUB</strong><h1>STAGING 환경 설정이 필요합니다.</h1><p>VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY를 Vercel 환경변수에 설정해 주세요.</p></div></section>`;
}

function renderLogin(state) {
  // Preserve the designed calm-login background and compact central card.
  // Authentication continues through the existing Discord OAuth action only.
  return `<section class="runtime-auth runtime-auth--access">
    <div class="runtime-access-stage">
      <div class="runtime-access-shell runtime-access-shell--calm">
        <div class="runtime-access-panel runtime-access-panel--calm">
          <div class="runtime-access-brand-compact"><strong>LAC HUB</strong><small>통합 플랫폼</small></div>
          <div class="runtime-access-panel-head"><h2>다시 오신 걸 환영해요.</h2><p>Discord 계정으로 로그인해 주세요.</p></div>
          <button type="button" class="runtime-access-discord" data-action="discord-login" ${state.loading ? 'disabled' : ''}><span class="runtime-access-discord-mark" aria-hidden="true"><i></i><i></i></span><strong>Discord로 로그인</strong><em aria-hidden="true">→</em></button>
          <div class="runtime-access-trust"><div class="runtime-access-privacy"><i aria-hidden="true">✓</i><span><strong>Discord 계정 하나로 이용해요.</strong><small>로그인 상태는 HUB와 BUILD에서 공유됩니다.</small></span></div></div>
        </div>
      </div>
    </div>
  </section>`;
}

function onboardingDiscordIdentity(state) {
  const user=state.session?.user||{};
  const meta=user.user_metadata||{};
  const id=String(meta.provider_id||meta.sub||user.identities?.find?.(item=>String(item?.provider||'').toLowerCase()==='discord')?.identity_data?.sub||'').trim();
  const name=String(meta.full_name||meta.global_name||meta.name||meta.user_name||meta.preferred_username||'Discord 사용자').trim();
  return {id,name};
}

// Public screenshot only: use the user-provided screen captures.
// This preview must never fetch a company's live ledger or evidence attachments.
function renderCompanyLedgerPreview(){
  const screenshot='/hub/lac-company-ledger-preview.png';
  const enlargedScreenshot='/hub/lac-company-ledger-preview-large.png';
  return `<figure class="lac-company-shot lac-preview-frame" aria-label="회사 관리 실제 화면 예시">
    <div class="lac-preview-frame__head"><div><strong>회사 관리 화면 미리보기</strong><small>실제 공금 관리 화면 · 클릭하면 확대</small></div><span>화면 캡처</span></div>
    <button type="button" class="lac-company-shot__open lac-cook-shot__open" data-action="company-preview-open" aria-haspopup="dialog" aria-controls="lac-company-preview-dialog" aria-label="이 페이지에서 회사 관리 공금 화면 크게 보기">
      <img src="${screenshot}" alt="날짜, 이름, 계좌, 내역, 금액 및 증빙 항목이 있는 회사 공금 관리 화면 예시" loading="lazy">
      <span class="lac-cook-shot__zoom">＋ 화면 전체 보기</span>
    </button>
    <figcaption>공금 입출금 내역과 증빙을 확인하는 화면이에요. 이미지를 누르면 현재 페이지에서 확대됩니다.</figcaption>
    <dialog id="lac-company-preview-dialog" class="lac-cook-preview-dialog" data-company-preview-dialog aria-label="회사 관리 화면 확대 보기">
      <div class="lac-cook-preview-dialog__head"><strong>회사 관리 · 공금내역 예시</strong><button type="button" data-action="company-preview-close" aria-label="확대 화면 닫기">닫기 ×</button></div>
      <img src="${enlargedScreenshot}" alt="회사 관리의 실제 공금내역 화면을 확대하여 표시">
    </dialog>
  </figure>`;
}

function firstRunContent(discord,{testMode=false,focus='',memberCheck='',canCreateCompany=true,accessError=false,contentKind='company',registrationOnly=false}={}) {
  const createAction=testMode?'test-center-open-new-company':'open-create-company';
  const copyAction=testMode?'test-center-copy-info':'copy-registration-info';
  const checkAction=testMode?'test-center-member-check':'check-member-registration';
  const createFocus=focus==='create'?' is-test-focus':'';
  const memberFocus=focus==='member'?' is-test-focus':'';
  const waiting=testMode&&memberCheck==='waiting'?`<div class="runtime-first-run__test-result is-waiting"><strong>아직 멤버 등록이 확인되지 않았습니다.</strong><span>대표 또는 관리자에게 현재 Discord 계정 등록을 요청한 뒤 다시 확인합니다.</span></div>`:'';
  const game=contentKind==='game';
  const title=game?'게임 정보':'회사 관리';
  const summary=game?'제작법·생산·퀘스트·스킬과 승인된 공통 개조서 정보를 확인하는 공간이에요.':'멤버·공금·계좌·자산을 한곳에서 확인하고 회사 운영을 관리하는 공간이에요.';
  // Illustrative rows only. Never fetch another company's data for a preview.
  const demo=game?`<div class="runtime-sample-window"><div class="runtime-sample-top"><span>게임 정보 · 화면 구성 예시</span><span>가상 자료</span></div><div class="runtime-sample-list"><div class="runtime-sample-list__head"><span>구분</span><span>자료명</span><span>확인할 내용</span></div><div><span>제작법</span><strong>예시 제작법</strong><span>재료 · 제작 결과</span></div></div></div>`:renderCompanyLedgerPreview();
  const registrationMarkup=`
    <details class="runtime-first-run__registration" ${focus==='create'||focus==='member'?'open':''}><summary><span><strong>우리 회사에서 이용하기</strong><small>새 회사 대표라면 등록 안내, 기존 회사 팀원이라면 멤버 등록 방법 확인</small></span><span aria-hidden="true">⌄</span></summary>
    <div class="runtime-first-run__choice"><strong>어떤 상황에 해당하나요?</strong><span>새 회사 대표는 왼쪽, 기존 회사 팀원은 오른쪽 안내를 확인해 주세요.</span></div>
    <div class="runtime-first-run__grid">
      <article class="runtime-onboarding-card runtime-onboarding-card--primary runtime-first-run__create${createFocus}"><span>01 · 새 회사 대표</span><h2>새 회사 만들기</h2><p>회사 이름과 대표명만 입력하면 먼저 회사를 만들 수 있습니다. Discord 설치와 운영 설정은 <b>회사 이용 승인 후</b> 진행합니다.</p>
        <div class="runtime-first-run__new-flow"><span>회사 생성</span><i>→</i><span>콘텐츠 둘러보기</span><i>→</i><span>이용 승인</span><i>→</i><span>초기 설정</span></div>
        ${canCreateCompany?`<button class="runtime-login-button runtime-first-run__primary-action" type="button" data-action="${createAction}">회사 만들기</button><small class="runtime-first-run__auto">회사 생성만으로 BOT이 설치되거나 Discord 권한이 요청되지는 않습니다.</small>`:`<div class="runtime-first-run__warning">${accessError?'회사 생성 권한을 확인하지 못했습니다. 잠시 후 새로고침해 주세요.':'이미 소속 회사가 있는 계정은 새 회사를 만들 수 없습니다. 기존 회사의 멤버로 이용해 주세요.'}</div>`}
        <div class="runtime-first-run__warning">이미 회사에 소속된 팀원이라면 오른쪽의 멤버 등록 안내를 이용해 주세요.</div>
      </article>
      <article class="runtime-onboarding-card runtime-first-run__member${memberFocus}"><div class="runtime-first-run__member-top"><span>02 · 기존 회사 팀원</span><em>멤버 등록 필요</em></div><h2>회사 대표에게 멤버 등록 요청하기</h2><p>회사 멤버 등록은 <b>회사 대표 또는 관리자</b>가 진행합니다. 아래 정보를 복사해 대표·관리자에게 전달해 주세요.</p>
        <div class="runtime-first-run__identity"><div><span>현재 Discord</span><strong>${esc(discord.name)}</strong></div><div><span>Discord ID</span><strong>${esc(discord.id||'확인 중')}</strong></div><button type="button" data-action="${copyAction}" ${discord.id?'':'disabled'}>대표에게 보낼 정보 복사</button></div>
        <div class="runtime-first-run__blocked"><i>!</i><div><strong>회사에서 멤버 등록 후 이용할 수 있어요</strong><span>회사 검색이나 합류 코드는 사용하지 않습니다.</span></div></div>
        <button class="runtime-btn-ghost runtime-first-run__check-button" type="button" data-action="${checkAction}">대표가 등록한 후 확인하기</button>
        ${waiting}
        <small class="runtime-first-run__auto">확인 버튼만으로 회사에 가입되지 않습니다. 등록 여부를 확인한 뒤 HUB에서 이용 가능한 콘텐츠를 다시 선택할 수 있습니다.</small>
      </article>
    </div>
    </details>`;
  if(registrationOnly)return registrationMarkup;
  return `
    <header class="runtime-first-run__head"><span>${esc(title)} · 미리보기</span><h1>${esc(title)}를 먼저 살펴보세요.</h1><p>${esc(summary)}</p></header>
    ${game?`<section class="runtime-first-run__sample lac-preview-frame" aria-label="게임 정보 화면 예시"><div class="lac-preview-frame__head"><div><strong>게임 정보 화면 미리보기</strong><small>실제 화면 형태를 참고한 가상 예시</small></div><span>화면 예시</span></div>${demo}<p>예시 데이터이며 실제 회사의 정보는 표시하지 않습니다.</p></section>`:demo}
    ${registrationMarkup}`;
}

// The COOK preview uses the exact same on-page registration component as company management.
export function renderCookRegistration(state) {
  const discord=onboardingDiscordIdentity(state);
  return `<div class="runtime-first-run">${firstRunContent(discord,{
    canCreateCompany:state.canCreateCompany===true,
    accessError:state.companyCreatePermissionError,
    contentKind:'company',registrationOnly:true
  })}</div>`;
}

function renderOnboarding(state) {
  const discord=onboardingDiscordIdentity(state);
  return `${hubReturnButton('hub-onboarding-back')}<section class="runtime-auth runtime-auth--onboarding runtime-auth--first-run"><div class="runtime-first-run">${firstRunContent(discord,{canCreateCompany:state.canCreateCompany===true,accessError:state.companyCreatePermissionError,contentKind:state.companyStartSource==='game'?'game':'company'})}</div></section>`;
}

function companySubscriptionAccountSummary(state) {
  if (!state.companyId || !(state.companies || []).some(company => company.id === state.companyId)) {
    return '<div class="runtime-account-subscription"><strong>회사 관리 이용권</strong><span>소속 회사 없음</span></div>';
  }
  const subscription = state.currentSubscription;
  const details = subscription
    ? `<span>플랜: ${esc(companyPlanName(subscription.plan))}</span><span>상태: ${esc(companyStatusName(subscription))}</span><span>종료일: ${esc(companySubscriptionEnd(subscription, value => fmtDate(value, true)))}</span>`
    : '<span>이용권 정보가 없습니다. 새로고침해 주세요.</span>';
  return `<div class="runtime-account-subscription"><strong>회사 관리 이용권</strong>${details}<button type="button" data-action="refresh-company-subscription">이용권 새로고침</button></div>`;
}

function renderAuthed(state) {
  const company = currentCompany(state);
  const membership = currentMembership(state);
  const connected = state.discordConnection?.status === 'connected';
  const platformScreen = ['platform', 'layout'].includes(state.page);
  // A new company can be registered only through companyless first-run onboarding;
  // the assigned company's console must not expose another creation CTA.
  return `<div class="runtime-app runtime-app--${esc(state.page||'fund')}">
    <header class="global-header"><div class="global-header__inner">
      <div class="lac-hub-return-slot">${hubReturnButton('global-hub-return')}</div>
      <button type="button" class="global-home-zone" data-action="${platformScreen?'go-hub':'open-company-console'}" aria-label="${platformScreen?'LAC HUB 메인':'회사 관리 대시보드'}로 이동">
        <span class="product-brand product-brand--home"><span class="product-brand__copy"><strong>${platformScreen?'서비스 관리':'회사 관리'}</strong>${platformScreen?'<small>LAC HUB · PLATFORM</small>':''}</span></span>
      </button>
      <div class="global-account runtime-account-picker ${state.accountMenuOpen?'is-open':''}">
        <button type="button" class="runtime-account-trigger" data-action="toggle-account-menu" aria-expanded="${state.accountMenuOpen?'true':'false'}" aria-haspopup="menu">
          <span class="runtime-account-trigger__identity"><strong>${esc(userDisplayName(state))}</strong><em>${esc(ROLE_LABEL[membership?.role] || (state.platformAdmin?'PLATFORM OWNER':'-'))}</em></span><b>⌄</b>
        </button>
        ${state.accountMenuOpen?`<div class="runtime-account-menu" role="menu"><div class="runtime-account-menu__head"><strong>계정 정보</strong><button type="button" data-action="close-account-menu" aria-label="계정 메뉴 닫기" title="닫기"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>${companySubscriptionAccountSummary(state)}<button type="button" data-action="logout" role="menuitem"><span class="runtime-account-menu__icon">${icon('logout')}</span><span><strong>로그아웃</strong><small>현재 계정에서 나가기</small></span></button></div>`:''}
      </div>
    </div></header>
    <div class="workspace-shell">
      <aside class="sidebar">
        <section class="company-switcher"><span class="overline">현재 회사</span>
          <div class="runtime-company-picker ${state.companyMenuOpen?'is-open':''}">
            <button type="button" class="runtime-company-trigger" data-action="toggle-company-menu" aria-expanded="${state.companyMenuOpen?'true':'false'}" aria-haspopup="listbox">
              <span><strong>${esc(company?.name||'회사')}</strong>${(state.companies||[]).length>1?`<small>${(state.companies||[]).length}개 회사</small>`:''}</span><b>⌄</b>
            </button>
            ${state.companyMenuOpen?`<div class="runtime-company-menu" role="listbox">${(state.companies||[]).map(c=>`<button type="button" class="${c.id===state.companyId?'is-current':''}" data-action="switch-company" data-company-id="${esc(c.id)}"><span>${esc(c.name)}</span>${c.id===state.companyId?'<em>현재</em>':''}</button>`).join('')}</div>`:''}
          </div>
        </section>
        <nav class="sidebar-nav"><span class="sidebar-nav__label">회사 운영</span>
          ${navItem(state,'dashboard','대시보드')}${navItem(state,'fund','공금 관리')}${navItem(state,'members','멤버 관리')}${navItem(state,'assets','자산 관리')}${navItem(state,'accounts','계좌 관리')}
          <span class="sidebar-nav__label spaced">정보 · 설정</span>${navItem(state,'combat','전투 기록')}${navItem(state,'settings','회사 설정')}
          
        </nav>
        <footer class="sidebar-footer">
          <div class="connection-status ${connected?'':'is-off'}"><i></i><div><strong>Discord ${connected?'연결됨':'미연결'}</strong><small>${esc(state.discordConnection?.guild_name || '연결 필요')}</small></div></div>
        </footer>
      </aside>
      <main class="main main--${esc(state.page||'fund')}">${state.loading && !state.ready ? '<div class="runtime-loading">불러오는 중…</div>' : renderPage(state)}</main>
    </div>
    ${renderModal(state)}
    ${renderSupportImageViewer(state)}
  </div>`;
}




// HUB game information is a standalone CONTENT screen. The shared read-only
// catalogue remains renderInfoPage; approved modbooks are shared platform-wide
// while company prices and operational notes stay in the Discord company overlay.
function renderStandaloneGameInfo(state) {
  const company=currentCompany(state);
  if (!canOpenWebContent(state,'game_info')) return renderHubHome(state);
  // Visual scene follows only the real existing data category, never item names
  // or illustrative sample content. The same catalogue and company RLS remain.
  const sceneMap = {
    info_crafts:'craft', info_craft_materials:'craft', info_material_recipes:'craft',
    info_processes:'production', info_quests:'quest',
    info_skill_ranks:'skill', modbook_catalog:'modbook'
  };
  const scene = sceneMap[state.info?.table] || 'craft';
  return `<div class="runtime-app runtime-app--game-info game-center ${state.gameAdminOpen&&state.platformAdmin?'game-center--admin':''}" data-game-scene="${scene}">
    <header class="game-center__header">
      <div class="game-center__actions">${hubReturnButton('game-center__back')}</div>
      <h1 class="game-center__title" id="game-info-heading">게임 정보</h1>
      ${state.platformAdmin?`<button type="button" class="game-center__admin-trigger" data-game-admin-action="${state.gameAdminOpen?'close':'open'}">${state.gameAdminOpen?'← 게임정보 보기':'⚙ 정보 관리'}</button>`:''}
    </header>
    <main class="game-center__body">
      ${state.gameAdminOpen&&state.platformAdmin?renderGameInfoAdmin(state):`<section class="game-center__hero" aria-label="게임 정보 소개">
        <div class="game-center__hero-copy">
          <p class="game-center__hero-line">제작부터 퀘스트, 스킬까지 필요한 정보를 한곳에서 확인하세요.</p>
        </div>
      </section>
      ${renderInfoPage(state,{standalone:true})}
      <p class="game-center__context">개조서는 LAC HUB 운영자 검수를 거쳐 승인된 공통 정보만 표시됩니다.</p>`}
    </main>
    ${renderModal(state)}
  </div>`;
}

// Platform administration has its own shell. It must never inherit a selected
// company's sidebar, company header, membership label, or company context.
function renderPlatformRailItem(state,view,label,iconName,count=null) {
  const active=state.page==='platform' && (view==='inbox'
    ? ['support','suggestions'].includes(state.platformView)
    : state.platformView===view);
  const target=view==='inbox'?'support':view;
  const badge=count===null?'':`<em class="platform-center__nav-count">${count>99?'99+':count}</em>`;
  return `<button type="button" class="platform-center__nav-item ${active?'is-active':''}" data-action="platform-view" data-platform-view="${target}" ${active?'aria-current="page"':''}>${icon(iconName)}<span>${label}</span>${badge}</button>`;
}

// Existing owner gate, subscription mutations, content-policy storage and
// customer-support handlers remain unchanged. Only the navigation shell moves.
function renderManagementCenter(state) {
  if (!state.session?.user || state.platformAdmin !== true) return renderPermission(state);
  const username = state.session.user.user_metadata?.full_name || state.session.user.user_metadata?.name || 'Discord 사용자';
  const siteOpen=(state.hubBoard?.tickets||[]).filter(item=>item.status!=='complete').length;
  const passQueue=(state.adminPassRequests||[]).filter(item=>item.status==='pending').length;
  const modbookQueue=Array.isArray(state.gameAdmin?.requests)?state.gameAdmin.requests.length:0;
  const buildReportQueue=(state.platformBuildReports?.items||[]).filter(item=>String(item.status||'pending')==='pending').length;
  const queue=siteOpen+buildReportQueue+Number(state.platformSupport?.counts?.pending||0)+Number(state.platformSupport?.counts?.checking||0)
    +Number(state.platformSuggestions?.counts?.pending||0)+Number(state.platformSuggestions?.counts?.checking||0);
  return `<div class="runtime-app runtime-app--${esc(state.page)} platform-center">
    <header class="platform-center__header">
      <button type="button" class="platform-center__brand" data-action="go-hub"><img src="/hub/mark.png" alt="" width="28" height="28"><span><strong>LAC HUB</strong><small>관리 센터</small></span></button>
      <div class="platform-center__return">${hubReturnButton('global-hub-return')}</div>
      <div class="platform-center__account"><span>${esc(username)}</span><span class="platform-center__role">서비스 운영자</span><button type="button" class="platform-center__logout" data-action="logout">로그아웃</button></div>
    </header>
    <div class="platform-center__workspace">
      <aside class="platform-center__sidebar" aria-label="관리 센터 메뉴">
        <div class="platform-center__sidebar-head"><span>PLATFORM ADMIN</span><strong>운영 관리</strong></div>
        <nav class="platform-center__nav" aria-label="플랫폼 관리 화면">
          ${renderPlatformRailItem(state,'overview','대시보드','dashboard')}
          ${renderPlatformRailItem(state,'companies','이용권 관리','platform')}
          ${renderPlatformRailItem(state,'pass-requests','이용권 신청','feedback',passQueue)}
          ${renderPlatformRailItem(state,'modbooks','개조서 검수','info',modbookQueue)}
          ${renderPlatformRailItem(state,'contents','콘텐츠 관리','assets')}
          ${renderPlatformRailItem(state,'inbox','문의 · 제보','feedback',queue)}
          <span class="platform-center__nav-divider" role="presentation"></span>
          <span class="platform-center__nav-caption">시스템</span>
          <button type="button" class="platform-center__nav-item ${state.page==='layout'?'is-active':''}" data-action="open-layout-studio" ${state.page==='layout'?'aria-current="page"':''}>${icon('settings')}<span>표 글씨 크기</span></button>
          <button type="button" class="platform-center__nav-item" data-action="open-test-center">${icon('search')}<span>테스트 센터</span></button>
        </nav>
        <p class="platform-center__sidebar-note">회사 내부 자료는 회사 관리 콘텐츠에서 확인할 수 있습니다.</p>
      </aside>
      <main class="main main--${esc(state.page)} platform-center__main">${renderPage(state)}</main>
    </div>
    ${renderModal(state)}
    ${renderSupportImageViewer(state)}
  </div>`;
}

function renderLayoutStudio(state) {
  const p = state.layoutDraft || {fontScale:100};
  return `<section class="layout-studio-page">
    <header class="page-header"><div><span class="page-eyebrow">LAC HUB · PLATFORM OWNER</span><h1>표 글씨 크기</h1><p>공금 · 멤버 · 자산 등 표 안의 글씨만 함께 조절합니다.</p></div></header>
    <div class="layout-studio-note">사이트 메뉴 · 페이지 제목 · 로그인 화면은 그대로 유지됩니다. 표 안의 글씨 비율만 함께 커집니다. 설정은 이 브라우저에 저장됩니다.</div>
    <section class="layout-studio-panel lac-type-panel">
      <header><div><strong>표 안의 글씨 크기</strong><span>표 머리글 · 날짜 · 이름 · 금액 · 상태 · 표 안의 버튼</span></div><b class="lac-type-percent" data-layout-scale-label>${p.fontScale}%</b></header>
      <div class="lac-type-controls"><input type="range" min="90" max="150" step="5" value="${p.fontScale}" data-layout-scale aria-label="데이터 표 안의 글씨 크기"><div class="lac-type-scale-labels"><span>90% · 작게</span><span>100% · 기본</span><span>150% · 크게</span></div></div>
      <footer class="layout-studio-actions"><span class="layout-studio-saved ${state.layoutDirty?'is-dirty':''}">${state.layoutDirty?'저장되지 않은 변경 사항':'현재 설정 저장됨'}</span><div><button type="button" data-action="layout-reset-default">기본값</button><button type="button" data-action="layout-revert">되돌리기</button><button type="button" class="is-primary" data-action="layout-save">저장</button></div></footer>
    </section>
    <p class="lac-type-hint">공금내역 · 멤버 현황 · 자산 현황 표에서 확인한 뒤 저장하세요. 글씨가 커져 칸이 좁아지면 표 안에서 가로로 스크롤할 수 있습니다.</p>
  </section>`;
}

function navItem(state,key,label){ const badge=key==='questions'?Number(state.questionBoard?.counts?.unread||0)+Number(state.suggestionBoard?.counts?.unread||0):0; const active=state.page===key||(key==='questions'&&state.page==='suggestions'); return `<button class="nav-item ${active?'is-active':''}" data-page="${key}"><span class="nav-item__icon">${icon(key)}</span><span>${label}</span>${badge?`<em class="nav-item__badge">${badge>99?'99+':badge}</em>`:''}</button>`; }
function supportTabNav(state){ const q=Number(state.questionBoard?.counts?.unread||0),s=Number(state.suggestionBoard?.counts?.unread||0);return `<nav class="axe-support-tabs" aria-label="문의와 건의"><button type="button" class="${state.page==='questions'?'is-active':''}" data-page="questions">질문게시판${q?`<em>${q>99?'99+':q}</em>`:''}</button><button type="button" class="${state.page==='suggestions'?'is-active':''}" data-page="suggestions">건의게시판${s?`<em>${s>99?'99+':s}</em>`:''}</button></nav>`; }
function pageHeader(kicker,title,desc,action=''){ const compact=!String(desc||'').trim(); return `<header class="page-header${compact?' page-header--compact':''}"><div><span class="page-eyebrow">${esc(kicker)}</span><h1>${esc(title)}</h1>${compact?'':`<p>${esc(desc)}</p>`}</div>${action?`<div class="page-header__actions">${action}</div>`:''}</header>`; }
function summary(items){ return `<section class="ops-mgmt-summary ops-mgmt-summary--clean">${items.map(([label,value,_sub,tone])=>`<article><span>${label}</span><strong class="${tone||''}">${value}</strong></article>`).join('')}</section>`; }
function empty(text){ return `<div class="ops-mgmt-empty">${esc(text)}</div>`; }

function renderPage(state) {
  if (state.page === 'platform') return state.platformAdmin ? renderPlatform(state) : renderPermission(state);
  if (state.page === 'layout') return state.platformAdmin ? renderLayoutStudio(state) : renderPermission(state);
  if (state.page === 'questions') return supportTabNav(state) + renderQuestions(state);
  if (state.page === 'suggestions') return supportTabNav(state) + renderSuggestions(state);
  const subscriptionState=String(state.currentSubscription?.effective_status||state.currentSubscription?.status||'active');
  if(['paused','expired'].includes(subscriptionState)) return renderSubscriptionBlocked(state,subscriptionState);
  if (!canAdmin(state)) return renderPermission(state);
  if (state.page === 'dashboard') return renderDashboard(state);
  if (state.page === 'members') return renderMembers(state);
  if (state.page === 'assets') return renderAssets(state);
  if (state.page === 'accounts') return renderAccounts(state);
  if (state.page === 'combat') return renderCombat(state);
  if (state.page === 'settings') return renderSettings(state);
  return renderFund(state);
}
function renderPermission(state){ return `<div class="ops-mgmt-page">${pageHeader('OPERATIONS','관리자 콘솔','OWNER 또는 ADMIN 권한이 있는 회사에서 사용할 수 있습니다.')}<section class="runtime-permission"><strong>관리 권한이 필요합니다.</strong><span>현재 역할: ${esc(ROLE_LABEL[currentMembership(state)?.role]||'-')}</span></section></div>`; }
function renderSubscriptionBlocked(state,status){ const end=state.currentSubscription?.ends_at?fmtDate(state.currentSubscription.ends_at,true):'—'; const label=status==='paused'?'이용이 일시 정지되었습니다.':'이용 기간이 만료되었습니다.'; return `<div class="ops-mgmt-page subscription-lock-page">${pageHeader('SUBSCRIPTION','서비스 이용 상태',label)}<section class="runtime-permission subscription-lock-card"><strong>${esc(label)}</strong><span>회사: ${esc(companyDisplayName(state))}</span><span>이용 종료일: ${esc(end)}</span><small>PLATFORM OWNER가 이용 기간을 연장하거나 상태를 변경하면 다시 사용할 수 있습니다.</small></section></div>`; }

// ============================================================
// DASHBOARD
// ============================================================
function dashboardModuleName(key){
  return ({fund:'공금',ammo:'총알',outlaw:'무법지대',modbook:'개조서',pinball:'핀볼',cooking:'요리',assets:'자산 · 계좌'})[key]||key;
}
function dashboardActiveMembers(state){ return (state.memberships||[]).filter(row=>String(row.status||'active')==='active'); }
function dashboardAccountPending(state){ return accountRecords(state).filter(row=>['등록 대기','변경 대기'].includes(row.status)); }
function dashboardFundPending(state){ return (state.fundRequests||[]).filter(row=>['pending','hold'].includes(String(row.status||''))); }
function dashboardUnassignedAssets(state){ return (state.assetsSnapshot?.assets||[]).filter(row=>!row.membership_id); }
function dashboardAttentionItems(state){
  const items=[];
  const fundPending=dashboardFundPending(state);
  const accountPending=dashboardAccountPending(state);
  const unassigned=dashboardUnassignedAssets(state);
  const questionUnread=Number(state.questionBoard?.counts?.unread||0);
  const platformPending=state.platformAdmin?Number(state.platformSupport?.counts?.pending||0):0;
  const platformChecking=state.platformAdmin?Number(state.platformSupport?.counts?.checking||0):0;
  const platformQuestions=platformPending+platformChecking;
  const suggestionUnread=Number(state.suggestionBoard?.counts?.unread||0);
  const platformSuggestionPending=state.platformAdmin?Number(state.platformSuggestions?.counts?.pending||0):0;
  const platformSuggestionChecking=state.platformAdmin?Number(state.platformSuggestions?.counts?.checking||0):0;
  const platformSuggestions=platformSuggestionPending+platformSuggestionChecking;
  if(platformQuestions) items.push({tone:'amber',icon:'questions',title:`고객 질문 ${platformQuestions}건`,desc:`답변대기 ${platformPending} · 확인중 ${platformChecking}`,page:'platform',action:'답변하기'});
  if(platformSuggestions) items.push({tone:'amber',icon:'suggestions',title:`건의 · 제보 ${platformSuggestions}건`,desc:`답변대기 ${platformSuggestionPending} · 확인중 ${platformSuggestionChecking}`,page:'platform',action:'확인하기'});
  if(questionUnread) items.push({tone:'green',icon:'questions',title:`질문 답변 도착 ${questionUnread}건`,desc:'확인하지 않은 답변이 있습니다.',page:'questions',action:'확인하기'});
  if(suggestionUnread) items.push({tone:'green',icon:'suggestions',title:`건의 답변 도착 ${suggestionUnread}건`,desc:'확인하지 않은 운영자 답변이 있습니다.',page:'suggestions',action:'확인하기'});
  if(fundPending.length) items.push({tone:'amber',icon:'fund',title:`공금 검수 ${fundPending.length}건`,desc:'납부 신청을 확인하고 승인 · 보류 · 반려를 처리하세요.',page:'fund',fundTab:'review',action:'검수하기'});
  if(accountPending.length) items.push({tone:'amber',icon:'accounts',title:`계좌 검수 ${accountPending.length}건`,desc:'신규 등록 또는 변경 요청이 처리 대기 중입니다.',page:'accounts',action:'확인하기'});
  if(unassigned.length) items.push({tone:'blue',icon:'assets',title:`미배정 자산 ${unassigned.length}개`,desc:'보유자가 없는 회사 자산을 필요한 멤버에게 배정할 수 있습니다.',page:'assets',action:'배정하기'});
  if(state.discordConnection?.status!=='connected') items.push({tone:'red',icon:'settings',title:'Discord 연결 필요',desc:'자동 채널 구성과 Discord 운영 기능을 사용하려면 서버 연결이 필요합니다.',page:'settings',settingsTab:'basic',action:'연결하기'});
  else if(state.onboardingStatus?.catalog_ready===false) items.push({tone:'amber',icon:'settings',title:'Discord 정보 동기화 중',desc:'역할과 채널 목록을 불러오는 중입니다. 잠시 후 다시 확인해 주세요.',page:'settings',settingsTab:'basic',action:'상태 보기'});
  return items;
}
function dashboardActivity(state){
  const rows=[];
  for(const item of (state.fundSnapshot?.ledger||[]).slice(0,18)){
    const when=item.created_at||item.updated_at||item.ledger_date;
    rows.push({when,icon:'fund',title:`공금 ${item.direction||'내역'} · ${item.entry_type==='payment'?'주간공금':(item.category||'기타')}`,meta:`${item.member_display_name||'회사'} · ${signedMoney(item.amount||0)}`,page:'fund'});
  }
  for(const item of (state.assetsSnapshot?.returns||[]).slice(0,12)){
    const when=item.processed_at||item.created_at;
    rows.push({when,icon:'assets',title:`${item.asset_name||'자산'} 반납 처리`,meta:`${item.owner_name||'이전 보유자'} · ${item.checker_name||'SYSTEM'}`,page:'assets'});
  }
  return rows
    .filter(row=>row.when)
    .sort((a,b)=>Number(new Date(b.when))-Number(new Date(a.when)))
    .slice(0,4);
}
function dashboardJumpButton(item){
  return `<button type="button" class="axe-dashboard-attention axe-dashboard-attention--${esc(item.tone)}" data-action="dashboard-jump" data-page="${esc(item.page||'dashboard')}" ${item.fundTab?`data-fund-tab="${esc(item.fundTab)}"`:''} ${item.settingsTab?`data-settings-tab="${esc(item.settingsTab)}"`:''}><span class="axe-dashboard-attention__icon">${icon(item.icon||'dashboard')}</span><span class="axe-dashboard-attention__copy"><strong>${esc(item.title)}</strong><small>${esc(item.desc)}</small></span><em>${esc(item.action||'열기')} →</em></button>`;
}
function renderDashboard(state){
  const members=dashboardActiveMembers(state);
  const fundEnabled=moduleEnabled(state,'fund');
  const assetsEnabled=moduleEnabled(state,'assets');
  const balance=Number(state.fundSnapshot?.balance?.public||0);
  const assets=state.assetsSnapshot?.assets||[];
  const enabledModules=(state.modules||[]).filter(row=>Boolean(row.enabled));
  const attention=dashboardAttentionItems(state);
  const activity=dashboardActivity(state);
  const connected=state.discordConnection?.status==='connected';
  const greeting=userDisplayName(state);
  const platformQuestionCount=state.platformAdmin?Number(state.platformSupport?.counts?.pending||0)+Number(state.platformSupport?.counts?.checking||0):0;
  const platformSuggestionCount=state.platformAdmin?Number(state.platformSuggestions?.counts?.pending||0)+Number(state.platformSuggestions?.counts?.checking||0):0;
  const attentionCount=dashboardFundPending(state).length+dashboardAccountPending(state).length+dashboardUnassignedAssets(state).length+Number(state.questionBoard?.counts?.unread||0)+Number(state.suggestionBoard?.counts?.unread||0)+platformQuestionCount+platformSuggestionCount+(connected?0:1);
  const statusCopy=attentionCount?`확인이 필요한 운영 항목이 ${attentionCount}건 있습니다.`:'현재 바로 처리해야 할 운영 항목이 없습니다.';
  const metrics=[
    ['활동 멤버',`${members.length}명`,'members'],
    ['공용계좌 잔액',fundEnabled?money(balance):'OFF','fund'],
    ['회사 자산',assetsEnabled?`${assets.length}개`:'OFF','assets'],
    ['Discord',connected?'연결됨':'미연결','settings'],
  ];
  const moduleTags=enabledModules.length?enabledModules.map(row=>`<span>${esc(dashboardModuleName(row.module_key))}</span>`).join(''):'<span class="is-muted">사용 중인 기능 없음</span>';
  const attentionVisible=attention.slice(0,4);
  const attentionOverflow=Math.max(0,attention.length-attentionVisible.length);
  const supportPending=platformQuestionCount+platformSuggestionCount+Number(state.questionBoard?.counts?.unread||0)+Number(state.suggestionBoard?.counts?.unread||0);
  const clearStats=[
    ['공금 검수',dashboardFundPending(state).length],
    ['계좌 검수',dashboardAccountPending(state).length],
    ['지원 응답',supportPending],
    ['미배정 자산',dashboardUnassignedAssets(state).length],
  ];
  const activityDigest=[
    ['불러온 공금 내역',(state.fundSnapshot?.ledger||[]).length,'fund'],
    ['자산 반납 기록',(state.assetsSnapshot?.returns||[]).length,'assets'],
    ['처리 대기',attentionCount,'dashboard'],
    ['사용 중 기능',enabledModules.length,'settings'],
  ];
  return `<div class="axe-dashboard">
    <header class="axe-dashboard-hero"><div><span class="axe-dashboard-kicker">DASHBOARD</span><h1>좋은 하루입니다, ${esc(greeting)}.</h1><p>${esc(statusCopy)}</p></div><button type="button" class="axe-dashboard-refresh" data-action="refresh">${icon('refresh')}<span>새로고침</span></button></header>
    <section class="axe-dashboard-metrics">${metrics.map(([label,value,page])=>`<button type="button" data-action="dashboard-jump" data-page="${page}"><span>${esc(label)}</span><strong>${esc(value)}</strong></button>`).join('')}</section>
    <div class="axe-dashboard-grid">
      <section class="axe-dashboard-panel axe-dashboard-panel--attention"><header><div><span>NOW</span><h2>지금 확인할 것</h2></div><em>${attention.length?`${attention.length}개 영역`:'ALL CLEAR'}</em></header><div class="axe-dashboard-attention-list">${attention.length?attentionVisible.map(dashboardJumpButton).join(''):`<div class="axe-dashboard-clear"><div class="axe-dashboard-clear__lead"><i>✓</i><strong>급한 운영 항목이 없습니다.</strong></div><div class="axe-dashboard-clear__stats">${clearStats.map(([label,value])=>`<span><small>${esc(label)}</small><b>${value}</b></span>`).join('')}</div></div>`}</div>${attentionOverflow?`<footer class="axe-dashboard-attention-foot">추가 ${attentionOverflow}개 항목은 해당 메뉴에서 확인할 수 있습니다.</footer>`:''}</section>
      <section class="axe-dashboard-panel axe-dashboard-panel--quick"><header><div><span>QUICK ACTION</span><h2>빠른 실행</h2></div><button type="button" data-action="dashboard-jump" data-page="settings">회사 설정 →</button></header><div class="axe-dashboard-quick-grid">${fundEnabled?`<button data-action="open-ledger">${icon('fund')}<span><strong>공금 등록</strong></span></button>`:''}<button data-action="dashboard-jump" data-page="members">${icon('members')}<span><strong>멤버 관리</strong></span></button>${assetsEnabled?`<button data-action="open-asset">${icon('assets')}<span><strong>자산 추가</strong></span></button>`:''}<button data-action="dashboard-jump" data-page="accounts">${icon('accounts')}<span><strong>계좌 관리</strong></span></button></div></section>
      <section class="axe-dashboard-panel axe-dashboard-panel--activity"><header><div><span>ACTIVITY</span><h2>최근 활동</h2></div><button type="button" data-action="dashboard-jump" data-page="fund">전체 내역 →</button></header><div class="axe-dashboard-activity-body"><div class="axe-dashboard-activity-list">${activity.length?activity.map(row=>`<button type="button" data-action="dashboard-jump" data-page="${esc(row.page)}"><span class="axe-dashboard-activity-icon">${icon(row.icon)}</span><span><strong>${esc(row.title)}</strong><small>${esc(row.meta)}</small></span><time>${esc(fmtDate(row.when,true))}</time></button>`).join(''):`<div class="axe-dashboard-empty">아직 표시할 최근 활동이 없습니다.</div>`}</div>${activity.length<3?`<div class="axe-dashboard-activity-digest"><strong>운영 스냅샷</strong><div>${activityDigest.map(([label,value,page])=>`<button type="button" data-action="dashboard-jump" data-page="${esc(page)}"><small>${esc(label)}</small><b>${Number(value||0).toLocaleString('ko-KR')}</b></button>`).join('')}</div></div>`:''}</div></section>
      <section class="axe-dashboard-panel axe-dashboard-panel--system"><header><div><span>OPERATIONS</span><h2>운영 연결 상태</h2></div><em class="${connected?'is-ok':'is-off'}">${connected?'정상':'확인 필요'}</em></header><div class="axe-dashboard-system-line"><div class="connection-status ${connected?'':'is-off'}"><i></i><div><strong>Discord ${connected?'연결됨':'미연결'}</strong></div></div><button data-action="dashboard-jump" data-page="settings">설정 열기 →</button></div><div class="axe-dashboard-module-tags"><strong>사용 중인 기능</strong><div>${moduleTags}</div></div></section>
    </div>
  </div>`;
}


// ============================================================
// COMBAT RECORD · company outlaw-stat analytics
// ============================================================
function combatNum(value){ const n=Number(value); return Number.isFinite(n)?n:0; }
function combatKd(kills,deaths){ const k=combatNum(kills),d=combatNum(deaths); return d>0?k/d:k>0?k:0; }
function combatKdText(value){ const n=Number(value); return Number.isFinite(n)?n.toFixed(2):'0.00'; }
function combatPeriodMeta(period){ return period==='7d'?{label:'최근 7일',days:7}:period==='30d'?{label:'최근 30일',days:30}:{label:'전체',days:null}; }
function combatFilterHistory(rows,period){
  const list=(Array.isArray(rows)?rows:[]).filter(row=>String(row.status||'approved')==='approved');
  const days=combatPeriodMeta(period).days;
  if(!days)return list;
  const cutoff=Date.now()-days*86400000;
  return list.filter(row=>{const t=new Date(row.recorded_at||row.created_at||0).getTime();return Number.isFinite(t)&&t>=cutoff;});
}
function combatPeriodStats(detail,period){
  const rows=combatFilterHistory(detail?.history,period);
  if(period==='all'){
    const kills=combatNum(detail?.current?.total_kills);
    const deaths=combatNum(detail?.current?.total_deaths);
    return {kills,deaths,kd:combatNum(detail?.current?.kd)||combatKd(kills,deaths),records:rows.length,rows};
  }
  const kills=rows.reduce((sum,row)=>sum+combatNum(row.kill_delta),0);
  const deaths=rows.reduce((sum,row)=>sum+combatNum(row.death_delta),0);
  return {kills,deaths,kd:combatKd(kills,deaths),records:rows.length,rows};
}
function combatRankValue(row,mode){
  if(mode==='kills')return combatNum(row.total_kills);
  if(mode==='activity')return combatNum(row.records_30d);
  return combatNum(row.kd||combatKd(row.total_kills,row.total_deaths));
}
function combatChart(history,period){
  const rows=combatFilterHistory(history,period).slice(-80);
  if(rows.length<2)return `<div class="combat-chart-empty"><strong>그래프를 만들 기록이 아직 부족합니다.</strong><span>승인된 전적이 2회 이상 쌓이면 K/D 추이가 표시됩니다.</span></div>`;
  const values=rows.map(row=>combatKd(row.total_kills,row.total_deaths));
  let min=Math.min(...values),max=Math.max(...values);
  if(Math.abs(max-min)<0.05){min=Math.max(0,min-0.2);max+=0.2;}
  const w=700,h=190,padX=18,padY=18,span=Math.max(0.01,max-min);
  const points=values.map((v,i)=>{
    const x=padX+(w-padX*2)*(i/(values.length-1));
    const y=h-padY-(h-padY*2)*((v-min)/span);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last=values.at(-1)||0;
  const first=values[0]||0;
  const delta=last-first;
  return `<div class="combat-chart-wrap"><div class="combat-chart-head"><div><strong>K/D 추이</strong><span>${esc(combatPeriodMeta(period).label)} · 승인된 전적 기준</span></div><em class="${delta>0?'is-up':delta<0?'is-down':''}">${delta>0?'+':''}${delta.toFixed(2)}</em></div><svg class="combat-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="K/D 추이 그래프"><line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" class="combat-chart-axis"/><line x1="${padX}" y1="${padY}" x2="${padX}" y2="${h-padY}" class="combat-chart-axis"/><polyline points="${points}" class="combat-chart-line" fill="none" vector-effect="non-scaling-stroke"/></svg><div class="combat-chart-scale"><span>${esc(fmtDate(rows[0]?.recorded_at||rows[0]?.created_at,true))}</span><strong>${combatKdText(last)}</strong><span>${esc(fmtDate(rows.at(-1)?.recorded_at||rows.at(-1)?.created_at,true))}</span></div></div>`;
}
function renderCombat(state){
  const combat=state.combat||{};
  const overview=combat.overview||{};
  const summaryData=overview.summary||{};
  const members=Array.isArray(overview.members)?overview.members:[];
  const selectedId=String(combat.selectedMembershipId||'');
  const selectedSummary=members.find(row=>String(row.membership_id)===selectedId)||null;
  const detail=combat.detail||null;
  const period=['7d','30d','all'].includes(combat.period)?combat.period:'30d';
  const rankMode=['kd','kills','activity'].includes(combat.rankMode)?combat.rankMode:'kd';
  const ranked=[...members].filter(row=>row.tracked).sort((a,b)=>combatRankValue(b,rankMode)-combatRankValue(a,rankMode)||combatNum(b.total_kills)-combatNum(a.total_kills));
  const periodStats=combatPeriodStats(detail,period);
  const summaryCards=[
    ['기록 멤버',`${combatNum(summaryData.tracked_count)}명`],
    ['누적 킬',combatNum(summaryData.total_kills).toLocaleString('ko-KR')],
    ['누적 데스',combatNum(summaryData.total_deaths).toLocaleString('ko-KR')],
    ['회사 K/D',combatKdText(summaryData.kd||combatKd(summaryData.total_kills,summaryData.total_deaths))],
  ];
  const rankingLabel=rankMode==='kills'?'누적 킬':rankMode==='activity'?'30일 갱신':'누적 K/D';
  const rankingRows=ranked.length?ranked.map((row,index)=>{
    const active=String(row.membership_id)===selectedId;
    const metric=rankMode==='kills'?`${combatNum(row.total_kills).toLocaleString('ko-KR')} K`:rankMode==='activity'?`${combatNum(row.records_30d)}회`:`K/D ${combatKdText(row.kd||combatKd(row.total_kills,row.total_deaths))}`;
    return `<button type="button" class="combat-member ${active?'is-active':''}" data-action="combat-select-member" data-membership-id="${esc(row.membership_id)}"><span class="combat-member-rank">${index+1}</span><span class="combat-member-copy"><strong>${esc(row.display_name||row.source_nickname||'이름 없음')}</strong><small>${esc(ROLE_KO[row.role]||row.role||'멤버')} · 전적 ${combatNum(row.record_count)}회</small></span><em>${esc(metric)}</em></button>`;
  }).join(''):`<div class="combat-empty-list"><strong>아직 전투 기록이 없습니다.</strong><span>무법지대 전적 이미지가 승인되면 자동으로 표시됩니다.</span></div>`;
  const memberName=detail?.member?.display_name||selectedSummary?.display_name||detail?.current?.source_nickname||'멤버 선택';
  const current=detail?.current||{};
  const currentKills=combatNum(current.total_kills ?? selectedSummary?.total_kills);
  const currentDeaths=combatNum(current.total_deaths ?? selectedSummary?.total_deaths);
  const currentKd=combatNum(current.kd)||combatKd(currentKills,currentDeaths);
  const history=Array.isArray(detail?.history)?detail.history:[];
  const historyRows=[...history].filter(row=>String(row.status||'approved')==='approved').sort((a,b)=>new Date(b.recorded_at||b.created_at||0)-new Date(a.recorded_at||a.created_at||0)).slice(0,12);
  const detailBody=!selectedId?`<div class="combat-detail-empty"><strong>멤버를 선택해 주세요.</strong><span>왼쪽 전투 랭킹에서 멤버를 선택하면 상세 기록을 확인할 수 있습니다.</span></div>`:combat.detailLoading?`<div class="combat-detail-empty"><span class="runtime-startup-spinner" aria-hidden="true"></span><strong>전투 기록을 불러오는 중입니다.</strong></div>`:!detail?`<div class="combat-detail-empty"><strong>표시할 상세 기록이 없습니다.</strong><span>해당 멤버에게 승인된 무법지대 기록이 있는지 확인해 주세요.</span></div>`:`
    <header class="combat-detail-head"><div><span>MEMBER RECORD</span><h2>${esc(memberName)}</h2><p>${esc(ROLE_KO[detail.member?.role]||detail.member?.role||'멤버')} · 최근 갱신 ${esc(fmtDate(current.updated_at||current.source_updated_at||selectedSummary?.updated_at,true))}</p></div><div class="combat-detail-state"><i></i><span>무법지대 전적 연동</span></div></header>
    <section class="combat-member-metrics"><article><span>KILLS</span><strong>${currentKills.toLocaleString('ko-KR')}</strong></article><article><span>DEATHS</span><strong>${currentDeaths.toLocaleString('ko-KR')}</strong></article><article><span>K/D</span><strong>${combatKdText(currentKd)}</strong></article><article><span>전적 갱신</span><strong>${history.filter(row=>String(row.status||'approved')==='approved').length}회</strong></article></section>
    <div class="combat-period-bar"><div><strong>기간별 기록</strong><span>어시스트 데이터가 없어 KDA가 아닌 K/D로 표시합니다.</span></div><div class="combat-period-tabs">${[['7d','7일'],['30d','30일'],['all','전체']].map(([key,label])=>`<button type="button" class="${period===key?'is-active':''}" data-action="combat-period" data-period="${key}">${label}</button>`).join('')}</div></div>
    ${period==='all'?'':`<section class="combat-period-summary"><article><span>${esc(combatPeriodMeta(period).label)} 킬</span><strong>+${periodStats.kills.toLocaleString('ko-KR')}</strong></article><article><span>${esc(combatPeriodMeta(period).label)} 데스</span><strong>+${periodStats.deaths.toLocaleString('ko-KR')}</strong></article><article><span>기간 K/D</span><strong>${combatKdText(periodStats.kd)}</strong></article><article><span>전적 갱신</span><strong>${periodStats.records}회</strong></article></section>`}
    <section class="combat-chart-panel">${combatChart(history,period)}</section>
    <section class="combat-history"><header><div><span>HISTORY</span><h3>최근 전적 갱신</h3></div><small>승인된 기록만 표시</small></header><div class="combat-history-head"><span>날짜</span><span>증가 K</span><span>증가 D</span><span>구간 K/D</span><span>누적 K/D</span><span>원본</span></div><div class="combat-history-list">${historyRows.length?historyRows.map(row=>{const dk=combatNum(row.kill_delta),dd=combatNum(row.death_delta),kd=combatKd(row.total_kills,row.total_deaths);const image=String(row.source_image_url||row.image_url||'').trim();return `<div class="combat-history-row"><time>${esc(fmtDate(row.recorded_at||row.created_at,true))}</time><strong>+${dk}</strong><strong>+${dd}</strong><span>${combatKdText(row.delta_kd||combatKd(dk,dd))}</span><span>${combatKdText(kd)}</span>${image?`<a href="${esc(image)}" target="_blank" rel="noopener noreferrer">이미지</a>`:'<em>—</em>'}</div>`;}).join(''):`<div class="combat-history-empty">표시할 승인 기록이 없습니다.</div>`}</div></section>`;
  return `<div class="combat-page">
    <header class="combat-page-head"><div><span class="page-eyebrow">COMBAT RECORD</span><h1>전투 기록</h1><p>회사 멤버의 무법지대 K/D와 기간별 전적 흐름을 확인합니다.</p></div><button type="button" class="combat-refresh" data-action="refresh-combat">${icon('refresh')}<span>새로고침</span></button></header>
    ${combat.error?`<div class="combat-error"><strong>전투 기록을 불러오지 못했습니다.</strong><span>${esc(combat.error)}</span></div>`:''}
    <section class="combat-company-summary">${summaryCards.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('')}</section>
    <div class="combat-layout">
      <aside class="combat-ranking"><header><div><span>MEMBER RANKING</span><h2>멤버 전투 현황</h2></div></header><div class="combat-rank-tabs">${[['kd','K/D'],['kills','킬'],['activity','활동']].map(([key,label])=>`<button type="button" class="${rankMode===key?'is-active':''}" data-action="combat-rank-mode" data-rank-mode="${key}">${label}</button>`).join('')}</div><div class="combat-ranking-caption"><span>순위 · 멤버</span><span>${esc(rankingLabel)}</span></div><div class="combat-member-list">${combat.loading&&!overview.members?`<div class="combat-empty-list">전투 기록을 불러오는 중입니다.</div>`:rankingRows}</div></aside>
      <section class="combat-detail">${detailBody}</section>
    </div>
  </div>`;
}

// ============================================================
// DATA DENSITY · bounded operational lists
// ============================================================
const OPS_PAGE_SIZE={questions:5,suggestions:5,fund:8,fundReview:6,members:8,assets:8,returns:8,accounts:8,cooking:9,platform:6};
function pageRows(rows,page,size){
  const list=Array.isArray(rows)?rows:[];
  const safeSize=Math.max(1,Number(size||8));
  const totalPages=Math.max(1,Math.ceil(list.length/safeSize));
  const safePage=Math.min(totalPages,Math.max(1,Number(page||1)));
  const start=(safePage-1)*safeSize;
  return {rows:list.slice(start,start+safeSize),page:safePage,totalPages,total:list.length,start:list.length?start+1:0,end:Math.min(start+safeSize,list.length)};
}
function renderDataPager(key,paged,noun='건'){
  if(!paged||paged.total<=0||paged.totalPages<=1)return '';
  const buttons=`<div class="ops-data-pager__buttons"><button type="button" data-action="list-page" data-list-key="${esc(key)}" data-list-page="${Math.max(1,paged.page-1)}" ${paged.page<=1?'disabled':''}>이전</button><span>${paged.page} / ${paged.totalPages}</span><button type="button" data-action="list-page" data-list-key="${esc(key)}" data-list-page="${Math.min(paged.totalPages,paged.page+1)}" ${paged.page>=paged.totalPages?'disabled':''}>다음 →</button></div>`;
  return `<footer class="ops-data-pager"><span><strong>${paged.start}–${paged.end}</strong> · 총 ${paged.total}${esc(noun)}</span>${buttons}</footer>`;
}

// ============================================================
// QUESTION BOARD
// ============================================================
function questionStatusMeta(status){
  const map={
    pending:{label:'답변대기',className:'is-pending'},
    checking:{label:'확인중',className:'is-checking'},
    complete:{label:'답변완료',className:'is-complete'},
  };
  return map[String(status||'')]||map.pending;
}
function renderQuestions(state){
  const board=state.questionBoard||{};
  const counts=board.counts||{};
  const items=Array.isArray(board.items)?board.items:[];
  const filter=String(state.questionStatus||'all');
  const scope=String(state.questionScope||'all');
  const scoped=scope==='mine'?items.filter(item=>item.is_mine===true):items;
  const filtered=filter==='all'?scoped:scoped.filter(item=>String(item.status||'pending')===filter);
  const paged=pageRows(filtered,state.questionPage,OPS_PAGE_SIZE.questions);
  const createAction=`<button class="axe-questions-primary" data-action="open-question-create">+ 질문 작성</button>`;
  const header=pageHeader('SUPPORT','질문게시판','',createAction);
  if(board.error){
    return `<section class="axe-questions">${header}<div class="axe-questions-error"><strong>질문게시판을 불러오지 못했습니다.</strong><span>${esc(board.error)}</span><button data-action="refresh-questions">다시 불러오기</button></div></section>`;
  }
  const summaryCards=[['답변대기',Number(counts.pending||0),'is-pending'],['확인중',Number(counts.checking||0),'is-checking'],['답변완료',Number(counts.complete||0),'is-complete']];
  const list=paged.rows.length?paged.rows.map(item=>{
    const meta=questionStatusMeta(item.status);
    const unread=item.unread?'<em class="axe-question-new">NEW</em>':'';
    const mine=item.is_mine?'<em class="axe-question-mine">내 질문</em>':'';
    return `<article class="axe-question-row ${item.unread?'is-unread':''}" data-action="open-question" data-question-id="${esc(item.id)}"><div class="axe-question-main"><div class="axe-question-title-line"><span class="axe-question-status ${meta.className}">${meta.label}</span>${mine}${unread}<strong>${esc(item.title)}</strong></div><div class="axe-question-meta"><span>${esc(item.author_name||'사용자')}</span><span>${esc(fmtDate(item.last_message_at||item.created_at,true))}</span><span>메시지 ${Math.max(1,Number(item.message_count||1))}개</span></div></div><div class="axe-question-actions"><button type="button" data-action="open-question" data-question-id="${esc(item.id)}">보기</button></div></article>`;
  }).join(''):`<div class="axe-questions-list-empty"><strong>조건에 맞는 질문이 없습니다.</strong><span>${scope==='mine'?'아직 내가 작성한 질문이 없습니다.':filter==='all'?'궁금한 내용이 생기면 이곳에서 바로 질문을 남길 수 있습니다.':'다른 상태를 선택해 질문을 확인해 보세요.'}</span></div>`;
  const unread=Number(counts.unread||0);
  const mineCount=Number(counts.mine||items.filter(item=>item.is_mine===true).length);
  const total=Number(counts.total||items.length);
  const loadedNote=total>items.length?`최근 ${items.length}건 기준`:`전체 ${total}건`;
  return `<section class="axe-questions">${header}<section class="axe-question-summary">${summaryCards.map(([label,value,tone])=>`<article class="${tone}"><span>${label}</span><strong>${value}건</strong></article>`).join('')}<button data-action="refresh-questions">새로고침</button></section>${unread?`<div class="axe-questions-alert"><strong>새 답변 ${unread}건</strong><span>확인하지 않은 답변이 있습니다.</span></div>`:''}<section class="axe-questions-board"><header><div><span>QUESTION BOARD</span><h2>질문 목록</h2></div><small>${esc(loadedNote)}</small></header><div class="axe-question-toolbar"><div class="axe-question-filter-stack"><div class="axe-question-scope-filter"><button class="${scope==='all'?'is-active':''}" data-action="question-scope" data-question-scope="all">전체 질문</button><button class="${scope==='mine'?'is-active':''}" data-action="question-scope" data-question-scope="mine">내 질문 <em>${mineCount}</em></button></div><div class="axe-question-status-filter"><button class="${filter==='all'?'is-active':''}" data-action="question-filter" data-question-status="all">전체</button><button class="${filter==='pending'?'is-active':''}" data-action="question-filter" data-question-status="pending">답변대기</button><button class="${filter==='checking'?'is-active':''}" data-action="question-filter" data-question-status="checking">확인중</button><button class="${filter==='complete'?'is-active':''}" data-action="question-filter" data-question-status="complete">완료</button></div></div></div><div class="axe-question-list axe-question-list--bounded">${list}</div>${renderDataPager('questions',paged,'건')}</section><div class="axe-questions-note"><strong>운영 방식</strong><span>질문은 LAC HUB 안에 저장됩니다. <b>답변은 LAC HUB 운영자만 작성</b>할 수 있고, 작성자는 자신의 질문에 추가 질문을 남길 수 있습니다.</span></div></section>`;
}

function suggestionCategoryMeta(category){
  const map={
    improvement:{label:'개선 제안',className:'is-improvement'},
    bug:{label:'오류 제보',className:'is-bug'},
    other:{label:'기타',className:'is-other'},
  };
  return map[String(category||'')]||map.other;
}
function renderSuggestions(state){
  const board=state.suggestionBoard||{};
  const counts=board.counts||{};
  const items=Array.isArray(board.items)?board.items:[];
  const status=String(state.suggestionStatus||'all');
  const category=String(state.suggestionCategory||'all');
  let filtered=status==='all'?items:items.filter(item=>String(item.status||'pending')===status);
  if(category!=='all') filtered=filtered.filter(item=>String(item.category||'other')===category);
  const paged=pageRows(filtered,state.suggestionPage,OPS_PAGE_SIZE.suggestions);
  const createAction=`<button class="axe-questions-primary" data-action="open-suggestion-create">+ 건의 작성</button>`;
  const header=pageHeader('PRIVATE SUPPORT','건의게시판','',createAction);
  if(board.error){
    return `<section class="axe-questions axe-suggestions">${header}<div class="axe-questions-error"><strong>건의게시판을 불러오지 못했습니다.</strong><span>${esc(board.error)}</span><button data-action="refresh-suggestions">다시 불러오기</button></div></section>`;
  }
  const summaryCards=[['답변대기',Number(counts.pending||0),'is-pending'],['확인중',Number(counts.checking||0),'is-checking'],['답변완료',Number(counts.complete||0),'is-complete']];
  const list=paged.rows.length?paged.rows.map(item=>{
    const meta=questionStatusMeta(item.status);
    const cat=suggestionCategoryMeta(item.category);
    const unread=item.unread?'<em class="axe-question-new">NEW</em>':'';
    return `<article class="axe-question-row ${item.unread?'is-unread':''}" data-action="open-suggestion" data-suggestion-id="${esc(item.id)}"><div class="axe-question-main"><div class="axe-question-title-line"><span class="suggestion-category ${cat.className}">${cat.label}</span><span class="axe-question-status ${meta.className}">${meta.label}</span>${unread}<strong>${esc(item.title)}</strong></div><div class="axe-question-meta"><span>비공개</span><span>${esc(fmtDate(item.last_message_at||item.created_at,true))}</span><span>메시지 ${Math.max(1,Number(item.message_count||1))}개</span></div></div><div class="axe-question-actions"><button type="button" data-action="open-suggestion" data-suggestion-id="${esc(item.id)}">보기</button></div></article>`;
  }).join(''):`<div class="axe-questions-list-empty"><strong>조건에 맞는 건의가 없습니다.</strong><span>${status==='all'&&category==='all'?'개선 아이디어나 오류가 있다면 부담 없이 남겨주세요.':'다른 조건을 선택해 건의를 확인해 보세요.'}</span></div>`;
  const unread=Number(counts.unread||0);
  const total=Number(counts.total||items.length);
  const loadedNote=total>items.length?`최근 ${items.length}건 기준`:`내 건의 ${total}건`;
  return `<section class="axe-questions axe-suggestions">${header}<section class="axe-question-summary">${summaryCards.map(([label,value,tone])=>`<article class="${tone}"><span>${label}</span><strong>${value}건</strong></article>`).join('')}<button data-action="refresh-suggestions">새로고침</button></section>${unread?`<div class="axe-questions-alert"><strong>새 답변 ${unread}건</strong><span>확인하지 않은 건의 답변이 있습니다.</span></div>`:''}<div class="suggestion-private-banner"><strong>1:1 비공개</strong><span>같은 회사의 대표·관리자·멤버도 다른 사람이 작성한 건의를 볼 수 없습니다.</span></div><section class="axe-questions-board"><header><div><span>SUGGESTION BOARD</span><h2>내 건의</h2></div><small>${esc(loadedNote)}</small></header><div class="axe-question-toolbar"><div class="axe-question-filter-stack"><div class="axe-question-scope-filter"><button class="${category==='all'?'is-active':''}" data-action="suggestion-category" data-suggestion-category="all">유형 전체</button><button class="${category==='improvement'?'is-active':''}" data-action="suggestion-category" data-suggestion-category="improvement">개선 제안</button><button class="${category==='bug'?'is-active':''}" data-action="suggestion-category" data-suggestion-category="bug">오류 제보</button><button class="${category==='other'?'is-active':''}" data-action="suggestion-category" data-suggestion-category="other">기타</button></div><div class="axe-question-status-filter"><button class="${status==='all'?'is-active':''}" data-action="suggestion-filter" data-suggestion-status="all">전체</button><button class="${status==='pending'?'is-active':''}" data-action="suggestion-filter" data-suggestion-status="pending">답변대기</button><button class="${status==='checking'?'is-active':''}" data-action="suggestion-filter" data-suggestion-status="checking">확인중</button><button class="${status==='complete'?'is-active':''}" data-action="suggestion-filter" data-suggestion-status="complete">완료</button></div></div></div><div class="axe-question-list axe-question-list--bounded">${list}</div>${renderDataPager('suggestions',paged,'건')}</section></section>`;
}

// ============================================================
// FUND
// ============================================================
function renderFund(state) {
  const snap = state.fundSnapshot || {};
  const balance = Number(snap.balance?.public || 0);
  const pending = Number(snap.pending_review_count || 0);
  return `<section class="axe-fund">
    <header class="axe-fund-header axe-fund-header--clean"><div class="axe-fund-header-copy"><span>FUND</span><h1>공금 관리</h1></div></header>
    <section class="axe-fund-summary axe-fund-summary--clean"><article class="axe-fund-metric"><span>현재 계산 잔액</span><strong>${money(balance)}</strong></article><article class="axe-fund-metric"><span>이번 달 수입</span><strong class="is-income">+${money(snap.month_income)}</strong></article><article class="axe-fund-metric"><span>이번 달 지출</span><strong class="is-expense">-${money(snap.month_expense)}</strong></article></section>
    <nav class="axe-fund-tabs">${[['ledger','공금 내역'],['weekly','납부 현황'],['review','납부 검수'],['balance','잔액 점검'],['settings','공금 설정']].map(([k,l])=>`<button class="${state.fundTab===k?'is-active':''}" data-fund-tab="${k}"><span>${l}</span>${k==='review'&&pending?`<em>${pending}</em>`:''}</button>`).join('')}</nav>
    <div class="axe-fund-view">${state.fundTab==='weekly'?renderFundWeekly(state):state.fundTab==='review'?renderFundReview(state):state.fundTab==='balance'?renderFundBalance(state):state.fundTab==='settings'?renderFundSettings(state):renderFundLedger(state)}</div>
  </section>`;
}

function monthOptions(selected, count=12) {
  const base = new Date();
  return Array.from({length:count},(_,i)=>{ const d=new Date(base.getFullYear(),base.getMonth()-i,1); const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return `<option value="${v}" ${v===selected?'selected':''}>${d.getFullYear()}년 ${d.getMonth()+1}월</option>`; }).join('');
}

function monthOptionsAround(selected, past=6, future=6) {
  const base = new Date();
  const rows=[];
  for(let offset=future; offset>=-past; offset--){
    const d=new Date(base.getFullYear(),base.getMonth()+offset,1);
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    rows.push(`<option value="${v}" ${v===selected?'selected':''}>${d.getFullYear()}년 ${d.getMonth()+1}월</option>`);
  }
  return rows.join('');
}

function renderFundLedger(state) {
  const ledger = Array.isArray(state.fundSnapshot?.ledger) ? state.fundSnapshot.ledger : [];
  const q = state.fundFilters || {person:'all',type:'all',account:'all'};
  let rows = ledger.slice();
  if(q.person!=='all') rows=rows.filter(r=>(r.member_display_name||'')===q.person);
  if(q.type==='approval') rows=rows.filter(r=>r.request_id); else if(q.type==='manual') rows=rows.filter(r=>!r.request_id); else if(q.type==='income') rows=rows.filter(r=>r.direction==='수입'); else if(q.type==='expense') rows=rows.filter(r=>r.direction==='지출');
  if(q.account!=='all') rows=rows.filter(r=>r.account===q.account);
  const people=[...new Set(ledger.map(r=>r.member_display_name).filter(Boolean))]; const accounts=[...new Set(ledger.map(r=>r.account).filter(Boolean))];
  const paged=pageRows(rows,state.fundLedgerPage,OPS_PAGE_SIZE.fund);
  const body=paged.rows.length?paged.rows.map(r=>renderLedgerRow(r,state)).join(''):`<div class="axe-fund-ledger-empty">조건에 맞는 공금내역이 없습니다.</div>`;
  return `<section class="axe-fund-ledger"><header class="axe-fund-ledger-head"><div><h2>공금내역</h2></div><div class="axe-fund-ledger-head-actions"><select class="axe-fund-history-select axe-fund-history-select--month" data-fund-ledger-month>${monthOptions(state.fundMonth,12)}</select><button class="axe-fund-primary axe-fund-primary--ledger" data-action="open-ledger">수입·지출 등록</button></div></header><section class="axe-fund-ledger-board"><div class="axe-fund-ledger-toolbar"><div class="axe-fund-ledger-filters"><select class="axe-fund-history-select" data-fund-filter="person"><option value="all">전체 이름</option>${people.map(v=>`<option ${q.person===v?'selected':''}>${esc(v)}</option>`).join('')}</select><select class="axe-fund-history-select" data-fund-filter="type"><option value="all">전체 구분</option><option value="approval" ${q.type==='approval'?'selected':''}>승인반영</option><option value="manual" ${q.type==='manual'?'selected':''}>직접기입</option><option value="income" ${q.type==='income'?'selected':''}>수입</option><option value="expense" ${q.type==='expense'?'selected':''}>지출</option></select><select class="axe-fund-history-select" data-fund-filter="account"><option value="all">전체 계좌</option>${accounts.map(v=>`<option ${q.account===v?'selected':''}>${esc(v)}</option>`).join('')}</select><button class="axe-fund-history-reset" data-action="reset-fund-filter">필터 초기화</button></div><span class="axe-fund-ledger-count">${rows.length}건</span></div><div class="axe-fund-ledger-columns"><span>날짜</span><span>이름</span><span>계좌</span><span>내역</span><span>구분</span><span>금액</span><span>증빙</span><span>관리</span></div><div class="axe-fund-ledger-list">${body}</div>${renderDataPager('fundLedger',paged,'건')}</section></section>`;
}
function renderLedgerRow(r,state){
  const amount=Number(r.amount||0); const isWeeklyPayment=r.entry_type==='payment'; const title=isWeeklyPayment?'주간공금':(r.category||'기타');
  const kind=isWeeklyPayment?'공금납부':(r.ledger_type||'—');
  const current=(state.memberships||[]).find(m=>m.id===r.membership_id); const who=current?.display_name||r.member_display_name||'—';
  const key=dateKey(r.ledger_date); const [y,m,d]=key.split('-');
  const editControl=`<button class="axe-fund-history-action ${r.can_edit?'':'is-correction'}" data-action="edit-ledger" data-entry-id="${esc(r.id)}" title="${r.can_edit?'직접 수정':'연동 내역은 원본을 보존하고 정정 반영'}">수정</button>`;
  const extra=(state.fundLedgerAttachments||[]).filter(a=>String(a.entry_id)===String(r.id));
  const evidenceCount=extra.length+(r.evidence_path?1:0);
  const evidenceControl=evidenceCount?`<button class="axe-fund-history-action is-evidence" data-action="open-ledger-evidence" data-entry-id="${esc(r.id)}">보기</button>`:'<span>—</span>';
  const detail=r.memo?`${title} · ${r.memo}`:title;
  return `<article class="axe-fund-ledger-row"><div class="axe-fund-ledger-date" data-label="날짜"><strong>${y}.${m}.${d}</strong></div><div class="axe-fund-ledger-person" data-label="이름"><strong>${esc(who)}</strong></div><div class="axe-fund-ledger-account" data-label="계좌"><span>${esc(r.account||'—')}</span></div><div class="axe-fund-ledger-entry" data-label="내역" title="${esc(detail)}"><strong>${esc(detail)}</strong></div><div class="axe-fund-ledger-type" data-label="구분">${esc(kind)}</div><div class="axe-fund-ledger-money ${amount<0?'is-expense':'is-income'}" data-label="금액">${signedMoney(amount)}</div><div class="axe-fund-ledger-action" data-label="증빙">${evidenceControl}</div><div class="axe-fund-ledger-action" data-label="관리">${editControl}</div></article>`;
}
function renderFundWeekly(state) {
  const rows=state.fundMonthlyRows||[]; const [y,m]=state.fundWeeklyMonth.split('-'); const fee=state.fundWeeklyFee || state.fundSnapshot?.fee_rules?.[0]?.weekly_fee || 0;
  return `<section class="axe-fund-card axe-fund-subview axe-fund-subview--weekly"><header class="axe-fund-card-head axe-fund-card-head--weekly"><div><h2>${y}년 ${Number(m)}월 납부 현황</h2><p>주간 공금 ${money(fee)}</p></div><div class="axe-fund-week-actions"><select class="axe-fund-select axe-fund-month-select" data-fund-weekly-month>${monthOptions(state.fundWeeklyMonth,12)}</select><span class="axe-fund-chip ${state.fundWeeklyMonth===state.currentMonth?'':'is-history'}">${state.fundWeeklyMonth===state.currentMonth?'현재 월':'과거 내역'}</span></div></header><div class="axe-fund-week-scroll"><div class="axe-fund-week-grid"><div class="axe-fund-week-row axe-fund-week-row--head"><span>멤버</span><span>역할</span>${[1,2,3,4,5].map(n=>`<b>${n}주</b>`).join('')}</div>${state.fundWeeklyLoading?'<div class="runtime-inline-loading">납부 현황을 불러오는 중…</div>':rows.length?rows.map(r=>`<div class="axe-fund-week-row"><span><strong>${esc(r.name)}</strong></span><span class="axe-fund-week-role">${esc(r.role||'—')}</span>${r.weeks.map(s=>`<b class="${weekClass(s)}" title="${esc(s)}">${weekSymbol(s)}</b>`).join('')}</div>`).join(''):'<div class="runtime-inline-loading">해당 월의 납부 기록이 없습니다.</div>'}</div></div></section>`;
}
function weekClass(v){return ({'완료':'is-ok','미납':'is-bad','면제':'is-skip','검수대기':'is-pending','보류':'is-pending','예정':'is-future','가입 전':'is-future'})[v]||'is-future';} function weekSymbol(v){return ({'완료':'✓','미납':'×','면제':'–','검수대기':'•','보류':'•','예정':'·','가입 전':'·'})[v]||'·';}

function renderFundReview(state) {
  const open=(state.fundRequests||[]).filter(r=>['pending','hold'].includes(r.status));
  const paged=pageRows(open,state.fundReviewPage,OPS_PAGE_SIZE.fundReview);
  const rows=paged.rows.length?paged.rows.map(r=>`<article class="axe-fund-review-row"><div class="axe-fund-review-cell" data-label="멤버"><strong>${esc(r.member_display_name||'멤버')}</strong></div><div class="axe-fund-review-cell" data-label="납부 주차">${esc(r.year)}.${String(r.month).padStart(2,'0')} · ${esc(r.week)}주</div><div class="axe-fund-review-cell is-money" data-label="금액">${money(r.amount)}</div><div class="axe-fund-review-cell" data-label="방식">${esc(r.payment_mode||'—')}</div><div class="axe-fund-review-cell" data-label="상태"><span class="axe-fund-review-state ${r.status==='hold'?'is-hold':''}">${r.status==='hold'?'보류':'대기'}</span></div><div class="axe-fund-review-cell" data-label="증빙">${r.evidence_path?`<button class="axe-fund-tool-button axe-fund-tool-button--compact" data-action="open-evidence" data-evidence-path="${esc(r.evidence_path)}">보기</button>`:'—'}</div><div class="axe-fund-review-actions" data-label="처리"><button data-action="fund-review" data-request-id="${esc(r.request_id)}" data-review-action="approve">승인</button><button data-action="fund-review" data-request-id="${esc(r.request_id)}" data-review-action="hold">보류</button><button class="danger" data-action="fund-review" data-request-id="${esc(r.request_id)}" data-review-action="reject">반려</button></div></article>`).join(''):empty('현재 검수할 납부 신청이 없습니다.');
  return `<section class="axe-fund-card axe-fund-subview axe-fund-subview--review"><header class="axe-fund-card-head"><div><h2>납부 검수</h2></div><span class="axe-fund-chip">${open.length}건</span></header><div class="axe-fund-review-columns"><span>멤버</span><span>납부 주차</span><span>금액</span><span>방식</span><span>상태</span><span>증빙</span><span>처리</span></div><div class="axe-fund-review-list">${rows}</div>${renderDataPager('fundReview',paged,'건')}</section>`;
}
function renderFundBalance(state) {
  const current=Number(state.fundSnapshot?.balance?.public||0); const check=state.companySettings?.settings?.fund_balance_check||{}; const diff=check.game_balance==null?null:Number(check.game_balance)-current;
  return `<div class="axe-fund-subview axe-fund-subview--balance axe-fund-balance-layout"><section class="axe-fund-card"><header class="axe-fund-card-head"><div><h2>공용계좌 잔액 점검</h2></div></header><form class="axe-fund-form-stack" data-form="fund-balance"><label class="axe-fund-field"><span>웹 계산 잔액</span><input value="${money(current)}" disabled></label><label class="axe-fund-field"><span>게임 내 공용계좌 잔액</span><input name="game_balance" type="number" value="${esc(check.game_balance??'')}" placeholder="현재 잔액 입력"></label><label class="axe-fund-field"><span>메모</span><textarea name="note" placeholder="차이가 있다면 이유를 적어주세요.">${esc(check.note||'')}</textarea></label><div class="axe-fund-form-actions"><button class="axe-fund-primary" type="submit">점검 저장</button></div></form></section><section class="axe-fund-card axe-fund-card--compact"><header class="axe-fund-card-head"><div><h2>최근 점검</h2><p>${check.checked_at?fmtDate(check.checked_at,true):'아직 점검 기록이 없습니다.'}</p></div>${diff===0?'<span class="axe-fund-status axe-fund-status--ok">일치</span>':''}</header><dl class="axe-fund-kv"><div><dt>웹 계산 잔액</dt><dd>${money(current)}</dd></div><div><dt>게임 내 잔액</dt><dd>${check.game_balance==null?'—':money(check.game_balance)}</dd></div><div><dt>차액</dt><dd class="${diff===0?'is-income':diff==null?'':'is-expense'}">${diff==null?'—':signedMoney(diff)}</dd></div></dl></section></div>`;
}
function renderFundSettings(state){
  const rule=(state.fundSnapshot?.fee_rules||[]).find(r=>r.enabled)||(state.fundSnapshot?.fee_rules||[])[0]||{};
  const selectedMonth=state.fundMonth||state.currentMonth;
  const [y,m]=selectedMonth.split('-');
  const defaultAccount=state.companySettings?.settings?.fund_default_account||'공용계좌';
  const selectedWeek=Number(rule.week||rule.start_week||1);
  return `<section class="axe-fund-card axe-fund-subview axe-fund-subview--settings">
    <header class="axe-fund-card-head"><div><h2>공금 설정</h2></div></header>
    <form class="axe-fund-settings-list" data-form="fund-fee-rule">
      <div class="axe-fund-setting">
        <div><strong>적용 월</strong></div>
        <select class="axe-fund-select axe-fund-select--month" name="fee_month" data-fund-ledger-month>${monthOptionsAround(selectedMonth,6,6)}</select>
      </div>
      <div class="axe-fund-setting">
        <div><strong>주간 공금 기준</strong></div>
        <div class="runtime-fee-controls">
          <select class="axe-fund-select axe-fund-select--week" name="week">${[1,2,3,4,5].map(n=>`<option value="${n}" ${selectedWeek===n?'selected':''}>${n}주차부터</option>`).join('')}</select>
          <div class="axe-fund-money-control"><input name="weekly_fee" type="number" min="0" step="1000" value="${esc(rule.weekly_fee||0)}"><span>원</span></div>
        </div>
      </div>
      <div class="axe-fund-setting">
        <div><strong>납부 대상</strong></div>
        <button type="button" class="axe-fund-tool-button axe-fund-tool-button--compact" data-page="members">멤버 관리</button>
      </div>
      <div class="axe-fund-setting">
        <div><strong>기본 계좌</strong></div>
        <select class="axe-fund-select axe-fund-select--account" name="default_account"><option ${defaultAccount==='공용계좌'?'selected':''}>공용계좌</option><option ${defaultAccount==='회사잔고'?'selected':''}>회사잔고</option></select>
      </div>
      <div class="runtime-settings-save"><button class="axe-fund-primary axe-fund-primary--settings" type="submit">공금 설정 저장</button></div>
    </form>
  </section>`;
}

function renderMembers(state){
  const all=state.memberships||[];
  const active=all.filter(m=>m.status==='active');
  const left=all.filter(m=>m.status==='left');
  const admins=active.filter(m=>['owner','admin'].includes(m.role));
  let rows=all.filter(m=>state.memberFilter==='active'?m.status==='active':state.memberFilter==='left'?m.status==='left':true);
  if(state.memberRole) rows=rows.filter(m=>m.role===state.memberRole);
  const q=(state.memberQuery||'').toLowerCase();
  if(q) rows=rows.filter(m=>`${m.display_name||''} ${m.discord_display_name||''} ${m.alias_name||''} ${ROLE_KO[m.role]||m.role||''} ${memberStatus(m.status)||''}`.toLowerCase().includes(q));
  const paged=pageRows(rows,state.memberPage,OPS_PAGE_SIZE.members);
  const memberRows=paged.rows.length?paged.rows.map(m=>{
    const hire=m.employment_started_on?fmtDate(m.employment_started_on,true):'미설정';
    const discordName=m.discord_display_name||'미연결';
    return `<article class="ops-lane-row ops-lane-row--member"><div class="ops-lane-cell ops-lane-copy" data-label="이름"><strong>${esc(m.display_name||'멤버')}</strong></div><div class="ops-lane-cell" data-label="Discord"><span class="ops-lane-value ${m.discord_display_name?'':'is-muted'}">${esc(discordName)}</span></div><div class="ops-lane-cell" data-label="역할"><span class="ops-lane-value">${esc(ROLE_KO[m.role]||m.role||'—')}</span></div><div class="ops-lane-cell" data-label="입사일"><span class="ops-lane-value ${hire==='미설정'?'is-muted':''}">${esc(hire)}</span></div><div class="ops-lane-cell is-center" data-label="상태"><span class="ops-mgmt-badge ${m.status==='active'?'is-green':m.status==='left'?'is-red':'is-amber'}">${memberStatus(m.status)}</span></div><div class="ops-lane-cell is-center" data-label="관리"><button class="ops-mgmt-action" data-action="edit-member" data-membership-id="${esc(m.id)}">상세</button></div></article>`;
  }).join(''):empty('조건에 맞는 멤버가 없습니다.');
  const memberFiltered=Boolean(q||state.memberRole||state.memberFilter==='active'||state.memberFilter==='left');
  return `<div class="ops-mgmt-page ops-mgmt-page--members">${pageHeader('MEMBERS','멤버 관리','',canAdmin(state)?`<button class="ops-action-primary" data-action="open-member-register">${icon('plus')}<span>멤버 등록</span></button>`:'')}${summary([['전체 멤버',`${all.length}명`,'',''],['활동 중',`${active.length}명`,'','is-positive'],['관리 권한',`${admins.length}명`,'','is-warning'],['퇴사',`${left.length}명`,'','']])}<div class="ops-mgmt-workspace"><div class="ops-mgmt-section-head ops-mgmt-section-head--solo"><div><strong>멤버 현황</strong></div></div><section class="ops-mgmt-board"><div class="ops-mgmt-toolbar"><div class="ops-mgmt-segments">${segment(state,'all','전체',all.length)}${segment(state,'active','활동',active.length)}${segment(state,'left','퇴사',left.length,true)}</div><div class="ops-mgmt-filters"><select class="ops-mgmt-select" data-member-role><option value="">역할 전체</option>${['owner','admin','manager','member'].map(r=>`<option value="${r}" ${state.memberRole===r?'selected':''}>${ROLE_KO[r]}</option>`).join('')}</select><label class="ops-mgmt-search">${icon('search')}<input data-member-query value="${esc(state.memberQuery||'')}" placeholder="멤버 검색" autocomplete="off"></label></div></div>${memberFiltered?`<div class="ops-mgmt-meta"><span><strong>${rows.length}</strong>명 검색 결과</span></div>`:''}<div class="ops-lane-head ops-lane-head--member"><span>이름</span><span>Discord</span><span>역할</span><span>입사일</span><span>상태</span><span>관리</span></div><div class="ops-mgmt-list">${memberRows}</div>${renderDataPager('members',paged,'명')}</section></div></div>`;
}
function segment(state,key,label,count,left=false){ return `<button class="${state.memberFilter===key?'is-active':''} ${left?'is-left':''}" data-member-filter="${key}">${label}<em>${count}</em></button>`; } function memberStatus(v){return ({active:'활동',left:'퇴사',suspended:'중지',invited:'초대'})[v]||v;}

// ============================================================
// ASSETS
// ============================================================
function renderAssets(state){
  const snap=state.assetsSnapshot||{}; const assets=snap.assets||[]; const returns=snap.returns||[];
  const assigned=assets.filter(a=>a.membership_id).length; const unassigned=assets.filter(a=>!a.membership_id).length;
  return `<div class="ops-mgmt-page ops-mgmt-page--assets ${state.assetTab==='returns'?'is-returns':'is-assets'}">${pageHeader('ASSETS','자산 관리','','')}${summary([['전체 자산',`${assets.length}개`,'',''],['사용 중',`${assigned}개`,'','is-positive'],['미배정',`${unassigned}개`,'','is-warning'],['반납 기록',`${returns.length}건`,'','']])}<div class="ops-mgmt-tabs-row"><div class="ops-dense-tabs"><button class="${state.assetTab==='assets'?'is-active':''}" data-asset-tab="assets">자산 현황</button><button class="${state.assetTab==='returns'?'is-active':''}" data-asset-tab="returns">반납 내역</button></div><button class="ops-action-primary" data-action="open-asset">${icon('plus')}<span>자산 추가</span></button></div>${state.assetTab==='returns'?renderReturns(state):renderAssetBoard(state)}</div>`;
}
function renderAssetBoard(state){
  let rows=(state.assetsSnapshot?.assets||[]).slice();
  const q=(state.assetQuery||'').toLowerCase();
  if(state.assetCategory)rows=rows.filter(a=>a.asset_category===state.assetCategory);
  if(state.assetStatus)rows=rows.filter(a=>(a.membership_id?'사용중':'미배정')===state.assetStatus);
  if(q)rows=rows.filter(a=>`${a.asset_name||''} ${a.owner_name||''} ${a.asset_category||''} ${a.acquisition_method||''} ${a.note||''}`.toLowerCase().includes(q));
  const cats=[...new Set((state.assetsSnapshot?.assets||[]).map(a=>a.asset_category).filter(Boolean))];
  const paged=pageRows(rows,state.assetPage,OPS_PAGE_SIZE.assets);
  const body=paged.rows.length?paged.rows.map(a=>`<article class="ops-lane-row ops-lane-row--asset"><div class="ops-lane-cell ops-lane-copy" data-label="보유자"><strong>${esc(a.owner_name||'미배정')}</strong></div><div class="ops-lane-cell ops-lane-copy" data-label="자산"><strong>${esc(a.asset_name)}</strong></div><div class="ops-lane-cell" data-label="취득 방식"><span class="ops-lane-value ${a.acquisition_method?'':'is-muted'}">${esc(a.acquisition_method||'미설정')}</span></div><div class="ops-lane-cell" data-label="분류"><span class="ops-lane-value">${esc(a.asset_category||'기타')}</span></div><div class="ops-lane-cell" data-label="메모"><span class="ops-lane-value ${a.note?'':'is-muted'}" title="${esc(a.note||'메모 없음')}">${esc(a.note||'—')}</span></div><div class="ops-lane-cell is-center" data-label="상태"><span class="ops-mgmt-badge ${a.membership_id?'is-green':'is-amber'}">${a.membership_id?'사용중':'미배정'}</span></div><div class="ops-lane-cell is-center" data-label="관리"><button class="ops-mgmt-action ${a.membership_id?'':'is-assign'}" data-action="edit-asset" data-asset-id="${esc(a.id)}">${a.membership_id?'상세':'배정'}</button></div></article>`).join(''):empty('조건에 맞는 자산이 없습니다.');
  const assetFiltered=Boolean(q||state.assetCategory||state.assetStatus);
  return `<section class="ops-mgmt-board"><div class="ops-mgmt-toolbar"><div class="ops-mgmt-filters"><label class="ops-mgmt-search">${icon('search')}<input data-asset-query value="${esc(state.assetQuery||'')}" placeholder="자산 검색"></label><select class="ops-mgmt-select" data-asset-category><option value="">분류 전체</option>${cats.map(c=>`<option ${state.assetCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select><select class="ops-mgmt-select" data-asset-status><option value="">상태 전체</option><option ${state.assetStatus==='사용중'?'selected':''}>사용중</option><option ${state.assetStatus==='미배정'?'selected':''}>미배정</option></select></div></div>${assetFiltered?`<div class="ops-mgmt-meta"><span><strong>${rows.length}</strong>개 검색 결과</span></div>`:''}<div class="ops-lane-head ops-lane-head--asset"><span>보유자</span><span>자산</span><span>취득 방식</span><span>분류</span><span>메모</span><span>상태</span><span>관리</span></div><div class="ops-mgmt-list">${body}</div>${renderDataPager('assets',paged,'개')}</section>`;
}
function renderReturns(state){
  const rows=state.assetsSnapshot?.returns||[];
  const paged=pageRows(rows,state.returnPage,OPS_PAGE_SIZE.returns);
  const body=paged.rows.length?paged.rows.map(r=>`<article class="ops-lane-row ops-lane-row--return"><div class="ops-lane-cell ops-lane-copy" data-label="자산"><strong>${esc(r.asset_name)}</strong></div><div class="ops-lane-cell" data-label="이전 보유자"><span class="ops-lane-value">${esc(r.owner_name||'—')}</span></div><div class="ops-lane-cell" data-label="처리"><span class="ops-lane-value">${r.note?'수동 반납':'반납 처리'}</span></div><div class="ops-lane-cell" data-label="메모"><span class="ops-lane-value ${r.note?'':'is-muted'}" title="${esc(r.note||'기록 없음')}">${esc(r.note||'—')}</span></div><div class="ops-lane-cell" data-label="확인자"><span class="ops-lane-value">${esc(r.checker_name||'SYSTEM')}</span></div><div class="ops-lane-cell" data-label="처리일"><span class="ops-lane-value">${esc(r.processed_at||fmtDate(r.created_at,true))}</span></div></article>`).join(''):empty('반납 기록이 없습니다.');
  return `<section class="ops-mgmt-board"><div class="ops-mgmt-board-head"><div><h2>반납 내역</h2></div><span>${rows.length}건</span></div><div class="ops-lane-head ops-lane-head--return"><span>자산</span><span>이전 보유자</span><span>처리</span><span>메모</span><span>확인자</span><span>처리일</span></div><div class="ops-mgmt-list">${body}</div>${renderDataPager('returns',paged,'건')}</section>`;
}
// ============================================================
// ACCOUNTS
// ============================================================
function accountRecords(state){ const snap=state.accountsSnapshot||{}; const reqs=snap.requests||[]; return (snap.accounts||[]).filter(a=>a.member_status==='active').map(a=>{ const pending=reqs.find(r=>r.membership_id===a.membership_id&&r.status==='pending'); return {...a,pending,status:pending?(a.account?'변경 대기':'등록 대기'):a.account&&a.enabled?'승인':'미등록'};}); }
function renderAccounts(state){
  const records=accountRecords(state); const approved=records.filter(r=>r.status==='승인').length; const pending=records.filter(r=>['변경 대기','등록 대기'].includes(r.status)); const missing=records.filter(r=>r.status==='미등록').length;
  let rows=records.slice(); if(state.accountStatus)rows=rows.filter(r=>r.status===state.accountStatus);
  const q=(state.accountQuery||'').toLowerCase(); if(q)rows=rows.filter(r=>`${r.display_name} ${ROLE_KO[r.role]||r.role||''} ${r.account||''}`.toLowerCase().includes(q));
  const my=currentMembership(state); const myRow=records.find(r=>r.membership_id===my?.id);
  const paged=pageRows(rows,state.accountPage,OPS_PAGE_SIZE.accounts);
  const rowAction=r=>{
    if(r.pending)return `<button class="ops-mgmt-action is-review" data-action="account-review" data-request-id="${esc(r.pending.id)}" data-review-action="approve">검수</button>`;
    if(r.membership_id===my?.id)return `<button class="ops-mgmt-action" data-action="open-account-row" data-membership-id="${esc(r.membership_id)}">수정</button>`;
    return `<button class="ops-mgmt-action" data-action="open-account-row" data-membership-id="${esc(r.membership_id)}">상세</button>`;
  };
  const body=paged.rows.length?paged.rows.map(r=>`<article class="ops-lane-row ops-lane-row--account ${r.pending?'is-attention':''}"><div class="ops-lane-cell ops-lane-copy" data-label="이름"><strong>${esc(r.display_name)}</strong></div><div class="ops-lane-cell" data-label="역할"><span class="ops-lane-value">${esc(ROLE_KO[r.role]||r.role||'—')}</span></div><div class="ops-lane-cell" data-label="계좌번호"><span class="ops-lane-value ${r.account?'':'is-muted'}">${r.account?esc(r.account):'등록된 계좌 없음'}</span></div><div class="ops-lane-cell is-center" data-label="상태">${accountBadge(r.status)}</div><div class="ops-lane-cell is-center" data-label="관리">${rowAction(r)}</div></article>`).join(''):empty('조건에 맞는 계좌가 없습니다.');
  const pendingPreview=pending.slice(0,4);
  const pendingMore=Math.max(0,pending.length-pendingPreview.length);
  return `<div class="ops-mgmt-page ops-mgmt-page--accounts">${pageHeader('ACCOUNTS','계좌 관리','','')}${summary([['전체 대상',`${records.length}명`,'',''],['등록 완료',`${approved}명`,'','is-positive'],['검수 필요',`${pending.length}건`,'','is-warning'],['미등록',`${missing}명`,'','is-negative']])}<div class="ops-mgmt-workspace"><div class="ops-mgmt-section-head"><div><strong>계좌 현황</strong></div><button class="ops-action-secondary" data-action="open-account-request">${icon('accounts')}<span>${myRow?.account?'내 계좌 변경':'내 계좌 등록'}</span></button></div>${pending.length?`<section class="ops-account-review"><div class="ops-account-review-head"><div><strong>검수 필요</strong></div><em>${pending.length}</em></div>${pendingPreview.map(r=>`<article><div><strong>${esc(r.display_name)}</strong><span>${esc(r.pending?.account||'계좌 미입력')}</span></div><span class="ops-mgmt-badge is-amber">${esc(r.status)}</span><div class="ops-account-review-actions"><button data-action="account-review" data-request-id="${esc(r.pending.id)}" data-review-action="reject">반려</button><button class="is-primary" data-action="account-review" data-request-id="${esc(r.pending.id)}" data-review-action="approve">승인</button></div></article>`).join('')}${pendingMore?`<div class="ops-account-review-more">외 ${pendingMore}건 · 아래 상태 필터에서 모두 확인할 수 있습니다.</div>`:''}</section>`:''}<section class="ops-mgmt-board"><div class="ops-mgmt-toolbar"><div class="ops-mgmt-filters"><label class="ops-mgmt-search">${icon('search')}<input data-account-query value="${esc(state.accountQuery||'')}" placeholder="멤버 · 계좌 검색"></label><select class="ops-mgmt-select" data-account-status><option value="">상태 전체</option>${['승인','등록 대기','변경 대기','미등록'].map(v=>`<option ${state.accountStatus===v?'selected':''}>${v}</option>`).join('')}</select></div></div>${(q||state.accountStatus)?`<div class="ops-mgmt-meta"><span><strong>${rows.length}</strong>명 검색 결과</span></div>`:''}<div class="ops-lane-head ops-lane-head--account"><span>이름</span><span>역할</span><span>계좌번호</span><span>상태</span><span>관리</span></div><div class="ops-mgmt-list">${body}</div>${renderDataPager('accounts',paged,'명')}</section></div></div>`;
}
function accountBadge(v){ if(v==='승인')return '<span class="ops-mgmt-badge is-green">승인</span>'; if(v==='미등록')return '<span class="ops-mgmt-badge is-red">미등록</span>'; return `<span class="ops-mgmt-badge is-amber">${esc(v)}</span>`; }

// ============================================================
// PLATFORM OWNER
// ============================================================
function platformStatusLabel(v){return ({trial:'체험',active:'사용중',paused:'정지',expired:'만료',lifetime:'무제한'})[v]||v||'미설정';}
function platformStatusClass(v){return v==='expired'?'is-red':v==='paused'?'is-amber':v==='trial'?'is-amber':'is-green';}
function platformDate(v){return v?fmtDate(v,true):'종료일 미설정';}
const PLATFORM_PLAN_LABEL={trial:'7일 체험',standard:'30일 이용',pro:'90일 이용',internal:'무제한',legacy:'무제한'};
function platformPlanLabel(v){return PLATFORM_PLAN_LABEL[String(v||'standard')]||String(v||'일반');}
// The site-wide HUB board is separate from the legacy company question/suggestion boards.
// Show both in the operator inbox without merging their distinct DB records.
function renderPlatformSiteTickets(state){
  const board=state.hubBoard||{};
  const tickets=Array.isArray(board.tickets)?board.tickets:[];
  const active=tickets.filter(item=>item.status!=='complete');
  const visible=tickets.slice(0,20);
  const statusNames={pending:'답변 대기',checking:'확인 중',complete:'처리 완료'};
  const categoryNames={question:'질문',suggestion:'건의',bug:'오류 신고'};
  const rows=visible.map(item=>`<article class="platform-support-row"><div><span class="axe-question-status">${esc(statusNames[item.status]||'문의')}</span></div><div class="platform-support-copy"><strong>${esc(item.title)}</strong><span>${esc(categoryNames[item.category]||'문의')} · ${esc(item.author_name||'작성자')} · ${esc(fmtDate(item.updated_at||item.created_at,true))}</span></div><button type="button" class="ops-mgmt-action" data-action="platform-open-site-ticket" data-ticket-id="${esc(item.id)}">상세 · 답변</button></article>`).join('');
  return `<section class="platform-support-board platform-site-support" aria-label="LAC HUB 사이트 문의와 건의"><header><div><span>LAC HUB SUPPORT</span><h2>사이트 문의 · 건의</h2></div><div class="platform-support-counts"><b>${active.length} 처리 대기</b><button type="button" class="ops-mgmt-action" data-action="platform-refresh-site-tickets">새로고침</button><button type="button" class="ops-mgmt-action" data-action="platform-open-site-board">게시판 전체 보기 →</button></div></header>${board.error?`<div class="platform-support-error">${esc(board.error)}</div>`:`<div class="platform-support-list">${rows||'<div class="platform-support-empty"><strong>등록된 사이트 문의가 없습니다.</strong><span>사이트 게시판에 새 문의·건의가 접수되면 여기에도 표시됩니다.</span></div>'}</div>${tickets.length>visible.length?`<p>최근 ${visible.length}건을 표시하고 있습니다. 전체 내역은 게시판에서 확인하세요.</p>`:''}`}</section>`;
}

function renderPlatformSupportQueue(state){
  const support=state.platformSupport||{};
  const counts=support.counts||{};
  const items=Array.isArray(support.items)?support.items:[];
  const active=items.filter(item=>item.status!=='complete').slice(0,8);
  if(support.error){
    return `<section class="platform-support-board"><header><div><span>SUPPORT QUEUE</span><h2>기존 회사 질문</h2></div><button class="ops-mgmt-action" data-action="refresh-platform-support">다시 불러오기</button></header><div class="platform-support-error">${esc(support.error)}</div></section>`;
  }
  const rows=active.length?active.map(item=>{const meta=questionStatusMeta(item.status);return `<article class="platform-support-row ${item.unread?'is-unread':''}" data-action="open-question" data-question-id="${esc(item.id)}"><div><span class="axe-question-status ${meta.className}">${meta.label}</span>${item.unread?'<em>NEW</em>':''}</div><div class="platform-support-copy"><strong>${esc(item.title)}</strong><span>${esc(item.company_name||'회사')} · ${esc(item.author_name||'사용자')} · ${esc(fmtDate(item.last_message_at||item.created_at,true))}</span></div><button type="button" class="ops-mgmt-action" data-action="open-question" data-question-id="${esc(item.id)}">답변</button></article>`;}).join(''):`<div class="platform-support-empty"><strong>대기 중인 질문이 없습니다.</strong><span>새 질문이 등록되면 이곳에 표시됩니다.</span></div>`;
  return `<section class="platform-support-board"><header><div><span>SUPPORT QUEUE</span><h2>기존 회사 질문</h2></div><div class="platform-support-counts"><b>${Number(counts.pending||0)} 대기</b><b>${Number(counts.checking||0)} 확인중</b>${Number(counts.unread||0)?`<em>${Number(counts.unread||0)} NEW</em>`:''}</div></header><div class="platform-support-list">${rows}</div></section>`;
}

function renderPlatformSuggestionQueue(state){
  const support=state.platformSuggestions||{};
  const counts=support.counts||{};
  const items=Array.isArray(support.items)?support.items:[];
  const active=items.filter(item=>item.status!=='complete').slice(0,8);
  if(support.error){
    return `<section class="platform-support-board platform-suggestion-board"><header><div><span>PRIVATE FEEDBACK</span><h2>기존 회사 건의 · 제보</h2></div><button class="ops-mgmt-action" data-action="refresh-platform-suggestions">다시 불러오기</button></header><div class="platform-support-error">${esc(support.error)}</div></section>`;
  }
  const rows=active.length?active.map(item=>{const meta=questionStatusMeta(item.status);const cat=suggestionCategoryMeta(item.category);return `<article class="platform-support-row ${item.unread?'is-unread':''}" data-action="open-suggestion" data-suggestion-id="${esc(item.id)}"><div><span class="suggestion-category ${cat.className}">${cat.label}</span><span class="axe-question-status ${meta.className}">${meta.label}</span>${item.unread?'<em>NEW</em>':''}</div><div class="platform-support-copy"><strong>${esc(item.title)}</strong><span>${esc(item.company_name||'회사')} · ${esc(item.author_name||'사용자')} · ${esc(fmtDate(item.last_message_at||item.created_at,true))}</span></div><button type="button" class="ops-mgmt-action" data-action="open-suggestion" data-suggestion-id="${esc(item.id)}">답변</button></article>`;}).join(''):`<div class="platform-support-empty"><strong>대기 중인 건의가 없습니다.</strong><span>새 건의나 제보가 등록되면 이곳에 표시됩니다.</span></div>`;
  return `<section class="platform-support-board platform-suggestion-board"><header><div><span>PRIVATE FEEDBACK</span><h2>기존 회사 건의 · 제보</h2></div><div class="platform-support-counts"><b>${Number(counts.pending||0)} 대기</b><b>${Number(counts.checking||0)} 확인중</b>${Number(counts.unread||0)?`<em>${Number(counts.unread||0)} NEW</em>`:''}</div></header><div class="platform-support-list">${rows}</div></section>`;
}

function renderPlatformUnifiedInbox(state){
  const siteTickets=Array.isArray(state.hubBoard?.tickets)?state.hubBoard.tickets:[];
  const legacyQuestions=Array.isArray(state.platformSupport?.items)?state.platformSupport.items:[];
  const legacySuggestions=Array.isArray(state.platformSuggestions?.items)?state.platformSuggestions.items:[];
  const buildReports=Array.isArray(state.platformBuildReports?.items)?state.platformBuildReports.items:[];
  const contentNames={company:'회사 관리',game_info:'게임 정보',build:'개조서 세팅',cook:'요리 계산기',hub:'LAC HUB'};
  const categoryNames={question:'질문',suggestion:'건의',bug:'오류 신고'};
  const statusNames={pending:'대기',checking:'확인 중',complete:'완료',approved:'승인',rejected:'반려'};
  const normalized=[];
  for(const item of siteTickets){
    const isContent=String(item.content_key||'hub')!=='hub';
    normalized.push({kind:'site',group:isContent?'content':'site',id:item.id,title:item.title||'문의',source:contentNames[item.content_key]||'LAC HUB',type:categoryNames[item.category]||'문의',status:item.status||'pending',author:item.author_name||'작성자',at:item.updated_at||item.created_at||'',open:item.status!=='complete',action:'platform-open-site-ticket',actionKey:'ticket-id'});
  }
  for(const item of buildReports){
    normalized.push({kind:'build',group:'content',id:item.id,title:item.name||'개조서 제보',source:'개조서 세팅',type:item.report_type==='correction'?'정보 수정':'누락 제보',status:item.status||'pending',author:'BUILD 제보',at:item.created_at||'',open:String(item.status||'pending')==='pending',action:'open-platform-build-report',actionKey:'report-id'});
  }
  for(const item of legacyQuestions){
    normalized.push({kind:'legacy-question',group:'company',id:item.id,title:item.title||'회사 질문',source:'회사 관리',type:'기존 질문',status:item.status||'pending',author:`${item.company_name||'회사'} · ${item.author_name||'사용자'}`,at:item.last_message_at||item.created_at||'',open:item.status!=='complete',unread:item.unread,action:'open-question',actionKey:'question-id'});
  }
  for(const item of legacySuggestions){
    normalized.push({kind:'legacy-suggestion',group:'company',id:item.id,title:item.title||'회사 건의',source:'회사 관리',type:'기존 건의 · 제보',status:item.status||'pending',author:`${item.company_name||'회사'} · ${item.author_name||'사용자'}`,at:item.last_message_at||item.created_at||'',open:item.status!=='complete',unread:item.unread,action:'open-suggestion',actionKey:'suggestion-id'});
  }
  normalized.sort((a,b)=>Number(b.open)-Number(a.open)||String(b.at).localeCompare(String(a.at)));
  const filter=['all','content','site','company'].includes(String(state.platformInboxFilter||''))?String(state.platformInboxFilter):'all';
  const visible=normalized.filter(item=>filter==='all'||item.group===filter);
  const counts={all:normalized.filter(item=>item.open).length,content:normalized.filter(item=>item.group==='content'&&item.open).length,site:normalized.filter(item=>item.group==='site'&&item.open).length,company:normalized.filter(item=>item.group==='company'&&item.open).length};
  const errors=[state.hubBoard?.error,state.platformSupport?.error,state.platformSuggestions?.error,state.platformBuildReports?.error].filter(Boolean);
  const filters=[['all','전체'],['content','콘텐츠 제보'],['site','사이트 문의'],['company','회사 문의']].map(([key,label])=>`<button type="button" class="${filter===key?'is-active':''}" data-action="platform-inbox-filter" data-inbox-filter="${key}"><span>${label}</span><em>${counts[key]}</em></button>`).join('');
  const rows=visible.slice(0,120).map(item=>`<article class="platform-inbox-row ${item.open?'is-open':'is-complete'} ${item.unread?'is-unread':''}"><div class="platform-inbox-source"><span>${esc(item.source)}</span><small>${esc(item.type)}</small></div><div class="platform-inbox-copy"><strong>${esc(item.title)}</strong><span>${esc(item.author)} · ${esc(fmtDate(item.at,true))}</span></div><span class="platform-inbox-status is-${esc(item.status)}">${esc(statusNames[item.status]||item.status||'대기')}</span><button type="button" class="ops-mgmt-action" data-action="${item.action}" data-${item.actionKey}="${esc(item.id)}">${item.kind==='build'?'검수':'열기'}</button></article>`).join('');
  return `<section class="platform-inbox"><div class="platform-inbox__toolbar"><nav class="platform-service-tabs" aria-label="문의 제보 분류">${filters}</nav><button type="button" class="ops-mgmt-action" data-action="refresh-platform-inbox">새로고침</button></div>${errors.length?`<div class="platform-inbox__warning">일부 자료를 불러오지 못했습니다. ${esc(errors[0])}</div>`:''}<div class="platform-inbox__list">${rows||'<div class="platform-support-empty"><strong>표시할 문의 · 제보가 없습니다.</strong><span>새로운 접수 건은 이곳에 한 번에 모입니다.</span></div>'}</div></section>`;
}

// This screen displays stored policy intentions, NOT enforced authorization.
// Do not add new permission toggles here until DB/RPC and server-side access gates exist.
function renderPlatformContentSettings(state) {
  const rows = state.platformContentSettings;
  const note = '<div class="lac-content-warning"><strong>웹 콘텐츠 진입 정책 연동 단계</strong><span>공개·무료 설정은 HUB의 카드와 게임 정보·LAC COOK 진입 화면에 반영됩니다. 실제 회사별 데이터는 기존 멤버/RLS 권한으로 별도 보호됩니다. BUILD 독립 주소와 COOK 정적 파일의 직접 주소 및 개별 콘텐츠 이용권은 아직 서버 차단과 연결되지 않았으므로, 이 화면의 설정만으로 완전한 접근 차단을 보장할 수 없습니다.</span></div>';
  if (state.platformContentError) return `<section class="lac-content-admin">${note}<p class="lac-content-error">${esc(state.platformContentError)}</p><button class="ops-mgmt-action" type="button" data-action="refresh-platform-contents">다시 불러오기</button></section>`;
  if (!Array.isArray(rows)) return `<section class="lac-content-admin">${note}<p>콘텐츠 설정을 불러오는 중입니다.</p></section>`;
  const descriptions = {
    company_management:'멤버 · 계좌 · 공금 · 자산을 관리하는 회사 운영 공간',
    lac_build:'회사 등록 없이 이용하도록 계획한 개조서 조합 서비스',
    lac_cook:'요리 제작 계산 · 작업 저장 기능을 제공하는 서비스',
    game_info:'공통 게임 정보와 운영자 승인 개조서 카탈로그를 한곳에서 열람',
  };
  const items = rows.map(row => `<article class="lac-content-admin-row">
    <div class="lac-content-admin-name"><strong>${esc(row.display_name)}</strong><span class="lac-content-admin-description">${esc(descriptions[row.content_key]||'등록된 콘텐츠의 공개 및 무료 운영 설정')}</span><small>설정 키: ${esc(row.content_key)} · 메인 진입 정책 연결</small></div>
    <div class="lac-content-admin-actions"><label><span>공개 설정 <small>HUB 카드 표시 및 진입 정책</small></span><button type="button" class="lac-content-toggle ${row.is_published?'is-on':'is-off'}" data-action="toggle-platform-content" data-content-key="${esc(row.content_key)}" data-field="is_published" aria-label="${esc(row.display_name)} 공개 설정 ${row.is_published?'켜짐':'꺼짐'}" aria-pressed="${row.is_published?'true':'false'}">${row.is_published?'켜짐':'꺼짐'}</button></label>
    <label><span>무료 설정 <small>회사 미등록 로그인 사용자의 이용 기준</small></span><button type="button" class="lac-content-toggle ${row.is_free?'is-on':'is-off'}" data-action="toggle-platform-content" data-content-key="${esc(row.content_key)}" data-field="is_free" aria-label="${esc(row.display_name)} 무료 설정 ${row.is_free?'켜짐':'꺼짐'}" aria-pressed="${row.is_free?'true':'false'}">${row.is_free?'켜짐':'꺼짐'}</button></label></div>
  </article>`).join('');
  // The menu may contain more content than the current legacy policy RPC returns.
  // Show missing entries explicitly instead of pretending they are configurable.
  const knownKeys = new Set(rows.map(row => String(row.content_key)));
  const unlinked = [
    {keys:['game_info'],name:'게임 정보',detail:'현재 회사별 정보 권한 유지 · 콘텐츠 공개 정책 연결 전'},
  ].filter(item => !item.keys.some(key => knownKeys.has(key)));
  const awaiting = unlinked.length ? `<section class="lac-content-admin-unlinked"><h3>정책 연결 대기 중인 웹 콘텐츠</h3>${unlinked.map(item => `<article class="lac-content-admin-row lac-content-admin-row--pending"><div class="lac-content-admin-name"><strong>${esc(item.name)}</strong><span class="lac-content-admin-description">${esc(item.detail)}</span></div><span class="lac-content-admin-phase">설정 준비 중</span></article>`).join('')}</section>` : '';
  const bot = `<section class="lac-content-admin-unlinked"><h3>회사별 Discord BOT 기능</h3><p>공금 · 총알 · 무법지대 · 개조서 · 핀볼 · 요리 주문 · 계좌조회 · AI 질문(BETA)은 회사 설정에서 각각 관리합니다. AI 질문의 실제 활성화 및 콘텐츠별 이용 권한은 별도 연동 작업이 필요합니다.</p></section>`;
  return `<section class="lac-content-admin">${note}<header><div><h2>콘텐츠 운영</h2><p class="lac-content-admin-intro">웹 콘텐츠 진입 조건을 관리합니다. 회사 통합 이용권은 회사 관리 → 관리에서 부여·회수합니다. COOK 정적 파일 직접 주소의 서버 차단은 별도 작업이 필요합니다.</p></div><button class="ops-mgmt-action" type="button" data-action="refresh-platform-contents">설정 새로고침</button></header><div class="lac-content-admin-list">${items||'<p>등록된 콘텐츠가 없습니다.</p>'}</div>${awaiting}${bot}</section>`;
}

function renderPlatformPassRequests(state){
  const rows=state.adminPassRequests||[];
  const count=rows.filter(row=>row.status==='pending').length;
  const roleName=value=>value==='representative'?'대표':value==='admin'?'관리자 · 간부':value==='member'?'팀원':'미입력';
  const statusName=value=>value==='pending'?'⏳ 승인 대기':value==='approved'?'✓ 승인 완료':value==='rejected'?'반려 완료':value==='canceled'?'신청 취소':'처리 완료';
  if(state.adminPassRequestsError)return `<section class="lac-pass-admin"><h2>회사 이용 신청</h2><p role="alert">${esc(state.adminPassRequestsError)}</p><button type="button" data-action="refresh-pass-requests">다시 시도</button></section>`;
  const cards=rows.map(row=>`<article class="lac-pass-admin__row lac-pass-admin__row--detail">
    <div class="lac-pass-admin__summary"><strong>${esc(row.company_name)}</strong><span>신청자: ${esc(row.requester_name)} · ${esc(fmtDate(row.requested_at))}</span><small>${esc(statusName(row.status))}</small></div>
    <div class="lac-pass-admin__verification"><span><small>회사 역할</small><strong>${esc(roleName(row.requester_role))}</strong></span><span><small>인게임 닉네임</small><strong>${esc(row.ingame_nickname||'미입력')}</strong></span><span><small>대표 닉네임</small><strong>${esc(row.representative_ingame_nickname||'대표 본인')}</strong></span><span><small>인게임 전화</small><strong>${esc(row.ingame_phone||'미입력')}</strong></span><span><small>인증 가능 시간</small><strong>${esc(row.available_time||'별도 협의')}</strong></span></div>
    ${row.applicant_note?`<p class="lac-pass-admin__note">${esc(row.applicant_note)}</p>`:''}
    ${row.application_blocked?`<p class="lac-pass-admin__block-note">신규 신청 제한 중${row.application_block_reason?` · ${esc(row.application_block_reason)}`:''}</p>`:''}
    <div class="lac-pass-admin__actions"><button type="button" data-action="admin-edit-pass-application" data-request-id="${esc(row.id)}">인증정보 수정</button><button type="button" class="${row.application_blocked?'':'is-danger'}" data-action="toggle-pass-application-block" data-company-id="${esc(row.company_id)}">${row.application_blocked?'신청 제한 해제':'신청 제한'}</button>${row.status==='pending'?`<button type="button" data-action="approve-pass-request" data-request-id="${esc(row.id)}">✓ 승인 및 발급</button><button type="button" class="is-danger" data-action="reject-pass-request" data-request-id="${esc(row.id)}">반려</button>`:''}</div>
  </article>`).join('');
  return `<section class="lac-pass-admin"><header><div><span>COMPANY BETA ACCESS</span><h2>회사 이용 신청 <em>${count}건 대기</em></h2><p>회사 단위 베타 이용 신청을 확인합니다. 신청 정보는 승인 후에도 운영자가 정정할 수 있으며, 이용 기간은 승인 시점부터 시작됩니다.</p></div><button type="button" data-action="refresh-pass-requests">새로고침</button></header><div class="lac-pass-admin__list">${cards||'<p class="lac-pass-admin__empty">접수된 회사 이용 신청이 없습니다.</p>'}</div></section>`;
}

function renderPlatform(state){
  const all=state.platformSnapshot||[];
  const q=String(state.platformQuery||'').trim().toLowerCase();
  const filter=String(state.platformStatus||'all');
  const requestedView=String(state.platformView||'');
  const view=requestedView==='suggestions'?'support':['overview','companies','pass-requests','modbooks','support','contents'].includes(requestedView)?requestedView:'companies';
  let rows=all.filter(r=>filter==='all'||String(r.effective_status||r.subscription_status)===filter);
  if(q)rows=rows.filter(r=>`${r.company_name||''} ${r.owner_name||''} ${r.guild_name||''} ${r.plan||''} ${platformPlanLabel(r.plan)}`.toLowerCase().includes(q));
  const active=all.filter(r=>!['expired','paused'].includes(String(r.effective_status||r.subscription_status))).length;
  const questionOpen=Number(state.platformSupport?.counts?.pending||0)+Number(state.platformSupport?.counts?.checking||0);
  const suggestionOpen=Number(state.platformSuggestions?.counts?.pending||0)+Number(state.platformSuggestions?.counts?.checking||0);
  const siteOpen=(state.hubBoard?.tickets||[]).filter(item=>item.status!=='complete').length;
  const buildReportOpen=(state.platformBuildReports?.items||[]).filter(item=>String(item.status||'pending')==='pending').length;
  const inboxOpen=questionOpen+suggestionOpen+siteOpen+buildReportOpen;
  const paged=pageRows(rows,state.platformPage,OPS_PAGE_SIZE.platform);
  const body=paged.rows.length?paged.rows.map(r=>{
    const period=companySubscriptionPeriod(r, value => fmtDate(value, true));
    return `<article class="platform-company-row"><div class="platform-company-copy"><strong>${esc(r.company_name||'회사')}</strong></div><div class="platform-company-value ${r.guild_name?'':'is-muted'}">${esc(r.guild_name||'미연결')}</div><div class="platform-company-value is-center">${Number(r.member_count||0)}명</div><div class="is-center"><span class="ops-mgmt-badge ${platformStatusClass(r.effective_status||r.subscription_status)}">${esc(platformStatusLabel(r.effective_status||r.subscription_status))}</span></div><div class="platform-company-value is-plan">${esc(platformPlanLabel(r.plan))}</div><div class="platform-company-value is-period">${esc(period)}</div><div class="platform-company-value">${esc(r.owner_name||'미확인')}</div><div class="is-center"><button class="ops-mgmt-action" data-action="edit-platform-subscription" data-company-id="${esc(r.company_id)}">관리</button></div></article>`;
  }).join(''):empty('조건에 맞는 회사가 없습니다.');
  const platformFiltered=Boolean(q||filter!=='all');
  const companyBoard=`<section class="platform-board"><div class="ops-mgmt-toolbar"><div class="ops-mgmt-filters"><label class="ops-mgmt-search">${icon('search')}<input data-platform-query value="${esc(state.platformQuery||'')}" placeholder="회사 · OWNER · Discord 검색"></label><select class="ops-mgmt-select" data-platform-status><option value="all" ${filter==='all'?'selected':''}>상태 전체</option><option value="trial" ${filter==='trial'?'selected':''}>체험</option><option value="active" ${filter==='active'?'selected':''}>사용중</option><option value="paused" ${filter==='paused'?'selected':''}>정지</option><option value="expired" ${filter==='expired'?'selected':''}>만료</option></select></div></div>${platformFiltered?`<div class="ops-mgmt-meta platform-company-meta"><span><strong>${rows.length}</strong>개 검색 결과</span></div>`:''}<div class="platform-company-head"><span>회사</span><span>Discord</span><span>멤버</span><span>상태</span><span>플랜</span><span>이용 종료</span><span>OWNER</span><span>관리</span></div><div class="platform-company-list">${body}</div>${renderDataPager('platform',paged,'개')}</section>`;
  const content=view==='support'?renderPlatformUnifiedInbox(state):view==='contents'?renderPlatformContentSettings(state):view==='pass-requests'?renderPlatformPassRequests(state):view==='modbooks'?renderPlatformModbookReview(state):companyBoard;
  const overview=`<section class="platform-overview" aria-label="운영 대시보드">
    ${summary([['전체 회사',`${all.length}개`,'',''],['이용 가능',`${active}개`,'','is-positive'],['처리 필요',`${inboxOpen}건`,'','is-warning'],['콘텐츠 제보',`${buildReportOpen+(state.hubBoard?.tickets||[]).filter(item=>item.status!=='complete'&&String(item.content_key||'hub')!=='hub').length}건`,'','is-warning']])}
    <div class="platform-overview__columns">
      <section class="platform-overview__section"><div class="platform-overview__section-heading"><span>QUICK ACTION</span><h2>바로 관리</h2><p>필요한 운영 화면으로 바로 이동합니다.</p></div>
        <div class="platform-overview__actions">
          <button type="button" data-action="platform-view" data-platform-view="companies">${icon('platform')}<span><strong>이용권 관리</strong><small>회사 구독 확인 · 연장 · 상태 관리</small></span><b aria-hidden="true">→</b></button>
          <button type="button" data-action="platform-view" data-platform-view="modbooks">${icon('info')}<span><strong>개조서 검수</strong><small>승인 대기 ${Array.isArray(state.gameAdmin?.requests)?state.gameAdmin.requests.length:0}건 · 원본 사진 확인</small></span><b aria-hidden="true">→</b></button>
          <button type="button" data-action="platform-view" data-platform-view="contents">${icon('assets')}<span><strong>콘텐츠 관리</strong><small>공개 및 무료 개방 정책 조회</small></span><b aria-hidden="true">→</b></button>
          <button type="button" data-action="platform-view" data-platform-view="support">${icon('feedback')}<span><strong>문의 · 제보</strong><small>사이트 · 콘텐츠 · 회사 문의 ${inboxOpen}건 처리 필요</small></span><b aria-hidden="true">→</b></button>
        </div>
      </section>
      <section class="platform-overview__section"><div class="platform-overview__section-heading"><span>SUBSCRIPTION</span><h2>회사 이용권 현황</h2><p>기존 회사 구독 데이터를 조회합니다.</p></div>
        <div class="platform-overview__status"><span>이용 가능 회사</span><strong>${active}<small> / ${all.length}개</small></strong></div>
        <p class="platform-overview__hint">회사별 통합 이용권은 회사 관리 화면에서 별도로 부여·회수할 수 있습니다. 기존 구독 일시정지·만료 설정은 유지됩니다.</p>
        <button type="button" class="platform-overview__more" data-action="platform-view" data-platform-view="companies">회사별 이용권 확인 <span aria-hidden="true">→</span></button>
      </section>
    </div>
  </section>`;
  const heading=view==='overview'?'운영 대시보드':view==='companies'?'이용권 관리':view==='pass-requests'?'이용권 신청':view==='modbooks'?'개조서 검수':view==='contents'?'콘텐츠 관리':'문의 · 제보 관리';
  const description=view==='overview'?'현재 운영 상태를 확인하고 필요한 작업으로 바로 이동하세요.':view==='companies'?'회사별 구독 관리와 기존 이용권 조회를 한곳에서 처리합니다.':view==='pass-requests'?'회사별 신청을 확인하고 이용권을 발급합니다.':view==='modbooks'?'Discord에서 접수된 개조서 신청을 원본 사진과 비교해 검수하고 공통 정보로 승인합니다.':view==='contents'?'콘텐츠 공개와 무료 개방 설정을 확인합니다.':'사이트 문의부터 콘텐츠 제보와 기존 회사 문의까지 한곳에서 확인하고 처리합니다.';
  const actions=view==='overview'||view==='companies'?`<button class="ops-action-secondary" data-action="open-create-company">+ 회사 생성</button><button class="ops-action-secondary" data-action="refresh-platform">${icon('refresh')}<span>새로고침</span></button>`:'';
  return `<div class="platform-page platform-page--${view}">${pageHeader('PLATFORM OWNER',heading,description,actions)}${view==='overview'?overview:`<div class="platform-service-view">${content}</div>`}</div>`;
}
// ============================================================
// SETTINGS
// ============================================================
const MODULE_ORDER = ['fund','ammo','outlaw','modbook','pinball','cooking','assets'];
const MODULE_UI = {
  fund:{name:'공금',desc:'납부 현황 · 검수 · 공금 관리',channels:[['status_channel_id','공금 현황 채널']]},
  ammo:{name:'총알',desc:'3시 · 10시 주문 / 제작 / 배분',channels:[['three_channel_id','3시 채널'],['ten_channel_id','10시 채널']]},
  outlaw:{name:'무법지대 전적',desc:'스크린샷 OCR · 랭킹 · 기록',channels:[['record_channel_id','전적 등록 채널']]},
  modbook:{name:'개조서',desc:'이름 조회 · 최근 거래가 갱신 · 등록 신청 · 검수',channels:[['channel_id','개조서 채널']]},
  pinball:{name:'핀볼 모집',desc:'개조서 · 일반 아이템 참여 모집 · 핀볼 명단 생성',channels:[['channel_id','핀볼 모집 채널']]},
  cooking:{name:'요리 주문',desc:'주문 · 변경 · 영업 관리',channels:[['order_channel_id','요리 주문 채널']]},
  assets:{name:'자산 · 계좌 관리',desc:'회사 자산 · 반납 · 멤버 계좌 관리',channels:[['account_lookup_channel_id','계좌조회 채널']]},
};
function settingsSaveLabel(state,resetBusy,catalogPending=false){
  if(resetBusy)return '정리 중';
  if(catalogPending&&state.settingsTab==='basic')return '정보 불러오는 중';
  const phase=String(state.onboardingStatus?.status||''); const step=String(state.onboardingStatus?.current_step||'');
  if(phase==='onboarding'&&state.settingsTab==='basic'&&step==='roles')return '저장하고 다음';
  if(phase==='onboarding'&&state.settingsTab==='modules'&&step==='modules')return '설정 완료';
  return '설정 저장';
}
function renderSettings(state){
  const visibleModules=(state.modules||[]).filter(m=>MODULE_UI[m.module_key]).sort((a,b)=>MODULE_ORDER.indexOf(a.module_key)-MODULE_ORDER.indexOf(b.module_key));
  const enabled=visibleModules.filter(m=>m.enabled).length; const channels=(state.discordChannels||[]).filter(c=>c.is_text_based); const roles=(state.discordRoles||[]).filter(r=>!r.managed&&r.role_name!=='@everyone');
  const resetBusy=['reset_requested','resetting'].includes(String(state.onboardingStatus?.status||'')); const catalogPending=state.discordConnection?.status==='connected'&&state.onboardingStatus?.catalog_ready===false;
  const saveLabel=settingsSaveLabel(state,resetBusy,catalogPending); const cookingAvailable=Boolean(moduleRow(state,'cooking')); const cookingTab=state.settingsTab==='cooking'&&cookingAvailable;
  const tabs=`<nav class="ops-settings-tabs ${cookingAvailable?'has-cooking':''}" aria-label="회사 설정 하위 메뉴"><button class="${state.settingsTab==='basic'?'is-active':''}" data-settings-tab="basic"><strong>기본 정보</strong></button><button class="${state.settingsTab==='modules'?'is-active':''}" data-settings-tab="modules" ${catalogPending?'disabled':''}><strong>기능 설정</strong></button>${cookingAvailable?`<button class="${cookingTab?'is-active':''}" data-settings-tab="cooking"><strong>요리 메뉴</strong></button>`:''}</nav>`;
  const action=cookingTab?'':`<button class="ops-settings-save-action" form="settings-active-form" type="submit" ${resetBusy||(catalogPending&&state.settingsTab==='basic')?'disabled':''}>${icon('save')}<span>${esc(saveLabel)}</span></button>`;
  const view=cookingTab?renderCookingMenuSettings(state):state.settingsTab==='modules'?renderModuleSettings(state,channels):renderBasicSettings(state,roles,catalogPending);
  const guideProgress=state.companySettings?.settings?.guided_setup; const guideLabel=guideProgress&&!guideProgress.completed?'설정 이어하기':state.onboardingStatus?.status==='ready'?'초기설정 가이드':'설정 이어하기'; const previewAction=currentMembership(state)?.role==='owner'?`<button type="button" class="ops-setup-demo-launch" data-action="open-setup-guide"><span>GUIDED SETUP</span><strong>${guideLabel}</strong></button>`:''; return `<div class="ops-settings-page">${pageHeader('COMPANY SETTINGS','회사 설정','',previewAction)}<section class="ops-settings-overview"><article><span>현재 회사</span><strong>${esc(companyDisplayName(state))}</strong></article><article><span>Discord</span><strong class="${state.discordConnection?.status==='connected'?'is-positive':''}">${resetBusy?'정리 중':state.discordConnection?.status==='connected'?'연결됨':'미연결'}</strong></article><article><span>사용 기능</span><strong class="is-warning">${enabled} / ${visibleModules.length}</strong></article><article><span>관리 역할</span><strong>${esc(roleName(state.discordCompanyConfig?.admin_role_id,roles)||'미설정')}</strong></article></section>${renderOnboardingProgress(state)}<div class="ops-settings-nav-row">${tabs}${action}</div><div class="ops-settings-view">${view}</div></div>`;
}

// Match the company-notice fallback already used by the existing cooking bot.
// This is display-only: saved company data changes only when an admin selects '안내 저장'.
const COOKING_PANEL_GUIDE_DEFAULT = '주문하기 버튼을 누른 뒤 메뉴를 선택하고 선택 완료를 눌러 수량을 입력해주세요.';
function cookingPanelGuideForEditor(value){
  const saved=String(value||'').trim();
  const normalized=saved.replace(/`/g,'').replace(/\s+/g,' ').trim();
  const legacy=normalized.includes('바질/부추') && normalized.includes('바질티/군만두') && normalized.includes('SET당 200원');
  return (!saved || legacy)?COOKING_PANEL_GUIDE_DEFAULT:saved;
}
function renderCookingMenuSettings(state){
  const admin=canAdmin(state); const cfg=state.cookingDiscordConfig||{}; const all=(state.cookingOrderTypes||[]).slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)); const active=all.filter(row=>row.enabled!==false).length;
  const guide=`<form data-form="cooking-guide" class="ops-cooking-guide-card"><div class="ops-cooking-guide-head"><div><strong>Discord 주문 안내</strong></div><button class="ops-compact-save" type="submit" ${!admin?'disabled':''}>${icon('save')}<span>안내 저장</span></button></div><div class="ops-cooking-guide-grid"><label><span>운영 일정</span><input name="schedule_text" maxlength="120" value="${esc(cfg.schedule_text||'')}" placeholder="예: 화·목·토 20:00" ${!admin?'disabled':''}></label><label><span>회사 안내 · Discord 주문 패널에 표시</span><input name="extra_guide" maxlength="240" value="${esc(cookingPanelGuideForEditor(cfg.extra_guide))}" placeholder="${esc(COOKING_PANEL_GUIDE_DEFAULT)}" ${!admin?'disabled':''}></label></div></form>`;
  const status=state.cookingStatus||'all'; const query=String(state.cookingQuery||'').trim().toLowerCase();
  let rows=all.filter(row=>status==='all'||(status==='enabled'?row.enabled!==false:row.enabled===false));
  if(query)rows=rows.filter(row=>`${row.label||''} ${row.short_label||''} ${row.detail||''} ${row.type_key||''}`.toLowerCase().includes(query));
  const paged=pageRows(rows,state.cookingPage,OPS_PAGE_SIZE.cooking);
  const menuRows=paged.rows.length?paged.rows.map(row=>{
    const detail=String(row.detail||'').trim();
    const showDetail=detail && !['설명','상세 설명'].includes(detail);
    return `<article class="ops-cooking-menu-row ${row.enabled===false?'is-disabled':''}"><div class="ops-cooking-menu-cell ops-cooking-menu-name" data-label="메뉴"><strong>${esc(row.label||row.type_key)}</strong></div><div class="ops-cooking-menu-cell ops-cooking-menu-detail ${showDetail?'':'is-muted'}" data-label="설명" title="${showDetail?esc(detail):'설명 없음'}">${showDetail?esc(detail):'—'}</div><div class="ops-cooking-menu-cell ops-cooking-menu-price" data-label="가격 / SET"><strong>${money(Number(row.price_per_set||0))}</strong></div><div class="ops-cooking-menu-cell ops-cooking-menu-order" data-label="순서">${Number(row.sort_order||0)}</div><div class="ops-cooking-menu-cell is-center" data-label="상태"><button type="button" class="runtime-power ${row.enabled===false?'is-off':'is-on'}" data-action="toggle-cooking-menu" data-type-key="${esc(row.type_key)}" ${!admin?'disabled':''}>${icon('power')}<span>${row.enabled===false?'OFF':'ON'}</span></button></div><div class="ops-cooking-menu-cell is-center" data-label="관리"><button type="button" class="ops-mgmt-action" data-action="edit-cooking-menu" data-type-key="${esc(row.type_key)}" ${!admin?'disabled':''}>수정</button></div></article>`;
  }).join(''):`<div class="ops-cooking-menu-empty"><strong>조건에 맞는 요리 메뉴가 없습니다.</strong><span>${all.length?'검색어나 상태 필터를 바꿔보세요.':admin?'오른쪽 메뉴 추가 버튼으로 첫 주문 품목을 등록해 주세요.':'회사 관리자가 메뉴를 등록하면 여기에 표시됩니다.'}</span></div>`;
  const cookingFiltered=Boolean(query||status!=='all');
  return `<div class="ops-cooking-settings">${guide}<section class="ops-settings-board ops-cooking-menu-board"><div class="ops-settings-board-head ops-cooking-menu-head"><div><h2>요리 주문 메뉴</h2></div><div class="ops-cooking-menu-tools"><span class="ops-cooking-menu-count">사용 <strong>${active}</strong> · 전체 ${all.length}</span><button type="button" class="ops-cooking-add" data-action="open-cooking-menu" ${!admin?'disabled':''}>${icon('plus')}<span>메뉴 추가</span></button></div></div><div class="ops-cooking-filterbar"><label class="ops-mgmt-search">${icon('search')}<input data-cooking-query value="${esc(state.cookingQuery||'')}" placeholder="메뉴 검색" autocomplete="off"></label><select class="ops-mgmt-select" data-cooking-status><option value="all" ${status==='all'?'selected':''}>전체 메뉴</option><option value="enabled" ${status==='enabled'?'selected':''}>사용 중</option><option value="disabled" ${status==='disabled'?'selected':''}>숨김</option></select>${cookingFiltered?`<span>${rows.length}개 검색 결과</span>`:''}</div><div class="ops-cooking-menu-columns"><span>메뉴</span><span>설명</span><span>가격 / SET</span><span>순서</span><span>상태</span><span>관리</span></div><div class="ops-cooking-menu-list">${menuRows}</div>${renderDataPager('cooking',paged,'개')}</section></div>`;
}
function renderOnboardingProgress(state){
  const status=state.onboardingStatus||{}; const current=String(status.current_step||'discord'); const phase=String(status.status||'onboarding');
  if(phase==='error')return `<section class="ops-onboarding-strip is-error"><div><strong>Discord 연결 정리에 실패했습니다.</strong><span>${esc(status.last_error||'잠시 후 다시 시도해 주세요.')}</span></div></section>`;
  if(['reset_requested','resetting'].includes(phase))return `<section class="ops-onboarding-strip is-resetting"><div class="ops-onboarding-spinner"></div><div><strong>기존 Discord 연결을 안전하게 정리 중입니다.</strong><span>패널과 Discord 설정만 정리하며 공금·멤버·자산·주문·전적 데이터는 보존됩니다.</span></div></section>`;
  const catalogPending=status.discord_connected===true&&status.catalog_ready===false;
  const catalogStrip=catalogPending?`<section class="ops-onboarding-strip is-catalog"><div class="ops-onboarding-spinner"></div><div><strong>Discord 역할·채널 정보를 불러오는 중입니다.</strong><span>연결은 완료됐습니다. 목록 동기화가 끝나면 역할 선택이 자동으로 활성화됩니다.</span></div></section>`:'';
  const order=['discord','roles','modules','complete']; const activeIndex=Math.max(0,order.indexOf(current)); const labels=[['discord','1','Discord 서버'],['roles','2','역할'],['modules','3','기능 · 채널'],['complete','✓','완료']];
  const guide=phase==='ready'?'현재 회사의 Discord 연결과 필수 설정이 준비됐습니다.':current==='roles'?'역할을 선택한 뒤 기능 설정으로 이동하면 현재 입력값이 자동 저장됩니다.':current==='modules'?'기능과 채널을 설정한 뒤 설정 완료를 누르면 초기 설정이 끝납니다.':'순서대로 설정하면 같은 화면에서 바로 운영을 시작할 수 있습니다.';
  return `${catalogStrip}<section class="ops-onboarding-progress"><div class="ops-onboarding-progress__copy"><strong>${phase==='ready'?'초기 설정 완료':'초기 설정'}</strong><span>${esc(guide)}</span></div><div class="ops-onboarding-steps">${labels.map(([key,no,label],i)=>`<span class="${i<activeIndex||phase==='ready'?'is-done':i===activeIndex?'is-current':''}"><b>${i<activeIndex||phase==='ready'?'✓':no}</b>${label}</span>`).join('')}</div></section>`;
}
function roleName(id,roles){return roles.find(r=>r.role_id===id)?.role_name||'';}
function renderBasicSettings(state,roles,catalogPending=false){ const cfg=state.discordCompanyConfig||{}; const connected=state.discordConnection?.status==='connected'; const resetBusy=['reset_requested','resetting'].includes(String(state.onboardingStatus?.status||'')); const discordAction=resetBusy?'':connected?'open-discord-reconnect':'connect-discord'; const discordLabel=resetBusy?'정리 중':connected?'다시 설정':'연결'; const roleDisabled=resetBusy||!connected||catalogPending; const emptyRoleLabel=catalogPending?'Discord 정보 불러오는 중...':'선택 안 함'; return `<form id="settings-active-form" data-form="settings-basic" class="ops-settings-board ops-settings-basic"><div class="ops-settings-board-head"><div><h2>기본 정보</h2></div></div>${settingRow('회사 이름','',`<input name="company_name" maxlength="80" value="${esc(companyDisplayName(state))}" ${resetBusy?'disabled':''}>`,'company')}${settingRow('관리자 역할','',`<select name="admin_role_id" ${roleDisabled?'disabled':''}><option value="">${emptyRoleLabel}</option>${roles.map(r=>`<option value="${esc(r.role_id)}" ${cfg.admin_role_id===r.role_id?'selected':''}>${esc(r.role_name)}</option>`).join('')}</select>`,'role')}${settingRow('일반 멤버 역할','',`<select name="member_role_id" ${roleDisabled?'disabled':''}><option value="">${emptyRoleLabel}</option>${roles.map(r=>`<option value="${esc(r.role_id)}" ${cfg.member_role_id===r.role_id?'selected':''}>${esc(r.role_name)}</option>`).join('')}</select>`,'role')}${settingRow('Discord 서버',connected?'':'BOT 연결 시 기본 운영 권한을 한 번에 승인합니다.',`<div class="ops-settings-discord ${connected?'is-connected':'is-disconnected'} ${resetBusy?'is-busy':''}"><i></i><strong>${esc(state.discordConnection?.guild_name||'미연결')}</strong><button type="button" ${discordAction?`data-action="${discordAction}"`: 'disabled'}>${discordLabel}</button></div>`,'discord')}</form>`; }
function settingRow(title,desc,control,kind){return `<div class="ops-settings-row ops-settings-row--${kind}"><div><strong>${title}</strong>${desc?`<span>${esc(desc)}</span>`:''}</div><div class="ops-settings-control">${control}</div></div>`;}
function renderModuleSettings(state,channels){
  const visible=(state.modules||[]).filter(m=>MODULE_UI[m.module_key]).sort((a,b)=>MODULE_ORDER.indexOf(a.module_key)-MODULE_ORDER.indexOf(b.module_key));
  const resetBusy=['reset_requested','resetting'].includes(String(state.onboardingStatus?.status||''));
  const cfg=state.discordCompanyConfig||{};
  const guildId=String(state.discordConnection?.guild_id||'');
  const companyChannels=channels.filter(c=>String(c.guild_id)===guildId);
  const usedChannels=new Set(visible.filter(m=>m.enabled).flatMap(m=>Object.entries(m.settings||{})
    .filter(([key])=>key.endsWith('channel_id')).map(([,value])=>String(value||''))));
  const aiChoices=companyChannels.filter(c=>!usedChannels.has(String(c.channel_id)) || String(c.channel_id)===String(cfg.ai_channel_id||''));
  const aiChannelControl=`<div class="ops-settings-channels"><label><span>AI 전용 채널</span><select name="ai_channel_id" ${resetBusy?'disabled':''}><option value="">사용 안 함</option>${aiChoices.map(c=>`<option value="${esc(c.channel_id)}" ${String(cfg.ai_channel_id||'')===String(c.channel_id)?'selected':''}>#${esc(c.channel_name)}</option>`).join('')}</select></label></div>`;
  const aiRow=`<article class="ops-settings-module ops-settings-module--channels-1 ops-settings-ai-row ${resetBusy?'is-disabled':''}"><div class="ops-settings-module-copy"><strong>AI 질문</strong><small>자유 질문 · 정보 검색 · 비교 및 계산 (답변 기능 연결 예정)</small></div>${aiChannelControl}<span class="ops-settings-ai-status">준비 중</span></article>`;
  return `<form id="settings-active-form" data-form="settings-modules" class="ops-settings-board ops-settings-modules"><div class="ops-settings-board-head"><div><h2>기능 설정</h2></div><span><strong>${visible.filter(m=>m.enabled).length}</strong> / ${visible.length} 사용 중</span></div><div class="ops-settings-module-list runtime-module-list">${visible.map(m=>renderModuleRow(m,channels,resetBusy)).join('')}${aiRow}</div></form>`;
}
function renderModuleRow(m,channels,disabled=false){ const ui=MODULE_UI[m.module_key]; const settings=m.settings||{}; const controls=ui.channels.length?`<div class="ops-settings-channels">${ui.channels.map(([key,label])=>`<label><span>${label}</span><select name="module_${m.module_key}_${key}" ${disabled?'disabled':''}><option value="">채널 선택</option>${channels.map(c=>`<option value="${esc(c.channel_id)}" ${settings[key]===c.channel_id?'selected':''}>#${esc(c.channel_name)}</option>`).join('')}</select></label>`).join('')}</div>`:'<div class="ops-settings-no-channel">별도 채널 설정 없음</div>'; return `<article class="ops-settings-module ops-settings-module--channels-${ui.channels.length} ${m.enabled?'is-enabled':''} ${disabled?'is-disabled':''}"><div class="ops-settings-module-copy"><strong>${esc(ui.name)}</strong><small>${esc(ui.desc)}</small></div>${controls}<button type="button" class="runtime-power ${m.enabled?'is-on':'is-off'}" data-action="toggle-module" data-module-key="${esc(m.module_key)}" ${disabled?'disabled':''}>${icon('power')}<span>${m.enabled?'ON':'OFF'}</span></button></article>`; }

function testCenterDashboardPreview(state){
  const tc=state.testCenter||{};
  const name=tc.fakeCompanyName||'LAC TEST';
  return `<div class="test-center-dashboard">
    <div class="test-center-dashboard__top"><span>COMPANY MANAGEMENT</span><strong>${esc(name)} 운영 대시보드</strong><small>초기 설정을 완료한 뒤 도착하는 화면을 미리 보여드립니다.</small></div>
    <div class="test-center-dashboard__kpis"><span><small>활동 멤버</small><b>8명</b></span><span><small>공용계좌 잔액</small><b>125,400원</b></span><span><small>회사 자산</small><b>6개</b></span><span><small>Discord</small><b>연결됨</b></span></div>
    <div class="test-center-dashboard__grid"><article><span>NOW</span><strong>지금 확인할 것</strong><p>처리 대기 항목이 없습니다.</p></article><article><span>QUICK ACTION</span><strong>빠른 실행</strong><p>공금 등록 · 멤버 관리 · 자산 추가 · 계좌 관리</p></article><article><span>ACTIVITY</span><strong>최근 활동</strong><p>${esc(name)}의 운영 기록이 이곳에 쌓입니다.</p></article><article><span>OPERATIONS</span><strong>운영 연결 상태</strong><p>Discord 연결됨 · 사용 기능 정상</p></article></div>
  </div>`;
}

function testCenterCompanyForm(state){
  const tc=state.testCenter||{};
  const name=tc.fakeCompanyName||'LAC TEST';
  const representative=tc.fakeRepresentativeName||'테스트 대표';
  return `<div class="test-center-company-form"><div class="test-center-company-form__head"><span>NEW COMPANY</span><h3>새 회사 만들기</h3><p>회사 기본 정보만 먼저 등록합니다. 이 단계에서는 BOT 설치나 Discord 권한 요청이 없습니다.</p></div><form data-form="test-center-company" class="runtime-modal-form"><label class="is-full">회사 이름<input name="name" maxlength="80" value="${esc(name)}" autocomplete="off" required></label><label class="is-full">대표명<input name="representative_name" maxlength="120" value="${esc(representative)}" autocomplete="off" required></label><div class="runtime-modal-hint is-full">회사 생성 코드 없이 등록하는 새 흐름입니다. 실제 데이터는 생성되지 않습니다.</div><footer><button type="button" class="runtime-btn-ghost" data-action="test-center-company-back">취소</button><button class="runtime-btn-primary" type="submit">회사 만들기</button></footer></form></div>`;
}

function testCenterPassApplicationForm(state){
  const tc=state.testCenter||{};
  const app=tc.passApplication||{};
  const editing=Boolean(tc.passEditMode&&tc.passStatus==='pending');
  const role=String(app.requesterRole||'representative');
  return `<div class="test-center-pass-application"><div class="test-center-pass-application__head"><span>UNIFIED PASS APPLICATION</span><h3>${editing?'이용권 신청 수정':'회사 이용권 신청'}</h3><p>이용권 발급 전 LAC 운영자가 개인 Discord DM과 인게임 만남을 통해 회사와 신청자를 확인합니다.</p></div><div class="test-center-pass-identity"><div><span>회사</span><strong>${esc(tc.fakeCompanyName||'LAC TEST')}</strong></div><div><span>등록 대표명</span><strong>${esc(tc.fakeRepresentativeName||'테스트 대표')}</strong></div><div><span>신청 번호</span><strong>${esc(app.applicationId||'PASS-TEST-0001')}</strong></div></div><form data-form="test-center-pass-application" class="runtime-modal-form test-center-pass-form"><section class="test-center-pass-section"><header class="test-center-pass-section__head"><div><span>01</span><strong>신청자 · 인게임 정보</strong></div><p>인게임에서 신청자와 회사 관계를 확인하는 데 필요한 정보입니다.</p></header><div class="test-center-pass-grid"><label><span class="test-center-pass-label">회사에서의 역할</span><select name="requester_role" required><option value="representative" ${role==='representative'?'selected':''}>대표</option><option value="admin" ${role==='admin'?'selected':''}>관리자 · 간부</option><option value="member" ${role==='member'?'selected':''}>팀원</option></select><small>대표가 아닌 경우 인게임 인증에서 대표 권한을 함께 확인합니다.</small></label><label><span class="test-center-pass-label">인게임 닉네임 <b>필수</b></span><input name="ingame_nickname" maxlength="80" value="${esc(app.ingameNickname||'')}" placeholder="운영자가 인게임에서 확인할 닉네임" required><small>직접 만남과 신청자 확인에 사용합니다.</small></label><label><span class="test-center-pass-label">대표자 인게임 닉네임</span><input name="representative_ingame_nickname" maxlength="80" value="${esc(app.representativeIngameNickname||'')}" placeholder="대표가 아닌 경우 입력"><small>대표 본인은 비워두셔도 됩니다. 관리자·간부·팀원 신청이면 필수입니다.</small></label><label><span class="test-center-pass-label">인게임 전화번호 <em>선택</em></span><input name="ingame_phone" maxlength="40" value="${esc(app.ingamePhone||'')}" placeholder="게임 내 연락 가능한 번호"><small>실제 휴대전화 번호가 아니라 게임 안의 전화번호만 입력합니다.</small></label></div></section><section class="test-center-pass-section"><header class="test-center-pass-section__head"><div><span>02</span><strong>인증 연락 정보</strong></div><p>운영자가 DM 또는 인게임에서 연락할 때 참고합니다.</p></header><div class="test-center-pass-grid test-center-pass-grid--single"><label><span class="test-center-pass-label">인증 가능한 시간 <em>선택</em></span><input name="available_time" maxlength="120" value="${esc(app.availableTime||'')}" placeholder="예: 오늘 21시 이후 / 평일 20~24시"></label><label><span class="test-center-pass-label">운영자에게 전달할 내용 <em>선택</em></span><textarea name="note" maxlength="1000" rows="4" placeholder="대표 대신 신청합니다, 접속 가능한 시간 등 필요한 내용을 적어주세요.">${esc(app.note||'')}</textarea></label></div></section><label class="test-center-pass-consent"><input type="checkbox" name="consent" required><span><strong>인증 절차 확인</strong>이용권 발급 전 LAC 운영자와의 개인 Discord DM 및 인게임 인증이 진행되는 것을 확인했습니다.</span></label><div class="runtime-modal-hint test-center-pass-hint">신청 후 운영자가 인증하기 전까지는 내용을 수정하거나 신청을 취소할 수 있습니다. 승인 후에는 변경할 수 없습니다.</div><footer class="test-center-pass-footer"><button type="button" class="runtime-btn-ghost" data-action="test-center-pass-back">돌아가기</button><button class="runtime-btn-primary" type="submit">${editing?'수정사항 저장':'이용권 신청'}</button></footer></form></div>`;
}

function testCenterJourney(tc){
  let current=0;
  if(tc.companyCreated)current=1;
  if(tc.screen==='pass-form'||tc.passStatus==='pending')current=2;
  if(tc.passStatus==='active')current=tc.setupComplete?4:3;
  const steps=[['회사 생성','회사명 · 대표명'],['콘텐츠 확인','메뉴 미리보기'],['이용권','신청 · 승인'],['초기 설정','회사 관리'],['사용 시작','정상 이용']];
  return `<div class="test-center-flowbar" aria-label="신규 회사 체험 진행 단계">${steps.map(([title,desc],i)=>`<div class="test-center-flowbar__step ${i<current?'is-done':i===current?'is-current':''}"><span>${i<current?'✓':i+1}</span><div><strong>${title}</strong><small>${desc}</small></div></div>${i<steps.length-1?`<i class="${i<current?'is-done':''}"></i>`:''}`).join('')}</div>`;
}

function testCenterHubPreview(state){
  const tc=state.testCenter||{};
  const created=Boolean(tc.companyCreated);
  const passLabel=tc.passStatus==='active'?'이용 가능':tc.passStatus==='pending'?'승인 대기':'이용권 필요';
  const companyLine=created?`<span class="test-center-company-chip"><i></i>${esc(tc.fakeCompanyName||'LAC TEST')} · 대표 ${esc(tc.fakeRepresentativeName||'테스트 대표')}</span>`:'<button type="button" class="test-center-create-shortcut" data-action="test-center-open-new-company">+ 회사 생성</button>';
  return `<div class="test-center-hub-sim">
    <div class="test-center-sim-topbar"><strong>LAC HUB</strong>${companyLine}</div>
    <section class="test-center-hub-hero"><span>COMPANY WORKSPACE</span><h2>${created?`${esc(tc.fakeCompanyName||'LAC TEST')}의 HUB입니다.`:'먼저 회사를 가볍게 만들어보세요.'}</h2><p>${created?'회사 생성만 완료된 상태입니다. 아래 콘텐츠를 직접 열어 이용권 전·후의 흐름을 확인해 보세요.':'회사명과 대표명만 입력하며, 이용권 승인 전에는 Discord 설치나 초기 설정을 요구하지 않습니다.'}</p>${created?'':`<button type="button" data-action="test-center-open-new-company">회사 만들기 체험</button>`}</section>
    <div class="test-center-content-title"><span>LAC 콘텐츠</span><i></i></div>
    <div class="test-center-content-grid">
      <article><div class="test-center-card-art is-info"><span>DATA</span></div><div><em>자유 이용</em><strong>게임 정보</strong><small>제작법 · 퀘스트 · 스킬 · 개조서 정보</small></div></article>
      <article><div class="test-center-card-art is-build"><span>BUILD</span></div><div><em>자유 이용</em><strong>개조서 세팅</strong><small>개조서 조합과 세팅을 미리 확인</small></div></article>
      <button type="button" class="test-center-content-card" data-action="test-center-open-content" data-content-key="company"><div class="test-center-card-art is-company"><span>OPS</span></div><div><em>${esc(passLabel)}</em><strong>회사 관리</strong><small>공금 · 멤버 · 자산 · Discord 운영</small><b>→</b></div></button>
      <button type="button" class="test-center-content-card" data-action="test-center-open-content" data-content-key="cook"><div class="test-center-card-art is-cook"><span>COOK</span></div><div><em>${esc(passLabel)}</em><strong>요리 계산기</strong><small>재료와 수량을 계산하는 편의 도구</small><b>→</b></div></button>
    </div>
  </div>`;
}

function testCenterPassGate(tc,contentKey){
  const title=contentKey==='cook'?'요리 계산기':'회사 관리';
  const app=tc.passApplication||{};
  const roleLabel=app.requesterRole==='admin'?'관리자 · 간부':app.requesterRole==='member'?'팀원':'대표';
  if(tc.passStatus==='none')return `<div class="test-center-gate-card"><span>UNIFIED PASS</span><h3>${esc(title)} 이용권이 필요합니다.</h3><p>메뉴와 화면 구성은 미리 볼 수 있지만 실제 기능과 세부 데이터는 이용권 승인 후 사용할 수 있습니다.</p>${tc.passCancelled?'<div class="test-center-pass-cancelled">이전 신청을 취소했습니다. 내용을 확인한 뒤 언제든 다시 신청할 수 있습니다.</div>':''}<button type="button" data-action="test-center-request-pass">${tc.passCancelled?'다시 신청':'이용권 신청'}</button></div>`;
  if(tc.passStatus==='pending')return `<div class="test-center-gate-card is-pending"><span>IN-GAME VERIFICATION</span><h3>인게임 인증 대기 중입니다.</h3><p>신청은 접수되었습니다. 운영자가 개인 Discord DM으로 연락한 뒤 인게임에서 회사와 신청자를 확인합니다.</p><div class="test-center-pending-state"><i></i><strong>운영자 인증 대기</strong><small>${esc(app.applicationId||'PASS-TEST-0001')}</small></div><div class="test-center-pass-summary"><span><small>신청 역할</small><strong>${esc(roleLabel)}</strong></span><span><small>인게임 닉네임</small><strong>${esc(app.ingameNickname||'-')}</strong></span><span><small>인게임 전화</small><strong>${esc(app.ingamePhone||'미입력')}</strong></span><span><small>인증 가능 시간</small><strong>${esc(app.availableTime||'별도 협의')}</strong></span></div><div class="test-center-pass-user-actions"><button type="button" data-action="test-center-edit-pass">신청 수정</button><button type="button" class="is-danger" data-action="test-center-cancel-pass">신청 취소</button></div><div class="test-center-sim-control"><span>TEST CONTROL · 실제 이용자에게는 보이지 않음</span><button type="button" data-action="test-center-approve-pass">인게임 인증 완료 · 승인 발생</button></div></div>`;
  return '';
}

function testCenterCompanyContent(state){
  const tc=state.testCenter||{};
  if(tc.passStatus==='active'&&tc.setupComplete)return testCenterDashboardPreview(state);
  const gate=tc.passStatus==='active'
    ? `<div class="test-center-gate-card is-ready"><span>PASS ACTIVE</span><h3>이용권 승인이 완료되었습니다.</h3><p>회사 관리는 Discord 연결과 역할·기능·채널 설정이 필요합니다. 지금부터 설치 프로그램처럼 한 단계씩 진행합니다.</p><button type="button" data-action="test-center-start-setup">초기 설정 시작 →</button></div>`
    : testCenterPassGate(tc,'company');
  return `<div class="test-center-product-sim"><header><button type="button" data-action="test-center-go-hub">← LAC HUB</button><div><span>회사 관리</span><strong>${esc(tc.fakeCompanyName||'LAC TEST')}</strong></div></header><div class="test-center-company-shell"><aside><strong>회사 관리</strong><span class="is-active">대시보드</span><span>공금 관리</span><span>멤버 관리</span><span>자산 · 계좌</span><span>회사 설정</span></aside><main><div class="test-center-preview-skeleton"><section><span>회사 현황</span><div><i></i><i></i><i></i></div></section><section><span>지금 확인할 것</span><div><i></i><i></i></div></section><section><span>최근 활동</span><div><i></i><i></i><i></i></div></section></div>${gate}</main></div></div>`;
}

function testCenterCookContent(state){
  const tc=state.testCenter||{};
  if(tc.passStatus==='active')return `<div class="test-center-product-sim"><header><button type="button" data-action="test-center-go-hub">← LAC HUB</button><div><span>요리 계산기</span><strong>이용권 승인 · 즉시 개방</strong></div></header><div class="test-center-cook-open"><div class="test-center-cook-head"><span>COOK CALCULATOR</span><h3>요리 계산기</h3><p>별도의 초기 설정 없이 바로 사용할 수 있습니다.</p></div><div class="test-center-cook-grid"><label>요리 선택<select><option>멧돼지 스튜</option><option>군만두</option><option>바질티</option></select></label><label>수량<input value="10" readonly></label><article><span>필요 재료</span><strong>멧돼지 고기 20 · 채소 10</strong><small>이용권 승인 후 실제 계산 결과가 표시됩니다.</small></article><article><span>예상 비용</span><strong>12,400원</strong><small>테스트용 예시 값</small></article></div></div></div>`;
  return `<div class="test-center-product-sim"><header><button type="button" data-action="test-center-go-hub">← LAC HUB</button><div><span>요리 계산기</span><strong>${esc(tc.fakeCompanyName||'LAC TEST')}</strong></div></header><div class="test-center-cook-shell"><div class="test-center-cook-preview"><div><span>요리 검색</span><i></i></div><div><span>수량</span><i></i></div><section><span>계산 결과</span><i></i><i></i><i></i></section></div>${testCenterPassGate(tc,'cook')}</div></div>`;
}

function testCenterModal(state){
  if(!state.platformAdmin)return '';
  const tc=state.testCenter||{};
  let body='';
  if(tc.screen==='company-form')body=testCenterCompanyForm(state);
  else if(tc.screen==='pass-form')body=testCenterPassApplicationForm(state);
  else if(tc.screen==='content')body=tc.content==='cook'?testCenterCookContent(state):testCenterCompanyContent(state);
  else body=testCenterHubPreview(state);
  const status=tc.screen==='pass-form'?(tc.passEditMode?'신청 수정':'신청서 작성'):tc.passStatus==='active'?(tc.setupComplete?'사용 준비 완료':'이용권 승인'):tc.passStatus==='pending'?'인증 대기':tc.companyCreated?'회사 생성 완료':'체험 시작';
  return `<div class="test-center-backdrop"><section class="test-center-shell test-center-shell--flow-r3" role="dialog" aria-modal="true" aria-label="신규 회사 온보딩 테스트 센터">
    <header class="test-center-header test-center-header--flow-r3"><div><span>PLATFORM OWNER · FLOW LAB R5</span><h2>신규 회사 온보딩 테스트</h2><p>회사 생성부터 이용권 신청·인게임 인증, 초기 설정까지 실제 이용자 흐름처럼 체험합니다.</p></div><div class="test-center-header__actions"><em>${esc(status)}</em><button type="button" data-action="test-center-exit" aria-label="테스트 센터 닫기">×</button></div></header>
    <div class="test-center-safe test-center-safe--flow-r3"><div><i></i><strong>SAFE SIMULATION</strong><span>회사 · 이용권 · Discord · BOT · 설정 데이터에 아무것도 저장하지 않습니다.</span></div><button type="button" data-action="test-center-reset">처음부터 다시</button></div>
    <div class="test-center-flow-progress">${testCenterJourney(tc)}</div>
    <main class="test-center-flow-stage"><div class="test-center-flow-stage__head"><div><strong>신규 회사 대표 시점</strong><span>아래 화면 안의 버튼을 직접 눌러 다음 단계로 진행하세요.</span></div><em>SIMULATION</em></div><div class="test-center-stage test-center-stage--flow-r3">${body}</div></main>
    <footer class="test-center-footer test-center-footer--flow-r3"><span>이용권 신청은 인증 전까지 수정·취소할 수 있고, 승인 후 회사 관리는 초기 설정 마법사를 진행합니다.</span><button type="button" class="runtime-btn-ghost" data-action="test-center-exit">테스트 종료</button></footer>
  </section></div>`;
}


function passRoleValueForViewer(state){
  const role=currentMembership(state)?.role;
  return role==='owner'?'representative':(['admin','manager'].includes(role)?'admin':'member');
}
function passApplicationFormMarkup(application={},adminMode=false){
  const role=String(application.requester_role||application.requesterRole||'representative');
  const consent=adminMode?'':`<label class="lac-pass-form__consent"><input type="checkbox" name="consent" required ${application.id?'checked':''}><span><strong>인증 절차 확인</strong>이용 승인 전 LAC 운영자와 개인 Discord DM 및 인게임 확인이 진행되는 것을 확인했습니다.</span></label>`;
  return `<section class="lac-pass-form__section"><header><div><span>01</span><strong>신청자 · 인게임 정보</strong></div><p>회사와 신청자를 확인하는 데 필요한 정보입니다.</p></header><div class="lac-pass-form__grid"><label><span>회사에서의 역할</span><select name="requester_role" required><option value="representative" ${role==='representative'?'selected':''}>대표</option><option value="admin" ${role==='admin'?'selected':''}>관리자 · 간부</option><option value="member" ${role==='member'?'selected':''}>팀원</option></select><small>대표가 아닌 경우 대표자 인게임 닉네임도 입력합니다.</small></label><label><span>인게임 닉네임 <b>필수</b></span><input name="ingame_nickname" maxlength="80" value="${esc(application.ingame_nickname||application.ingameNickname||'')}" placeholder="운영자가 인게임에서 확인할 닉네임" required><small>신청자 확인과 인게임 만남에 사용합니다.</small></label><label><span>대표자 인게임 닉네임</span><input name="representative_ingame_nickname" maxlength="80" value="${esc(application.representative_ingame_nickname||application.representativeIngameNickname||'')}" placeholder="대표가 아닌 경우 입력"><small>대표 본인은 비워두셔도 됩니다.</small></label><label><span>인게임 전화번호 <em>선택</em></span><input name="ingame_phone" maxlength="40" value="${esc(application.ingame_phone||application.ingamePhone||'')}" placeholder="게임 내 연락 가능한 번호"><small>실제 휴대전화 번호가 아닌 게임 안의 전화번호입니다.</small></label></div></section><section class="lac-pass-form__section"><header><div><span>02</span><strong>인증 연락 정보</strong></div><p>운영자가 연락할 때 참고하는 선택 정보입니다.</p></header><div class="lac-pass-form__grid lac-pass-form__grid--single"><label><span>인증 가능한 시간 <em>선택</em></span><input name="available_time" maxlength="120" value="${esc(application.available_time||application.availableTime||'')}" placeholder="예: 오늘 21시 이후 / 평일 20~24시"></label><label><span>운영자에게 전달할 내용 <em>선택</em></span><textarea name="note" maxlength="1000" rows="4" placeholder="대표 대신 신청합니다, 접속 가능한 시간 등 필요한 내용을 적어주세요.">${esc(application.applicant_note||application.note||'')}</textarea></label></div></section>${consent}`;
}
function passApplicationModal(state,m){
  const company=currentCompany(state);
  const current=state.companyPassRequest||{};
  const editing=Boolean(m?.editing&&current.status==='pending');
  const owner=(state.memberships||[]).find(row=>row.role==='owner'&&row.status==='active');
  const application=editing?current:{requester_role:passRoleValueForViewer(state)};
  const number=current?.id?`#${String(current.id).slice(0,8).toUpperCase()}`:'신규 신청';
  const title=editing?'회사 이용 신청 수정':'회사 이용 신청';
  const form=`<div class="lac-pass-form"><div class="lac-pass-form__identity"><div><span>회사</span><strong>${esc(company?.name||'회사')}</strong></div><div><span>등록 대표</span><strong>${esc(owner?.alias_name||owner?.display_name||owner?.discord_display_name||'대표')}</strong></div><div><span>신청 번호</span><strong>${esc(number)}</strong></div></div><form data-form="pass-application" class="runtime-modal-form lac-pass-form__body"><input type="hidden" name="request_id" value="${esc(editing?current.id||'':'')}">${passApplicationFormMarkup(application,false)}<div class="runtime-modal-hint lac-pass-form__hint">신청 대기 중에는 신청자 본인이 내용을 수정하거나 취소할 수 있습니다. 취소 후 6시간, 반려 후 24시간 동안 재신청이 제한됩니다.</div><footer class="lac-pass-form__footer"><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">${editing?'수정사항 저장':'회사 이용 신청'}</button></footer></form></div>`;
  return modalShell(title,'회사 단위 베타 기능 이용을 위한 확인 정보를 입력해 주세요.',form,true);
}
function adminPassApplicationModal(state,m){
  const row=(state.adminPassRequests||[]).find(item=>String(item.id)===String(m?.requestId||''));
  if(!row)return '';
  const form=`<div class="lac-pass-form lac-pass-form--admin"><div class="lac-pass-form__identity"><div><span>회사</span><strong>${esc(row.company_name||'회사')}</strong></div><div><span>신청자</span><strong>${esc(row.requester_name||'사용자')}</strong></div><div><span>현재 상태</span><strong>${esc(row.status||'-')}</strong></div></div><form data-form="admin-pass-application" class="runtime-modal-form lac-pass-form__body"><input type="hidden" name="request_id" value="${esc(row.id)}">${passApplicationFormMarkup(row,true)}<div class="runtime-modal-hint lac-pass-form__hint">운영자는 승인 이후에도 인증 정보를 정정할 수 있습니다. 이용 상태와 이용 기간은 이 수정으로 변경되지 않습니다.</div><footer class="lac-pass-form__footer"><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">인증정보 저장</button></footer></form></div>`;
  return modalShell('인증정보 수정','오타·닉네임 변경 등 신청 기록의 인증 정보를 정정합니다.',form,true);
}

function renderModal(state){ const m=state.modal; if(!m)return ''; if(m.type==='pass-application')return passApplicationModal(state,m); if(m.type==='admin-pass-application')return adminPassApplicationModal(state,m); if(m.type==='platform-build-report')return platformBuildReportModal(state,m); if(m.type==='test-center')return testCenterModal(state); if(m.type==='setup-guide')return setupGuideLive(state); if(m.type==='setup-demo')return setupGuidePreview(state); if(m.type==='support-question-create')return supportQuestionCreateModal(state); if(m.type==='support-question')return supportQuestionModal(state,m); if(m.type==='suggestion-create')return suggestionCreateModal(state); if(m.type==='suggestion-thread')return suggestionThreadModal(state,m); if(m.type==='ledger')return ledgerModal(state,m); if(m.type==='ledger-correction')return ledgerCorrectionModal(state,m); if(m.type==='ledger-evidence')return ledgerEvidenceModal(state,m); if(m.type==='platform-subscription')return platformSubscriptionModal(state,m); if(m.type==='company-delete')return companyDeleteModal(state,m); if(m.type==='member-register')return memberRegisterModal(state); if(m.type==='member')return memberModal(state,m); if(m.type==='asset')return assetModal(state,m); if(m.type==='account')return accountModal(state); if(m.type==='account-detail')return accountDetailModal(state,m); if(m.type==='create-company')return companyModal(state); if(m.type==='discord-reconnect')return discordReconnectModal(state); if(m.type==='cooking-menu')return cookingMenuModal(state,m); return ''; }
function modalShell(title,desc,body,wide=false){return `<div class="runtime-modal-backdrop" data-modal-backdrop><section class="runtime-modal ${wide?'is-wide':''}" role="dialog" aria-modal="true"><header><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><button type="button" data-action="close-modal">×</button></header>${body}</section></div>`;}

function supportText(value){return esc(value||'').replaceAll('\n','<br>');}
function supportAttachmentPendingHtml(state){
  const pending=state.questionPendingFiles||[];
  return pending.length?pending.map(item=>`<figure><img src="${esc(item.previewUrl||'')}" alt="질문 첨부 미리보기"><figcaption><span>${esc(item.file?.name||'붙여넣은 이미지')}</span><button type="button" data-action="remove-question-pending" data-pending-id="${esc(item.id)}">제거</button></figcaption></figure>`).join(''):'<span class="support-attachment-empty">아직 첨부한 사진이 없습니다.</span>';
}
function supportAttachmentPicker(state){
  const count=(state.questionPendingFiles||[]).length;
  return `<div class="support-attachment-picker is-full"><div class="support-attachment-head"><div><strong>사진 첨부</strong><span>JPG · PNG · WEBP · 최대 5장 · 장당 10MB</span></div><label class="support-attachment-upload">${icon('upload')}<span>파일 선택</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-support-attachment-input></label></div><div class="support-attachment-drop" data-support-attachment-drop tabindex="0"><strong>캡처한 이미지는 Ctrl+V로 바로 붙여넣을 수 있습니다.</strong><span>이미지를 이 영역에 끌어놓아도 됩니다.</span></div><div class="support-attachment-meta"><span>첨부 미리보기</span><b data-support-pending-count>${count}/5</b></div><div class="support-attachment-preview" data-support-pending-list>${supportAttachmentPendingHtml(state)}</div></div>`;
}
function supportAttachmentGallery(items){
  const rows=(Array.isArray(items)?items:[]).filter(item=>item?.signed_url);
  if(!rows.length)return '';
  return `<div class="support-thread-attachments">${rows.map(item=>`<button type="button" data-action="open-support-image" data-image-url="${esc(item.signed_url)}" data-image-name="${esc(item.file_name||'첨부 사진')}" aria-label="${esc(item.file_name||'첨부 사진')} 크게 보기"><img src="${esc(item.signed_url)}" alt="${esc(item.file_name||'첨부 사진')}"><span>${esc(item.file_name||'첨부 사진')}</span></button>`).join('')}</div>`;
}
function renderSupportImageViewer(state){
  const viewer=state.supportImageViewer;
  if(!viewer?.url)return '';
  return `<div class="support-image-lightbox" data-support-image-backdrop><section class="support-image-lightbox__panel" role="dialog" aria-modal="true" aria-label="첨부 사진 크게 보기"><header><div><strong>첨부 사진</strong><span>${esc(viewer.name||'첨부 사진')}</span></div><button type="button" data-action="close-support-image" aria-label="사진 닫기">×</button></header><div class="support-image-lightbox__stage"><img src="${esc(viewer.url)}" alt="${esc(viewer.name||'첨부 사진')}"></div><footer><span>바깥 영역을 클릭하거나 ESC를 눌러도 닫을 수 있습니다.</span><button type="button" class="runtime-btn-ghost" data-action="close-support-image">닫기</button></footer></section></div>`;
}
function supportQuestionCreateModal(state){return modalShell('질문 작성','사용 중 막히는 내용만 간단히 남겨주세요. 운영자가 확인 후 답변합니다.',`<form data-form="support-question-create" class="runtime-modal-form support-question-form"><label class="is-full">제목<input name="title" maxlength="120" placeholder="예: 공금 납부 취소는 어떻게 하나요?" required></label><label class="is-full">질문 내용<textarea name="body" maxlength="4000" rows="8" placeholder="현재 상황과 궁금한 점을 적어주세요." required></textarea></label>${supportAttachmentPicker(state)}<div class="runtime-modal-hint is-full">질문은 LAC HUB 안에 저장됩니다. 답변이 등록되면 사이트에 새 답변 표시가 뜨고, Discord 계정이 연결되어 있으면 DM 알림도 시도합니다.</div><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">질문 등록</button></footer></form>`,true);}
function supportQuestionModal(state,m){
  const q=m.question||{}; const meta=questionStatusMeta(q.status); const platform=Boolean(state.platformAdmin);
  const messages=Array.isArray(q.messages)?q.messages:[];
  const thread=[`<article class="support-thread-message is-customer"><header><strong>${esc(q.author_name||'사용자')}</strong><span>${esc(fmtDate(q.created_at))}</span></header><div>${supportText(q.body)}</div>${supportAttachmentGallery(q.attachments)}</article>`,...messages.map(msg=>`<article class="support-thread-message ${msg.author_type==='platform'?'is-platform':'is-customer'}"><header><strong>${esc(msg.author_name|| (msg.author_type==='platform'?'LAC HUB 운영자':'사용자'))}</strong><span>${esc(fmtDate(msg.created_at))}</span></header><div>${supportText(msg.body)}</div>${supportAttachmentGallery(msg.attachments)}</article>`)].join('');
  const statusActions=platform?`<div class="support-question-status-actions"><button type="button" data-action="question-status" data-question-id="${esc(q.id)}" data-status="pending" ${q.status==='pending'?'disabled':''}>답변대기</button><button type="button" data-action="question-status" data-question-id="${esc(q.id)}" data-status="checking" ${q.status==='checking'?'disabled':''}>확인중</button></div>`:'';
  const replyLabel=platform?'답변 등록 · 완료 처리':'추가 질문 보내기';
  const note=platform?'답변은 LAC HUB 운영자만 등록할 수 있습니다. 등록하면 자동으로 답변완료가 되고 작성자에게 Discord DM 알림을 시도합니다.':'작성자는 자신의 질문에만 추가 질문을 남길 수 있습니다. 추가 질문을 보내면 상태가 다시 답변대기로 변경됩니다.';
  const canAnswer=platform&&q.viewer_can_answer!==false;
  const canFollowUp=!platform&&(q.viewer_can_follow_up===true||(q.viewer_can_follow_up==null&&q.viewer_can_reply!==false));
  const canReply=canAnswer||canFollowUp;
  const deleteButton=q.viewer_can_delete?`<button type="button" class="runtime-btn-danger" data-action="delete-question" data-question-id="${esc(q.id)}">질문 삭제</button>`:'<span></span>';
  const replyArea=canReply?`<form data-form="support-question-reply" class="runtime-modal-form support-question-reply"><input type="hidden" name="question_id" value="${esc(q.id)}"><label class="is-full"><span>${platform?'답변':'추가 질문'}</span><textarea name="body" maxlength="4000" rows="6" placeholder="${platform?'답변 내용을 입력하세요.':'추가로 궁금한 내용을 입력하세요.'}" required></textarea></label>${supportAttachmentPicker(state)}<div class="runtime-modal-hint is-full">${esc(note)}</div><footer>${deleteButton}<div><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button><button class="runtime-btn-primary" type="submit">${replyLabel}</button></div></footer></form>`:`<div class="runtime-modal-hint support-question-readonly">다른 멤버가 작성한 질문입니다. 답변은 함께 볼 수 있고, 별도 문의는 새 질문으로 등록해 주세요.</div><footer class="support-question-readonly-footer">${deleteButton}<button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button></footer>`;
  return modalShell(q.title||'질문','질문과 답변을 한 흐름에서 확인합니다.',`<div class="support-question-detail"><div class="support-question-detail-head"><div><span class="axe-question-status ${meta.className}">${meta.label}</span>${q.unread?'<em>NEW</em>':''}</div><div><strong>${esc(q.company_name||companyDisplayName(state))}</strong><span>${esc(q.author_name||'사용자')} · ${esc(fmtDate(q.created_at))}</span></div>${statusActions}</div><div class="support-thread">${thread}</div>${replyArea}</div>`,true);
}

function suggestionAttachmentPendingHtml(state){
  const pending=state.suggestionPendingFiles||[];
  return pending.length?pending.map(item=>`<figure><img src="${esc(item.previewUrl||'')}" alt="건의 첨부 미리보기"><figcaption><span>${esc(item.file?.name||'붙여넣은 이미지')}</span><button type="button" data-action="remove-suggestion-pending" data-pending-id="${esc(item.id)}">제거</button></figcaption></figure>`).join(''):'<span class="support-attachment-empty">아직 첨부한 사진이 없습니다.</span>';
}
function suggestionAttachmentPicker(state){
  const count=(state.suggestionPendingFiles||[]).length;
  return `<div class="support-attachment-picker is-full"><div class="support-attachment-head"><div><strong>사진 첨부</strong><span>JPG · PNG · WEBP · 최대 5장 · 장당 10MB</span></div><label class="support-attachment-upload">${icon('upload')}<span>파일 선택</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-suggestion-attachment-input></label></div><div class="support-attachment-drop" data-suggestion-attachment-drop tabindex="0"><strong>캡처한 이미지는 Ctrl+V로 바로 붙여넣을 수 있습니다.</strong><span>이미지를 이 영역에 끌어놓아도 됩니다.</span></div><div class="support-attachment-meta"><span>첨부 미리보기</span><b data-suggestion-pending-count>${count}/5</b></div><div class="support-attachment-preview" data-suggestion-pending-list>${suggestionAttachmentPendingHtml(state)}</div></div>`;
}
function suggestionCreateModal(state){
  return modalShell('건의 작성','개선 제안이나 오류를 LAC HUB 운영자에게 1:1로 전달합니다.',`<form data-form="suggestion-create" class="runtime-modal-form support-question-form"><label>유형<select name="category" required><option value="improvement">개선 제안</option><option value="bug">오류 제보</option><option value="other">기타</option></select></label><label>제목<input name="title" maxlength="120" placeholder="예: 핀볼 모집 패널 개선 제안" required></label><label class="is-full">내용<textarea name="body" maxlength="4000" rows="8" placeholder="현재 상황과 개선되었으면 하는 점을 적어주세요." required></textarea></label>${suggestionAttachmentPicker(state)}<div class="runtime-modal-hint is-full"><strong>1:1 비공개</strong><br>이 글은 작성자 본인과 LAC HUB 운영자만 볼 수 있습니다. 같은 회사의 대표·관리자·멤버에게도 공개되지 않습니다. 답변 알림은 연결된 Discord 계정으로 자동 시도합니다.</div><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">건의 등록</button></footer></form>`,true);
}
function suggestionThreadModal(state,m){
  const q=m.suggestion||{}; const meta=questionStatusMeta(q.status); const cat=suggestionCategoryMeta(q.category); const platform=Boolean(state.platformAdmin);
  const messages=Array.isArray(q.messages)?q.messages:[];
  const thread=[`<article class="support-thread-message is-customer"><header><strong>${esc(q.author_name||'사용자')}</strong><span>${esc(fmtDate(q.created_at))}</span></header><div>${supportText(q.body)}</div>${supportAttachmentGallery(q.attachments)}</article>`,...messages.map(msg=>`<article class="support-thread-message ${msg.author_type==='platform'?'is-platform':'is-customer'}"><header><strong>${esc(msg.author_name||(msg.author_type==='platform'?'LAC HUB 운영자':'사용자'))}</strong><span>${esc(fmtDate(msg.created_at))}</span></header><div>${supportText(msg.body)}</div>${supportAttachmentGallery(msg.attachments)}</article>`)].join('');
  const statusActions=platform?`<div class="support-question-status-actions"><button type="button" data-action="suggestion-status" data-suggestion-id="${esc(q.id)}" data-status="pending" ${q.status==='pending'?'disabled':''}>답변대기</button><button type="button" data-action="suggestion-status" data-suggestion-id="${esc(q.id)}" data-status="checking" ${q.status==='checking'?'disabled':''}>확인중</button></div>`:'';
  const canAnswer=platform&&q.viewer_can_answer!==false;
  const canFollowUp=!platform&&q.viewer_can_follow_up===true;
  const canReply=canAnswer||canFollowUp;
  const deleteButton=q.viewer_can_delete?`<button type="button" class="runtime-btn-danger" data-action="delete-suggestion" data-suggestion-id="${esc(q.id)}">건의 삭제</button>`:'<span></span>';
  const replyArea=canReply?`<form data-form="suggestion-reply" class="runtime-modal-form support-question-reply"><input type="hidden" name="suggestion_id" value="${esc(q.id)}"><label class="is-full"><span>${platform?'답변':'추가 메시지'}</span><textarea name="body" maxlength="4000" rows="6" placeholder="${platform?'답변 내용을 입력하세요.':'추가로 전달할 내용을 입력하세요.'}" required></textarea></label>${suggestionAttachmentPicker(state)}<div class="runtime-modal-hint is-full">${platform?'답변을 등록하면 자동으로 답변완료 처리되고 작성자에게 사이트 NEW 표시와 Discord DM 알림을 시도합니다.':'추가 메시지를 보내면 상태가 다시 답변대기로 변경됩니다.'}</div><footer>${deleteButton}<div><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button><button class="runtime-btn-primary" type="submit">${platform?'답변 등록 · 완료 처리':'추가 메시지 보내기'}</button></div></footer></form>`:`<footer class="support-question-readonly-footer">${deleteButton}<button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button></footer>`;
  return modalShell(q.title||'건의','작성자와 LAC HUB 운영자만 볼 수 있는 1:1 비공개 스레드입니다.',`<div class="support-question-detail suggestion-thread-detail"><div class="support-question-detail-head"><div><span class="suggestion-category ${cat.className}">${cat.label}</span><span class="axe-question-status ${meta.className}">${meta.label}</span>${q.unread?'<em>NEW</em>':''}</div><div><strong>${esc(q.company_name||companyDisplayName(state))}</strong><span>${esc(q.author_name||'사용자')} · ${esc(fmtDate(q.created_at))}</span></div>${statusActions}</div><div class="support-thread">${thread}</div>${replyArea}</div>`,true);
}

function ledgerEvidencePicker(state,row){
  const existing=(state.fundLedgerAttachments||[]).filter(a=>String(a.entry_id)===String(row.id||''));
  const pending=state.ledgerPendingFiles||[];
  return `<div class="runtime-ledger-evidence is-full"><div class="runtime-ledger-evidence-head"><div><strong>사진 첨부</strong><span>영수증·거래 화면 등 JPG, PNG, WEBP · 최대 5장</span></div><label class="runtime-ledger-upload-button">${icon('upload')}<span>파일 선택</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-ledger-evidence-input></label></div><div class="runtime-ledger-evidence-drop" data-ledger-evidence-drop tabindex="0"><strong>캡처 이미지를 Ctrl+V로 붙여넣을 수 있습니다.</strong><span>파일을 이 영역에 끌어놓아도 됩니다.</span></div>${existing.length?`<div class="runtime-ledger-existing"><span>기존 첨부 ${existing.length}장</span>${existing.map(a=>`<button type="button" data-action="open-ledger-attachment" data-storage-path="${esc(a.storage_path)}">${esc(a.file_name||'첨부 사진')} ↗</button>`).join('')}</div>`:''}${pending.length?`<div class="runtime-ledger-preview-list">${pending.map(item=>`<figure><img src="${esc(item.previewUrl)}" alt="첨부 미리보기"><figcaption><span>${esc(item.file?.name||'붙여넣은 이미지')}</span><button type="button" data-action="remove-ledger-pending" data-pending-id="${esc(item.id)}">제거</button></figcaption></figure>`).join('')}</div>`:''}</div>`;
}
function ledgerModal(state,m){
  const row=(state.fundSnapshot?.ledger||[]).find(r=>r.id===m.entryId)||{}; const direction=row.direction||'수입'; const account=row.account||state.companySettings?.settings?.fund_default_account||'공용계좌'; const actorId=row.id?(row.membership_id||''):(currentMembership(state)?.id||''); const actor=(state.memberships||[]).find(x=>x.id===actorId); const actorName=actor?.display_name||row.member_display_name||userDisplayName(state);
  return modalShell(row.id?'공금 내역 수정':'수입·지출 등록','등록자는 로그인한 관리자 기준으로 자동 기록됩니다.',`<form data-form="ledger" class="runtime-modal-form"><input type="hidden" name="entry_id" value="${esc(row.id||'')}"><input type="hidden" name="membership_id" value="${esc(actorId)}"><label>날짜<input name="ledger_date" type="date" value="${esc(row.ledger_date?dateKey(row.ledger_date):dateKey(new Date()))}" required></label><label>구분<select name="direction"><option ${direction==='수입'?'selected':''}>수입</option><option ${direction==='지출'?'selected':''}>지출</option></select></label><label>항목<input name="category" value="${esc(row.category||'')}" placeholder="예: 재료 구입" autocomplete="off" required></label><label>금액<input name="amount" type="number" min="1" value="${esc(Math.abs(Number(row.amount||0))||'')}" required></label><label>계좌<select name="account"><option ${account==='공용계좌'?'selected':''}>공용계좌</option><option ${account==='회사잔고'?'selected':''}>회사잔고</option></select></label><label>등록자<input value="${esc(actorName)}" readonly class="is-readonly"></label><label class="is-full">메모<textarea name="memo" placeholder="여러 사람이 관련된 내역이라면 여기에 기록해 주세요." autocomplete="off">${esc(row.memo||'')}</textarea></label>${ledgerEvidencePicker(state,row)}<footer>${row.id?`<button type="button" class="runtime-btn-danger" data-action="cancel-ledger" data-entry-id="${esc(row.id)}">내역 취소</button>`:'<span></span>'}<div><button type="button" class="runtime-btn-ghost" data-action="close-modal">${row.id?'닫기':'취소'}</button><button class="runtime-btn-primary" type="submit">${row.id?'수정 내용 저장':'내역 등록'}</button></div></footer></form>`,true);
}
function ledgerEvidenceModal(state,m){
  const row=(state.fundSnapshot?.ledger||[]).find(r=>String(r.id)===String(m.entryId))||{};
  const items=[]; if(row.evidence_path)items.push({storage_path:row.evidence_path,file_name:'납부 증빙'});
  for(const a of (state.fundLedgerAttachments||[]).filter(x=>String(x.entry_id)===String(m.entryId)))items.push(a);
  return modalShell('공금 첨부사진',`${items.length}장의 증빙 사진이 연결되어 있습니다.`,`<div class="runtime-evidence-gallery is-photo-grid">${items.length?items.map((a,i)=>`<button type="button" data-action="open-ledger-attachment" data-storage-path="${esc(a.storage_path)}" aria-label="증빙 사진 ${i+1} 크게 보기"><img src="${esc(m.previewUrls?.[a.storage_path]||'')}" alt="증빙 사진 ${i+1}" loading="lazy"><span>${String(i+1).padStart(2,'0')}</span></button>`).join(''):'<div class="runtime-modal-hint">연결된 사진이 없습니다.</div>'}<div class="runtime-modal-simple-footer"><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button></div></div>`);
}
function platformSubscriptionModal(state,m){
  const row=(state.platformSnapshot||[]).find(r=>String(r.company_id)===String(m.companyId));
  if(!row)return '';
  const status=String(row.subscription_status||'unassigned');
  const plan=String(row.plan||'standard');
  const access=(state.platformCompanyAccess||[]).find(item=>String(item.company_id)===String(row.company_id));
  const accessLoaded=Array.isArray(state.platformCompanyAccess);
  const enabled=access?.enabled===true;
  const endBoundary=row.grace_until||row.ends_at;
  const endsAt=endBoundary?new Date(endBoundary).getTime():null;
  const naturallyEnded=Number.isFinite(endsAt)&&endsAt<=Date.now();
  const canIssue=accessLoaded&&(plan==='unassigned'||status==='expired'||naturallyEnded||(!enabled&&status!=='paused'));
  const canExpire=accessLoaded&&plan!=='unassigned'&&(enabled||status!=='expired');
  const canPause=accessLoaded&&plan!=='unassigned'&&enabled&&['active','trial','lifetime'].includes(status)&&!naturallyEnded;
  const canResume=accessLoaded&&plan!=='unassigned'&&enabled&&status==='paused'&&!naturallyEnded;
  const events=state.platformPassEvents;
  const historyLabels={issue:'새로 발급',expire:'즉시 만료',pause:'일시정지',resume:'사용 재개'};
  const history=Array.isArray(events)?(events.length?events.map(e=>{
    const next=e.next_subscription||{};
    const at=e.performed_at?new Date(e.performed_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'';
    const end=next.ends_at?new Date(next.ends_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'없음';
    return `<li><strong>${esc(historyLabels[e.event_action]||e.event_action)}</strong> · ${esc(at)}<small>처리 후 종료: ${esc(end)}</small></li>`;
  }).join(''):'<li>15차 기능 적용 이후 기록이 없습니다. 이전 기록은 추정하여 생성하지 않습니다.</li>'):'<li>기록을 확인하는 중입니다.</li>';
  return modalShell('회사 통합 이용권 관리',row.company_name||'회사',`
    <div class="lac-subscription-manager lac-pass-lifecycle" data-company-id="${esc(row.company_id)}">
      <section class="lac-subscription-current" aria-label="현재 이용권 상태">
        <div class="lac-subscription-current__top"><span>현재 이용권</span><strong>${esc(companyStatusName(row))}</strong></div>
        <h3>${esc(companyPlanName(plan))}</h3>
        <dl>
          <div><dt>통합 이용권</dt><dd>${accessLoaded?(enabled?'발급됨':'미발급'):'조회 실패 · 변경 불가'}</dd></div>
          <div><dt>현재 구독 상태</dt><dd>${esc(companyStatusName(row))}</dd></div>
          <div><dt>시작 시각</dt><dd>${esc(row.starts_at?new Date(row.starts_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미설정')}</dd></div>
          <div><dt>종료 시각</dt><dd>${esc(row.ends_at?new Date(row.ends_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미설정')}</dd></div>
        </dl>
        <small>만료는 이전 이용권을 종료합니다. 다음 발급은 이전 기간을 이어받지 않고 새 발급 시각부터 계산합니다. 일시정지 중에도 종료 시각은 유지됩니다.</small>
      </section>
      <section class="lac-company-pass-admin" aria-label="회사 통합 이용권 관리 작업">
        <strong>이용권 작업</strong>
        <label class="lac-subscription-quick-days">새 발급 기간
          <select data-pass-issue-days>${[[7,'7일'],[30,'30일'],[90,'90일']].map(([days,label])=>`<option value="${days}">${label}</option>`).join('')}</select>
        </label>
        <div class="lac-pass-lifecycle__actions">
          <button type="button" data-action="platform-pass-lifecycle" data-pass-op="issue" data-company-id="${esc(row.company_id)}" ${canIssue?'':'disabled'}>🎟️ 새 이용권 발급</button>
          <button type="button" data-action="platform-pass-lifecycle" data-pass-op="expire" data-company-id="${esc(row.company_id)}" ${canExpire?'':'disabled'}>현재 이용권 즉시 만료</button>
          ${canPause?`<button type="button" data-action="platform-pass-lifecycle" data-pass-op="pause" data-company-id="${esc(row.company_id)}">이용 일시정지</button>`:''}
          ${canResume?`<button type="button" data-action="platform-pass-lifecycle" data-pass-op="resume" data-company-id="${esc(row.company_id)}">이용 재개</button>`:''}
        </div>
        ${!canIssue?'<p>현재 이용권이 남아 있다면 먼저 즉시 만료한 다음 새로 발급해 주세요. 종료일이 지나 자연 만료된 경우에는 바로 새로 발급할 수 있습니다.</p>':''}
        ${!accessLoaded?'<p>통합 이용권 상태를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.</p>':''}
      </section>
      <details class="lac-pass-lifecycle__history"><summary>이용권 발급·종료 기록 (최근 30건)</summary><ol>${history}</ol></details>
      <footer class="lac-subscription-footer"><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button></footer>
      <details class="lac-subscription-company-settings"><summary>별도 회사 설정 · 위험 작업</summary><p>회사 삭제는 이용권 만료와 다릅니다. 회사 데이터까지 삭제하려는 경우에만 아래 기능을 사용하세요.</p><button type="button" class="runtime-btn-danger" data-action="open-delete-company" data-company-id="${esc(row.company_id)}">회사 삭제 관리</button></details>
    </div>`,true);
}
function companyDeleteModal(state,m){
  const row=(state.platformSnapshot||[]).find(r=>String(r.company_id)===String(m.companyId)); if(!row)return '';
  const name=String(row.company_name||'회사');
  return modalShell('회사 삭제',name,`<form data-form="company-delete" class="runtime-modal-form runtime-company-delete-form" autocomplete="off"><input type="hidden" name="company_id" value="${esc(row.company_id)}"><input type="hidden" name="company_name" value="${esc(name)}"><div class="runtime-delete-warning is-full"><strong>이 작업은 되돌릴 수 없습니다.</strong><span>회사 멤버·설정·공금·자산·계좌·Discord 연결 정보 등 LAC HUB의 회사 데이터가 함께 삭제됩니다.</span><small>Discord 서버에 이미 만들어진 채널이나 메시지는 자동으로 삭제하지 않습니다.</small></div><label class="is-full"><span>삭제 확인</span><input name="confirm_name" placeholder="${esc(name)}" required autocomplete="off"><small>계속하려면 회사 이름 <b>${esc(name)}</b>을(를) 정확히 입력하세요.</small></label><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-danger" type="submit">영구 삭제</button></footer></form>`,true);
}
function ledgerCorrectionModal(state,m){
  const row=(state.fundSnapshot?.ledger||[]).find(r=>r.id===m.entryId)||{};
  const amount=Math.abs(Number(row.amount||0)); const direction=row.direction||(Number(row.amount||0)<0?'지출':'수입');
  const who=(state.memberships||[]).find(x=>x.id===row.membership_id)?.display_name||row.member_display_name||'—';
  const title=row.entry_type==='payment'?'주간공금':(row.category||'연동 내역');
  return modalShell('공금 내역 수정','연동된 원본은 감사 이력을 위해 보존하고, 차액 정정 내역을 추가해 최종 금액을 맞춥니다.',`<form data-form="ledger-correction" class="runtime-modal-form"><input type="hidden" name="entry_id" value="${esc(row.id||'')}"><div class="runtime-modal-hint is-full"><strong>${esc(title)}</strong> · ${esc(who)} · 현재 ${signedMoney(Number(row.amount||0))}<br>원본 행은 삭제하지 않고 정정 차액만 별도 기록됩니다.</div><label>최종 구분<select name="direction"><option ${direction==='수입'?'selected':''}>수입</option><option ${direction==='지출'?'selected':''}>지출</option></select></label><label>최종 금액<input name="amount" type="number" min="1" value="${esc(amount||'')}" required></label><label>정정 반영일<input name="ledger_date" type="date" value="${dateKey(new Date())}" required></label><label>계좌<input value="${esc(row.account||'공용계좌')}" readonly class="is-readonly"></label><label class="is-full">정정 사유<textarea name="reason" placeholder="예: 금액 오입력 정정" required></textarea></label>${ledgerEvidencePicker(state,row)}<footer>${row.entry_type==='payment' && row.request_id && (!row.status || row.status==='active')?`<button type="button" class="runtime-btn-danger" data-action="cancel-ledger-approval" data-entry-id="${esc(row.id)}">내역 취소</button>`:'<span></span>'}<div><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button><button class="runtime-btn-primary" type="submit">수정 내용 저장</button></div></footer></form>`,true);
}

function memberRegisterModal(state){
  const draft = state.modal || {};
  const busy = Boolean(draft.pending);
  const role = ['member','manager','admin'].includes(draft.role) ? draft.role : 'member';
  return modalShell('멤버 등록','팀원이 전달한 Discord ID로 현재 회사에 먼저 등록합니다.',`<form data-form="member-register" class="runtime-modal-form member-register-form" autocomplete="off" ${busy?'aria-busy="true"':''}>
    <div class="runtime-modal-hint member-register-guide is-full"><strong>Discord ID 등록 안내</strong><span>팀원이 첫 접속 화면에서 복사한 Discord ID를 붙여넣어 주세요.</span><span>현재 연결된 Discord 서버의 실제 멤버인지 확인한 뒤 등록합니다. 등록 전에는 회사 관리 콘텐츠에 진입할 수 없습니다.</span></div>
    <label class="is-full">Discord ID<input name="discord_user_id" inputmode="numeric" pattern="[0-9]{15,22}" minlength="15" maxlength="22" value="${esc(draft.discordUserId||'')}" placeholder="예: 123456789012345678" required autocomplete="off" ${busy?'disabled':''}><small>Discord 이름이 아니라 숫자로 된 사용자 ID입니다.</small></label>
    <label class="is-full">회사 관리 권한<select name="role" ${busy?'disabled':''}><option value="member" ${role==='member'?'selected':''}>일반 멤버</option><option value="manager" ${role==='manager'?'selected':''}>매니저</option><option value="admin" ${role==='admin'?'selected':''}>관리자</option></select><small>OWNER 권한은 이 등록 화면에서 부여하지 않습니다.</small></label>
    <div class="member-register-feedback is-full" data-member-register-error role="alert" ${draft.error?'':'hidden'}>${esc(draft.error||'')}</div>
    <div class="member-register-status is-full" data-member-register-status role="status" ${busy?'':'hidden'}>등록 정보를 확인하고 있습니다…</div>
    <footer><button type="button" class="runtime-btn-ghost" data-action="close-modal" ${busy?'disabled':''}>취소</button><button class="runtime-btn-primary" type="submit" ${busy?'disabled':''}>${busy?'등록 중…':'멤버 등록'}</button></footer>
  </form>`);
}


function memberModal(state,m){
  const row=(state.memberships||[]).find(x=>x.id===m.membershipId);
  if(!row)return '';
  const discordName=row.discord_display_name||'';
  const alias=row.alias_name||'';
  const note=row.member_note||'';
  const isOwner=row.role==='owner';
  const statusLabels={active:'활동',suspended:'중지',left:'퇴사'};
  return modalShell('멤버 관리',row.display_name||discordName||'멤버',`<form data-form="member" class="runtime-modal-form member-profile-form" autocomplete="off">
    <input type="hidden" name="membership_id" value="${esc(row.id)}">
    <label class="member-profile-name-field"><span class="member-profile-label">Discord 표시명</span><input value="${esc(discordName||'아직 동기화되지 않음')}" readonly class="is-readonly" autocomplete="off"><small>해당 Discord 서버에서 확인된 이름입니다.</small></label>
    <label class="member-profile-name-field"><span class="member-profile-label">별칭 <em>선택</em></span><input name="alias_name" value="${esc(alias)}" placeholder="비우면 Discord 표시명 사용" maxlength="120" autocomplete="off"><small>회사에서 따로 부를 이름이 있을 때만 입력합니다.</small></label>
    <div class="member-profile-inline is-full">
      <label>역할${isOwner?`<input value="대표" readonly class="is-readonly" aria-label="대표 역할 변경 불가"><input type="hidden" name="role" value="owner">`:`<select name="role">${['admin','manager','member'].map(r=>`<option value="${r}" ${row.role===r?'selected':''}>${ROLE_KO[r]}</option>`).join('')}</select>`}</label>
      <label>상태${isOwner?`<input value="${esc(statusLabels[row.status]||row.status)}" readonly class="is-readonly" aria-label="대표 상태 변경 불가"><input type="hidden" name="status" value="${esc(row.status)}">`:`<select name="status"><option value="active" ${row.status==='active'?'selected':''}>활동</option><option value="suspended" ${row.status==='suspended'?'selected':''}>중지</option><option value="left" ${row.status==='left'?'selected':''}>퇴사</option></select>`}</label>
      <label>입사일<input name="employment_started_on" type="date" value="${esc(row.employment_started_on||'')}"></label>
    </div>
    ${isOwner?'<div class="runtime-modal-hint is-full">대표 계정의 역할과 상태는 이 화면에서 변경할 수 없습니다.</div>':''}
    <label class="is-full">메모 (선택)<textarea name="member_note" maxlength="1000" placeholder="업무 참고사항이나 내부 메모를 입력하세요." autocomplete="off">${esc(note)}</textarea><small>회사 내부 운영 참고용 메모입니다.</small></label>
    <footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">저장</button></footer>
  </form>`);
}
function assetModal(state,m){ const row=(state.assetsSnapshot?.assets||[]).find(x=>x.id===m.assetId)||{}; const status=row.membership_id?'보유':'미배정'; return modalShell(row.id?(row.membership_id?'자산 수정':'자산 배정'):'자산 추가','보유자와 상태를 운영 흐름에 맞게 관리합니다.',`<form data-form="asset" class="runtime-modal-form"><input type="hidden" name="asset_id" value="${esc(row.id||'')}"><label>자산명<input name="asset_name" value="${esc(row.asset_name||'')}" required></label><label>분류<input name="asset_category" value="${esc(row.asset_category||'기타')}" required></label><label>보유자<select name="membership_id" data-asset-holder><option value="">미배정</option>${(state.assetsSnapshot?.members||[]).filter(x=>x.status==='active').map(x=>`<option value="${esc(x.id)}" ${row.membership_id===x.id?'selected':''}>${esc(x.display_name)}</option>`).join('')}</select></label><label>상태<select name="status" data-asset-modal-status><option value="보유" ${status==='보유'?'selected':''}>보유</option><option value="미배정" ${status==='미배정'?'selected':''}>미배정</option></select></label><label class="is-full">취득 방식<input name="acquisition_method" value="${esc(row.acquisition_method||'')}" placeholder="선택"></label><label class="is-full">메모<textarea name="note">${esc(row.note||'')}</textarea></label><div class="runtime-modal-hint is-full">퇴사 처리된 멤버의 자산은 자동으로 미배정됩니다. 미배정 자산은 여기서 다른 활동 멤버에게 바로 배정할 수 있습니다.</div><footer>${row.id&&row.membership_id?`<button type="button" class="runtime-btn-danger" data-action="return-asset" data-asset-id="${esc(row.id)}">반납 처리</button>`:'<span></span>'}<div><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">저장</button></div></footer></form>`,true);}
function accountModal(state){ const mine=accountRecords(state).find(r=>r.membership_id===currentMembership(state)?.id); return modalShell(mine?.account?'내 계좌 수정 신청':'내 계좌 등록 신청','계좌 변경은 신청 후 관리자 검수로 반영됩니다.',`<form data-form="account-request" class="runtime-modal-form"><label class="is-full">플리카 계좌<input name="account" value="${esc(mine?.account||'')}" inputmode="numeric" maxlength="20" required></label><label class="is-full">메모<textarea name="note" placeholder="변경 사유 등"></textarea></label><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">수정 신청</button></footer></form>`);}
function accountDetailModal(state,m){ const row=accountRecords(state).find(r=>r.membership_id===m.membershipId); if(!row)return ''; const pending=row.pending; return modalShell('계좌 상세',row.display_name||'멤버',`<div class="runtime-account-detail"><dl><div><dt>멤버</dt><dd>${esc(row.display_name||'—')}</dd></div><div><dt>역할</dt><dd>${esc(ROLE_KO[row.role]||row.role||'—')}</dd></div><div><dt>현재 계좌</dt><dd>${esc(row.account||'미등록')}</dd></div><div><dt>상태</dt><dd>${esc(row.status||'—')}</dd></div>${pending?`<div><dt>신청 계좌</dt><dd>${esc(pending.account||'—')}</dd></div>`:''}</dl><div class="runtime-modal-hint">다른 멤버의 계좌는 본인 신청 → 관리자 검수 흐름으로 변경됩니다. 현재 관리자 화면에서는 상세 확인과 검수를 제공합니다.</div><div class="runtime-modal-simple-footer"><button type="button" class="runtime-btn-ghost" data-action="close-modal">닫기</button></div></div>`);}

function companyModal(state){ const representative=userDisplayName(state); return modalShell('새 회사 만들기','회사 기본 정보만 먼저 등록합니다. 이용권 승인 전에는 Discord 연결이나 BOT 권한 설정을 요구하지 않습니다.',`<form data-form="create-company" class="runtime-modal-form"><div class="runtime-modal-warning is-full"><strong>이미 이용 중인 회사의 팀원인가요?</strong><span>새 회사를 만들지 말고 대표 또는 관리자에게 멤버 등록을 요청해 주세요.</span></div><label class="is-full">회사 이름<input name="name" maxlength="80" placeholder="예: LAC COMPANY" autocomplete="organization" required></label><label class="is-full">대표명<input name="representative_name" maxlength="120" value="${esc(representative)}" placeholder="회사에서 표시할 대표 이름" autocomplete="name" required></label><div class="runtime-modal-hint is-full">회사 생성 후 HUB에서 회사 관리와 요리 계산기 등 콘텐츠를 둘러볼 수 있습니다. 실제 운영 설정은 이용권 승인 후 시작합니다.</div><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">회사 만들기</button></footer></form>`);}

function setupGuidePreview(state){
  const demo=state.setupDemo||{}; const step=Math.max(0,Math.min(6,Number(demo.step||0))); const connected=Boolean(demo.connected);
  const steps=[['WELCOME','시작'],['DISCORD','Discord'],['ROLES','역할'],['MODULES','기능'],['CHANNELS','채널'],['MEMBERS','멤버'],['READY','완료']];
  const wizardSteps=steps.slice(1);
  const wizardProgress=wizardSteps.map(([,label],idx)=>{
    const target=idx+1;
    const done=step>target || step===6;
    const current=step===target || (step===0&&idx===0);
    return `<div class="setup-wizard-progress-item ${done?'is-done':current?'is-current':''}"><span>${done?'✓':idx+1}</span><strong>${label}</strong></div>${idx<wizardSteps.length-1?`<i class="setup-wizard-progress-line ${step>target?'is-done':''}"></i>`:''}`;
  }).join('');
  const modules=demo.modules||{};
  const moduleCard=(key,name,desc)=>`<button type="button" class="setup-demo-module ${modules[key]?'is-on':''}" data-action="setup-demo-toggle-module" data-module-key="${key}"><span class="setup-demo-check">${modules[key]?'✓':''}</span><div><strong>${name}</strong><small>${desc}</small></div><em>${modules[key]?'ON':'OFF'}</em></button>`;
  const previewModuleCards=MODULE_ORDER.filter(key=>MODULE_UI[key]).map(key=>moduleCard(key,MODULE_UI[key].name,MODULE_UI[key].desc)).join('');
  const channelSelect=(key,label,value)=>`<label class="setup-demo-field"><span>${label}</span><select data-setup-channel="${key}"><option value="#${key}" ${value===`#${key}`?'selected':''}>#${key}</option><option value="#운영-${key}" ${value===`#운영-${key}`?'selected':''}>#운영-${key}</option><option value="#axe-${key}" ${value===`#axe-${key}`?'selected':''}>#axe-${key}</option></select></label>`;
  const generated=demo.generatedChannels||{};
  const channelPlan=[];
  if(modules.fund)channelPlan.push(['fund','공금 관리','공금현황판',generated.fund||'공금현황판','공금현황판']);
  if(modules.ammo){channelPlan.push(['ammo3','총알 관리 · 3시','3시-총알',generated.ammo3||'3시-총알','3시']);channelPlan.push(['ammo10','총알 관리 · 10시','10시-총알',generated.ammo10||'10시-총알','10시']);}
  if(modules.outlaw)channelPlan.push(['outlaw','무법지대 전적','전적-등록',generated.outlaw||'전적-등록','전적 등록']);
  if(modules.modbook)channelPlan.push(['modbook','개조서 조회 · 가격','개조서',generated.modbook||'개조서','개조서']);
  if(modules.pinball)channelPlan.push(['pinball','핀볼 모집','핀볼-모집',generated.pinball||'핀볼-모집','핀볼 모집']);
  if(modules.cooking)channelPlan.push(['cooking','요리 주문','요리-주문',generated.cooking||'요리-주문','요리 주문']);
  if(modules.assets)channelPlan.push(['accountLookup','계좌 조회','계좌조회',generated.accountLookup||'계좌조회','계좌 조회']);
  const generatedRow=([key,label,placeholder,value,linkLabel])=>`<label class="setup-demo-create-row"><span class="setup-demo-create-copy"><strong>${label}</strong><small>생성 후 ${linkLabel} 기능에 자동 연결</small></span><span class="setup-demo-channel-input"><b>#</b><input type="text" maxlength="90" value="${esc(value)}" placeholder="${esc(placeholder)}" data-setup-generated-channel="${key}"></span><em>AUTO</em></label>`;

  const memberRole=demo.memberRole||'회사원'; const adminRole=demo.adminRole||'대표';
  const memberGroups={
    member:[{id:'m1',name:'Nova',tag:'nova_01'},{id:'m2',name:'Mika',tag:'mika_02'},{id:'m3',name:'Sena',tag:'sena_03'},{id:'m4',name:'Haru',tag:'haru_04'},{id:'m5',name:'Jin',tag:'jin_05'},{id:'m6',name:'Raven',tag:'raven_06'}],
    admin:[{id:'a1',name:'Orion',tag:'orion_admin'},{id:'a2',name:'Lynx',tag:'lynx_admin'}],
    guest:[{id:'g1',name:'Guest 01',tag:'guest_01'},{id:'g2',name:'Guest 02',tag:'guest_02'},{id:'g3',name:'Guest 03',tag:'guest_03'},{id:'g4',name:'Guest 04',tag:'guest_04'},{id:'g5',name:'Guest 05',tag:'guest_05'},{id:'g6',name:'Guest 06',tag:'guest_06'},{id:'g7',name:'Guest 07',tag:'guest_07'},{id:'g8',name:'Guest 08',tag:'guest_08'},{id:'g9',name:'Guest 09',tag:'guest_09'},{id:'g10',name:'Guest 10',tag:'guest_10'}]
  };
  const filter=memberGroups[demo.memberFilter]?demo.memberFilter:'member'; const visibleMembers=memberGroups[filter]; const selectedMembers=new Set(demo.memberSelected||[]); const allVisibleSelected=visibleMembers.length>0&&visibleMembers.every(m=>selectedMembers.has(m.id));
  const roleLabel=filter==='admin'?adminRole:filter==='guest'?'손님':memberRole; const targetRole=demo.memberTargetRole==='admin'?'관리자':'일반 멤버';
  const memberRows=visibleMembers.map(m=>`<label class="setup-demo-member-row ${selectedMembers.has(m.id)?'is-selected':''}"><input type="checkbox" data-setup-member-select="${m.id}" ${selectedMembers.has(m.id)?'checked':''}><span class="setup-demo-member-avatar">${esc(m.name.slice(0,1).toUpperCase())}</span><span class="setup-demo-member-copy"><strong>${esc(m.name)}</strong><small>@${esc(m.tag)}</small></span><em>${esc(roleLabel)}</em></label>`).join('');

  let body=''; let nextLabel='다음';
  if(step===0){ body=`<div class="setup-demo-hero"><span class="setup-demo-kicker">회사 관리 · SETUP GUIDE</span><h2>처음 설정도, 순서대로 하면 어렵지 않습니다.</h2><p>필요한 것만 하나씩 안내하고 완료된 단계는 자동으로 확인합니다. 지금 체험하는 내용은 실제 회사 설정에 저장되지 않습니다.</p><div class="setup-demo-facts"><span><b>약 2–3분</b> 예상 소요시간</span><span><b>6단계</b> 핵심 설정만 진행</span><span><b>0건</b> 실제 데이터 변경</span></div></div>`; nextLabel='체험 시작'; }
  if(step===1){ body=connected?`<div class="setup-demo-quest"><span class="setup-wizard-stage">1단계 · Discord 연결</span><h2>Discord 서버 연결 완료</h2><p>연결된 서버를 확인했습니다. 역할과 채널 목록도 자동으로 가져오는 흐름입니다.</p><div class="setup-demo-discord-card is-connected"><i></i><div><strong>LAC TEST SERVER</strong><span>Discord 연결됨 · 체험 데이터</span></div><b>연결 완료</b></div><div class="setup-demo-tip"><strong>자동으로 처리되는 것</strong><span>서버 확인 → 역할 목록 → 채널 목록 동기화</span></div></div>`:`<div class="setup-demo-quest"><span class="setup-wizard-stage">1단계 · Discord 연결</span><h2>운영할 Discord 서버를 연결합니다.</h2><p>실제 연결에서는 Discord 서버 선택 화면으로 이동합니다. 이 체험에서는 연결 동작만 시뮬레이션합니다.</p><button type="button" class="setup-demo-discord-connect" data-action="setup-demo-connect"><span>Discord</span><strong>테스트 서버 연결하기</strong><small>실제 Discord 권한 요청 없음</small></button></div>`; nextLabel=connected?'다음':'연결 먼저 하기'; }
  if(step===2){ body=`<div class="setup-demo-quest"><span class="setup-wizard-stage">2단계 · 역할 설정</span><h2>누가 운영하고, 누가 사용하는지 정합니다.</h2><p>Discord 역할을 기준으로 관리자와 일반 멤버 권한을 나눕니다.</p><div class="setup-demo-role-grid"><label class="setup-demo-field"><span>관리자 역할</span><select data-setup-role="adminRole"><option ${demo.adminRole==='대표'?'selected':''}>대표</option><option ${demo.adminRole==='운영진'?'selected':''}>운영진</option><option ${demo.adminRole==='관리자'?'selected':''}>관리자</option></select><small>멤버 · 공금 · 자산 · 회사 설정 관리</small></label><label class="setup-demo-field"><span>일반 멤버 역할</span><select data-setup-role="memberRole"><option ${demo.memberRole==='회사원'?'selected':''}>회사원</option><option ${demo.memberRole==='직원'?'selected':''}>직원</option><option ${demo.memberRole==='크루'?'selected':''}>크루</option></select><small>회사 기능을 사용하는 일반 구성원</small></label></div><div class="setup-demo-tip"><strong>현재 선택</strong><span>${esc(demo.adminRole||'대표')} → 관리자 / ${esc(demo.memberRole||'회사원')} → 일반 멤버</span></div></div>`; }
  if(step===3){ body=`<div class="setup-demo-quest"><span class="setup-wizard-stage">3단계 · 기능 선택</span><h2>회사에서 사용할 기능만 선택합니다.</h2><p>켜지 않은 기능은 다음 단계에서도 묻지 않습니다.</p><div class="setup-demo-module-grid">${previewModuleCards}</div></div>`; }
  if(step===4){
    const mode=demo.channelMode||'quick';
    const modePicker=`<div class="setup-demo-channel-mode"><button type="button" class="${mode==='quick'?'is-active':''}" data-action="setup-demo-channel-mode" data-mode="quick"><b>⚡</b><span><strong>빠른 설정</strong><small>필요한 채널을 추천하고 자동으로 만들어줍니다.</small></span></button><button type="button" class="${mode==='direct'?'is-active':''}" data-action="setup-demo-channel-mode" data-mode="direct"><b>↗</b><span><strong>직접 연결</strong><small>이미 사용 중인 Discord 채널을 선택합니다.</small></span></button></div>`;
    if(mode==='quick'){
      const category=demo.categoryName||'LAC HUB';
      const builder=channelPlan.length?`<div class="setup-demo-builder"><div class="setup-demo-builder-head"><div><strong>추천 구성</strong><span>생성 전에 이름을 자유롭게 바꿀 수 있습니다.</span></div><em>${channelPlan.length}개 채널</em></div><label class="setup-demo-category-row"><span><strong>카테고리</strong><small>채널을 묶어둘 Discord 카테고리</small></span><input type="text" maxlength="90" value="${esc(category)}" data-setup-category-name></label><div class="setup-demo-create-list">${channelPlan.map(generatedRow).join('')}</div>${demo.channelsGenerated?`<div class="setup-demo-generation-result"><div class="setup-demo-generation-title"><i>✓</i><span><strong>생성 체험 완료</strong><small>실제 Discord에는 아무것도 생성되지 않았습니다.</small></span></div><ul><li><b>✓</b><span><strong>${esc(category)}</strong><small>카테고리 생성</small></span></li>${channelPlan.map(([,label,,value])=>`<li><b>✓</b><span><strong>#${esc(value)}</strong><small>${esc(label)}에 자동 연결</small></span></li>`).join('')}</ul></div>`:`<div class="setup-demo-builder-note"><b>PREVIEW</b><span>아래 <strong>이 구성으로 생성 체험</strong>을 누르면 생성 과정을 미리 볼 수 있습니다.</span></div>`}</div>`:`<div class="setup-demo-empty"><strong>자동 생성이 필요한 채널이 없습니다.</strong><span>선택한 기능은 별도 Discord 채널이 필요하지 않습니다.</span></div>`;
      body=`<div class="setup-demo-quest setup-demo-quest--channels"><span class="setup-wizard-stage">4단계 · 채널 설정</span><h2>회사 관리 채널도 자동으로 준비할 수 있습니다.</h2><p>추천 구성을 그대로 사용하거나, 카테고리와 채널명을 회사 스타일에 맞게 바꾼 뒤 생성합니다.</p>${modePicker}${builder}</div>`;
    }else{
      const rows=[]; if(modules.fund)rows.push(channelSelect('공금현황판','공금 현황판',demo.channels?.fund)); if(modules.ammo){rows.push(channelSelect('3시-총알','3시 총알 채널',demo.channels?.ammo3));rows.push(channelSelect('10시-총알','10시 총알 채널',demo.channels?.ammo10));} if(modules.outlaw)rows.push(channelSelect('전적-등록','무법 전적 등록 채널',demo.channels?.outlaw)); if(modules.modbook)rows.push(channelSelect('개조서','개조서 채널',demo.channels?.modbook)); if(modules.pinball)rows.push(channelSelect('핀볼-모집','핀볼 모집 채널',demo.channels?.pinball)); if(modules.cooking)rows.push(channelSelect('요리-주문','요리 주문 채널',demo.channels?.cooking)); if(modules.assets)rows.push(channelSelect('계좌조회','계좌 조회 채널',demo.channels?.accountLookup));
      body=`<div class="setup-demo-quest setup-demo-quest--channels"><span class="setup-wizard-stage">4단계 · 채널 설정</span><h2>기존 채널을 그대로 연결할 수도 있습니다.</h2><p>이미 서버 구조가 잡혀 있다면 새 채널을 만들지 않고 기존 채널을 기능에 연결합니다.</p>${modePicker}<div class="setup-demo-channel-list">${rows.length?rows.join(''):`<div class="setup-demo-empty"><strong>채널 설정이 필요한 기능이 없습니다.</strong><span>바로 다음 단계로 진행할 수 있습니다.</span></div>`}</div><div class="setup-demo-tip"><strong>직접 연결</strong><span>기존 서버 구조는 그대로 유지하고 LAC HUB 기능만 연결합니다.</span></div></div>`;
    }
  }
  if(step===5){
    const selectedVisible=visibleMembers.filter(m=>selectedMembers.has(m.id)).length;
    body=`<div class="setup-demo-quest setup-demo-quest--members"><span class="setup-wizard-stage">5단계 · 멤버 등록</span><h2>멤버도 한 번에 등록할 수 있습니다.</h2><p>서버 인원이 많아도 Discord 역할로 먼저 걸러낸 뒤, 필요한 사람만 선택해서 회사 관리 권한을 일괄 부여합니다.</p><div class="setup-demo-member-toolbar"><label><span>Discord 역할로 대상 찾기</span><select data-setup-member-filter><option value="member" ${filter==='member'?'selected':''}>${esc(memberRole)} · 일반 멤버 역할 (6)</option><option value="admin" ${filter==='admin'?'selected':''}>${esc(adminRole)} · 관리자 역할 (2)</option><option value="guest" ${filter==='guest'?'selected':''}>손님 · 게스트 (10)</option></select><small>게스트가 많은 서버에서도 실제 회사 인원만 빠르게 찾습니다.</small></label><label><span>LAC HUB에서 부여할 권한</span><select data-setup-member-target-role><option value="member" ${demo.memberTargetRole!=='admin'?'selected':''}>일반 멤버</option><option value="admin" ${demo.memberTargetRole==='admin'?'selected':''}>관리자</option></select><small>필터는 대상을 찾는 기준이고, 이 권한이 실제 LAC HUB 멤버 권한입니다.</small></label></div><div class="setup-demo-member-summary"><div><strong>${esc(roleLabel)} 역할</strong><span>서버 전체 18명 중 ${visibleMembers.length}명 표시</span></div><button type="button" data-action="setup-demo-select-visible-members">${allVisibleSelected?'현재 목록 선택 해제':'현재 목록 전체 선택'}</button></div><div class="setup-demo-member-list">${memberRows}</div>${demo.memberImportDone?demo.memberImportSkipped?`<div class="setup-demo-member-result is-skipped"><i>→</i><div><strong>멤버 등록은 나중에 진행합니다.</strong><span>운영 중에는 Discord 우클릭 → 앱 → LAC HUB 멤버 등록으로 한 명씩 추가할 수 있습니다.</span></div></div>`:`<div class="setup-demo-member-result"><i>✓</i><div><strong>${selectedMembers.size}명 등록 체험 완료</strong><span>선택한 멤버에게 <b>${esc(targetRole)}</b> 권한을 부여하는 흐름입니다.</span></div></div>`:`<div class="setup-demo-member-actions"><span><b>${selectedVisible}명 선택됨</b> · 현재 화면은 체험 데이터입니다.</span><button type="button" data-action="setup-demo-skip-members">나중에 개별 등록</button></div>`}</div>`;
  }
  if(step===6){ const memberDone=demo.memberImportDone&&!demo.memberImportSkipped; body=`<div class="setup-demo-complete"><div class="setup-demo-complete-mark">✓</div><span class="setup-wizard-stage is-complete">초기 설정 완료</span><h2>회사 관리 준비가 완료되었습니다.</h2><p>실제 서비스에서는 여기서 바로 회사 관리 대시보드로 이동합니다.</p><div class="setup-demo-next-task"><span>${memberDone?'MEMBERS':'NEXT'}</span><div><strong>${memberDone?`${selectedMembers.size}명 멤버 등록 준비 완료`:'추가 멤버는 언제든 등록할 수 있습니다.'}</strong><small>${memberDone?`${esc(targetRole)} 권한으로 일괄 등록하는 흐름을 확인했습니다.`:'Discord에서 대상 우클릭 → 앱 → LAC HUB 멤버 등록'}</small></div></div><div class="setup-demo-safe"><b>체험 모드</b><span>지금 선택한 역할·기능·채널·멤버는 실제 회사 설정에 저장되지 않았습니다.</span></div></div>`; nextLabel='회사 관리 시작'; }
  const needsGeneration=step===4&&(demo.channelMode||'quick')==='quick'&&channelPlan.length>0&&!demo.channelsGenerated;
  const needsMemberImport=step===5&&!demo.memberImportDone;
  const primary=step===1&&!connected?`<button type="button" class="setup-demo-primary" data-action="setup-demo-connect">Discord 연결 체험</button>`:needsGeneration?`<button type="button" class="setup-demo-primary setup-demo-primary--generate" data-action="setup-demo-generate-channels">이 구성으로 생성 체험</button>`:needsMemberImport?`<button type="button" class="setup-demo-primary setup-demo-primary--members" data-action="setup-demo-import-members" ${(demo.memberSelected||[]).length?'':'disabled'}>선택 멤버 등록 체험</button>`:step===6?`<button type="button" class="setup-demo-primary" data-action="setup-demo-finish">회사 관리 시작</button>`:`<button type="button" class="setup-demo-primary" data-action="setup-demo-next">${nextLabel}</button>`;
  const scrollStep=step===4||step===5;
  return `<div class="setup-demo-backdrop"><section class="setup-wizard-shell" role="dialog" aria-modal="true" aria-label="회사 초기 설정 마법사 체험"><header class="setup-wizard-header"><div><span>LAC HUB</span><strong>회사 초기 설정</strong></div><div class="setup-wizard-test-badge"><i></i><span>테스트 모드 · 실제 데이터 변경 없음</span></div><button type="button" data-action="close-modal" aria-label="닫기">×</button></header><div class="setup-wizard-progress">${wizardProgress}</div><main class="setup-wizard-body setup-demo-content ${scrollStep?'is-scroll-step':''}">${body}</main><footer class="setup-wizard-footer"><div>${step>0&&step<6?`<button type="button" class="setup-demo-back" data-action="setup-demo-back">‹ 이전</button>`:'<span></span>'}</div><div><button type="button" class="setup-demo-restart" data-action="setup-demo-restart">처음부터</button>${primary}</div></footer></section></div>`;
}


function setupGuideLive(state){
  const guide=state.setupGuide||{};
  const step=Math.max(0,Math.min(6,Number(guide.step||0)));
  const connected=state.discordConnection?.status==='connected';
  const steps=[['START','시작'],['STEP 1','Discord'],['STEP 2','역할'],['STEP 3','기능'],['STEP 4','채널'],['STEP 5','멤버'],['DONE','완료']];
  const rail=steps.map(([k,label],i)=>`<button type="button" class="setup-demo-step ${i<step?'is-done':i===step?'is-current':''}" data-action="setup-guide-jump" data-step="${i}" ${i>step?'disabled':''}><b>${i<step?'✓':String(i+1).padStart(2,'0')}</b><span><small>${k}</small><strong>${label}</strong></span></button>`).join('');
  const roles=(state.discordRoles||[]).filter(r=>!r.managed&&r.role_name!=='@everyone');
  const channels=(state.discordChannels||[]).filter(c=>c.is_text_based);
  const textChannels=channels.filter(c=>Number(c.channel_type)!==15&&!String(c.channel_type||'').toLowerCase().includes('forum'));
  const roleOptions=(selected='')=>`<option value="">역할 선택</option>${roles.map(r=>`<option value="${esc(r.role_id)}" ${String(selected)===String(r.role_id)?'selected':''}>${esc(r.role_name)}</option>`).join('')}`;
  const channelOptions=(selected='')=>`<option value="">채널 선택</option>${textChannels.map(c=>`<option value="${esc(c.channel_id)}" ${String(selected)===String(c.channel_id)?'selected':''}>#${esc(c.channel_name)}</option>`).join('')}`;
  const modules=guide.modules||{};
  const availableModules=(state.modules||[]).filter(m=>MODULE_UI[m.module_key]);
  const moduleCard=(row)=>{const ui=MODULE_UI[row.module_key];const on=Boolean(modules[row.module_key]);return `<button type="button" class="setup-demo-module ${on?'is-on':''}" data-action="setup-guide-toggle-module" data-module-key="${esc(row.module_key)}"><span class="setup-demo-check">${on?'✓':''}</span><div><strong>${esc(ui.name)}</strong><small>${esc(ui.desc)}</small></div><em>${on?'ON':'OFF'}</em></button>`;};
  const plan=[];
  if(modules.fund)plan.push({key:'fund',label:'공금 관리',placeholder:'공금현황판',value:guide.generatedChannels?.fund||'공금현황판',type:'text'});
  if(modules.ammo){plan.push({key:'ammo3',label:'총알 관리 · 3시',placeholder:'3시-총알',value:guide.generatedChannels?.ammo3||'3시-총알'});plan.push({key:'ammo10',label:'총알 관리 · 10시',placeholder:'10시-총알',value:guide.generatedChannels?.ammo10||'10시-총알'});}
  if(modules.outlaw)plan.push({key:'outlaw',label:'무법지대 전적',placeholder:'전적-등록',value:guide.generatedChannels?.outlaw||'전적-등록'});
  if(modules.modbook)plan.push({key:'modbook',label:'개조서 조회 · 가격',placeholder:'개조서',value:guide.generatedChannels?.modbook||'개조서'});
  if(modules.pinball)plan.push({key:'pinball',label:'핀볼 모집',placeholder:'핀볼-모집',value:guide.generatedChannels?.pinball||'핀볼-모집'});
  if(modules.cooking)plan.push({key:'cooking',label:'요리 주문',placeholder:'요리-주문',value:guide.generatedChannels?.cooking||'요리-주문'});
  if(modules.assets)plan.push({key:'accountLookup',label:'계좌 조회',placeholder:'계좌조회',value:guide.generatedChannels?.accountLookup||'계좌조회',type:'text'});
  const generatedRow=(row)=>`<label class="setup-demo-create-row"><span class="setup-demo-create-copy"><strong>${esc(row.label)}</strong><small>생성 후 해당 기능에 자동 연결</small></span><span class="setup-demo-channel-input"><b>#</b><input type="text" maxlength="90" value="${esc(row.value)}" placeholder="${esc(row.placeholder)}" data-guide-generated-channel="${esc(row.key)}"></span><em>AUTO</em></label>`;
  const directRows=plan.map(row=>`<label class="setup-demo-field"><span>${esc(row.label)}</span><select data-guide-direct-channel="${esc(row.key)}">${channelOptions(guide.directChannels?.[row.key]||'')}</select></label>`).join('');
  const candidates=Array.isArray(guide.memberCandidates)?guide.memberCandidates:[];
  const selected=new Set((guide.memberSelected||[]).map(String));
  const allSelected=candidates.length>0&&candidates.every(m=>selected.has(String(m.discord_user_id)));
  const memberRows=candidates.map(m=>{const id=String(m.discord_user_id||'');const name=String(m.display_name||m.discord_display_name||m.username||'Discord 멤버');return `<label class="setup-demo-member-row ${selected.has(id)?'is-selected':''}"><input type="checkbox" data-guide-member-select="${esc(id)}" ${selected.has(id)?'checked':''}><span class="setup-demo-member-avatar">${esc(name.slice(0,1).toUpperCase())}</span><span class="setup-demo-member-copy"><strong>${esc(name)}</strong><small>@${esc(m.username||id)}</small></span><em>${guide.memberTargetRole==='admin'?'관리자':'일반 멤버'}</em></label>`;}).join('');
  let body=''; let primary='';
  if(step===0){body=`<div class="setup-demo-hero"><span class="setup-demo-kicker">회사 관리 · INITIAL SETUP</span><h2>이용권 승인이 완료되었습니다. 이제 운영 환경을 준비합니다.</h2><p>프로그램 설치처럼 한 단계씩 진행합니다. Discord 연결부터 역할, 기능, 채널, 멤버 등록까지 현재 단계에 필요한 설정만 보여드립니다.</p><div class="setup-demo-facts"><span><b>약 2–3분</b> 예상 소요시간</span><span><b>6단계</b> 핵심 설정</span><span><b>자동 저장</b> 단계별 적용</span></div></div>`;primary=`<button type="button" class="setup-demo-primary" data-action="setup-guide-next">설정 시작 →</button>`;}
  if(step===1){body=connected?`<div class="setup-demo-quest"><span class="setup-demo-quest-no">STEP 1 · DISCORD</span><h2>Discord 서버가 연결되어 있습니다.</h2><p>연결된 서버의 역할과 채널 정보를 기준으로 다음 설정을 이어갑니다.</p><div class="setup-demo-discord-card is-connected"><i></i><div><strong>${esc(state.discordConnection?.guild_name||'Discord 서버')}</strong><span>${state.onboardingStatus?.catalog_ready===false?'역할·채널 정보를 불러오는 중':'역할·채널 동기화 완료'}</span></div><b>${state.onboardingStatus?.catalog_ready===false?'동기화 중':'연결 완료'}</b></div></div>`:`<div class="setup-demo-quest setup-demo-quest--discord"><span class="setup-demo-quest-no">STEP 1 · DISCORD</span><h2>운영할 Discord 서버를 연결합니다.</h2><p>처음 연결할 때 AXE BOT 설치와 기본 운영 권한 승인을 한 번에 진행합니다. 연결 후 이 가이드로 자동 복귀합니다.</p><div class="setup-guide-connect-permissions"><div class="setup-guide-connect-permissions-head"><strong>연결 시 승인하는 권한</strong><span>필요한 권한만</span></div><div class="setup-guide-connect-permission-chips"><span>채널 보기</span><span>메시지 전송</span><span>임베드 표시</span><span>메시지 기록 보기</span><span>메시지 관리</span><span>채널 관리</span></div><small>자동 채널 생성과 운영 메시지 처리에 사용합니다. <b>관리자 전체 권한은 요청하지 않습니다.</b></small></div><button type="button" class="setup-demo-discord-connect" data-action="setup-guide-connect"><span>Discord</span><strong>Discord에 AXE 연결</strong><small>서버 선택 · BOT 추가 · 권한 승인</small></button></div>`;primary=connected?`<button type="button" class="setup-demo-primary" data-action="setup-guide-next" ${state.onboardingStatus?.catalog_ready===false?'disabled':''}>다음 →</button>`:`<button type="button" class="setup-demo-primary" data-action="setup-guide-connect">Discord에 AXE 연결</button>`;}
  if(step===2){body=`<div class="setup-demo-quest"><span class="setup-demo-quest-no">STEP 2 · ROLES</span><h2>누가 운영하고, 누가 사용하는지 정합니다.</h2><p>Discord 역할을 기준으로 회사 관리자와 일반 멤버를 구분합니다.</p><div class="setup-demo-role-grid"><label class="setup-demo-field"><span>관리자 역할</span><select data-guide-role="adminRoleId">${roleOptions(guide.adminRoleId)}</select><small>멤버 · 공금 · 자산 · 회사 설정 관리</small></label><label class="setup-demo-field"><span>일반 멤버 역할</span><select data-guide-role="memberRoleId">${roleOptions(guide.memberRoleId)}</select><small>회사 기능을 사용하는 일반 구성원</small></label></div></div>`;primary=`<button type="button" class="setup-demo-primary" data-action="setup-guide-save-roles" ${guide.adminRoleId&&guide.memberRoleId?'':'disabled'}>저장하고 다음 →</button>`;}
  if(step===3){body=`<div class="setup-demo-quest"><span class="setup-demo-quest-no">STEP 3 · FEATURES</span><h2>회사에서 사용할 기능만 선택합니다.</h2><p>켜지 않은 기능은 다음 채널 단계에서도 묻지 않습니다.</p><div class="setup-demo-module-grid">${availableModules.map(moduleCard).join('')}</div></div>`;primary=`<button type="button" class="setup-demo-primary" data-action="setup-guide-save-modules">저장하고 다음 →</button>`;}
  if(step===4){const mode=guide.channelMode==='direct'?'direct':'quick';const modePicker=`<div class="setup-demo-channel-mode"><button type="button" class="${mode==='quick'?'is-active':''}" data-action="setup-guide-channel-mode" data-mode="quick"><b>⚡</b><span><strong>빠른 설정</strong><small>필요한 회사 운영 채널을 자동 생성하고 바로 연결합니다.</small></span></button><button type="button" class="${mode==='direct'?'is-active':''}" data-action="setup-guide-channel-mode" data-mode="direct"><b>↗</b><span><strong>직접 연결</strong><small>이미 사용하는 Discord 채널을 선택합니다.</small></span></button></div>`;const permissionCard=guide.permissionIssue==='manage_channels'?`<div class="setup-guide-permission-card"><div class="setup-guide-permission-icon">!</div><div class="setup-guide-permission-copy"><strong>채널 생성 권한이 필요합니다.</strong><span>${esc(guide.permissionMessage||'회사 운영 채널을 만들려면 Discord의 채널 관리 권한 승인이 필요합니다.')}</span><small>현재 연결된 Discord 서버만 고정해서 권한 승인을 다시 진행합니다. 관리자 전체 권한은 요청하지 않습니다.</small></div><div class="setup-guide-permission-actions"><button type="button" class="is-primary" data-action="setup-guide-reapprove-channels">권한 다시 승인</button><button type="button" data-action="setup-guide-channel-mode" data-mode="direct">기존 채널 직접 연결</button></div></div>`:'';if(mode==='quick'){body=`<div class="setup-demo-quest setup-demo-quest--channels"><span class="setup-demo-quest-no">STEP 4 · CHANNELS</span><h2>회사 관리 채널도 자동으로 준비할 수 있습니다.</h2><p>추천 이름을 그대로 쓰거나 회사 스타일에 맞게 수정한 뒤 생성합니다.</p>${modePicker}${permissionCard}${plan.length?`<div class="setup-demo-builder"><div class="setup-demo-builder-head"><div><strong>생성할 구성</strong><span>생성 전에 자유롭게 수정할 수 있습니다.</span></div><em>${plan.length}개 채널</em></div><label class="setup-demo-category-row"><span><strong>카테고리</strong><small>Discord에서 채널을 묶어둘 카테고리</small></span><input type="text" maxlength="90" value="${esc(guide.categoryName||'LAC HUB')}" data-guide-category-name></label><div class="setup-demo-create-list">${plan.map(generatedRow).join('')}</div><div class="setup-demo-builder-note"><b>LIVE</b><span>생성하면 Discord 서버에 실제 카테고리와 채널이 만들어지고 회사 관리 기능에 자동 연결됩니다.</span></div></div>`:`<div class="setup-demo-empty"><strong>생성할 채널이 없습니다.</strong><span>선택한 기능은 별도의 Discord 채널이 필요하지 않습니다.</span></div>`}</div>`;primary=plan.length?`<button type="button" class="setup-demo-primary setup-demo-primary--generate" data-action="setup-guide-create-channels">이 구성으로 생성</button>`:`<button type="button" class="setup-demo-primary" data-action="setup-guide-next">다음 →</button>`;}else{body=`<div class="setup-demo-quest setup-demo-quest--channels"><span class="setup-demo-quest-no">STEP 4 · CHANNELS</span><h2>기존 채널을 그대로 연결할 수 있습니다.</h2><p>서버 구조를 바꾸지 않고 회사 관리 기능만 기존 채널에 연결합니다.</p>${modePicker}<div class="setup-demo-channel-list">${directRows||`<div class="setup-demo-empty"><strong>연결할 채널이 없습니다.</strong><span>바로 다음 단계로 진행할 수 있습니다.</span></div>`}</div></div>`;primary=`<button type="button" class="setup-demo-primary" data-action="setup-guide-save-direct-channels">저장하고 다음 →</button>`;}}
  if(step===5){const filterRoleName=roles.find(r=>String(r.role_id)===String(guide.memberFilterRoleId))?.role_name||'역할';body=`<div class="setup-demo-quest setup-demo-quest--members"><span class="setup-demo-quest-no">STEP 5 · MEMBERS</span><h2>기존 멤버를 한 번에 등록할 수 있습니다.</h2><p>Discord 역할로 회사 인원만 걸러낸 뒤 회사 관리 권한을 일괄 부여합니다.</p><div class="setup-demo-member-toolbar"><label><span>Discord 역할로 대상 찾기</span><select data-guide-member-filter>${roleOptions(guide.memberFilterRoleId)}</select><small>게스트가 많은 서버에서도 원하는 역할의 멤버만 불러옵니다.</small></label><label><span>LAC HUB에서 부여할 권한</span><select data-guide-member-target-role><option value="member" ${guide.memberTargetRole!=='admin'?'selected':''}>일반 멤버</option><option value="admin" ${guide.memberTargetRole==='admin'?'selected':''}>관리자</option></select><small>선택한 Discord 멤버에게 부여할 LAC HUB 권한입니다.</small></label></div>${guide.memberListLoaded?`<div class="setup-demo-member-summary"><div><strong>${esc(filterRoleName)} 역할</strong><span>${Number(guide.memberScanCount||candidates.length)}명 확인 · ${candidates.length}명 표시</span></div><button type="button" data-action="setup-guide-select-members">${allSelected?'현재 목록 선택 해제':'현재 목록 전체 선택'}</button></div><div class="setup-demo-member-list">${memberRows||`<div class="setup-demo-empty"><strong>해당 역할의 등록 가능한 멤버가 없습니다.</strong><span>BOT 계정과 기존 등록 멤버는 제외될 수 있습니다.</span></div>`}</div>`:`<div class="setup-demo-empty"><strong>역할을 선택해 멤버를 불러오세요.</strong><span>Discord 서버 인원이 많아도 선택한 역할만 필터링합니다.</span></div>`}${guide.memberImportDone?guide.memberImportSkipped?`<div class="setup-demo-member-result is-skipped"><i>→</i><div><strong>멤버 등록은 나중에 진행합니다.</strong><span>Discord 우클릭 → 앱 → LAC HUB 멤버 등록으로 개별 추가할 수 있습니다.</span></div></div>`:`<div class="setup-demo-member-result"><i>✓</i><div><strong>선택한 멤버 등록을 완료했습니다.</strong><span>멤버 관리에서 등록 결과를 확인할 수 있습니다.</span></div></div>`:`<div class="setup-demo-member-actions"><span><b>${selected.size}명 선택됨</b></span><button type="button" data-action="setup-guide-skip-members">나중에 개별 등록</button></div>`}</div>`;primary=guide.memberImportDone?`<button type="button" class="setup-demo-primary" data-action="setup-guide-next">다음 →</button>`:guide.memberListLoaded?`<button type="button" class="setup-demo-primary setup-demo-primary--members" data-action="setup-guide-import-members" ${selected.size?'':'disabled'}>선택 멤버 등록</button>`:`<button type="button" class="setup-demo-primary" data-action="setup-guide-load-members" ${guide.memberFilterRoleId?'':'disabled'}>멤버 불러오기</button>`;}
  if(step===6){body=`<div class="setup-demo-complete"><div class="setup-demo-complete-mark">✓</div><span class="setup-demo-kicker">SETUP COMPLETE</span><h2>운영 준비가 완료되었습니다.</h2><p>설정한 역할·기능·채널이 현재 회사에 적용되었습니다.</p><div class="setup-demo-next-task"><span>NEXT</span><div><strong>이제 LAC HUB을 바로 사용할 수 있습니다.</strong><small>추가 멤버는 Discord 우클릭 → 앱 → LAC HUB 멤버 등록으로 언제든 추가할 수 있습니다.</small></div></div></div>`;primary=`<button type="button" class="setup-demo-primary" data-action="setup-guide-finish">운영 콘솔 시작</button>`;}
  const scrollStep=step===4||step===5;
  return `<div class="setup-demo-backdrop"><section class="setup-demo-shell" role="dialog" aria-modal="true" aria-label="초기설정 가이드"><aside class="setup-demo-rail"><div class="setup-demo-brand"><strong>회사 관리</strong><small>GUIDED SETUP</small></div><div class="setup-demo-preview-badge is-live"><i></i><span>실제 설정</span><small>현재 회사에 단계별 적용</small></div><nav>${rail}</nav><button type="button" class="setup-demo-exit" data-action="close-modal">가이드 닫기</button></aside><main class="setup-demo-main"><header><div><span>초기설정 가이드</span><strong>${step+1} / ${steps.length}</strong></div><button type="button" data-action="close-modal" aria-label="닫기">×</button></header><div class="setup-demo-content ${scrollStep?'is-scroll-step':''}">${body}</div><footer>${step>0&&step<6?`<button type="button" class="setup-demo-back" data-action="setup-guide-back">이전</button>`:'<span></span>'}<div>${primary}</div></footer></main></section></div>`;
}

function discordReconnectModal(state){ const guild=state.discordConnection?.guild_name||'현재 Discord 서버'; return modalShell('Discord 연결 다시 설정','기존 연결을 안전하게 정리한 뒤 같은 서버도 처음부터 다시 연결할 수 있습니다.',`<form data-form="reconnect-discord" class="runtime-modal-form runtime-reconnect-form"><div class="runtime-reconnect-summary"><span>현재 연결</span><strong>${esc(guild)}</strong></div><div class="runtime-reconnect-warning"><strong>삭제되는 항목</strong><p>Discord 서버 연결 · 관리자/멤버 역할 선택 · 기능별 채널 연결 · BOT 상시 패널</p></div><div class="runtime-reconnect-safe"><strong>그대로 보존되는 항목</strong><p>멤버 · 공금 원장 · 자산/계좌 · 총알 주문 · 무법 전적 · 요리 주문 등 회사 운영 데이터</p></div><label class="runtime-reconnect-confirm is-full"><input type="checkbox" name="confirm" value="yes" required><span>위 내용을 확인했고 Discord 연결 설정만 처음부터 다시 진행합니다.</span></label><footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-danger" type="submit">연결 다시 설정</button></footer></form>`);}
function cookingMenuModal(state,m){ const row=(state.cookingOrderTypes||[]).find(x=>String(x.type_key)===String(m.typeKey||''))||null; const editing=Boolean(row); const nextSort=editing?Number(row.sort_order||0):((state.cookingOrderTypes||[]).reduce((max,x)=>Math.max(max,Number(x.sort_order||0)),0)+1); return modalShell(editing?'요리 메뉴 수정':'요리 메뉴 추가','회사별 Discord 주문창에 표시할 메뉴를 설정합니다.',`<form data-form="cooking-menu" class="runtime-modal-form"><input type="hidden" name="type_key" value="${esc(row?.type_key||'')}"><label>메뉴 이름<input name="label" maxlength="100" value="${esc(row?.label||'')}" placeholder="예: 멧돼지 스튜" required></label><label>짧은 이름<input name="short_label" maxlength="60" value="${esc(row?.short_label||'')}" placeholder="예: 멧돼지"></label><label class="is-full">설명<input name="detail" maxlength="160" value="${esc(row?.detail||'')}" placeholder="Discord 선택창에 보일 설명"></label><label>SET당 가격<input name="price_per_set" type="number" min="0" max="1000000000" step="1" value="${esc(Number(row?.price_per_set||0))}" required></label><label>노출 순서<input name="sort_order" type="number" min="0" step="1" value="${esc(nextSort)}" required></label><label class="runtime-modal-toggle is-full"><input name="enabled" type="checkbox" ${row?.enabled===false?'':'checked'}><span><strong>Discord 주문창에 사용</strong><small>OFF로 바꾸면 기존 주문 기록은 유지하고 신규 선택지만 숨깁니다.</small></span></label>${editing?`<div class="runtime-modal-readonly is-full"><span>내부 키</span><strong>${esc(row.type_key)}</strong><small>기존 주문 연결을 위해 생성 후에는 변경하지 않습니다.</small></div>`:''}<footer><button type="button" class="runtime-btn-ghost" data-action="close-modal">취소</button><button class="runtime-btn-primary" type="submit">${editing?'저장':'메뉴 추가'}</button></footer></form>`,true);}


export { esc, icon, money, signedMoney, fmtDate, currentMembership, canAdmin, moduleEnabled, moduleRow, companyDisplayName, userDisplayName };
