import { companyPlanName, companyStatusName, companySubscriptionEnd } from './subscriptionPresentation.js';
import { renderHubNewsStrip } from './hubBoard.js';
import { HUB_CONTENT } from '../platform/catalog.js';
import {contentIsVisible,contentCardStatus,canOpenWebContent} from '../platform/contentPolicy.js';

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

// HUB and BUILD are served under the same origin; keep the independent BUILD deployment unchanged.
const BUILD_PUBLIC_URL = '/build/';
const ASSETS = '/hub/';
const chevron = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const settingsIcon = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 3.3 13.9 4l1.5-.6 2.5 2.5-.6 1.5.7 1.9 1.5.6v3.5l-1.5.6-.7 1.9.6 1.5-2.5 2.5-1.5-.6-1.9.7-.6 1.5h-3.5l-.6-1.5-1.9-.7-1.5.6-2.5-2.5.6-1.5-.7-1.9-1.5-.6V9.9l1.5-.6.7-1.9-.6-1.5L6.4 3.4l1.5.6 1.9-.7.6-1.5h3.5z" transform="translate(1 1) scale(.85)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
function accountName(state) {
  const user = state.session?.user || {};
  const meta = user.user_metadata || {};
  // The company alias is an existing field in company_memberships. Do not use
  // another company's member record or expose raw numeric Discord identifiers.
  const membership = (state.memberships || []).find(member =>
    member.user_id === user.id && member.company_id === state.companyId && member.status !== 'inactive');
  const names = [membership?.alias_name, membership?.display_name, membership?.discord_display_name,
    meta.global_name, meta.name, meta.full_name, meta.preferred_username, meta.user_name, meta.username];
  const name = names.map(value => String(value ?? '').trim()).find(value => value && !/^\d+$/.test(value));
  return name || '내 계정';
}
function accountAvatar(state, displayName) {
  const meta = state.session?.user?.user_metadata || {};
  const candidate = meta.avatar_url || meta.picture;
  let avatar = '';
  try {
    const url = new URL(String(candidate || ''));
    if(url.protocol === 'https:' && ['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)) avatar = url.href;
  } catch { /* No valid Discord avatar: show a typographic avatar instead. */ }
  return avatar ? `<img src="${esc(avatar)}" alt="" width="35" height="35" loading="eager" referrerpolicy="no-referrer">`
    : `<span aria-hidden="true">${esc(Array.from(displayName)[0] || 'L')}</span>`;
}

function contentCard({title,description,image,tag,tagType='',action='',href='',disabled=false,footnote='',contentKey=''}) {
  const stateClass=tagType ? ` hub-feature__tag--${tagType}` : '';
  // Internal content uses the existing delegated button actions. External BUILD
  // has one native anchor with new-tab semantics, without navigating away from HUB.
  const active=Boolean((action || href) && !disabled);
  const open=!active ? `<article class="hub-feature hub-feature--pending">`
    : href ? `<a class="hub-feature hub-feature--interactive" href="${esc(href)}" ${href.startsWith("/build/") || href.startsWith("/cook/") ? "" : 'target="_blank" rel="noopener noreferrer"'} aria-label="${esc(title)} 열기">`
    : `<button type="button" class="hub-feature hub-feature--interactive" data-action="${esc(action)}" ${contentKey?`data-content-key="${esc(contentKey)}"`:''} aria-label="${esc(title)} ${action==='open-company-start'?'이용 안내':'열기'}">`;
  const close=!active ? '</article>' : href ? '</a>' : '</button>';
  return `${open}<span class="hub-feature__visual"><img src="${ASSETS}${image}" alt="" loading="eager" decoding="async"><span class="hub-feature__tag${stateClass}">${esc(tag)}</span></span>
    <span class="hub-feature__content"><span><strong class="hub-feature__name">${esc(title)}</strong><span class="hub-feature__description">${esc(description)}</span></span>${active?'<span class="hub-feature__enter" aria-hidden="true">→</span>':'<span class="hub-feature__pending" aria-hidden="true">준비 중</span>'}</span>${close}`;
}

export function renderHubHome(state) {
  const companies = state.companies || [];
  const current = companies.find(company => company.id === state.companyId) || null;
  const displayName = accountName(state);
  const avatar = accountAvatar(state, displayName);
  const owner = state.platformAdmin === true;
  const companyAction = current ? 'open-company-console' : 'open-company-start';
  // The hero is the only company CTA on the HUB home. A member of an existing
  // company must never see a new-company CTA, even if the creation RPC reports
  // eligibility (e.g. an administrator or a member who has not created one).
  const companyLabel = current ? '내 회사로 이동' : state.canCreateCompany === true ? '+ 회사 생성' : state.companyCreatePermissionError ? '회사 등록 안내' : '회사 가입 안내';
  // One account control for every member; platform administration remains
  // independent and appears only for the platform owner.
  const accountCompany = !current
    ? `<span class="hub-account__company hub-account__company--empty">회사 미설정</span>`
    : companies.length > 1
      ? `<details class="hub-account__company-switch"><summary class="hub-account__company" title="현재 회사: ${esc(current.name)}"><span>소속 회사</span><strong>${esc(current.name)}</strong>${chevron}</summary><div class="hub-account__company-menu" aria-label="회사 전환">${companies.map(company => `<button type="button" data-action="switch-company" data-company-id="${esc(company.id)}" ${company.id === state.companyId ? 'aria-current="true"' : ''}>${esc(company.name)}</button>`).join('')}</div></details>`
      : `<span class="hub-account__company" title="현재 회사: ${esc(current.name)}"><span>소속 회사</span><strong>${esc(current.name)}</strong></span>`;
  const subscription = state.currentSubscription;
  const access=state.companyAccess;
  const subscriptionDetails = current && !access?.can_use
    ? `<span>${state.companyAccessError?'이용권 확인 실패':access?.entitlement_enabled?'일시정지 또는 만료':'이용권 미부여'}</span>`
    : current && subscription
    ? `<span>플랜 <b>${esc(companyPlanName(subscription.plan))}</b></span><span>상태 <b>${esc(companyStatusName(subscription))}</b></span><span>종료일 <b>${esc(companySubscriptionEnd(subscription, value => new Intl.DateTimeFormat('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(value))))}</b></span>`
    : `<span>${current ? '이용권 정보가 없습니다. 새로고침해 주세요.' : '소속 회사 없음'}</span>`;
  const accountSubscription = `<section class="hub-account__subscription" aria-label="회사 통합 이용권"><strong>회사 통합 이용권</strong>${subscriptionDetails}${current ? '<button type="button" data-action="refresh-company-subscription">이용권 새로고침</button>' : ''}</section>`;
  const pendingPassCount=owner?(state.adminPassRequests||[]).filter(row=>row.status==='pending').length:0;
  const accountMenu = `<details class="hub-account__profile"><summary class="hub-account__trigger" aria-label="내 계정 메뉴 열기: ${esc(displayName)}"><span class="hub-account__avatar">${avatar}</span><span class="hub-account__identity"><strong>${esc(displayName)}</strong><small>${current ? esc(current.name) : '회사 미설정'}</small></span>${pendingPassCount?`<b class="hub-pass-alert__dot" aria-label="새 이용권 신청 ${pendingPassCount}건">${pendingPassCount}</b>`:''}${chevron}</summary><div class="hub-account__menu"><div class="hub-account__menu-head"><span class="hub-account__avatar hub-account__avatar--large">${avatar}</span><span><small>로그인 계정</small><strong>${esc(displayName)}</strong></span><button type="button" class="hub-account__close" data-action="close-account-menu" aria-label="계정 메뉴 닫기" title="닫기"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>${accountCompany}${accountSubscription}${owner?`<button type="button" class="hub-pass-alert" data-action="open-pass-requests"><span aria-hidden="true">🔔</span> 이용권 신청 알림 ${pendingPassCount?`<b>${pendingPassCount}건</b>`:'<small>새 신청 없음</small>'}</button>`:''}<button type="button" class="hub-logout" data-action="logout">로그아웃 <span aria-hidden="true">→</span></button></div></details>`;
  return `<div class="hub-home">
    <header class="hub-topbar"><div class="hub-topbar__inner">
      <span class="hub-wordmark"><img src="${ASSETS}mark.png" alt="" width="32" height="32"><strong>LAC HUB</strong></span>
      <div class="hub-account">${accountMenu}${owner?`<span class="hub-account__admin-divider" aria-hidden="true"></span><button type="button" class="hub-admin-link" data-action="open-platform-admin" title="플랫폼 운영자 관리 센터" aria-label="플랫폼 운영자 관리 센터">${settingsIcon}</button>`:''}</div>
    </div></header>
    <main class="hub-body">
      <section class="hub-hero" aria-labelledby="hub-headline"><div class="hub-hero__shade"></div><div class="hub-hero__copy"><span class="hub-kicker">LAC HUB</span><h1 id="hub-headline">LAC를 즐기는<br><em>더 편리한 방법</em></h1><p>게임 정보와 다양한 편의 기능을<br>LAC HUB에서 만나보세요.</p><div class="hub-hero__actions"><button type="button" class="hub-cta hub-cta--primary" data-action="${companyAction}">${companyLabel} <span aria-hidden="true">→</span></button></div></div></section>
      ${renderHubNewsStrip(state)}
      <section class="hub-contents" id="hub-contents" aria-labelledby="hub-contents-title"><div class="hub-contents__title"><div><h2 id="hub-contents-title">LAC 콘텐츠</h2></div></div>
        ${!state.contentPoliciesLoaded?'<p class="hub-content-policy-note" role="status">콘텐츠 이용 조건을 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>':''}
        <div class="hub-features">
          ${contentIsVisible(state,'game_info')?contentCard({title:'게임 정보',description:'게임 관련 정보와 자료를 한곳에서 확인하세요.',image:'game.webp',tag:contentCardStatus(state,'game_info'),tagType:contentCardStatus(state,'game_info')==='자유 이용'?'free':contentCardStatus(state,'game_info')==='이용 가능'?'available':contentCardStatus(state,'game_info')==='이용 신청'?'request':contentCardStatus(state,'game_info')==='이용 제한'?'restricted':'company',action:canOpenWebContent(state,'game_info')?'open-hub-game-info':current?'open-paid-content-guide':'open-company-start-game',contentKey:'game_info'}):''}
          ${contentIsVisible(state,'lac_build')?contentCard({title:HUB_CONTENT.build.name,description:'개조서를 미리 조합하고 구성을 살펴보세요.',image:'build.webp',tag:contentCardStatus(state,'lac_build'),tagType:contentCardStatus(state,'lac_build')==='자유 이용'?'free':contentCardStatus(state,'lac_build')==='이용 가능'?'available':contentCardStatus(state,'lac_build')==='이용 신청'?'request':contentCardStatus(state,'lac_build')==='이용 제한'?'restricted':'company',href:canOpenWebContent(state,'lac_build')?BUILD_PUBLIC_URL:'',action:canOpenWebContent(state,'lac_build')?'':current?'open-paid-content-guide':'open-company-start',contentKey:'lac_build'}):''}
          ${contentIsVisible(state,'company_management')?contentCard({title:HUB_CONTENT.company.name,description:'멤버·계좌·자산, 회사 운영을 한곳에서.',image:'company.webp',tag:contentCardStatus(state,'company_management'),tagType:contentCardStatus(state,'company_management')==='이용 가능'?'available':contentCardStatus(state,'company_management')==='이용 신청'?'request':contentCardStatus(state,'company_management')==='이용 제한'?'restricted':'company',action:companyAction}):''}
          ${contentIsVisible(state,'lac_cook')?contentCard({title:HUB_CONTENT.cook.name,description:'요리 제작 계산과 작업을 간편하게 관리하세요.',image:'cook.webp',tag:contentCardStatus(state,'lac_cook'),tagType:contentCardStatus(state,'lac_cook')==='자유 이용'?'free':contentCardStatus(state,'lac_cook')==='이용 가능'?'available':contentCardStatus(state,'lac_cook')==='이용 신청'?'request':contentCardStatus(state,'lac_cook')==='이용 제한'?'restricted':'company',href:'/cook/'}):''}
        </div>
      </section>
      <footer class="hub-footer" aria-label="저작권 및 콘텐츠 안내">
        <div class="hub-footer__brand"><strong>© 2026 LAC HUB</strong><span>PLAY TOGETHER</span></div>
        <div class="hub-footer__legal">
          <p>LAC와 관련하여 사용된 게임 내 이미지, 로고 및 원본 콘텐츠의 저작권은 클러치게이밍에 있습니다.</p>
          <p>일부 시각 자료는 원본 게임 자료를 바탕으로 AI 기술을 활용해 새롭게 구성되었습니다.</p>
          <small>LAC HUB의 자체 제작 UI 및 편집 디자인의 무단 복제·재배포를 금합니다.</small>
        </div>
      </footer>
    </main>
  </div>`;
}
