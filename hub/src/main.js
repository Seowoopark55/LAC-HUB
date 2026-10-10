import './styles.css';
import {loadLayoutStudioProfile, saveLayoutStudioProfile, clearLayoutStudioProfile, applyLayoutStudioProfile, applyLayoutStudioPreset, adjustLayoutStudioValue} from './ui/layoutStudio.js';
import { envReady, supabase } from './lib/supabase.js';
import { memberChanges } from './lib/memberChanges.js';
import {loadHubBoardList,createHubTicket,loadHubTicket,replyHubTicket,setHubTicketStatus,publishHubNotice,updateHubNotice,deleteHubNotice,deleteHubTicket,checkHubBoardFiles,uploadHubBoardFiles,hubBoardImageUrl,checkHubNoticeImages,uploadHubNoticeImage,hubNoticeImageUrl,removeHubNoticeImages,notifyPlatformInbox} from './lib/hubBoardApi.js';
import {noticeBodyForEditor,serializeNoticeEditorBody,noticeImagePaths,markerForNoticeImage} from './lib/hubNoticeMedia.js';
import {
  getSession, refreshSession, signInWithDiscord, signOut, onAuthStateChange,
  listCompanies, createCompany, claimDiscordMemberships, getMemberships, updateMembershipDetails, updateMembershipAlias, updateCompanyName,
  getModuleCatalog, getCompanyModules, setCompanyModule, updateCompanyModuleSettings,
  getCookingOrderTypes, saveCookingOrderType, setCookingOrderTypeEnabled, getCookingDiscordConfig, saveCookingDiscordGuide,
  getCompanySettings, updateCompanySettings,
  getDiscordConnection, getDiscordChannels, getDiscordRoles, getDiscordCompanyConfig, saveCompanyAiChannel, saveDiscordCompanyConfig,
  getFundAdminRequests, getFundAdminPeriodStatus, reviewFundRequest, cancelFundApproval, setFundFeeRule, getFundEvidenceSignedUrl, uploadFundEvidence, removeUnclaimedFundEvidence,
  startDiscordConnection, startDiscordPermissionReapproval, completeDiscordConnection, createGuidedSetupChannels, getQuestionBoard, createSupportQuestion, getSupportQuestion, addSupportQuestionMessage, updateQuestionStatus, markSupportQuestionSeen, getPlatformSupportQuestions, notifySupportQuestionAnswer, uploadSupportAttachment, attachSupportQuestionFile, getSupportAttachmentSignedUrl, removeSupportAttachments, deleteSupportQuestion, listGuidedSetupMembers, bulkRegisterDiscordMembers, registerDiscordMember, getCompanyOnboardingStatus, requestCompanyDiscordReconnect,
  getFundTreasurySnapshot, saveFundLedgerEntry, cancelFundLedgerEntry, getFundLedgerAttachments, attachFundLedgerEvidence,
  isPlatformAdmin, canCreateCompany, getPlatformCompanies, getCompanySubscription, managePlatformPassLifecycle, listPlatformPassLifecycle, deletePlatformCompany, listPlatformContentSettings, updatePlatformContentSetting, listWebContentPolicies,
  getWebAssetsSnapshot, saveWebAsset, manageWebAsset,
  getWebAccountsSnapshot, submitWebAccountRequest, reviewWebAccountRequest, getCombatOverview, getCombatMember,
  getSuggestionBoard, createSuggestion, getSuggestion, addSuggestionMessage, updateSuggestionStatus, markSuggestionSeen,
  getPlatformSuggestions, notifySuggestionAnswer, uploadSuggestionAttachment, attachSuggestionFile, getSuggestionAttachmentSignedUrl, getPlatformBuildReports, reviewPlatformBuildReport, getPlatformBuildReportEvidenceUrl,
  removeSuggestionAttachments, deleteSuggestion, getGameInformation, getGlobalModbooks, getMyCompanyAccess, listPlatformCompanyAccess,
  saveGameInfoAdminRow, getGameInfoAdminHistory, uploadGameInfoAdminImage, cleanupUnlinkedGameInfoAdminImage, listPlatformModbookRequests, reviewPlatformModbookRequest, deleteModbookMaster,
  createCompanyPassRequest, updateCompanyPassRequest, cancelCompanyPassRequest, getCompanyPassRequest, listAdminPassRequests, adminUpdateCompanyPassRequest, setAdminCompanyPassApplicationBlock, reviewCompanyPassRequest, notifyPassRequestOwner,
} from './lib/productApi.js';
import { renderShell, renderCookRegistration, canAdmin, currentMembership, moduleEnabled, moduleRow } from './ui/render.js';
import { renderInfoPage, setGameInfoImageMap } from './ui/infoPage.js';
import { GAME_ADMIN_SCHEMAS, GAME_ADMIN_TABLES, GAME_ADMIN_IMAGE_TABLES, renderGameInfoAdmin } from './ui/gameInfoAdmin.js';
import {canOpenWebContent,contentIsVisible,hasCompany,hasUnifiedPass,companySetupComplete} from './platform/contentPolicy.js';
import {renderCompanyPassNotice} from './platform/unifiedPassGuide.js';
import { readPrimaryScreen, recordPrimaryScreen, replacePrimaryScreen, routeForPathname, routePathForScreen, AUTH_RETURN_STORAGE_KEY, safeInternalReturnPath } from './platform/screenHistory.js';

const root = document.querySelector('#app');
const MODBOOK_REVIEW_STORAGE_KEY='lac_hub_pending_modbook_review_v1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPANY_CONTEXT_FRESH_MS=60_000;
let companyDataLoadPromise=null;
let companyDataLoadCompanyId='';
const companyPageLoadPromises=new Map();
function pendingModbookReviewId(){
  const fromUrl=String(new URLSearchParams(window.location.search).get('modbook-review')||'').trim();
  if(UUID_RE.test(fromUrl)){try{sessionStorage.setItem(MODBOOK_REVIEW_STORAGE_KEY,fromUrl);}catch{}return fromUrl;}
  try{const stored=String(sessionStorage.getItem(MODBOOK_REVIEW_STORAGE_KEY)||'').trim();return UUID_RE.test(stored)?stored:'';}catch{return '';}
}
function clearPendingModbookReviewId(){
  try{sessionStorage.removeItem(MODBOOK_REVIEW_STORAGE_KEY);}catch{}
  try{const u=new URL(window.location.href);u.searchParams.delete('modbook-review');window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}catch{}
}
// Preserve a DM deep link across Discord OAuth, which intentionally returns to '/'.
pendingModbookReviewId();
const isBuildRoute = () => /^\/build(?:\/|$)/.test(window.location.pathname);
const isCookRoute = () => /^\/cook(?:\/|$)/.test(window.location.pathname);
let embeddedHost = null;
let embedLoadPromise = null;
let cookHost = null;
let cookFrame = null;

function switchVisibleApp(buildActive) {
  document.documentElement.classList.toggle('lac-build-route', buildActive);
  root.hidden = buildActive;
  if (embeddedHost) embeddedHost.hidden = !buildActive;
  if (cookHost) cookHost.hidden = true;
  document.documentElement.classList.remove('lac-cook-route');
  if (!buildActive) document.title = 'LAC HUB';
}

function showEmbeddedBuild({ push = false } = {}) {
  if (push && !isBuildRoute()) {
    window.history.pushState({ axeTab: 'home' }, '', '/build/');
    window.dispatchEvent(new Event('lac:build-route-change'));
  }
  if (!embeddedHost) {
    embeddedHost = document.createElement('section');
    embeddedHost.id = 'lac-build-host';
    embeddedHost.setAttribute('aria-label', '개조서 세팅');
    root.insertAdjacentElement('afterend', embeddedHost);
  }
  switchVisibleApp(true);
  if (!embedLoadPromise) {
    embeddedHost.textContent = '개조서 세팅 화면을 준비하고 있습니다…';
    embedLoadPromise = import('./buildEmbed.jsx')
      .then(({ mountEmbeddedBuild }) => {
        embeddedHost.textContent = '';
        mountEmbeddedBuild(embeddedHost);
        embeddedHost.hidden = !isBuildRoute();
      })
      .catch((error) => {
        console.error('LAC BUILD embedded startup failed', error);
        embeddedHost.textContent = 'BUILD 화면을 시작하지 못했습니다. 새로고침해 주세요.';
        embedLoadPromise = null;
      });
  }
}

function showCookRegistrationFeedback(message,isError=false){
  const el=cookHost?.querySelector('[data-cook-registration-feedback]');
  if(!el)return;
  el.hidden=false;el.textContent=message;
  el.classList.toggle('is-error',isError);
}

// First-party COOK route. Recipe catalog is a bundled snapshot and cloud writes
// remain disabled until a separately approved, tested Supabase migration.
function showCookPreview({ push = false } = {}) {
  if (push && !isCookRoute()) window.history.pushState({ lac_hub_primary_screen_v1: 'hub' }, '', '/cook/');
  if (!isCookRoute()) return;
  if (!cookHost) {
    cookHost=document.createElement('section');
    cookHost.id='lac-cook-host';
    cookHost.setAttribute('aria-label','요리 계산기');
    root.insertAdjacentElement('afterend',cookHost);
    // Close the on-page screenshot dialog by clicking its backdrop; native
    // <dialog> handles Escape and restores keyboard focus to the opener.
    cookHost.addEventListener('click', event=>{
      const dialog=cookHost.querySelector('[data-cook-preview-dialog]');
      if(dialog?.open && event.target===dialog)dialog.close();
    });
    // COOK has its own route: keep preview/registration actions inside COOK.
    cookHost.addEventListener('click', async event=>{
      const button=event.target.closest('button[data-action]');
      if(!button||!cookHost.contains(button))return;
      const action=button.dataset.action;
      if(action==='cook-hub-return'){
        event.preventDefault();
        // COOK is mounted inside the current SPA. Returning to the HUB must not
        // perform a full document navigation, otherwise the global startup loader
        // flashes while session/company state is bootstrapped again.
        navigatePrimaryScreen('hub',{replace:true});
        switchVisibleApp(false);
        render();
        window.scrollTo(0,0);
        return;
      }
      if(action==='cook-preview-open'){
        event.preventDefault();
        const dialog=cookHost.querySelector('[data-cook-preview-dialog]');
        if(dialog && !dialog.open)dialog.showModal();
        return;
      }
      if(action==='cook-preview-close'){
        event.preventDefault();
        cookHost.querySelector('[data-cook-preview-dialog]')?.close();
        cookHost.querySelector('[data-action="cook-preview-open"]')?.focus({preventScroll:true});
        return;
      }
      if(!['open-create-company','copy-registration-info','check-member-registration','open-pass-application','edit-pass-application','cancel-pass-application'].includes(action))return;
      event.preventDefault();
      if(!state.session?.user){showCookRegistrationFeedback('먼저 Discord로 로그인해 주세요.',true);return;}
      if(action==='open-pass-application'||action==='edit-pass-application'){
        state.requestedContent='요리 계산기';
        navigatePrimaryScreen('paid-content-guide');
        state.modal={type:'pass-application',editing:action==='edit-pass-application'};
        switchVisibleApp(false);render();window.scrollTo(0,0);
        return;
      }
      if(action==='cancel-pass-application'){
        const requestId=String(state.companyPassRequest?.id||'');
        if(!requestId){showCookRegistrationFeedback('취소할 신청을 찾지 못했습니다.',true);return;}
        if(!window.confirm('현재 회사 이용 신청을 취소할까요? 취소 후 6시간 동안 재신청할 수 없습니다.'))return;
        button.disabled=true;
        try{
          await cancelCompanyPassRequest(requestId);
          state.companyPassRequest=await getCompanyPassRequest(state.companyId);
          showCookPreview();
          showCookRegistrationFeedback('이용 신청을 취소했습니다. 6시간 후 다시 신청할 수 있습니다.');
        }catch(error){showCookRegistrationFeedback(String(error?.message||'신청을 취소하지 못했습니다.'),true);}
        finally{if(button.isConnected)button.disabled=false;}
        return;
      }
      if(action==='copy-registration-info'){
        const user=state.session.user,meta=user.user_metadata||{};
        const discordId=String(meta.provider_id||meta.sub||user.identities?.find?.(row=>String(row?.provider||'').toLowerCase()==='discord')?.identity_data?.sub||'').trim();
        const discordName=String(meta.full_name||meta.global_name||meta.name||meta.user_name||meta.preferred_username||'Discord 사용자').trim();
        if(!discordId){showCookRegistrationFeedback('Discord ID를 확인하지 못했습니다. 다시 로그인해 주세요.',true);return;}
        try{
          await navigator.clipboard.writeText(`회사 대표·관리자에게 멤버 등록 요청\nDiscord 이름: ${discordName}\nDiscord ID: ${discordId}`);
          showCookRegistrationFeedback('회사 대표·관리자에게 전달할 요청 정보를 복사했습니다.');
        }catch{showCookRegistrationFeedback('복사하지 못했습니다. 화면에 표시된 Discord ID를 직접 전달해 주세요.',true);}
        return;
      }
      if(action==='open-create-company'){
        if(state.companies?.length){showCookRegistrationFeedback('이미 소속 회사가 있습니다. 회사 대표에게 콘텐츠 이용 권한을 문의해 주세요.',true);return;}
        button.disabled=true;
        try{
          state.canCreateCompany=await canCreateCompany();state.companyCreatePermissionError=false;
          if(!state.canCreateCompany){showCookRegistrationFeedback('회사 생성 권한이 없습니다. 운영자에게 문의해 주세요.',true);return;}
          // Opening the real company-creation form is an explicit action;
          // the registration instructions themselves always stay within COOK.
          state.companyStartSource='company';
          navigatePrimaryScreen('company-start');
          state.modal={type:'create-company'};
          switchVisibleApp(false);render();window.scrollTo(0,0);
        }catch(error){showCookRegistrationFeedback(String(error?.message||'회사 생성 권한을 확인하지 못했습니다.'),true);}
        finally{if(button.isConnected)button.disabled=false;}
        return;
      }
      if(action==='check-member-registration'){
        // Checking registration must not automatically mount or navigate into COOK.
        button.disabled=true;
        try{
          await claimDiscordMemberships();
          await loadCompanies();
          if(!state.companies?.length){
            showCookRegistrationFeedback('아직 회사에서 등록한 멤버가 아닙니다. 대표·관리자에게 등록을 요청해 주세요.',true);
            return;
          }
          await loadCompanyData();
          if(!currentMembership(state)){
            showCookRegistrationFeedback('현재 계정의 회사 멤버 권한을 확인하지 못했습니다. 대표·관리자에게 문의해 주세요.',true);
            return;
          }
          await loadWebContentPolicies();
          if(!hasUnifiedPass(state)) { showCookRegistrationFeedback('회사 소속을 확인했습니다. 회사 이용 승인이 필요합니다.');return; }
          showCookRegistrationFeedback('회사 소속을 확인했습니다. HUB에서 회사 이용 승인 상태를 확인해 주세요.');
          // Keep the preview mounted on this click. A separate navigation
          // performs the ordinary content-entry check again.
        }catch(error){showCookRegistrationFeedback(String(error?.message||'멤버 등록 확인에 실패했습니다.'),true);}
        finally{if(button.isConnected)button.disabled=false;}
      }
    });

  }
  // Do not mount the working COOK iframe before authenticated policy and company
  // state have finished loading. Clearing it on revocation avoids a stale frame.
  const allowed=state.ready && canOpenWebContent(state,'lac_cook');
  if (!allowed) {
    if(cookFrame){cookFrame.remove();cookFrame=null;}
    const loggedIn=Boolean(state.session?.user);
    const pending=loggedIn && !state.ready;
    const published=contentIsVisible(state,'lac_cook');
    cookHost.innerHTML=`<section class="lac-cook-gate" aria-label="요리 계산기 이용 안내">
      <div class="lac-pass-landing__top"><button type="button" class="lac-cook-gate__back lac-pass-back" data-action="cook-hub-return" aria-label="LAC HUB 메인으로 돌아가기"><span class="lac-pass-back__icon" aria-hidden="true">←</span><span>LAC HUB로 돌아가기</span></button><span class="lac-pass-landing__context">요리 계산기 <span aria-hidden="true">·</span> 이용 안내</span></div>
      <span class="lac-cook-gate__eyebrow">요리 계산기 · 화면 예시</span>
      <h1>${pending?'이용 조건을 확인하고 있어요.':!loggedIn?'Discord 로그인 후 이용할 수 있어요.':!state.contentPoliciesLoaded?'이용 조건을 확인하지 못했어요.':!published?'현재 요리 계산기를 이용할 수 없어요.':'요리 계산기, 이렇게 이용할 수 있어요.'}</h1>
      <p>${published&&state.contentPoliciesLoaded?'요리를 선택하면 필요한 재료와 작업 수량을 한눈에 정리할 수 있어요.':'LAC HUB 메인에서 현재 이용 가능한 콘텐츠를 확인해 주세요.'}</p>
      <section class="lac-cook-registration" aria-label="요리 계산기 회사 등록 안내">
        ${hasCompany(state)?renderCompanyPassNotice(state,'요리 계산기',true):renderCookRegistration(state)}
        <p class="lac-cook-registration__feedback" data-cook-registration-feedback role="status" aria-live="polite" hidden></p>
      </section>
      <figure class="lac-cook-shot lac-preview-frame" aria-label="요리 계산기 실제 이용 화면 미리보기">
        <div class="lac-preview-frame__head"><div><strong>요리 계산기 화면 미리보기</strong><small>실제 이용 화면을 촬영한 이미지</small></div><span>화면 캡처</span></div>
        <button type="button" class="lac-cook-shot__open" data-action="cook-preview-open" aria-haspopup="dialog" aria-controls="lac-cook-preview-dialog" aria-label="이 페이지에서 요리 계산기 실제 이용 화면 크게 보기">
          <img src="/hub/lac-cook-screen-preview.png" alt="요리 검색, 작업 목록, 제작 레시피 및 재료 구매 리스트가 함께 보이는 요리 계산기 실제 화면" loading="lazy">
          <span class="lac-cook-shot__zoom">＋ 화면 전체 보기</span>
        </button>
        <figcaption>요리 제작부터 재료 구매 리스트까지 실제 화면으로 살펴보세요. 이미지를 누르면 이 페이지에서 확대됩니다.</figcaption>
      </figure>
      <dialog id="lac-cook-preview-dialog" class="lac-cook-preview-dialog" data-cook-preview-dialog aria-label="요리 계산기 실제 화면 확대 보기">
        <div class="lac-cook-preview-dialog__head"><strong>요리 계산기 · 실제 이용 화면</strong><button type="button" data-action="cook-preview-close" aria-label="확대 화면 닫기">닫기 ×</button></div>
        <img src="/hub/lac-cook-screen-preview.png" alt="요리 계산기의 요리 검색, 작업 목록, 제작 레시피 및 재료 구매 리스트 전체 화면">
      </dialog>
      ${(!loggedIn||!state.contentPoliciesLoaded||!published)?`<p class="lac-cook-gate__hint">${!loggedIn?'HUB 메인에서 Discord 로그인을 진행해 주세요.':!state.contentPoliciesLoaded?'설정 조회에 실패했습니다. 잠시 후 다시 접속해 주세요.':'운영자가 콘텐츠를 다시 공개하면 이용할 수 있어요.'}</p>`:''}

    </section>`;
  } else if (!cookFrame) {
    cookHost.replaceChildren();
    cookFrame=document.createElement('iframe');
    cookFrame.title='요리 계산기';
    cookFrame.src='/cook-preview/index.html?lacCookHostPreview=1';
    cookFrame.setAttribute('referrerpolicy','same-origin');
    cookHost.append(cookFrame);
  }
  switchVisibleApp(false);
  document.documentElement.classList.add('lac-cook-route');
  root.hidden=true;
  cookHost.hidden=false;
  document.title='요리 계산기';
}

window.addEventListener('message', event => {
  if (!cookFrame || !isCookRoute() || event.origin !== window.location.origin ||
      event.source !== cookFrame.contentWindow ||
      !event.data || typeof event.data !== 'object' || Array.isArray(event.data) ||
      event.data.type !== 'lac-cook:hub-return:v1') return;
  navigatePrimaryScreen('hub');
  switchVisibleApp(false);
  render();
  window.scrollTo(0, 0);
});

// COOK report bridge. The iframe never receives HUB credentials; the authenticated
// parent creates the private HUB ticket and returns only success/failure.
window.addEventListener('message', async event => {
  if (!cookFrame || !isCookRoute() || event.origin !== window.location.origin ||
      event.source !== cookFrame.contentWindow || !event.data || typeof event.data !== 'object' ||
      Array.isArray(event.data) || event.data.type !== 'lac-cook:report:request:v1') return;
  const requestId=String(event.data.requestId||'');
  const payload=event.data.payload;
  if(!requestId || requestId.length>80 || !payload || typeof payload!=='object' || Array.isArray(payload))return;
  const reply=result=>{ if(event.source===cookFrame?.contentWindow)event.source.postMessage({type:'lac-cook:report:response:v1',requestId,...result},event.origin); };
  try{
    if(!state.session?.user)throw new Error('제보하려면 HUB 로그인이 필요합니다.');
    const reportType=['edit','add','report'].includes(String(payload.type||''))?String(payload.type):'report';
    const name=String(payload.name||'').trim();
    const detail=String(payload.detail||'').trim();
    if(name.length<1||name.length>90||detail.length<2||detail.length>2500)throw new Error('요리명과 제보 내용을 확인해 주세요.');
    const labels={edit:'레시피 수정 제안',add:'레시피 추가 제안',report:'요리 제보'};
    const title=`${labels[reportType]} · ${name}`.slice(0,120);
    const body=`요리명: ${name}\n\n${detail}`;
    const ticketId=await createHubTicket({contentKey:'cook',category:reportType==='edit'?'bug':'suggestion',title,body});
    notifyPlatformInbox('hub_ticket',ticketId).catch(()=>({sent:false}));
    if(state.platformAdmin){await Promise.all([loadHubBoard(),loadPlatformBuildReports()]);}
    reply({ok:true,ticketId});
  }catch(error){reply({ok:false,error:String(error?.message||'요리 제보를 접수하지 못했습니다.')});}
});

// COOK recipe editor bridge. The iframe receives no session, token or service key.
// This UI guard is additional only: Supabase RLS independently validates admin rights.
window.addEventListener('message', async event => {
  if (!cookFrame || !isCookRoute() || event.origin !== window.location.origin ||
      event.source !== cookFrame.contentWindow ||
      !event.data || typeof event.data !== 'object' || Array.isArray(event.data) ||
      event.data.type !== 'lac-cook:recipes:request:v1') return;
  const { requestId, action, payload } = event.data;
  if (typeof requestId !== 'string' || requestId.length > 80 ||
      !['list', 'save', 'process-save'].includes(action)) return;
  const reply = (result) => {
    if (event.source === cookFrame?.contentWindow)
      event.source.postMessage({ type:'lac-cook:recipes:response:v1',requestId,...result },event.origin);
  };
  try {
    if (!supabase) throw Error('Supabase 연결이 준비되지 않았습니다.');
    if (action === 'list') {
      const { data, error } = await supabase.from('lac_cook_recipe_entries')
        .select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version')
        .order('food_name');
      if (error) throw error;
      const { data: authData } = await supabase.auth.getSession();
      const canEdit = Boolean(authData?.session?.user && await isPlatformAdmin());
      const processQuery = await supabase.from('lac_cook_process_entries')
        .select('process_material_name,result_qty,process_time,ingredients,source_kind,version')
        .order('process_material_name');
      // An uninstalled optional process table must not disable food recipe editing.
      reply({ok:true,entries:data || [],canEdit,
        processReady:!processQuery.error,processEntries:processQuery.data || [],
        processError:processQuery.error ? '가공 편집용 DB를 연결하지 못했습니다. SQL 적용 상태를 확인해 주세요.' : ''});
      return;
    }
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user || !(await isPlatformAdmin()))
      throw Error('레시피 등록과 수정은 플랫폼 관리자 계정에서만 가능합니다.');
    if (action === 'process-save') {
      const record = payload?.entry;
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('가공 데이터 형식을 확인해 주세요.');
      const name=String(record.process_material_name||'').trim(), parts=record.ingredients;
      const output=Number(record.result_qty), processTime=String(record.process_time||'').trim();
      if (name.length<1 || name.length>90 || !Number.isSafeInteger(output) || output<1 || output>100000 ||
          processTime.length>40 || !['new','override'].includes(record.source_kind) ||
          !(parts===null && record.source_kind==='override' ||
            Array.isArray(parts) && parts.length>=1 && parts.length<=24 &&
            parts.every(p=>typeof p?.name==='string' && p.name.trim() && p.name.length<=90 &&
              Number.isSafeInteger(p.qty) && p.qty>=1 && p.qty<=999999 && p.name.trim()!==name) &&
            new Set(parts.map(p=>p.name.trim().toLocaleLowerCase('ko'))).size===parts.length)
          ) throw Error('가공 1회 생산량 및 투입 재료를 확인해 주세요.');
      const entry={process_material_name:name,result_qty:output,process_time:processTime,
        ingredients:parts===null?null:parts.map(p=>({name:p.name.trim(),qty:p.qty})),source_kind:record.source_kind};
      let result;
      if(payload?.expectedVersion != null){
        const version=Number(payload.expectedVersion);
        if(!Number.isSafeInteger(version)||version<1||version>2147483645)throw Error('가공식 버전이 올바르지 않습니다.');
        result=await supabase.from('lac_cook_process_entries')
          .update({...entry,version:version+1,updated_at:new Date().toISOString()})
          .eq('process_material_name',name).eq('version',version)
          .select('process_material_name,result_qty,process_time,ingredients,source_kind,version').maybeSingle();
        if(!result.error&&!result.data)throw Error('다른 곳에서 가공식이 먼저 수정되었습니다. 최신 데이터를 다시 불러오세요.');
      }else{
        result=await supabase.from('lac_cook_process_entries').insert(entry)
          .select('process_material_name,result_qty,process_time,ingredients,source_kind,version').single();
      }
      if(result.error)throw result.error;
      reply({ok:true,entry:result.data});return;
    }
    const record = payload?.entry;
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('레시피 형식을 확인해 주세요.');
    const foodId=String(record.food_id||'');
    const name=String(record.food_name||'').trim();
    const count=Number(record.set_qty), seconds=Number(record.cook_time);
    const parts=record.ingredients;
    if (foodId.length<5 || foodId.length>90 || name.length<1 || name.length>90 ||
        !Number.isSafeInteger(count) || count<1 || count>100000 ||
        !Number.isFinite(seconds) || seconds<0 || seconds>86400 ||
        !Array.isArray(parts) || parts.length<1 || parts.length>24 ||
        parts.some(part=>typeof part?.name!=='string' || !part.name.trim() || part.name.length>90 ||
          !Number.isSafeInteger(part.qty) || part.qty<1 || part.qty>999999) ||
        !['new','override'].includes(record.source_kind)) throw Error('입력된 레시피 정보를 확인해 주세요.');
    const entry={food_id:foodId,food_name:name,set_qty:count,cook_time:seconds,
      ingredients:parts.map(part=>({name:part.name.trim(),qty:part.qty})),source_kind:record.source_kind};
    let result;
    if (payload?.expectedVersion != null) {
      const version=Number(payload.expectedVersion);
      if (!Number.isSafeInteger(version) || version<1) throw Error('레시피 변경 버전이 올바르지 않습니다.');
      result=await supabase.from('lac_cook_recipe_entries').update(entry)
        .eq('food_id',foodId).eq('version',version)
        .select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').maybeSingle();
      if (!result.error && !result.data) throw Error('다른 곳에서 레시피가 먼저 수정되었습니다. 최신 자료를 다시 불러와 주세요.');
    } else {
      result=await supabase.from('lac_cook_recipe_entries').insert(entry)
        .select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').single();
    }
    if (result.error) throw result.error;
    reply({ok:true,entry:result.data});
  } catch(error) {
    reply({ok:false,error:String(error?.message || '레시피 요청을 처리하지 못했습니다.')});
  }
});

// Intercept first-party BUILD and COOK cards. Preserve native browser gestures
// and existing HUB delegated actions for company / administration content.
root.addEventListener('click', async (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const anchor = event.target instanceof Element ? event.target.closest('a[href="/build/"], a[href="/cook/"]') : null;
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  event.preventDefault();
  event.stopPropagation();
  if (anchor.getAttribute('href') === '/cook/') {
    if(hasCompany(state)) {
      if(state.companyAccessStatus!=='ready')state.companyAccessStatus='loading';
      try { state.companyAccess=await getMyCompanyAccess(state.companyId);state.companyAccessError='';state.companyAccessStatus='ready';state.companyAccessCheckedAt=Date.now(); }
      catch(error){state.companyAccess=null;state.companyAccessError=String(error?.message||error||'이용권 조회 실패');state.companyAccessStatus='error';state.companyAccessCheckedAt=Date.now();}
    }
    await loadWebContentPolicies();
    showCookPreview({ push: true });
  } else {
    showEmbeddedBuild({ push: true });
  }
  window.scrollTo(0, 0);
}, true);
window.addEventListener('lac:navigate-hub', () => {
  if (!isBuildRoute()) return;
  navigatePrimaryScreen('hub');
  switchVisibleApp(false);
  render();
  window.scrollTo(0, 0);
});
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const validPages = ['paid-content-guide','hub','hub-board','dashboard','fund','members','assets','accounts','questions','suggestions','settings','platform','combat','game-info','layout'];

const state = {
  envReady,
  session: null,
  companies: [],
  companyId: localStorage.getItem('axe_product_company_id') || null,
  memberships: [],
  moduleCatalog: [],
  modules: [],
  cookingOrderTypes: [],
  cookingDiscordConfig: null,
  companySettings: null,
  discordConnection: null,
  discordChannels: [],
  discordRoles: [],
  discordCompanyConfig: null,
  onboardingStatus: null,
  page: 'hub', requestedContent:'회사 관리', hubContentCategory:'main',
  fundTab: localStorage.getItem('axe_product_fund_tab') || 'ledger',
  fundMonth: currentMonth,
  fundWeeklyMonth: currentMonth,
  currentMonth,
  fundSnapshot: null,
  fundRequests: [],
  fundMonthlyRows: [],
  fundWeeklyFee: 0,
  fundWeeklyLoading: false,
  fundFilters: { person:'all', type:'all', account:'all' }, fundLedgerPage:1, fundReviewPage:1,
  memberFilter: 'all', memberRole:'', memberQuery:'', memberPage:1,
  assetTab: 'assets', assetQuery:'', assetCategory:'', assetStatus:'', assetPage:1, returnPage:1, assetsSnapshot:null,
  accountQuery:'', accountStatus:'', accountPage:1, accountsSnapshot:null,
  combat:{overview:null,detail:null,selectedMembershipId:'',period:'30d',rankMode:'kd',loading:false,detailLoading:false,error:''},
  platformAdmin:false, canCreateCompany:false, companyCreatePermissionError:false, platformSnapshot:[], platformSupport:{counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''}, platformSuggestions:{counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''}, platformBuildReports:{items:[],error:''}, platformInboxFilter:'all', platformQuery:'', platformStatus:'all', platformPage:1, platformView:'companies', platformContentSettings:null, platformContentError:'', contentPolicies:[], contentPoliciesLoaded:false, contentPolicyError:'', currentSubscription:null, companyAccess:null, companyAccessError:'', companyAccessStatus:'idle', companyAccessCheckedAt:0, companyDataCompanyId:'', companyDataLoadedAt:0, companyDataLoading:false, platformCompanyAccess:[], companyPassRequest:null, companyPassRequestError:'', adminPassRequests:[], adminPassRequestsError:'', adminPassView:'pending', adminPassPage:1, adminPassQuery:'', adminPassExpandedCompanies:{},
  fundLedgerAttachments:[], ledgerPendingFiles:[],
  settingsTab: localStorage.getItem('axe_product_settings_tab') || 'basic',
  questionBoard: { configured:true, counts:{ pending:0, checking:0, complete:0, unread:0, mine:0, total:0 }, items:[], error:'' }, questionStatus:'all', questionScope:'all', questionPage:1,
  suggestionBoard: { configured:true, private:true, counts:{ pending:0, checking:0, complete:0, unread:0, total:0 }, items:[], error:'' }, suggestionStatus:'all', suggestionCategory:'all', suggestionPage:1,
  hubBoard:{notices:[],tickets:[],ticket:null,files:[],mode:'list',tab:'support',filterContent:'all',filterCategory:'all',noticeId:null,noticeMedia:[],noticeMediaSeq:0,noticeEditorBody:'',noticeUploading:false,noticeCaret:0,error:'',userId:null},
  info: { table:'info_crafts', craftGroup:'근접무기', modbookCategory:'', query:'', selectedId:'', filterPrimary:'__all__', filterSecondary:'__all__', showInactive:false, loading:false, loaded:false, error:'', modbookError:'', companyId:null, data:{} },
  gameAdminOpen:false,gameAdmin:{table:'info_crafts',selectedId:'',mode:'',query:'',showInactive:false,dirty:false,showHistory:false,history:[],historyError:'',requestMode:false,requests:[],requestsLoading:false,requestsError:'',requestSelectedId:''},
  cookingQuery:'', cookingStatus:'all', cookingPage:1,
  questionPendingFiles: [],
  suggestionPendingFiles: [],
  supportImageViewer: null,
  companyMenuOpen: false,
  accountMenuOpen: false,
  layoutDraft: loadLayoutStudioProfile(), layoutSaved: loadLayoutStudioProfile(), layoutDirty: false, layoutAdvanced: false, issuedCompanyCode: '',
  modal: null,
  setupDemo: null,
  testCenter: null,
  setupGuide: null,
  setupGuideDismissed: false,
  loading: false,
  ready: false,
  error: '',
  notice: '',
};

applyLayoutStudioProfile(state.layoutSaved);

let noticeTimer = null;
let mutationBusy = false;
let reconnectPollTimer = null;
let reconnectPollAttempts = 0;
let catalogPollTimer = null;
let catalogPollAttempts = 0;
let sessionRecoveryBusy = false;
let lastSessionRecoveryAt = 0;
let manualSignOutUntil = 0;
let sessionHealthTimer = null;
let infoLoadSequence = 0;

function resetScopedGameInfo(){
  ++infoLoadSequence;
  state.info.loaded=false;
  state.info.loading=false;
  state.info.error='';
  state.info.modbookError='';
  state.info.companyId=null;
  state.info.selectedId='';
  state.info.query='';
  state.info.data={};
  // Admin drafts are scoped to the currently loaded catalogue/company.
  // Never carry a stale edit or object URL across a company/account reset.
  if(state.gameAdmin?.previewUrl){try{URL.revokeObjectURL(state.gameAdmin.previewUrl);}catch{}}
  state.gameAdminOpen=false;
  if(state.gameAdmin)Object.assign(state.gameAdmin,{table:'info_crafts',selectedId:'',mode:'',query:'',showInactive:false,dirty:false,showHistory:false,history:[],historyError:'',previewUrl:'',requestMode:false,requests:[],requestsLoading:false,requestsError:'',requestSelectedId:''});
}

function subscriptionEffectiveStatus(row){
  if(!row) return 'active';
  return String(row.effective_status||row.status||'active');
}
function subscriptionAllowsUse(row){
  return !['paused','expired'].includes(subscriptionEffectiveStatus(row));
}
function applyPlatformCompanyVisibility(){
  // Keep paused/expired companies as membership identities so the HUB can show
  // "이용 신청 / 일시정지" rather than falsely showing "회사 미등록".
  // Restricted content is gated separately by the company-access RPC result.
  return false;
}

function clearLedgerPendingFiles(){
  for(const item of state.ledgerPendingFiles||[]){ try{ if(item.previewUrl) URL.revokeObjectURL(item.previewUrl); }catch{} }
  state.ledgerPendingFiles=[];
}
function clearQuestionPendingFiles(){
  for(const item of state.questionPendingFiles||[]){ try{ if(item.previewUrl) URL.revokeObjectURL(item.previewUrl); }catch{} }
  state.questionPendingFiles=[];
}
function questionPendingPreviewHtml(){
  const pending=state.questionPendingFiles||[];
  if(!pending.length) return '<span class="support-attachment-empty">아직 첨부한 사진이 없습니다.</span>';
  return pending.map(item=>`<figure><img src="${item.previewUrl}" alt="질문 첨부 미리보기"><figcaption><span>${String(item.file?.name||'붙여넣은 이미지').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}</span><button type="button" data-action="remove-question-pending" data-pending-id="${item.id}">제거</button></figcaption></figure>`).join('');
}
function refreshQuestionPendingAttachmentUi(){
  const list=root.querySelector('[data-support-pending-list]');
  const count=root.querySelector('[data-support-pending-count]');
  if(list) list.innerHTML=questionPendingPreviewHtml();
  if(count) count.textContent=`${(state.questionPendingFiles||[]).length}/5`;
}
function addQuestionPendingFiles(files){
  const current=state.questionPendingFiles||[];
  const allowed=['image/jpeg','image/png','image/webp'];
  let changed=false;
  for(const file of Array.from(files||[])){
    if(!(file instanceof File) || !allowed.includes(file.type)){ setError('질문 사진은 JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.'); continue; }
    if(file.size>10*1024*1024){ setError('사진 한 장은 10MB 이하만 첨부할 수 있습니다.'); continue; }
    if(current.length>=5){ setError('질문에는 사진을 최대 5장까지 첨부할 수 있습니다.'); break; }
    current.push({id:crypto.randomUUID(),file,previewUrl:URL.createObjectURL(file)});
    changed=true;
  }
  state.questionPendingFiles=current;
  if(changed) refreshQuestionPendingAttachmentUi();
}
async function uploadQuestionPendingAttachments(questionId,messageId=null){
  const pending=[...(state.questionPendingFiles||[])];
  const result={uploaded:0,failed:0,lastError:''};
  if(!questionId || !pending.length) return result;
  for(const item of pending){
    let path='';
    try{
      path=await uploadSupportAttachment(state.companyId,questionId,state.session.user.id,item.file);
      await attachSupportQuestionFile(questionId,messageId,{storagePath:path,fileName:item.file.name||'clipboard-image',mimeType:item.file.type,sizeBytes:item.file.size});
      result.uploaded+=1;
    }catch(error){
      result.failed+=1; result.lastError=String(error?.message||error||'사진 첨부 실패');
      if(path) await removeSupportAttachments([path]).catch(()=>{});
    }
  }
  return result;
}
async function hydrateSupportAttachments(items){
  const rows=Array.isArray(items)?items:[];
  return Promise.all(rows.map(async item=>({
    ...item,
    signed_url: await getSupportAttachmentSignedUrl(item.storage_path).catch(()=>''),
  })));
}
async function hydrateSupportQuestion(question){
  if(!question) return question;
  const rootAttachments=await hydrateSupportAttachments(question.attachments);
  const messages=await Promise.all((Array.isArray(question.messages)?question.messages:[]).map(async message=>({
    ...message,
    attachments: await hydrateSupportAttachments(message.attachments),
  })));
  return {...question,attachments:rootAttachments,messages};
}
function supportQuestionStoragePaths(question){
  const paths=[];
  for(const item of question?.attachments||[]) if(item?.storage_path) paths.push(String(item.storage_path));
  for(const message of question?.messages||[]) for(const item of message?.attachments||[]) if(item?.storage_path) paths.push(String(item.storage_path));
  return [...new Set(paths)];
}

function clearSuggestionPendingFiles(){
  for(const item of state.suggestionPendingFiles||[]){ try{ if(item.previewUrl) URL.revokeObjectURL(item.previewUrl); }catch{} }
  state.suggestionPendingFiles=[];
}
function suggestionPendingPreviewHtml(){
  const pending=state.suggestionPendingFiles||[];
  if(!pending.length) return '<span class="support-attachment-empty">아직 첨부한 사진이 없습니다.</span>';
  return pending.map(item=>`<figure><img src="${item.previewUrl}" alt="건의 첨부 미리보기"><figcaption><span>${String(item.file?.name||'붙여넣은 이미지').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}</span><button type="button" data-action="remove-suggestion-pending" data-pending-id="${item.id}">제거</button></figcaption></figure>`).join('');
}
function refreshSuggestionPendingAttachmentUi(){
  const list=root.querySelector('[data-suggestion-pending-list]');
  const count=root.querySelector('[data-suggestion-pending-count]');
  if(list) list.innerHTML=suggestionPendingPreviewHtml();
  if(count) count.textContent=`${(state.suggestionPendingFiles||[]).length}/5`;
}
function addSuggestionPendingFiles(files){
  const current=state.suggestionPendingFiles||[];
  const allowed=['image/jpeg','image/png','image/webp'];
  let changed=false;
  for(const file of Array.from(files||[])){
    if(!(file instanceof File) || !allowed.includes(file.type)){ setError('건의 사진은 JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.'); continue; }
    if(file.size>10*1024*1024){ setError('사진 한 장은 10MB 이하만 첨부할 수 있습니다.'); continue; }
    if(current.length>=5){ setError('게시글 또는 답변에는 사진을 최대 5장까지 첨부할 수 있습니다.'); break; }
    current.push({id:crypto.randomUUID(),file,previewUrl:URL.createObjectURL(file)});
    changed=true;
  }
  state.suggestionPendingFiles=current;
  if(changed) refreshSuggestionPendingAttachmentUi();
}
async function uploadSuggestionPendingAttachments(suggestionId,messageId=null,companyId=state.companyId){
  const pending=[...(state.suggestionPendingFiles||[])];
  const result={uploaded:0,failed:0,lastError:''};
  if(!suggestionId || !pending.length) return result;
  for(const item of pending){
    let path='';
    try{
      path=await uploadSuggestionAttachment(companyId,suggestionId,state.session.user.id,item.file);
      await attachSuggestionFile(suggestionId,messageId,{storagePath:path,fileName:item.file.name||'clipboard-image',mimeType:item.file.type,sizeBytes:item.file.size});
      result.uploaded+=1;
    }catch(error){
      result.failed+=1; result.lastError=String(error?.message||error||'사진 첨부 실패');
      if(path) await removeSuggestionAttachments([path]).catch(()=>{});
    }
  }
  return result;
}
async function hydrateSuggestionAttachments(items){
  const rows=Array.isArray(items)?items:[];
  return Promise.all(rows.map(async item=>({
    ...item,
    signed_url: await getSuggestionAttachmentSignedUrl(item.storage_path).catch(()=>''),
  })));
}
async function hydrateSuggestion(suggestion){
  if(!suggestion) return suggestion;
  const rootAttachments=await hydrateSuggestionAttachments(suggestion.attachments);
  const messages=await Promise.all((Array.isArray(suggestion.messages)?suggestion.messages:[]).map(async message=>({
    ...message,
    attachments: await hydrateSuggestionAttachments(message.attachments),
  })));
  return {...suggestion,attachments:rootAttachments,messages};
}
function suggestionStoragePaths(suggestion){
  const paths=[];
  for(const item of suggestion?.attachments||[]) if(item?.storage_path) paths.push(String(item.storage_path));
  for(const message of suggestion?.messages||[]) for(const item of message?.attachments||[]) if(item?.storage_path) paths.push(String(item.storage_path));
  return [...new Set(paths)];
}
function addLedgerPendingFiles(files){
  const current=state.ledgerPendingFiles||[];
  const allowed=['image/jpeg','image/png','image/webp'];
  for(const file of Array.from(files||[])){
    if(!(file instanceof File) || !allowed.includes(file.type)) continue;
    if(file.size>10*1024*1024){ setError('사진 한 장은 10MB 이하만 첨부할 수 있습니다.'); continue; }
    if(current.length>=5){ setError('공금 내역에는 사진을 최대 5장까지 첨부할 수 있습니다.'); break; }
    current.push({id:crypto.randomUUID(),file,previewUrl:URL.createObjectURL(file)});
  }
  state.ledgerPendingFiles=current; render();
}
function ledgerEntryIdFromSave(saved){
  if(!saved) return '';
  if(typeof saved==='string') return saved;
  if(Array.isArray(saved)) return ledgerEntryIdFromSave(saved[0]);
  return String(saved.id||saved.entry_id||saved.ledger_entry_id||saved.data?.id||saved.data?.entry_id||'');
}
async function uploadLedgerPendingEvidence(entryId){
  if(!entryId || !(state.ledgerPendingFiles||[]).length) return;
  for(const item of state.ledgerPendingFiles){
    const path=await uploadFundEvidence(state.companyId,state.session.user.id,item.file);
    try{
      await attachFundLedgerEvidence(state.companyId,entryId,{storagePath:path,fileName:item.file.name||'clipboard-image',mimeType:item.file.type,sizeBytes:item.file.size});
    }catch(error){
      try{await removeUnclaimedFundEvidence(path);}catch{}
      throw error;
    }
  }
}
function createSetupDemoState(){
  const demoModules={fund:true,ammo:true,outlaw:false,modbook:true,pinball:true,cooking:false,assets:true};
  for(const row of state.modules||[]){
    const key=String(row?.module_key||'');
    if(key&&!Object.prototype.hasOwnProperty.call(demoModules,key)) demoModules[key]=Boolean(row.enabled);
  }
  return {
    step:0,
    connected:false,
    adminRole:'대표',
    memberRole:'회사원',
    modules:demoModules,
    channelMode:'quick',
    categoryName:'LAC HUB',
    channelsGenerated:false,
    generatedChannels:{fund:'공금현황판',ammo3:'3시-총알',ammo10:'10시-총알',outlaw:'전적-등록',modbook:'개조서',pinball:'핀볼-모집',cooking:'요리-주문',accountLookup:'계좌조회'},
    channels:{fund:'#공금현황판',ammo3:'#3시-총알',ammo10:'#10시-총알',outlaw:'#전적-등록',modbook:'#개조서',pinball:'#핀볼-모집',cooking:'#요리-주문',accountLookup:'#계좌조회'},
    memberFilter:'member',
    memberTargetRole:'member',
    memberSelected:['m1','m2','m3','m4','m5','m6'],
    memberImportDone:false,
    memberImportSkipped:false
  };
}

function createTestCenterState(){
  return {
    screen:'hub',
    content:null,
    companyCreated:false,
    fakeCompanyName:'LAC TEST',
    fakeRepresentativeName:'테스트 대표',
    passStatus:'none',
    passEditMode:false,
    passCancelled:false,
    passApplication:{
      applicationId:'PASS-TEST-0001',
      requesterRole:'representative',
      ingameNickname:'',
      representativeIngameNickname:'',
      ingamePhone:'',
      availableTime:'',
      note:'',
      submittedAt:null,
      updatedAt:null
    },
    setupComplete:false
  };
}

function createSetupGuideState(step = 0){
  const moduleMap={};
  for(const row of state.modules||[]) moduleMap[row.module_key]=Boolean(row.enabled);
  const settingsByKey={};
  for(const row of state.modules||[]) settingsByKey[row.module_key]=row.settings||{};
  const cfg=state.discordCompanyConfig||{};
  const roleRows=(state.discordRoles||[]).filter(r=>!r.managed&&r.role_name!=='@everyone');
  const memberFilterRoleId=String(cfg.member_role_id||roleRows[0]?.role_id||'');
  return {
    step:Math.max(0,Math.min(6,Number(step||0))),
    adminRoleId:String(cfg.admin_role_id||''),
    memberRoleId:String(cfg.member_role_id||''),
    modules:moduleMap,
    channelMode:'quick',
    categoryName:'LAC HUB',
    generatedChannels:{fund:'공금현황판',ammo3:'3시-총알',ammo10:'10시-총알',outlaw:'전적-등록',modbook:'개조서',pinball:'핀볼-모집',cooking:'요리-주문',accountLookup:'계좌조회'},
    directChannels:{
      fund:String(settingsByKey.fund?.status_channel_id||''),
      ammo3:String(settingsByKey.ammo?.three_channel_id||''),
      ammo10:String(settingsByKey.ammo?.ten_channel_id||''),
      outlaw:String(settingsByKey.outlaw?.record_channel_id||''),
      modbook:String(settingsByKey.modbook?.channel_id||''),
      pinball:String(settingsByKey.pinball?.channel_id||''),
      cooking:String(settingsByKey.cooking?.order_channel_id||''),
      accountLookup:String(settingsByKey.assets?.account_lookup_channel_id||''),
    },
    createdChannelIds:{},
    memberFilterRoleId,
    memberTargetRole:'member',
    memberCandidates:[],
    memberSelected:[],
    memberScanCount:0,
    memberListLoaded:false,
    memberImportDone:false,
    memberImportSkipped:false,
    permissionIssue:null,
    permissionMessage:'',
  };
}

function savedSetupGuideProgress(){
  const value=state.companySettings?.settings?.guided_setup;
  return value&&typeof value==='object'?value:null;
}

function resolveSetupGuideResumeStep(requestedStep = 0){
  let step=Math.max(0,Math.min(6,Number(requestedStep||0)));
  if(state.discordConnection?.status!=='connected'||state.onboardingStatus?.catalog_ready===false) return 1;
  if(!state.discordCompanyConfig?.admin_role_id||!state.discordCompanyConfig?.member_role_id) return 2;
  if(String(state.onboardingStatus?.status||'')==='onboarding'&&String(state.onboardingStatus?.current_step||'')==='modules') step=Math.max(step,3);
  return step;
}

async function persistSetupGuideProgress(step,{completed=false}={}){
  if(!state.companyId||!state.session?.user?.id)return;
  const settings={...(state.companySettings?.settings||{}),guided_setup:{step:Math.max(0,Math.min(6,Number(step||0))),completed:Boolean(completed),updated_at:new Date().toISOString()}};
  await updateCompanySettings(state.companyId,{locale:state.companySettings?.locale||'ko-KR',timezone:state.companySettings?.timezone||'Asia/Seoul',settings},state.session.user.id);
  state.companySettings={...(state.companySettings||{}),settings};
}

function openSetupGuide(step = 0){
  state.setupGuide=createSetupGuideState(step);
  state.modal={type:'setup-guide'};
  render();
}

function setupGuideChannelPlan(){
  const modules=state.setupGuide?.modules||{};
  const rows=[];
  if(modules.fund)rows.push({key:'fund',moduleKey:'fund',settingKey:'status_channel_id',label:'공금 관리',name:state.setupGuide.generatedChannels?.fund||'공금현황판',type:'text'});
  if(modules.ammo){
    rows.push({key:'ammo3',moduleKey:'ammo',settingKey:'three_channel_id',label:'총알 관리 · 3시',name:state.setupGuide.generatedChannels?.ammo3||'3시-총알'});
    rows.push({key:'ammo10',moduleKey:'ammo',settingKey:'ten_channel_id',label:'총알 관리 · 10시',name:state.setupGuide.generatedChannels?.ammo10||'10시-총알'});
  }
  if(modules.outlaw)rows.push({key:'outlaw',moduleKey:'outlaw',settingKey:'record_channel_id',label:'무법지대 전적',name:state.setupGuide.generatedChannels?.outlaw||'전적-등록'});
  if(modules.modbook)rows.push({key:'modbook',moduleKey:'modbook',settingKey:'channel_id',label:'개조서 조회 · 가격',name:state.setupGuide.generatedChannels?.modbook||'개조서'});
  if(modules.pinball)rows.push({key:'pinball',moduleKey:'pinball',settingKey:'channel_id',label:'핀볼 모집',name:state.setupGuide.generatedChannels?.pinball||'핀볼-모집'});
  if(modules.cooking)rows.push({key:'cooking',moduleKey:'cooking',settingKey:'order_channel_id',label:'요리 주문',name:state.setupGuide.generatedChannels?.cooking||'요리-주문'});
  if(modules.assets)rows.push({key:'accountLookup',moduleKey:'assets',settingKey:'account_lookup_channel_id',label:'계좌 조회',name:state.setupGuide.generatedChannels?.accountLookup||'계좌조회'});
  return rows;
}

async function loadSetupGuideMembers(){
  if(!state.setupGuide || !state.companyId) return;
  const roleId=String(state.setupGuide.memberFilterRoleId||'');
  if(!roleId){state.setupGuide.memberCandidates=[];state.setupGuide.memberSelected=[];state.setupGuide.memberListLoaded=true;render();return;}
  const data=await listGuidedSetupMembers(state.companyId,roleId);
  const rows=Array.isArray(data?.members)?data.members:[];
  state.setupGuide.memberCandidates=rows;
  state.setupGuide.memberSelected=rows.map(row=>String(row.discord_user_id));
  state.setupGuide.memberScanCount=Number(data?.scanned||rows.length);
  state.setupGuide.memberListLoaded=true;
  render();
}

async function saveSetupGuideRoles(){
  if(!state.setupGuide) return;
  const adminRoleId=String(state.setupGuide.adminRoleId||'');
  const memberRoleId=String(state.setupGuide.memberRoleId||'');
  if(!adminRoleId||!memberRoleId) throw new Error('관리자 역할과 일반 멤버 역할을 모두 선택해 주세요.');
  await saveDiscordCompanyConfig(state.companyId,{
    notification_channel_id:state.discordCompanyConfig?.notification_channel_id||null,
    command_channel_id:state.discordCompanyConfig?.command_channel_id||null,
    admin_role_id:adminRoleId,
    member_role_id:memberRoleId,
  },state.session.user.id);
  await loadBaseCompanyData();
  state.setupGuide={...createSetupGuideState(3),modules:{...(state.setupGuide?.modules||{})},adminRoleId,memberRoleId};
}

async function saveSetupGuideModules(){
  if(!state.setupGuide) return;
  for(const row of state.modules||[]){
    if(!Object.prototype.hasOwnProperty.call(state.setupGuide.modules||{},row.module_key)) continue;
    const enabled=Boolean(state.setupGuide.modules[row.module_key]);
    if(Boolean(row.enabled)!==enabled) await setCompanyModule(state.companyId,row.module_key,enabled,state.session.user.id);
  }
  await loadBaseCompanyData();
  const previous=state.setupGuide;
  const next=createSetupGuideState(4);
  next.channelMode=previous.channelMode||'quick';
  next.categoryName=previous.categoryName||'LAC HUB';
  next.generatedChannels={...(previous.generatedChannels||next.generatedChannels)};
  state.setupGuide=next;
}

function setupGuideChannelBinding(key){
  const map={
    fund:['fund','status_channel_id'],
    ammo3:['ammo','three_channel_id'],
    ammo10:['ammo','ten_channel_id'],
    outlaw:['outlaw','record_channel_id'],
    modbook:['modbook','channel_id'],
    pinball:['pinball','channel_id'],
    cooking:['cooking','order_channel_id'],
    accountLookup:['assets','account_lookup_channel_id'],
  };
  return map[key]||null;
}

async function persistSetupGuideChannels(channelMap){
  const grouped=new Map();
  for(const [key,channelId] of Object.entries(channelMap||{})){
    const binding=setupGuideChannelBinding(key); if(!binding||!channelId)continue;
    const [moduleKey,settingKey]=binding;
    if(!grouped.has(moduleKey)) grouped.set(moduleKey,{});
    grouped.get(moduleKey)[settingKey]=String(channelId);
  }
  for(const [moduleKey,patch] of grouped){
    const row=(state.modules||[]).find(m=>m.module_key===moduleKey); if(!row)continue;
    await updateCompanyModuleSettings(state.companyId,moduleKey,{...(row.settings||{}),...patch},state.session.user.id);
  }
  await loadBaseCompanyData();
}

async function cleanupLegacyPwa() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('axe-product-pwa-')).map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('LAC HUB legacy PWA cleanup failed', error);
  }
}

function suppressBrowserFormHistory() {
  root.querySelectorAll('form').forEach(form => form.setAttribute('autocomplete','off'));
  root.querySelectorAll('input, textarea').forEach(field => {
    if (!field.hasAttribute('autocomplete')) field.setAttribute('autocomplete','off');
    field.setAttribute('autocorrect','off');
    field.setAttribute('autocapitalize','off');
    field.setAttribute('spellcheck','false');
  });
}
function routePathMatches(path) {
  const clean=value=>{const raw=String(value||'/').split('?')[0].split('#')[0]||'/';return raw.length>1?raw.replace(/\/+$/,''):raw;};
  return clean(window.location.pathname)===clean(path);
}

function applyRouteContext(route) {
  if (!route || route.kind !== 'app') return;
  if (route.platformView) state.platformView = route.platformView;
  if (route.hubBoardTab) state.hubBoard.tab = route.hubBoardTab;
  if (route.infoTable && ['info_crafts','info_processes','info_quests','info_skill_ranks','modbook_catalog'].includes(route.infoTable)) {
    if (state.info.table !== route.infoTable) {
      state.info.table = route.infoTable;
      state.info.craftGroup = '근접무기';
      state.info.modbookCategory = '';
      state.info.selectedId = '';
      state.info.query = '';
      state.info.filterPrimary = '__all__';
      state.info.filterSecondary = '__all__';
    }
  }
  if (route.fundTab && ['ledger','weekly','review','balance','settings'].includes(route.fundTab)) {
    state.fundTab = route.fundTab;
    localStorage.setItem('axe_product_fund_tab', state.fundTab);
  }
  if (route.assetTab && ['assets','returns'].includes(route.assetTab)) state.assetTab = route.assetTab;
  if (route.settingsTab && ['basic','modules','cooking'].includes(route.settingsTab)) {
    state.settingsTab = route.settingsTab;
    localStorage.setItem('axe_product_settings_tab', state.settingsTab);
  }
  if (route.adminPassView && ['pending','recent','all'].includes(route.adminPassView)) {
    state.adminPassView = route.adminPassView;
    state.adminPassPage = 1;
  }
  if (route.platformInboxFilter && ['all','content','site','company'].includes(route.platformInboxFilter)) {
    state.platformInboxFilter = route.platformInboxFilter;
  }
}

function routePathForCurrentState(page = state.page) {
  return routePathForScreen(page, {
    platformView: state.platformView,
    hubBoardTab: state.hubBoard?.tab,
    infoTable: state.info?.table,
    fundTab: state.fundTab,
    assetTab: state.assetTab,
    settingsTab: state.settingsTab,
    adminPassView: state.adminPassView,
    platformInboxFilter: state.platformInboxFilter,
  });
}

function navigatePrimaryScreen(page, { replace = false } = {}) {
  const path = routePathForCurrentState(page);
  const sameEntry = readPrimaryScreen(window.history.state) === page && routePathMatches(path);
  if (!sameEntry) {
    if (replace) replacePrimaryScreen(window.history, page, path);
    else recordPrimaryScreen(window.history, page, path);
  }
  state.page = page;
}

function syncPrimaryScreenRoute({ replace = false } = {}) {
  if (isBuildRoute() || isCookRoute()) return;
  const path = routePathForCurrentState();
  if (routePathMatches(path) && readPrimaryScreen(window.history.state) === state.page) return;
  if (replace) replacePrimaryScreen(window.history, state.page, path);
  else recordPrimaryScreen(window.history, state.page, path);
}

function pendingAuthReturnPath() {
  try {
    const raw=sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    if(!raw)return '';
    let path=raw,createdAt=Date.now();
    try{const parsed=JSON.parse(raw);path=String(parsed?.path||'/');createdAt=Number(parsed?.createdAt||0)||0;}catch{}
    if(createdAt&&Date.now()-createdAt>20*60*1000){sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);return '';}
    return safeInternalReturnPath(path);
  } catch { return ''; }
}
function consumeAuthReturnPath() {
  const value=pendingAuthReturnPath()||'/';
  try { sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY); } catch {}
  return value;
}

function cleanLegacySupabaseAuthFragment() {
  const raw=String(window.location.hash||'').replace(/^#/,'');
  if(!raw)return;
  const params=new URLSearchParams(raw);
  const authKeys=['access_token','refresh_token','expires_in','expires_at','token_type','provider_token','provider_refresh_token','type'];
  if(!authKeys.some(key=>params.has(key)))return;
  authKeys.forEach(key=>params.delete(key));
  const fragment=params.toString();
  window.history.replaceState(window.history.state,'',`${window.location.pathname}${window.location.search}${fragment?`#${fragment}`:''}`);
}

function finalizeSupabaseAuthNavigation() {
  cleanLegacySupabaseAuthFragment();
  const params=new URLSearchParams(window.location.search);
  const oauthSignal=params.has('code')||params.has('error')||params.has('error_code')||params.has('error_description');
  // Supabase may already have exchanged and removed ?code before getSession()
  // resolves. The short-lived sessionStorage marker lets us still restore the
  // intended route without depending on the auth query remaining visible.
  const currentRoute=routeForPathname(window.location.pathname);
  const autoExchangedReturn=Boolean(pendingAuthReturnPath()&&state.session?.user&&currentRoute.kind==='app'&&currentRoute.canonicalPath==='/');
  if(!oauthSignal&&!autoExchangedReturn)return null;
  const authError=params.get('error_description')||params.get('error');
  if(authError&&!state.error)state.error=`Discord 로그인에 실패했습니다. ${authError}`;
  const returnPath=consumeAuthReturnPath();
  const url=new URL(returnPath,window.location.origin);
  const route=routeForPathname(url.pathname);
  if(route.kind==='build'||route.kind==='cook'){
    state.page='hub';
    replacePrimaryScreen(window.history,'hub',`${route.canonicalPath}${url.search}`);
    if(route.kind==='build')showEmbeddedBuild();
    else showCookPreview();
    return route;
  }
  const target=route.kind==='app'?route:{kind:'app',page:'hub',canonicalPath:'/'};
  applyRouteContext(target);
  state.page=target.page;
  replacePrimaryScreen(window.history,state.page,`${target.canonicalPath}${url.search}`);
  return target;
}

function allowedHistoryPage(target) {
  const companyAvailable = Boolean(state.companyId && state.companies.some(company => company.id === state.companyId));
  if (!state.session?.user) return 'hub';
  if (target === 'hub' || target === 'hub-board') return target;
  if (target === 'company-start') return state.companies.length ? 'hub' : target;
  if (target === 'game-info') return canOpenWebContent(state,'game_info') ? target : 'hub';
  if (target === 'info') return companyAvailable ? 'combat' : 'hub';
  if (['platform', 'layout'].includes(target)) return state.platformAdmin ? target : 'hub';
  return companyAvailable ? target : 'hub';
}

function installPrimaryScreenHistory() {
  // The URL is now the source of truth for the first screen. Build and COOK keep
  // their dedicated mounts, while all other paths map to a HUB primary screen.
  const route=routeForPathname(window.location.pathname);
  if(route.kind==='build'||route.kind==='cook'){
    state.page='hub';
    replacePrimaryScreen(window.history,'hub');
  }else{
    const initial=route.kind==='app'?route:{kind:'app',page:'hub',canonicalPath:'/'};
    applyRouteContext(initial);
    state.page=initial.page;
    // Preserve callback/query/hash material until the owning auth handler has
    // consumed it. Only the pathname is canonicalized here.
    replacePrimaryScreen(window.history,state.page,`${initial.canonicalPath}${window.location.search}${window.location.hash}`);
  }
  window.addEventListener('popstate', event => {
    const route=routeForPathname(window.location.pathname);
    if (route.kind==='build') { showEmbeddedBuild(); return; }
    if (route.kind==='cook') { showCookPreview(); return; }
    switchVisibleApp(false);
    const target = route.kind==='app' ? route.page : readPrimaryScreen(event.state);
    if (!target) return;
    applyRouteContext(route);
    state.page = allowedHistoryPage(target);
    if(state.page!==target)syncPrimaryScreenRoute({replace:true});
    state.accountMenuOpen = false;
    state.companyMenuOpen = false;
    state.modal = null;
    if (state.page !== 'hub' && state.page !== 'company-start') {
      localStorage.setItem('axe_product_page', state.page);
    }
    render();
    if (state.page === 'hub-board') void loadHubBoard();
    if (state.page==='game-info' && !state.info.loaded && !state.info.loading) void loadGameInfo();
    if (['dashboard','fund','members','assets','accounts','questions','suggestions','settings','combat','platform'].includes(state.page)) void queueCompanyPageData(state.page);
  });
}

function render() { renderShell(root, state); suppressBrowserFormHistory(); }
// Phase 6: Keep confirmation above the existing HUB modal without replacing its DOM.
// A cancelled/escaped dialog must never reach the destructive API call.
function confirmHubDeletion({ title, message, confirmLabel }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'lac-hub-confirm';
    dialog.setAttribute('aria-labelledby', 'lac-hub-confirm-title');
    dialog.setAttribute('aria-describedby', 'lac-hub-confirm-message');
    dialog.innerHTML = `<form method="dialog" class="lac-hub-confirm__content">
      <h2 id="lac-hub-confirm-title"></h2>
      <p id="lac-hub-confirm-message"></p>
      <div class="lac-hub-confirm__actions">
        <button type="submit" class="runtime-btn-ghost" value="cancel">취소</button>
        <button type="submit" class="runtime-btn-danger" value="confirm"></button>
      </div>
    </form>`;
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('p').textContent = message;
    dialog.querySelector('[value="confirm"]').textContent = confirmLabel;
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'confirm';
      dialog.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      resolve(accepted);
    }, { once: true });
    document.body.append(dialog);
    try {
      dialog.showModal();
      dialog.querySelector('[value="cancel"]').focus();
    } catch {
      // If a browser cannot display the custom dialog, fail closed.
      dialog.remove();
      resolve(false);
    }
  });
}


// Phase 9: Keep the reason/note input mounted during Korean IME composition.
// Cancellation (including Escape or a browser without <dialog>) resolves to null;
// only an explicit confirmation may proceed to a mutation/RPC.
function requestHubActionNote({ title, message, label, confirmLabel, required = false, requiredMessage = '사유를 입력해 주세요.', danger = false }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'lac-hub-confirm lac-hub-action-note';
    dialog.setAttribute('aria-labelledby', 'lac-hub-action-note-title');
    dialog.setAttribute('aria-describedby', 'lac-hub-action-note-message');
    dialog.innerHTML = `<form class="lac-hub-confirm__content">
      <h2 id="lac-hub-action-note-title"></h2>
      <p id="lac-hub-action-note-message"></p>
      <label class="lac-hub-action-note__label"><span></span>
        <textarea rows="3" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
      </label>
      <div class="lac-hub-confirm__actions">
        <button type="button" class="runtime-btn-ghost" data-note-cancel>취소</button>
        <button type="submit" class="runtime-btn-primary" data-note-confirm></button>
      </div>
    </form>`;
    const field = dialog.querySelector('textarea');
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('p').textContent = message;
    dialog.querySelector('label span').textContent = label;
    const submit = dialog.querySelector('[data-note-confirm]');
    submit.textContent = confirmLabel;
    if (danger) submit.className = 'runtime-btn-danger';
    if (required) field.required = true;
    let accepted = false;
    let note = '';
    dialog.querySelector('[data-note-cancel]').addEventListener('click', () => dialog.close('cancel'));
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      note = field.value.trim();
      if (required && !note) {
        field.setCustomValidity(requiredMessage);
        field.reportValidity();
        return;
      }
      accepted = true;
      dialog.close('confirm');
    });
    field.addEventListener('input', () => field.setCustomValidity(''));
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      resolve(accepted ? note : null);
    }, { once: true });
    document.body.append(dialog);
    try {
      dialog.showModal();
      field.focus();
    } catch {
      dialog.remove();
      resolve(null); // Fail closed: never apply an irreversible action without consent.
    }
  });
}

// Keep board photos in the current page. A native dialog handles Escape and focus trapping.
function showHubBoardPhoto(trigger, signedUrl){
  const previousFocus=trigger;
  const dialog=document.createElement('dialog');
  dialog.className='hub-board-photo-dialog';
  dialog.setAttribute('aria-label','첨부 사진 크게 보기');
  dialog.innerHTML=`<div class="hub-board-photo-dialog__top"><span>첨부 사진</span><button type="button" class="hub-board-photo-dialog__close" aria-label="사진 닫기">×</button></div><img class="hub-board-photo-dialog__image" alt="첨부 사진 확대 보기">`;
  dialog.querySelector('img').src=signedUrl;
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{
    dialog.remove();
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  },{once:true});
  document.body.append(dialog);
  try{dialog.showModal();dialog.querySelector('button').focus();}
  catch(error){dialog.remove();throw error;}
}

function setNotice(message) {
  state.notice = String(message || ''); state.error = ''; render();
  if (noticeTimer) clearTimeout(noticeTimer);
  if (state.notice) noticeTimer = setTimeout(() => {
    state.notice = '';
    // Do not re-render the whole app just to hide a notice. A full root.innerHTML
    // replacement closes an open native <select>, which made role/channel
    // dropdowns appear to close by themselves a few seconds after catalog load.
    root.querySelector('.runtime-banner--notice')?.remove();
  }, 3200);
}
function setError(error) { state.error = String(error?.message || error || '오류가 발생했습니다.'); render(); }
function companyDataReadyForCurrentCompany(){
  return Boolean(state.companyId && state.companyDataCompanyId===state.companyId && state.companyAccessStatus==='ready');
}
function companyAccessDecisionKnown(){
  return Boolean(state.companyId && ['ready','error'].includes(String(state.companyAccessStatus||'')));
}

function companyAccessFreshForCurrentCompany(){
  const checkedAt=Number(state.companyAccessCheckedAt||0);
  return Boolean(state.companyId && state.companyAccessStatus==='ready' && checkedAt && Date.now()-checkedAt<COMPANY_CONTEXT_FRESH_MS);
}
function companyContextFreshForCurrentCompany(){
  const loadedAt=Number(state.companyDataLoadedAt||0);
  return companyDataReadyForCurrentCompany() && companyAccessFreshForCurrentCompany() && Boolean(loadedAt && Date.now()-loadedAt<COMPANY_CONTEXT_FRESH_MS);
}
function ensureCompanyData({force=false}={}){
  const companyId=String(state.companyId||'');
  if(!companyId)return Promise.resolve();
  if(!force&&companyContextFreshForCurrentCompany())return Promise.resolve();
  if(companyDataLoadPromise&&companyDataLoadCompanyId===companyId)return companyDataLoadPromise;
  const request=loadCompanyData();
  companyDataLoadCompanyId=companyId;
  companyDataLoadPromise=request.finally(()=>{
    if(companyDataLoadCompanyId===companyId){companyDataLoadPromise=null;companyDataLoadCompanyId='';}
  });
  return companyDataLoadPromise;
}
async function loadCompanyPageData(page=state.page){
  const companyId=String(state.companyId||'');
  if(!companyId)return;
  const stillCurrent=()=>String(state.companyId||'')===companyId;
  if(['dashboard','fund'].includes(page)&&!state.fundSnapshot)await loadFundSnapshot();
  if(!stillCurrent())return;
  if(['dashboard','assets','accounts'].includes(page)&&!state.assetsSnapshot)await loadAssetsAndAccounts();
  if(!stillCurrent())return;
  if(page==='questions')await loadQuestionBoard();
  if(!stillCurrent())return;
  if(page==='suggestions')await loadSuggestionBoard();
  if(!stillCurrent())return;
  if(page==='combat'&&!state.combat.overview)await loadCombatOverview();
  if(!stillCurrent())return;
  if(page==='platform'&&state.platformAdmin){
    state.platformSnapshot=await getPlatformCompanies().catch(()=>state.platformSnapshot||[]);
    if(!stillCurrent())return;
    await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);
  }
}
function queueCompanyPageData(page=state.page){
  const companyId=String(state.companyId||'');
  const key=`${companyId}:${page}`;
  if(companyPageLoadPromises.has(key))return companyPageLoadPromises.get(key);
  const request=loadCompanyPageData(page)
    .catch(error=>{if(String(state.companyId||'')===companyId&&state.page===page)setError(error);})
    .finally(()=>{
      companyPageLoadPromises.delete(key);
      if(String(state.companyId||'')===companyId&&state.page===page)render();
    });
  companyPageLoadPromises.set(key,request);
  return request;
}

function clearCompanyData() {
  resetScopedGameInfo();
  state.memberships=[]; state.moduleCatalog=[]; state.modules=[]; state.cookingOrderTypes=[]; state.cookingDiscordConfig=null; state.companySettings=null;
  state.discordConnection=null; state.discordChannels=[]; state.discordRoles=[]; state.discordCompanyConfig=null; state.onboardingStatus=null;
  state.fundSnapshot=null; state.fundRequests=[]; state.fundMonthlyRows=[]; state.fundLedgerAttachments=[]; state.assetsSnapshot=null; state.accountsSnapshot=null; state.currentSubscription=null; state.companyAccess=null; state.companyAccessError='';
  state.companyAccessStatus='idle';state.companyAccessCheckedAt=0;state.companyDataCompanyId='';state.companyDataLoadedAt=0;state.companyDataLoading=false;
  state.combat={overview:null,detail:null,selectedMembershipId:'',period:'30d',rankMode:'kd',loading:false,detailLoading:false,error:''};
  state.questionBoard={configured:true,counts:{pending:0,checking:0,complete:0,unread:0,mine:0,total:0},items:[],error:''};
  state.suggestionBoard={configured:true,private:true,counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''};
  state.fundLedgerPage=1;state.fundReviewPage=1;state.memberPage=1;state.assetPage=1;state.returnPage=1;state.accountPage=1;state.questionPage=1;state.suggestionPage=1;state.cookingPage=1;state.platformPage=1;
  clearQuestionPendingFiles();
  clearSuggestionPendingFiles();
}

async function loadCompanies() {
  const previousCompanyId=state.companyId;
  state.companies = await listCompanies();
  if (!state.companies.length) { state.companyId=null; localStorage.removeItem('axe_product_company_id'); clearCompanyData(); return; }
  if (!state.companies.some(c=>c.id===state.companyId)) state.companyId=state.companies[0].id;
  if (previousCompanyId!==state.companyId){
    resetScopedGameInfo();
    state.companyAccess=null;state.companyAccessError='';state.companyAccessStatus='idle';state.companyAccessCheckedAt=0;
    state.companyDataCompanyId='';state.companyDataLoadedAt=0;state.companyDataLoading=false;
  }
  localStorage.setItem('axe_product_company_id', state.companyId);
}

async function loadBaseCompanyData() {
  if (!state.companyId) { clearCompanyData(); return; }
  const companyId=String(state.companyId);
  const accessWasKnown=companyAccessDecisionKnown() && state.companyDataCompanyId===companyId;
  state.companyDataLoading=true;
  if(!accessWasKnown) state.companyAccessStatus='loading';
  state.companyAccessError='';

  const [membershipsResult,accessResult,passRequestResult]=await Promise.allSettled([
    getMemberships(companyId),
    getMyCompanyAccess(companyId),
    getCompanyPassRequest(companyId),
  ]);
  if(String(state.companyId)!==companyId)return;
  if(membershipsResult.status==='rejected')throw membershipsResult.reason;
  state.memberships=membershipsResult.value||[];

  if(accessResult.status==='fulfilled'){
    state.companyAccess=accessResult.value||null;
    state.companyAccessError='';
    state.companyAccessStatus='ready';
    state.companyAccessCheckedAt=Date.now();
  }else{
    state.companyAccess=null;
    state.companyAccessError=String(accessResult.reason?.message||accessResult.reason||'이용권 조회 실패');
    state.companyAccessStatus='error';
    state.companyAccessCheckedAt=Date.now();
  }
  if(passRequestResult.status==='fulfilled'){state.companyPassRequest=passRequestResult.value||null;state.companyPassRequestError='';}
  else{state.companyPassRequest=null;state.companyPassRequestError=String(passRequestResult.reason?.message||passRequestResult.reason||'이용권 신청 상태 조회 실패');}

  if(!hasUnifiedPass(state)){
    state.currentSubscription=null; state.modules=[];state.cookingOrderTypes=[];
    state.fundSnapshot=null;state.assetsSnapshot=null;state.accountsSnapshot=null;
    state.companyDataCompanyId=companyId;state.companyDataLoadedAt=Date.now();state.companyDataLoading=false;
    return;
  }
  const [catalog, modules, cookingTypes, cookingConfig, settings, discord, channels, roles, config, onboarding, subscription] = await Promise.all([
    getModuleCatalog(), getCompanyModules(companyId), getCookingOrderTypes(companyId), getCookingDiscordConfig(companyId), getCompanySettings(companyId),
    getDiscordConnection(companyId), getDiscordChannels(companyId), getDiscordRoles(companyId), getDiscordCompanyConfig(companyId),
    getCompanyOnboardingStatus(companyId),
    getCompanySubscription(companyId).catch(()=>null),
  ]);
  if(String(state.companyId)!==companyId)return;
  state.moduleCatalog=catalog||[];
  const moduleRows=new Map((modules||[]).map(row=>[row.module_key,row]));
  state.modules=(catalog||[]).map(item=>moduleRows.get(item.module_key)||{
    company_id:companyId,module_key:item.module_key,enabled:false,settings:{},updated_at:null,
  });
  state.cookingOrderTypes=cookingTypes||[]; state.cookingDiscordConfig=cookingConfig||null; state.companySettings=settings||null;
  state.discordConnection=discord||null; state.discordChannels=channels||[]; state.discordRoles=roles||[]; state.discordCompanyConfig=config||null; state.onboardingStatus=onboarding||null; state.currentSubscription=subscription||null;
}

async function loadFundSnapshot() {
  if (!canAdmin(state) || !moduleEnabled(state,'fund')) { state.fundSnapshot=null; state.fundRequests=[]; return; }
  const [y,m] = state.fundMonth.split('-').map(Number);
  const [snapshot, requests, attachments] = await Promise.all([
    getFundTreasurySnapshot(state.companyId,y,m,200),
    getFundAdminRequests(state.companyId,null,100),
    getFundLedgerAttachments(state.companyId,null).catch(()=>[]),
  ]);
  state.fundSnapshot=snapshot||{}; state.fundRequests=requests||[]; state.fundLedgerAttachments=attachments||[];
}

function fundWeekNumbersForMonth(year, month) {
  const safeYear=Number(year);
  const safeMonth=Number(month);
  const lastDay=new Date(Date.UTC(safeYear,safeMonth,0)).getUTCDate();
  const weeks=[];
  for(let day=1;day<=lastDay;day+=1){
    if(new Date(Date.UTC(safeYear,safeMonth-1,day)).getUTCDay()===6) weeks.push(weeks.length+1);
  }
  return weeks;
}

async function loadFundWeeklyMonth(monthValue = state.fundWeeklyMonth) {
  if (!canAdmin(state) || !moduleEnabled(state,'fund')) { state.fundMonthlyRows=[]; return; }
  state.fundWeeklyLoading=true; render();
  const [year,month]=String(monthValue).split('-').map(Number);
  const weekNumbers=fundWeekNumbersForMonth(year,month);
  const results = await Promise.all(weekNumbers.map(async week => {
    try { return await getFundAdminPeriodStatus(state.companyId,year,month,week); } catch { return []; }
  }));
  const map=new Map(); let fee=0;
  results.forEach((weekRows,index)=>{
    for(const row of weekRows||[]){
      const key=row.membership_id || row.display_name;
      if(!map.has(key)) map.set(key,{name:row.display_name||'멤버',role:(row.member_role||'member').toUpperCase(),weeks:['예정','예정','예정','예정','예정']});
      map.get(key).weeks[index]=row.status||'예정';
      if(!fee && Number(row.expected_amount)>0) fee=Number(row.expected_amount);
    }
  });
  state.fundMonthlyRows=[...map.values()]; state.fundWeeklyFee=fee; state.fundWeeklyLoading=false; render();
}

async function loadAssetsAndAccounts() {
  if (!canAdmin(state) || !moduleEnabled(state,'assets')) { state.assetsSnapshot=null; state.accountsSnapshot=null; return; }
  const [assets, accounts] = await Promise.all([getWebAssetsSnapshot(state.companyId), getWebAccountsSnapshot(state.companyId)]);
  state.assetsSnapshot=assets||{}; state.accountsSnapshot=accounts||{};
}

async function loadCombatMember(membershipId = state.combat.selectedMembershipId) {
  const id=String(membershipId||'').trim();
  if(!state.companyId||!canAdmin(state)||!id){state.combat.detail=null;return;}
  state.combat.selectedMembershipId=id;
  state.combat.detailLoading=true;
  state.combat.error='';
  render();
  try{
    const companyId=state.companyId;
    const detail=await getCombatMember(companyId,id,1000);
    if(state.companyId!==companyId||state.combat.selectedMembershipId!==id)return;
    state.combat.detail=detail||null;
  }catch(error){
    state.combat.error=String(error?.message||error||'멤버 전투 기록을 불러오지 못했습니다.');
    state.combat.detail=null;
  }finally{
    if(state.combat.selectedMembershipId===id){state.combat.detailLoading=false;render();}
  }
}

async function loadCombatOverview({selectFirst=true}={}) {
  if(!state.companyId||!canAdmin(state)){state.combat.overview=null;state.combat.detail=null;return;}
  const companyId=state.companyId;
  state.combat.loading=true;
  state.combat.error='';
  render();
  try{
    const overview=await getCombatOverview(companyId);
    if(state.companyId!==companyId)return;
    state.combat.overview=overview||{};
    const members=Array.isArray(overview?.members)?overview.members:[];
    const currentId=String(state.combat.selectedMembershipId||'');
    const selectedExists=members.some(row=>String(row.membership_id)===currentId);
    if(!selectedExists){
      const first=(members.find(row=>row.tracked)||members[0]);
      state.combat.selectedMembershipId=selectFirst?String(first?.membership_id||''):'';
      state.combat.detail=null;
    }
    if(state.combat.selectedMembershipId) await loadCombatMember(state.combat.selectedMembershipId);
  }catch(error){
    if(state.companyId!==companyId)return;
    state.combat.error=String(error?.message||error||'전투 기록을 불러오지 못했습니다.');
    state.combat.overview=null;state.combat.detail=null;
  }finally{
    if(state.companyId===companyId){state.combat.loading=false;render();}
  }
}

async function loadQuestionBoard() {
  if (!state.companyId) {
    state.questionBoard={configured:true,counts:{pending:0,checking:0,complete:0,unread:0,mine:0,total:0},items:[],error:''};
    return;
  }
  try {
    const board=await getQuestionBoard(state.companyId);
    state.questionBoard={configured:true,counts:{pending:0,checking:0,complete:0,unread:0,mine:0,total:0},items:[],error:'',...(board||{})};
  } catch (error) {
    state.questionBoard={...(state.questionBoard||{}),error:String(error?.message||error||'질문게시판을 불러오지 못했습니다.')};
  }
}

async function loadSuggestionBoard() {
  if (!state.companyId) {
    state.suggestionBoard={configured:true,private:true,counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''};
    return;
  }
  try {
    const board=await getSuggestionBoard(state.companyId);
    state.suggestionBoard={configured:true,private:true,counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:'',...(board||{})};
  } catch (error) {
    state.suggestionBoard={...(state.suggestionBoard||{}),error:String(error?.message||error||'건의게시판을 불러오지 못했습니다.')};
  }
}

async function loadPlatformSuggestions() {
  if (!state.platformAdmin) {
    state.platformSuggestions={counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''};
    return;
  }
  try {
    const board=await getPlatformSuggestions(120);
    state.platformSuggestions={counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:'',...(board||{})};
  } catch (error) {
    state.platformSuggestions={...(state.platformSuggestions||{}),error:String(error?.message||error||'전체 건의 현황을 불러오지 못했습니다.')};
  }
}

async function loadPlatformBuildReports(){
  if(!state.platformAdmin){state.platformBuildReports={items:[],error:''};return;}
  try{
    const rows=await getPlatformBuildReports(160);
    state.platformBuildReports={items:Array.isArray(rows)?rows:[],error:''};
  }catch(error){
    state.platformBuildReports={items:[],error:String(error?.message||error||'개조서 세팅 제보를 불러오지 못했습니다.')};
  }
}

function platformInboxOpenCount(){
  const siteOpen=(state.hubBoard?.tickets||[]).filter(item=>item.status!=='complete').length;
  const buildOpen=(state.platformBuildReports?.items||[]).filter(item=>String(item.status||'pending')==='pending').length;
  const questionOpen=Number(state.platformSupport?.counts?.pending||0)+Number(state.platformSupport?.counts?.checking||0);
  const suggestionOpen=Number(state.platformSuggestions?.counts?.pending||0)+Number(state.platformSuggestions?.counts?.checking||0);
  return siteOpen+buildOpen+questionOpen+suggestionOpen;
}

async function loadPlatformCompanyAccessAfterReview(){
  state.platformCompanyAccess=await listPlatformCompanyAccess();
}

async function loadAdminPassRequests(){
  if(!state.platformAdmin){state.adminPassRequests=[];state.adminPassRequestsError='';return;}
  try{state.adminPassRequests=await listAdminPassRequests();state.adminPassRequestsError='';}
  catch(error){state.adminPassRequestsError=String(error?.message||error||'이용권 신청 목록 조회 실패');}
}

function passApplicationPayload(data,{requireConsent=true}={}){
  const requesterRole=String(data.get('requester_role')||'representative');
  const ingameNickname=String(data.get('ingame_nickname')||'').trim();
  const representativeIngameNickname=String(data.get('representative_ingame_nickname')||'').trim();
  const ingamePhone=String(data.get('ingame_phone')||'').trim();
  const availableTime=String(data.get('available_time')||'').trim();
  const note=String(data.get('note')||'').trim();
  const consent=requireConsent?String(data.get('consent')||'')==='on':true;
  if(!['representative','admin','member'].includes(requesterRole))throw new Error('회사에서의 역할을 선택해 주세요.');
  if(!ingameNickname)throw new Error('인게임 닉네임을 입력해 주세요.');
  if(requesterRole!=='representative'&&!representativeIngameNickname)throw new Error('대표가 아닌 경우 대표자 인게임 닉네임을 입력해 주세요.');
  if(requireConsent&&!consent)throw new Error('인게임 인증 절차 확인에 동의해 주세요.');
  return {requesterRole,ingameNickname,representativeIngameNickname,ingamePhone,availableTime,note,consent};
}

// One application belongs to one company. Server RPCs remain authoritative for
// membership, duplicate prevention, cooldowns and edit/cancel permissions.
async function submitUnifiedPassRequest(application){
  if(!hasCompany(state)||!state.session?.user)throw new Error('먼저 회사 소속을 확인해 주세요.');
  if(state.companyAccessError||state.companyPassRequestError)throw new Error('이용 승인 상태를 확인하지 못했습니다. 다시 접속해 주세요.');
  if(state.companyAccess?.entitlement_enabled && state.companyAccess?.subscription_status!=='expired')throw new Error('이미 이용 승인이 적용된 회사입니다.');
  const id=state.companyId;
  const result=await createCompanyPassRequest(id,application);
  if(!result?.id)throw new Error('신청 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  if(state.companyId===id){
    try{state.companyPassRequest=await getCompanyPassRequest(id);}
    catch{state.companyPassRequest={id:result.id,status:'pending'};state.companyPassRequestError='';}
  }
  // DM is supplemental: a Discord failure must never roll back an accepted DB request.
  if(result.created===true)await notifyPassRequestOwner(result.id).catch(()=>({sent:false}));
  if(state.platformAdmin)await loadAdminPassRequests();
  return result.created===true;
}

async function loadPlatformSupport() {
  if (!state.platformAdmin) {
    state.platformSupport={counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:''};
    return;
  }
  try {
    const board=await getPlatformSupportQuestions(120);
    state.platformSupport={counts:{pending:0,checking:0,complete:0,unread:0,total:0},items:[],error:'',...(board||{})};
  } catch (error) {
    state.platformSupport={...(state.platformSupport||{}),error:String(error?.message||error||'전체 질문 현황을 불러오지 못했습니다.')};
  }
}

async function openSupportQuestion(questionId) {
  const id=String(questionId||'').trim();
  if(!id) throw new Error('질문을 찾을 수 없습니다.');
  clearQuestionPendingFiles();
  const question=await hydrateSupportQuestion(await getSupportQuestion(id));
  await markSupportQuestionSeen(id).catch(()=>false);
  question.unread=false;
  state.modal={type:'support-question',questionId:id,question};
  if(state.platformAdmin) await loadPlatformSupport();
  if(String(question.company_id||'')===String(state.companyId||'')) await loadQuestionBoard();
}

async function openSuggestion(suggestionId) {
  const id=String(suggestionId||'').trim();
  if(!id) throw new Error('건의를 찾을 수 없습니다.');
  clearSuggestionPendingFiles();
  const suggestion=await hydrateSuggestion(await getSuggestion(id));
  await markSuggestionSeen(id).catch(()=>false);
  suggestion.unread=false;
  state.modal={type:'suggestion-thread',suggestionId:id,suggestion};
  if(state.platformAdmin) await loadPlatformSuggestions();
  if(String(suggestion.company_id||'')===String(state.companyId||'')) await loadSuggestionBoard();
}

// LAC HUB board has no company_id dependency; the DB policies enforce author/admin privacy.
function clearHubBoardFiles(){
  for(const item of state.hubBoard.files){try{URL.revokeObjectURL(item.url);}catch{}}
  state.hubBoard.files=[];
}
function syncHubBoardPreviews(){
  const container=root.querySelector('.hub-board__previews');
  if(!container)return;
  container.replaceChildren();
  for(const item of state.hubBoard.files){
    const frame=document.createElement('div');frame.className='hub-board__preview';
    const img=document.createElement('img');img.src=item.url;img.alt='첨부 예정 사진';
    const button=document.createElement('button');button.type='button';button.dataset.action='hub-board-file-remove';button.dataset.fileId=item.id;button.setAttribute('aria-label','첨부 제거');button.textContent='×';
    frame.append(img,button);container.append(frame);
  }
}
function addHubBoardFiles(files){
  const selected=checkHubBoardFiles([...state.hubBoard.files.map(item=>item.file),...Array.from(files||[])]);
  const previous=state.hubBoard.files.length;
  for(const file of selected.slice(previous))state.hubBoard.files.push({id:crypto.randomUUID(),file,url:URL.createObjectURL(file)});
  syncHubBoardPreviews();
}

function resetHubNoticeEditorState(){
  state.hubBoard.noticeMedia=[];
  state.hubBoard.noticeMediaSeq=0;
  state.hubBoard.noticeEditorBody='';
  state.hubBoard.noticeUploading=false;
  state.hubBoard.noticeCaret=0;
}
function initHubNoticeEditor(notice=null){
  resetHubNoticeEditorState();
  if(!notice)return;
  const parsed=noticeBodyForEditor(notice.body,hubNoticeImageUrl);
  state.hubBoard.noticeMedia=parsed.media;
  state.hubBoard.noticeMediaSeq=parsed.nextSeq;
  state.hubBoard.noticeEditorBody=parsed.editorBody;
}
function syncHubNoticePreviews(){
  const container=root.querySelector('.hub-board__notice-previews');
  if(!container)return;
  container.replaceChildren();
  for(const item of (state.hubBoard.noticeMedia||[]).filter(entry=>!entry.removed)){
    const frame=document.createElement('div');frame.className='hub-board__notice-preview';
    const img=document.createElement('img');img.src=item.url||hubNoticeImageUrl(item.path);img.alt='공지 이미지 미리보기';
    const copy=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=markerForNoticeImage(item.key);
    const small=document.createElement('small');small.textContent='본문의 이 표기 위치에 이미지가 표시됩니다.';
    copy.append(strong,small);
    const button=document.createElement('button');button.type='button';button.dataset.action='hub-board-notice-image-remove';button.dataset.noticeImageKey=item.key;button.textContent='제거';
    frame.append(img,copy,button);container.append(frame);
  }
}
function insertHubNoticeMarker(textarea,marker){
  if(!textarea)return;
  const value=String(textarea.value||'');
  const fallback=Math.max(0,Math.min(value.length,Number(state.hubBoard.noticeCaret||value.length)));
  const start=Number.isInteger(textarea.selectionStart)?textarea.selectionStart:fallback;
  const end=Number.isInteger(textarea.selectionEnd)?textarea.selectionEnd:start;
  const prefix=start>0&&!value.slice(0,start).endsWith('\n')?'\n':'';
  const suffix=end<value.length&&!value.slice(end).startsWith('\n')?'\n':'';
  const chunk=`${prefix}${marker}${suffix}`;
  textarea.setRangeText(chunk,start,end,'end');
  state.hubBoard.noticeCaret=textarea.selectionStart||textarea.value.length;
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
  textarea.focus();
}
async function addHubNoticeImages(files,textarea=root.querySelector('[data-hub-notice-body]')){
  if(!state.platformAdmin)throw new Error('운영자만 공지 이미지를 추가할 수 있습니다.');
  const selected=checkHubNoticeImages(files);
  const current=(state.hubBoard.noticeMedia||[]).filter(item=>!item.removed).length;
  if(current+selected.length>8)throw new Error('공지 이미지는 최대 8장까지 사용할 수 있습니다.');
  state.hubBoard.noticeUploading=true;
  const submit=textarea?.closest('form')?.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent='이미지 업로드 중…';}
  try{
    for(const file of selected){
      const uploaded=await uploadHubNoticeImage(file);
      state.hubBoard.noticeMediaSeq=Number(state.hubBoard.noticeMediaSeq||0)+1;
      const key=String(state.hubBoard.noticeMediaSeq);
      state.hubBoard.noticeMedia.push({key,path:uploaded.path,url:uploaded.url,isNew:true,removed:false});
      insertHubNoticeMarker(textarea,markerForNoticeImage(key));
      syncHubNoticePreviews();
    }
  }finally{
    state.hubBoard.noticeUploading=false;
    if(submit?.isConnected){submit.disabled=false;submit.textContent=submit.dataset.originalText||'저장하기 →';delete submit.dataset.originalText;}
  }
}
async function cleanupHubNoticeDraft({keepReferenced=false}={}){
  const media=state.hubBoard.noticeMedia||[];
  const textarea=root.querySelector('[data-hub-notice-body]');
  const currentText=textarea?.value??state.hubBoard.noticeEditorBody??'';
  const serialized=serializeNoticeEditorBody(currentText,media);
  const referenced=new Set(noticeImagePaths(serialized));
  const paths=media.filter(item=>item.isNew&&item.path&&(!keepReferenced||!referenced.has(item.path))).map(item=>item.path);
  if(paths.length)await removeHubNoticeImages(paths).catch(()=>{});
  resetHubNoticeEditorState();
}
async function removeHubNoticeMediaByKey(key){
  const item=(state.hubBoard.noticeMedia||[]).find(entry=>String(entry.key)===String(key));
  if(!item)return;
  const textarea=root.querySelector('[data-hub-notice-body]');
  if(textarea){
    const marker=markerForNoticeImage(item.key);
    textarea.value=String(textarea.value||'').split(marker).join('').replace(/\n{3,}/g,'\n\n');
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }
  item.removed=true;
  if(item.isNew&&item.path){await removeHubNoticeImages([item.path]).catch(()=>{});item.path='';}
  syncHubNoticePreviews();
}
async function loadHubBoard(){
  if(!state.session?.user)return;
  const userId=state.session.user.id;
  if(state.hubBoard.userId!==userId){clearHubBoardFiles();state.hubBoard={notices:[],tickets:[],ticket:null,files:[],mode:'list',tab:'support',filterContent:'all',filterCategory:'all',noticeId:null,noticeMedia:[],noticeMediaSeq:0,noticeEditorBody:'',noticeUploading:false,noticeCaret:0,error:'',userId};}
  try{
    const board=await loadHubBoardList(state.platformAdmin);
    if(state.session?.user?.id!==userId)return;
    state.hubBoard.notices=board.notices;state.hubBoard.tickets=board.tickets;state.hubBoard.error='';
  }catch(error){state.hubBoard.error=String(error?.message||error||'게시판을 불러오지 못했습니다.');}
  if(state.page==='hub'||state.page==='hub-board')render();
}
async function openHubBoardTicket(ticketId){
  const id=String(ticketId||'');
  if(!id)return;
  clearHubBoardFiles();state.hubBoard.mode='detail';state.hubBoard.ticket=null;render();
  const ticket=await loadHubTicket(id);
  if(state.page!=='hub-board'||state.hubBoard.mode!=='detail')return;
  ticket.attachments=await Promise.all(ticket.attachments.map(async item=>({...item,signedUrl:await hubBoardImageUrl(item.storage_path).catch(()=>'')})));
  state.hubBoard.ticket=ticket;render();
}
async function storeHubBoardFiles(ticketId,messageId){
  const files=state.hubBoard.files.map(item=>item.file);
  if(!files.length)return;
  await uploadHubBoardFiles(ticketId,messageId,state.session.user.id,files);
  clearHubBoardFiles();
}
async function loadCompanyData() {
  const companyId=String(state.companyId||'');
  try{
    await loadBaseCompanyData();
    if(String(state.companyId||'')!==companyId)return;
    if (!hasUnifiedPass(state)) return;
    if (!canAdmin(state)) { await Promise.all([loadQuestionBoard(),loadSuggestionBoard()]); return; }
    const jobs=[];
    if (moduleEnabled(state,'fund')) jobs.push(loadFundSnapshot());
    if (moduleEnabled(state,'assets')) jobs.push(loadAssetsAndAccounts());
    jobs.push(loadQuestionBoard(),loadSuggestionBoard());
    if(state.page==='combat') jobs.push(loadCombatOverview());
    await Promise.all(jobs);
    if (state.fundTab==='weekly' && moduleEnabled(state,'fund')) await loadFundWeeklyMonth(state.fundWeeklyMonth);
  }finally{
    if(companyId&&String(state.companyId||'')===companyId){state.companyDataCompanyId=companyId;state.companyDataLoadedAt=Date.now();state.companyDataLoading=false;}
  }
}

async function loadGameInfo(){
  const request=++infoLoadSequence;
  if(!canOpenWebContent(state,'game_info')){resetScopedGameInfo();return;}
  const companyId=String(state.companyId||'');
  const userId=state.session?.user?.id;
  state.info.loading=true;
  state.info.error='';
  state.info.modbookError='';
  render();
  try {
    const data=await getGameInformation(Boolean(state.platformAdmin));
    let modbooks=[];
    let modbookError='';
    try {
      modbooks=await getGlobalModbooks(Boolean(state.platformAdmin));
    }catch(error){
      modbookError=String(error?.message||error||'개조서를 불러오지 못했습니다.');
    }
    if(request!==infoLoadSequence||String(state.companyId||'')!==companyId||state.session?.user?.id!==userId)return;
    state.info.data={...data,modbook_catalog:modbooks};
    setGameInfoImageMap(data.info_images||[]);
    state.info.companyId=companyId;
    state.info.modbookError=modbookError;
    state.info.loaded=true;
  } catch(error){
    if(request!==infoLoadSequence)return;
    state.info.error=String(error?.message||error||'게임 정보를 불러오지 못했습니다.');
    state.info.loaded=false;
  } finally {
    if(request!==infoLoadSequence)return;
    state.info.loading=false;
    render();
  }
}

async function loadWebContentPolicies() {
  state.contentPoliciesLoaded=false;
  state.contentPolicyError='';
  try {
    state.contentPolicies=await listWebContentPolicies();
    state.contentPoliciesLoaded=true;
  } catch(error) {
    state.contentPolicies=[];
    state.contentPolicyError=String(error?.message||error||'콘텐츠 이용 정책 조회 실패');
  }
}

async function loadPlatformContentSettings() {
  if (!state.platformAdmin) {
    state.platformContentSettings = null;
    state.platformContentError = '';
    return;
  }
  try {
    state.platformContentSettings = await listPlatformContentSettings();
    state.platformContentError = '';
  } catch (error) {
    state.platformContentSettings = null;
    state.platformContentError = String(error?.message || error || '설정 조회 실패');
  }
}

async function refreshAll() {
  resetScopedGameInfo();
  if (!state.session?.user) { state.contentPolicies=[];state.contentPoliciesLoaded=false;state.contentPolicyError='';state.adminPassRequests=[];state.adminPassRequestsError='';state.companyPassRequest=null;state.companyPassRequestError='';state.ready=true;render();if(isCookRoute())showCookPreview();return; }
  state.loading=true; state.error=''; render();
  try {
    state.platformAdmin=await isPlatformAdmin().catch(()=>false);
    if (!state.platformAdmin) { state.platformContentSettings=null; state.platformContentError=''; state.adminPassRequests=[];state.adminPassRequestsError=''; }
    // Fail closed for creation UI without blocking access to existing companies.
    state.companyCreatePermissionError=false;
    try { state.canCreateCompany=await canCreateCompany(); }
    catch { state.canCreateCompany=false; state.companyCreatePermissionError=true; }
    await loadWebContentPolicies();
    if(!state.platformAdmin && ['platform','layout'].includes(state.page)){state.page='dashboard';localStorage.setItem('axe_product_page','dashboard');}
    await claimDiscordMemberships();
    await loadCompanies();
    if(state.page==='company-start' && state.companies.length)state.page='hub';
    state.platformSnapshot=state.platformAdmin?await getPlatformCompanies().catch(()=>[]):[];
    state.platformCompanyAccess=state.platformAdmin?await listPlatformCompanyAccess().catch(()=>null):[];
    await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports(),loadAdminPassRequests(),...(state.platformAdmin?[gameAdminLoadModbookRequests()]:[])]);
    applyPlatformCompanyVisibility();
    const modbookReviewId=pendingModbookReviewId();
    if(state.platformAdmin&&modbookReviewId){state.page='platform';state.platformView='modbooks';}
    state.page = allowedHistoryPage(state.page);
    if(!isBuildRoute()&&!isCookRoute())syncPrimaryScreenRoute({replace:true});
    await loadCompanyData();
    if(state.page==='settings' && state.settingsTab==='cooking' && !moduleRow(state,'cooking')){
      state.settingsTab='basic';
      localStorage.setItem('axe_product_settings_tab','basic');
      syncPrimaryScreenRoute({replace:true});
    }
    if(state.page==='game-info' && canOpenWebContent(state,'game_info'))await loadGameInfo();
    if(state.platformAdmin&&modbookReviewId){
      await loadPlatformModbookReviewCenter(modbookReviewId);
      clearPendingModbookReviewId();
    }
    if(state.page==='platform' && state.platformView==='contents' && state.platformAdmin) await loadPlatformContentSettings();
    state.ready=true;
    if(isCookRoute())showCookPreview();
  }
  catch(error){ state.error=String(error?.message||error); }
  finally { state.loading=false; render(); }
}

function clearReconnectPoll() {
  if (reconnectPollTimer) clearTimeout(reconnectPollTimer);
  reconnectPollTimer = null;
  reconnectPollAttempts = 0;
}

function clearCatalogPoll() {
  if (catalogPollTimer) clearTimeout(catalogPollTimer);
  catalogPollTimer = null;
  catalogPollAttempts = 0;
}

function discordCatalogPending(status = state.onboardingStatus) {
  return state.discordConnection?.status === 'connected' && status?.catalog_ready === false;
}

function startCatalogStatusPoll() {
  clearCatalogPoll();
  const run = async () => {
    if (!state.companyId || !state.session?.user) return clearCatalogPoll();
    catalogPollAttempts += 1;
    try {
      const status = await getCompanyOnboardingStatus(state.companyId);
      state.onboardingStatus = status || null;
      if (!status?.discord_connected) {
        clearCatalogPoll();
        render();
        return;
      }
      if (status?.catalog_ready === true) {
        clearCatalogPoll();
        await loadBaseCompanyData();
        if(state.modal?.type==='setup-guide' && Number(state.setupGuide?.step||0)<=1){
          state.setupGuide=createSetupGuideState(2);
          render();
        }
        setNotice(`Discord 역할 ${Number(status.role_count||0)}개 · 채널 ${Number(status.channel_count||0)}개를 불러왔습니다.`);
        return;
      }
      render();
    } catch (error) {
      if (catalogPollAttempts >= 30) {
        clearCatalogPoll();
        setError(error);
        return;
      }
    }
    if (catalogPollAttempts < 30) catalogPollTimer=setTimeout(run,2000);
    else {
      clearCatalogPoll();
      setNotice('Discord 역할·채널 동기화가 지연되고 있습니다. 잠시 후 새로고침해 주세요.');
    }
  };
  catalogPollTimer=setTimeout(run,600);
}

function startReconnectStatusPoll() {
  clearReconnectPoll();
  const run = async () => {
    if (!state.companyId || !state.session?.user) return clearReconnectPoll();
    reconnectPollAttempts += 1;
    try {
      const status = await getCompanyOnboardingStatus(state.companyId);
      state.onboardingStatus = status || null;
      const phase = String(status?.status || '');
      if (phase === 'error') {
        clearReconnectPoll();
        setError(status?.last_error || 'Discord 연결 초기화에 실패했습니다.');
        return;
      }
      if (!['reset_requested','resetting'].includes(phase)) {
        clearReconnectPoll();
        await loadBaseCompanyData();
        state.settingsTab='basic';
        localStorage.setItem('axe_product_settings_tab','basic');
        if(state.page==='settings')syncPrimaryScreenRoute({replace:true});
        setNotice('기존 Discord 연결 정리가 완료됐습니다. 다시 연결할 수 있습니다.');
        return;
      }
      render();
    } catch (error) {
      if (reconnectPollAttempts >= 20) {
        clearReconnectPoll();
        setError(error);
        return;
      }
    }
    if (reconnectPollAttempts < 20) reconnectPollTimer=setTimeout(run,2500);
    else { clearReconnectPoll(); setNotice('Discord 연결 정리가 진행 중입니다. 잠시 후 새로고침해 주세요.'); }
  };
  reconnectPollTimer=setTimeout(run,1200);
}

function discordOAuthErrorMessage(code) {
  const map={access_denied:'Discord 서버 연결이 취소됐습니다.',invalid_request:'Discord 인증 요청이 올바르지 않습니다.',temporarily_unavailable:'Discord 인증 서비스를 잠시 사용할 수 없습니다.',token_exchange_failed:'Discord 인증 코드 교환에 실패했습니다.',guild_not_returned:'선택한 Discord 서버 정보를 확인하지 못했습니다.',guild_mismatch:'권한을 승인한 Discord 서버가 현재 연결된 회사 서버와 다릅니다.',oauth_validation_failed:'Discord 인증 보안 검증에 실패했습니다.',missing_oauth_response:'Discord 인증 결과가 비어 있습니다.',oauth_failed:'Discord 서버 연결에 실패했습니다.'};
  return map[code]||'Discord 서버 연결에 실패했습니다.';
}
async function handleDiscordOAuthReturn() {
  const raw=String(location.hash||'').replace(/^#/,''); if(!raw)return;
  const params=new URLSearchParams(raw); const token=params.get('discord_link'); const error=params.get('discord_error');
  if(!token&&!error)return; history.replaceState(history.state,'',`${location.pathname}${location.search}`);
  if(error) throw new Error(discordOAuthErrorMessage(error));
  if(!state.session?.user) throw new Error('Discord 서버 연결을 완료하려면 다시 로그인해 주세요.');
  const connection=await completeDiscordConnection(token); clearReconnectPoll(); clearCatalogPoll(); state.companyId=connection.company_id; localStorage.setItem('axe_product_company_id',state.companyId); await refreshAll(); state.settingsTab='basic'; localStorage.setItem('axe_product_settings_tab','basic'); navigatePrimaryScreen('settings',{replace:true}); localStorage.setItem('axe_product_page','settings');
  const resumeGuide=localStorage.getItem('axe_product_setup_resume')==='1';
  const resumeStepRaw=Number(localStorage.getItem('axe_product_setup_resume_step'));
  localStorage.removeItem('axe_product_setup_resume');
  localStorage.removeItem('axe_product_setup_resume_step');
  if(resumeGuide){
    const requestedStep=Number.isInteger(resumeStepRaw)&&resumeStepRaw>=0&&resumeStepRaw<=6?resumeStepRaw:(discordCatalogPending()?1:2);
    const resumeStep=resolveSetupGuideResumeStep(requestedStep);
    state.setupGuide=createSetupGuideState(resumeStep);
    state.modal={type:'setup-guide'};
    render();
  }
  if(discordCatalogPending()){setNotice(`Discord 서버 ${connection.guild_name||''} 연결 완료 · 역할·채널 정보를 불러오는 중입니다.`);startCatalogStatusPoll();}
  else setNotice(`Discord 서버 ${connection.guild_name||''} 연결이 완료됐습니다.`);
}

async function recoverSessionOnResume({force=false}={}) {
  if(!envReady || document.visibilityState==='hidden' || sessionRecoveryBusy) return;
  const nowMs=Date.now();
  if(!force && nowMs-lastSessionRecoveryAt<8000) return;
  sessionRecoveryBusy=true; lastSessionRecoveryAt=nowMs;
  try{
    let session=await getSession();
    const expiresAt=Number(session?.expires_at||0)*1000;
    if(session && (!expiresAt || expiresAt-nowMs<5*60*1000)){
      try{session=await refreshSession()||session;}catch(error){console.warn('LAC HUB session refresh deferred',error);}
    }
    if(!session){
      try{session=await refreshSession();}catch(error){
        const msg=String(error?.message||error||'');
        if(!/session.*missing|refresh.*token.*not found|invalid refresh/i.test(msg)) throw error;
      }
    }
    if(session?.user){
      const before=state.session?.user?.id||null; const after=session.user.id;
      state.session=session;
      if(before!==after || !state.ready){state.ready=false;await refreshAll();}
      return;
    }
    if(state.session?.user){state.session=null;state.canCreateCompany=false;state.companyCreatePermissionError=false;state.contentPolicies=[];state.contentPoliciesLoaded=false;clearCompanyData();state.ready=true;render();if(isCookRoute())showCookPreview();}
  }catch(error){
    console.warn('LAC HUB session recovery skipped after transient error',error);
  }finally{sessionRecoveryBusy=false;}
}

function installSessionResumeRecovery(){
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')recoverSessionOnResume({force:true});});
  window.addEventListener('focus',()=>recoverSessionOnResume());
  window.addEventListener('online',()=>recoverSessionOnResume({force:true}));
  if(sessionHealthTimer)clearInterval(sessionHealthTimer);
  sessionHealthTimer=setInterval(()=>{if(document.visibilityState==='visible'&&state.session?.user)recoverSessionOnResume();},10*60*1000);
}

async function boot() {
  if(!envReady){state.ready=true;render();if(isCookRoute())showCookPreview();return;}
  installPrimaryScreenHistory();
  if (isBuildRoute()) showEmbeddedBuild();
  if (isCookRoute()) showCookPreview();
  // Keep the HUB startup screen until the session and the requested route are ready.
  render();
  try{state.session=await getSession();if(state.session){const exp=Number(state.session.expires_at||0)*1000;if(!exp||exp-Date.now()<5*60*1000)state.session=await refreshSession()||state.session;}}catch(error){state.error=String(error?.message||error);}
  finalizeSupabaseAuthNavigation();
  render(); await refreshAll();
  installSessionResumeRecovery();
  if(discordCatalogPending()) startCatalogStatusPoll();
  try{await handleDiscordOAuthReturn();}catch(error){setError(error);}
  onAuthStateChange((event,session)=>{
    setTimeout(async()=>{
      if(event==='SIGNED_OUT' && Date.now()>manualSignOutUntil){await recoverSessionOnResume({force:true});return;}
      const before=state.session?.user?.id||null; const after=session?.user?.id||null;
      state.session=session;
      if(before!==after){state.canCreateCompany=false;state.companyCreatePermissionError=false;state.ready=false;await refreshAll();}
    },0);
  });
}

let memberClosePending = false;
async function closeModal({force=false}={}) {
  // A registration in flight cannot be closed while the server may be writing.
  if (state.modal?.type === 'member-register' && state.modal.pending) return false;
  if (state.modal?.type === 'member') {
    if (mutationBusy || memberClosePending) return false;
    const editingModal = state.modal;
    const form = root.querySelector('form[data-form="member"]');
    const row = state.memberships.find(item => item.id === editingModal.membershipId);
    // Only actual changes need a discard confirmation. The draft remains
    // mounted while the dialog is open (important for Korean IME inputs).
    let changed = false;
    if (!force && form && row) {
      try { changed = Object.keys(memberChanges(row, new FormData(form))).length > 0; }
      catch { changed = true; } // Invalid draft is still an unsaved draft.
    }
    if (changed) {
      memberClosePending = true;
      let discard = false;
      try {
        discard = await confirmHubDeletion({
          title: '변경 사항을 버릴까요?',
          message: '저장하지 않은 멤버 정보는 반영되지 않습니다.',
          confirmLabel: '버리고 닫기',
        });
      } finally { memberClosePending = false; }
      if (!discard || state.modal !== editingModal || mutationBusy) return false;
    }
  }

  if(state.modal?.type==='setup-demo' && state.modal?.returnToTestCenter){
    state.setupDemo=null;
    state.modal={type:'test-center'};
    render();
    return true;
  }
  if(state.modal?.type==='setup-demo') state.setupDemo=null;
  if(state.modal?.type==='test-center') state.testCenter=null;
  if(state.modal?.type==='setup-guide'){ state.setupGuide=null; state.setupGuideDismissed=true; }
  if(['ledger','ledger-correction'].includes(state.modal?.type)) clearLedgerPendingFiles();
  if(['support-question-create','support-question'].includes(state.modal?.type)) clearQuestionPendingFiles();
  if(['suggestion-create','suggestion-thread'].includes(state.modal?.type)) clearSuggestionPendingFiles();
  state.supportImageViewer=null; state.modal=null; render(); return true;
}

async function withMutation(fn){ if(mutationBusy)return; mutationBusy=true; state.loading=true; render(); try{await fn();}catch(error){setError(error);}finally{mutationBusy=false;state.loading=false;render();} }

// Keep the registration form mounted during a request, especially on API errors.
// The regular mutation wrapper re-renders the entire app and would erase the ID.
async function submitMemberRegistration(form, data) {
  const modal = state.modal;
  if (!modal || modal.type !== 'member-register' || mutationBusy || modal.pending) return;
  const id = String(data.get('discord_user_id') || '').trim();
  const role = String(data.get('role') || 'member');
  modal.discordUserId = String(data.get('discord_user_id') || '');
  modal.role = role;
  const feedback = form.querySelector('[data-member-register-error]');
  const status = form.querySelector('[data-member-register-status]');
  const showError = message => {
    modal.error = String(message || '등록 요청을 처리하지 못했습니다.');
    if (feedback?.isConnected) { feedback.textContent = modal.error; feedback.hidden = false; }
  };
  modal.error = '';
  if (feedback) { feedback.textContent = ''; feedback.hidden = true; }
  if (!canAdmin(state)) { showError('멤버 등록은 OWNER 또는 관리자만 할 수 있습니다.'); return; }
  if (!/^\d{15,22}$/.test(id)) { showError('Discord ID는 15~22자리 숫자로 입력해 주세요.'); return; }
  if (!['member','manager','admin'].includes(role)) { showError('회사 관리 권한을 다시 선택해 주세요.'); return; }

  mutationBusy = true;
  modal.pending = true;
  form.setAttribute('aria-busy','true');
  if (status) status.hidden = false;
  const controls = [ ...form.querySelectorAll('input, select, button'),
    root.querySelector('.runtime-modal > header button[data-action="close-modal"]')
  ].filter(Boolean);
  controls.forEach(control => { control.disabled = true; });
  let registered = false;
  try {
    const result = await registerDiscordMember(state.companyId,id,role);
    registered = true;
    state.memberFilter = 'active'; state.memberRole = ''; state.memberQuery = ''; state.memberPage = 1;
    let refreshed = true;
    try { await loadBaseCompanyData(); }
    catch (error) { refreshed = false; console.warn('Member registered but company list reload failed',error); }
    state.modal = null;
    if (!refreshed) setNotice('멤버 등록 요청은 완료됐지만 목록을 새로고침하지 못했습니다. 새로고침 후 등록 상태를 확인해 주세요.');
    else if (result?.status === 'existing' && result?.membership?.status && result.membership.status!=='active')
      setNotice('이미 등록 이력이 있는 멤버입니다. 멤버 관리에서 현재 상태를 확인해 주세요.');
    else setNotice(result?.status === 'existing' ? '이미 등록된 Discord 멤버입니다. 멤버 목록에서 확인해 주세요.' : '멤버를 등록했습니다. 해당 팀원은 등록 확인 후 바로 회사에 연결됩니다.');
  } catch (error) {
    if (!registered && state.modal === modal) showError(error?.message || error);
    else console.warn('Member registration completed; follow-up UI failed',error);
  } finally {
    modal.pending = false;
    mutationBusy = false;
    if (!registered && state.modal === modal) {
      const liveForm = root.querySelector('form[data-form="member-register"]');
      if (liveForm) {
        liveForm.removeAttribute('aria-busy');
        const liveStatus = liveForm.querySelector('[data-member-register-status]');
        if (liveStatus) liveStatus.hidden = true;
        liveForm.querySelectorAll('input, select, button').forEach(control => { control.disabled = false; });
        const submitButton = liveForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = '멤버 등록';
        const headerClose = root.querySelector('.runtime-modal > header button[data-action="close-modal"]');
        if (headerClose) headerClose.disabled = false;
        const liveFeedback = liveForm.querySelector('[data-member-register-error]');
        if (liveFeedback && modal.error) { liveFeedback.textContent = modal.error; liveFeedback.hidden = false; }
      }
    }
  }
}


function isCurrentCompanyOwner(){ return currentMembership(state)?.role==='owner'; }

function onboardingPhase(){ return String(state.onboardingStatus?.status||''); }
function onboardingStep(){ return String(state.onboardingStatus?.current_step||''); }
function isOnboardingStep(step){ return onboardingPhase()==='onboarding' && onboardingStep()===step; }

function assertOnboardingRoles(data){
  if(!isOnboardingStep('roles')) return;
  if(discordCatalogPending()) throw new Error('Discord 역할·채널 정보를 불러오는 중입니다. 잠시만 기다려 주세요.');
  if(!String(data.get('admin_role_id')||'').trim()) throw new Error('관리자 역할을 선택해 주세요.');
  if(!String(data.get('member_role_id')||'').trim()) throw new Error('일반 멤버 역할을 선택해 주세요.');
}

async function saveBasicSettingsData(data,{requireOnboardingRoles=false}={}){
  if(requireOnboardingRoles) assertOnboardingRoles(data);
  const companyName=String(data.get('company_name')||'').trim();
  if(!companyName) throw new Error('회사 이름을 입력해 주세요.');
  if(companyName!==(state.companies.find(c=>c.id===state.companyId)?.name||'')) await updateCompanyName(state.companyId,companyName);
  let settings={...(state.companySettings?.settings||{})};
  await updateCompanySettings(state.companyId,{locale:state.companySettings?.locale||'ko-KR',timezone:state.companySettings?.timezone||'Asia/Seoul',settings},state.session.user.id);
  await saveDiscordCompanyConfig(state.companyId,{notification_channel_id:state.discordCompanyConfig?.notification_channel_id||null,command_channel_id:state.discordCompanyConfig?.command_channel_id||null,admin_role_id:String(data.get('admin_role_id')||'')||null,member_role_id:String(data.get('member_role_id')||'')||null},state.session.user.id);
}

async function saveModuleSettingsData(form,data){
  // Validate against the currently connected company's synced Discord channel list.
  const aiChannelId=String(data.get('ai_channel_id')||'').trim();
  if(aiChannelId){
    const connectedGuildId=String(state.discordConnection?.guild_id||'');
    const channel=(state.discordChannels||[]).find(c=>String(c.channel_id)===aiChannelId
      && String(c.guild_id)===connectedGuildId && c.is_text_based===true);
    if(!channel) throw new Error('현재 회사에서 사용할 수 있는 AI 전용 텍스트 채널을 선택해 주세요.');
    // Avoid processing an existing functional channel twice (normal BOT command + AI message).
    const used=(state.modules||[]).filter(m=>m.enabled).flatMap(m=>
      Object.entries(m.settings||{}).filter(([key])=>key.endsWith('channel_id')).map(([,value])=>String(value||'')));
    if(used.includes(aiChannelId)) throw new Error('AI 전용 채널은 기존 기능 채널과 다르게 지정해 주세요.');
  }
  const beforeAiChannelId=String(state.discordCompanyConfig?.ai_channel_id||'');
  if(aiChannelId!==beforeAiChannelId){
    if(!state.discordCompanyConfig) throw new Error('Discord 회사 설정을 먼저 완료해 주세요.');
    await saveCompanyAiChannel(state.companyId,aiChannelId,state.session.user.id);
  }
  for(const mod of state.modules){
    const settings={...(mod.settings||{})};
    for(const key of ['status_channel_id','three_channel_id','ten_channel_id','record_channel_id','channel_id','order_channel_id','account_lookup_channel_id']){
      const field=`module_${mod.module_key}_${key}`; if(form.elements[field])settings[key]=String(data.get(field)||'')||null;
    }
    await updateCompanyModuleSettings(state.companyId,mod.module_key,settings,state.session.user.id);
  }
}

// Same-page enlargement for the public company screenshot, independent of COOK's route.
root.addEventListener('click', event => {
  const dialog=event.target;
  if(dialog instanceof HTMLDialogElement && dialog.matches('[data-company-preview-dialog]') && dialog.open){dialog.close();}
});

function gameAdminInlineError(error){
  const form=root.querySelector('form[data-form="game-admin-save"]');
  if(!form){setError(error);return;}
  let message=form.querySelector('[data-ga-form-error]');
  if(!message){message=document.createElement('p');message.className='lac-ga__error';message.dataset.gaFormError='';message.setAttribute('role','alert');form.prepend(message);}
  message.textContent=String(error?.message||error||'저장에 실패했습니다.');
  message.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function gameAdminConfirmDiscard(){
  if(!state.gameAdmin?.dirty)return true;
  return window.confirm('저장하지 않은 변경 내용이 있습니다. 현재 작업을 취소할까요?');
}
function gameAdminResetForm(){
  state.gameAdmin.dirty=false;
  if(state.gameAdmin.previewUrl){URL.revokeObjectURL(state.gameAdmin.previewUrl);state.gameAdmin.previewUrl='';}
}
function gameAdminApplyListSearch(){
  const list=root.querySelector('.lac-ga__items');
  if(!list)return;
  const query=String(state.gameAdmin?.query||'').trim().toLocaleLowerCase('ko-KR');
  let count=0;
  for(const item of list.querySelectorAll('.lac-ga__item[data-ga-search-text]')){
    const matched=!query||String(item.dataset.gaSearchText||'').includes(query);
    item.hidden=!matched;
    if(matched)count+=1;
  }
  const counter=root.querySelector('.lac-ga__list-top small');
  if(counter)counter.textContent=`${count}건`;
}
function gameAdminRefreshList(){
  const current=root.querySelector('.lac-ga__items');
  if(!current)return;
  const temp=document.createElement('div');
  temp.innerHTML=renderGameInfoAdmin(state);
  const next=temp.querySelector('.lac-ga__items');
  if(!next)return;
  current.replaceWith(next);
  gameAdminApplyListSearch();
}
async function gameAdminRefreshHistory(){
  if(!state.platformAdmin)return;
  try{state.gameAdmin.history=await getGameInfoAdminHistory();state.gameAdmin.historyError='';}
  catch(error){state.gameAdmin.historyError=String(error?.message||error);}
}

async function gameAdminLoadModbookRequests(preferredId=''){
  if(!state.platformAdmin)return;
  const admin=state.gameAdmin;
  admin.requestsLoading=true;admin.requestsError='';
  try{
    const rows=await listPlatformModbookRequests('pending');
    admin.requests=Array.isArray(rows)?rows:[];
    const wanted=String(preferredId||admin.requestSelectedId||'');
    admin.requestSelectedId=admin.requests.some(row=>String(row.id)===wanted)?wanted:String(admin.requests[0]?.id||'');
  }catch(error){admin.requestsError=String(error?.message||error);admin.requests=[];admin.requestSelectedId='';}
  finally{admin.requestsLoading=false;}
}
async function loadPlatformModbookReviewCenter(preferredId=''){
  if(!state.platformAdmin)return;
  const admin=state.gameAdmin;
  admin.table='modbook_catalog';admin.requestMode=true;admin.mode='';admin.selectedId='';admin.query='';admin.showInactive=false;
  admin.requestsLoading=true;admin.requestsError='';
  try{
    const [requests,masters]=await Promise.all([
      listPlatformModbookRequests('pending'),
      getGlobalModbooks(true),
    ]);
    admin.requests=Array.isArray(requests)?requests:[];
    const wanted=String(preferredId||admin.requestSelectedId||'');
    admin.requestSelectedId=admin.requests.some(row=>String(row.id)===wanted)?wanted:String(admin.requests[0]?.id||'');
    state.info.data={...(state.info.data||{}),modbook_catalog:Array.isArray(masters)?masters:[]};
    state.info.loaded=true;state.info.modbookError='';
  }catch(error){
    admin.requestsError=String(error?.message||error||'개조서 검수 정보를 불러오지 못했습니다.');
    if(!Array.isArray(admin.requests))admin.requests=[];
  }finally{admin.requestsLoading=false;}
}
function gameAdminChoiceSpec(type=''){
  if(!String(type).startsWith('multi-choice:'))return null;
  const [,maxRaw,choicesRaw]=String(type).split(':');
  return {max:Math.max(1,Number(maxRaw)||2),choices:String(choicesRaw||'').split('|').filter(Boolean)};
}
function gameAdminFieldRaw(form,name,type='text'){
  const spec=gameAdminChoiceSpec(type);
  if(spec){
    const values=new FormData(form).getAll(name).map(value=>String(value||'').trim()).filter(Boolean);
    const unique=[...new Set(values)];
    if(unique.length>spec.max)throw new Error(`${name==='category'?'분류':'적용 가능 부위'}는 최대 ${spec.max}개까지 선택할 수 있습니다.`);
    if(unique.some(value=>!spec.choices.includes(value)))throw new Error(`${name==='category'?'분류':'적용 가능 부위'} 선택값을 다시 확인해 주세요.`);
    return unique.join(', ');
  }
  return String(form.elements.namedItem(name)?.value??'').trim();
}
function gameAdminUpdateMultiChoice(control){
  const details=control?.closest?.('[data-ga-multi]');if(!details)return;
  const max=Math.max(1,Number(details.dataset.gaMultiMax)||2);
  const checked=[...details.querySelectorAll('input[type="checkbox"]:checked')];
  if(checked.length>max){control.checked=false;setNotice(`${details.dataset.gaMultiLabel||'항목'}은(는) 최대 ${max}개까지 선택할 수 있습니다.`);}
  const selected=[...details.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
  const summary=details.querySelector('[data-ga-multi-summary]');if(summary)summary.textContent=selected.length?selected.join(' · '):'선택해 주세요';
}
function gameAdminRequestPayload(form){
  const schema=GAME_ADMIN_SCHEMAS.modbook_catalog;
  const payload={};
  for(const [name,label,type='text',required=false] of schema.fields){
    const raw=gameAdminFieldRaw(form,name,type);
    if(required&&!raw)throw new Error(`${label}을(를) 입력해 주세요.`);
    if(raw.length>2000)throw new Error(`${label}의 내용이 너무 깁니다.`);
    if(type==='number'||type==='integer'){
      if(!raw)payload[name]=name==='success_rate'?null:0;
      else{const value=Number(raw);if(!Number.isFinite(value)||value<0||value>1e9||(type==='integer'&&!Number.isSafeInteger(value)))throw new Error(`${label}의 값을 확인해 주세요.`);if(name==='success_rate'&&value>100)throw new Error('성공률은 0~100% 사이로 입력해 주세요.');payload[name]=value;}
    }else payload[name]=raw||null;
  }
  payload.active=true;
  return payload;
}
async function gameAdminReviewModbookRequest(action,button){
  if(mutationBusy)return;
  const form=button.closest('[data-ga-request-form]');
  const requestId=String(form?.dataset.requestId||state.gameAdmin.requestSelectedId||'');
  if(!form||!requestId)throw new Error('검수할 신청을 다시 선택해 주세요.');
  const reviewNote=String(form.elements.namedItem('review_note')?.value||'').trim();
  let payload=null,mergeModbookId=null,message='';
  if(action==='approve'){
    if(!confirm('신청 내용을 그대로 승인해 공통 개조서에 등록할까요?'))return;
    message='개조서 신청을 승인했습니다.';
  }else if(action==='approve_edit'){
    payload=gameAdminRequestPayload(form);
    if(!confirm('현재 수정한 내용으로 승인해 공통 개조서에 등록할까요?'))return;
    message='수정한 내용으로 개조서 신청을 승인했습니다.';
  }else if(action==='merge'){
    mergeModbookId=String(form.elements.namedItem('merge_modbook_id')?.value||'').trim();
    if(!mergeModbookId)throw new Error('병합할 기존 공통 개조서를 선택해 주세요.');
    if(!confirm('이 신청을 선택한 기존 개조서와 병합할까요? 새 개조서는 생성되지 않습니다.'))return;
    message='기존 개조서와 병합했습니다.';
  }else if(action==='reject'){
    if(!reviewNote&&!confirm('반려 사유 없이 이 신청을 반려할까요?'))return;
    if(reviewNote&&!confirm('이 신청을 반려할까요?'))return;
    message='개조서 신청을 반려했습니다.';
  }else return;
  mutationBusy=true;button.disabled=true;
  try{
    await reviewPlatformModbookRequest({requestId,action,payload,mergeModbookId,reviewNote});
    if(state.page==='platform'&&state.platformView==='modbooks')await loadPlatformModbookReviewCenter();
    else await Promise.all([loadGameInfo(),gameAdminLoadModbookRequests()]);
    state.gameAdmin.requestMode=true;
    state.gameAdmin.requestSelectedId=String(state.gameAdmin.requests[0]?.id||'');
    render();setNotice(message);
  }finally{mutationBusy=false;if(button?.isConnected)button.disabled=false;}
}
async function gameAdminAction(button){
  const platformModbookReview=state.page==='platform'&&state.platformView==='modbooks';
  if(!state.platformAdmin||!(state.page==='game-info'||platformModbookReview))return;
  const admin=state.gameAdmin;
  const action=button.dataset.gameAdminAction;
  if(action==='open'){
    admin.table=GAME_ADMIN_SCHEMAS[state.info.table]?state.info.table:'info_crafts';
    admin.selectedId='';admin.mode='';admin.query='';admin.showInactive=false;
    state.gameAdminOpen=true;
    render();await gameAdminLoadModbookRequests();render();return;
  }
  if(action==='close'){
    if(!gameAdminConfirmDiscard())return;
    gameAdminResetForm();admin.requestMode=false;state.gameAdminOpen=false;render();return;
  }
  // The standalone Platform Admin review center is intentionally independent
  // from the Game Info content-manager open/close state. Requiring
  // gameAdminOpen here made review buttons silently no-op in the review center.
  if(!state.gameAdminOpen&&!platformModbookReview)return;
  if(action==='table'){
    const next=button.dataset.gameAdminTable;
    if(!GAME_ADMIN_TABLES.includes(next)||!gameAdminConfirmDiscard())return;
    gameAdminResetForm();Object.assign(admin,{table:next,selectedId:'',mode:'',query:'',showInactive:false,requestMode:false});
    if(next==='modbook_catalog')await gameAdminLoadModbookRequests();render();return;
  }
  if(action==='new'||action==='select'){
    if(!gameAdminConfirmDiscard())return;
    gameAdminResetForm();admin.mode=action==='new'?'new':'edit';admin.selectedId=action==='new'?'':String(button.dataset.gameAdminId||'');render();return;
  }
  if(action==='requests-open'){
    if(!gameAdminConfirmDiscard())return;
    gameAdminResetForm();admin.requestMode=true;admin.mode='';admin.selectedId='';
    await gameAdminLoadModbookRequests();render();return;
  }
  if(action==='requests-close'){
    admin.requestMode=false;admin.requestSelectedId='';render();return;
  }
  if(action==='requests-refresh'){
    if(state.page==='platform'&&state.platformView==='modbooks')await loadPlatformModbookReviewCenter(admin.requestSelectedId);
    else await gameAdminLoadModbookRequests();
    render();return;
  }
  if(action==='request-select'){
    admin.requestSelectedId=String(button.dataset.requestId||'');render();return;
  }
  if(action==='modbook-request-approve-original'){await gameAdminReviewModbookRequest('approve',button);return;}
  if(action==='modbook-request-approve-edit'){await gameAdminReviewModbookRequest('approve_edit',button);return;}
  if(action==='modbook-request-merge'){await gameAdminReviewModbookRequest('merge',button);return;}
  if(action==='modbook-request-reject'){await gameAdminReviewModbookRequest('reject',button);return;}
  if(action==='delete-modbook'){
    if(admin.table!=='modbook_catalog'||admin.mode!=='edit'||!admin.selectedId)return;
    const row=(state.info?.data?.modbook_catalog||[]).find(item=>String(item.id)===String(admin.selectedId));
    if(!row)throw new Error('삭제할 개조서를 찾지 못했습니다. 목록을 새로고침해 주세요.');
    if(!confirm(`개조서 “${String(row.name||'')}”을 삭제할까요?\n\n일반 사용자와 Discord 목록에서는 즉시 숨겨지며, 변경 기록과 회사별 가격 데이터는 보존됩니다.`))return;
    mutationBusy=true;button.disabled=true;
    try{
      await deleteModbookMaster({id:String(row.id),expectedAt:row.updated_at||null});
      admin.selectedId='';admin.mode='';admin.dirty=false;admin.showInactive=false;
      await loadGameInfo();render();setNotice('개조서를 삭제했습니다. 비활성 정보 포함에서 기록을 확인하거나 다시 활성화할 수 있습니다.');
    }finally{mutationBusy=false;if(button?.isConnected)button.disabled=false;}
    return;
  }
  if(action==='add-material'){
    const list=root.querySelector('[data-ga-material-list]');
    if(!list||list.children.length>=40)return;
    const first=list.querySelector('[data-ga-material]');
    let row;
    if(first){row=first.cloneNode(true);row.querySelector('[name="material_name"]').value='';row.querySelector('[name="quantity"]').value='1';}
    else{row=document.createElement('div');row.className='lac-ga__material';row.dataset.gaMaterial='';row.innerHTML='<label><span>재료 이름</span><input name="material_name" maxlength="160" required placeholder="아이템 이름"></label><label><span>필요 수량</span><input name="quantity" type="number" min="0.000001" step="any" value="1" required></label><button type="button" class="lac-ga__quiet" data-game-admin-action="remove-material">제거</button>';}
    list.append(row);admin.dirty=true;row.querySelector('[name="material_name"]')?.focus();return;
  }
  if(action==='remove-material'){
    button.closest('[data-ga-material]')?.remove();admin.dirty=true;return;
  }
  if(action==='toggle-history'){
    admin.showHistory=!admin.showHistory;
    if(admin.showHistory)await gameAdminRefreshHistory();
    // Updating a separate history region without remounting an unsaved form.
    const history=root.querySelector('.lac-ga__history');
    if(history)history.remove();
    const h=button.closest('.lac-ga__top')?.parentElement;
    if(h){const temp=document.createElement('div');temp.innerHTML=renderGameInfoAdmin(state);const next=temp.querySelector('.lac-ga__history');if(next)h.querySelector('.lac-ga__tabs')?.after(next);}
    button.textContent=admin.showHistory?'변경 기록 닫기':'변경 기록';return;
  }
  if(action==='history-refresh'){
    await gameAdminRefreshHistory();
    const old=root.querySelector('.lac-ga__history');
    const temp=document.createElement('div');temp.innerHTML=renderGameInfoAdmin(state);
    if(old)old.replaceWith(temp.querySelector('.lac-ga__history'));
  }
}
function gameAdminFormData(form,record){
  const admin=state.gameAdmin,table=admin.table,schema=GAME_ADMIN_SCHEMAS[table];
  if(!schema)throw new Error('관리 항목을 선택해 주세요.');
  const payload={};
  for(const [name,label,type='text',required=false] of schema.fields){
    const raw=gameAdminFieldRaw(form,name,type);
    if(required&&!raw)throw new Error(`${label}을(를) 입력해 주세요.`);
    if(raw.length>2000)throw new Error(`${label}의 내용이 너무 깁니다.`);
    if(type==='number'||type==='integer'){
      if(!raw){
        // Optional DB values remain NULL; non-null DB numeric fields default to zero.
        const nullable=['success_rate','reward_xp','recent_price'];
        payload[name]=nullable.includes(name)?null:0;
      }else{
        const value=Number(raw);
        if(!Number.isFinite(value)||value<0||value>1e9||(type==='integer'&&!Number.isSafeInteger(value)))throw new Error(`${label}의 수량을 확인해 주세요.`);
        if(name==='success_rate'&&value>100)throw new Error('성공률은 0~100% 사이로 입력해 주세요.');
        payload[name]=value;
      }
    }else if(type==='date')payload[name]=raw||null;
    else if(name==='parts')payload[name]=raw;
    else payload[name]=raw||null;
  }
  const activeKey=table==='modbook_catalog'?'active':'is_active';
  payload[activeKey]=Boolean(form.elements.namedItem(activeKey)?.checked);
  let materials=null;
  if(table==='info_crafts'){
    const ingredients=[...form.querySelectorAll('[data-ga-material]')];
    materials=ingredients.map((row,index)=>{
      const name=String(row.querySelector('[name="material_name"]')?.value||'').trim();
      const raw=String(row.querySelector('[name="quantity"]')?.value||'').trim();
      if(!name&&!raw)return null;
      const qty=Number(raw);
      if(!name||name.length>160||!Number.isFinite(qty)||qty<=0||qty>1e9)throw new Error(`${index+1}번째 제작 재료의 이름과 수량을 확인해 주세요.`);
      return {material_name:name,quantity:qty};
    }).filter(Boolean);
    const original=record?(state.info.data.info_craft_materials||[]).filter(row=>String(row.craft_id)===String(record.id)&&row.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(row=>({material_name:String(row.material_name||'').trim(),quantity:Number(row.quantity)})):[];
    if(JSON.stringify(original)===JSON.stringify(materials))materials=null;
  }
  return {table,payload,materials};
}
function gameAdminImageKey(table,row){
  if(!row||!GAME_ADMIN_IMAGE_TABLES.includes(table))return '';
  return table==='info_skill_ranks'
    ? `skill:${String(row.skill||'').trim()}`
    : String(row.item_name||'').trim();
}
function gameAdminReviewDialog({table,record,payload,materials,file}){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='lac-hub-confirm lac-ga__review';
    const title=GAME_ADMIN_SCHEMAS[table]?.label||table;
    const changed=Object.entries(payload).filter(([name,value])=>!record||String(record[name]??'')!==String(value??'')).map(([name,value])=>{
      const field=GAME_ADMIN_SCHEMAS[table].fields.find(item=>item[0]===name);
      return `${field?.[1]||'공개 상태'}: ${String(record?.[name]??'—')} → ${String(value??'—')}`;
    });
    dialog.innerHTML='<form method="dialog" class="lac-hub-confirm__content"><h2 id="lac-ga-review-title"></h2><p id="lac-ga-review-intro"></p><div class="lac-ga__review-list" data-ga-review-list></div><div class="lac-hub-confirm__actions"><button type="submit" class="runtime-btn-ghost" value="cancel">돌아가기</button><button type="submit" class="runtime-btn-ghost" value="confirm">확인 후 저장</button></div></form>';
    dialog.setAttribute('aria-labelledby','lac-ga-review-title');
    dialog.querySelector('h2').textContent=`${title} ${record?'수정':'등록'} 확인`;
    dialog.querySelector('#lac-ga-review-intro').textContent='아래 변경 내용을 확인한 다음 저장해 주세요.';
    const review=dialog.querySelector('[data-ga-review-list]');
    const lines=changed.length?changed:['변경된 기본 입력값 없음'];
    if(materials!==null)lines.push(`제작 재료 ${materials.length}개 등록`);
    if(file)lines.push(`대표 이미지 교체: ${file.name}`);
    for(const line of lines){const p=document.createElement('p');p.textContent=line;review.append(p);}
    dialog.addEventListener('close',()=>{const yes=dialog.returnValue==='confirm';dialog.remove();resolve(yes);},{once:true});
    document.body.append(dialog);dialog.showModal();
  });
}
async function gameAdminSaveForm(form){
  if(!state.platformAdmin||!state.gameAdminOpen||state.page!=='game-info')return;
  const admin=state.gameAdmin;
  const table=admin.table;
  const selected=admin.mode==='new'?null:(state.info?.data?.[table]||[]).find(row=>String(row.id)===String(admin.selectedId));
  if(admin.mode!=='new'&&!selected)throw new Error('수정할 항목을 찾지 못했습니다. 목록을 새로고침해 주세요.');
  if(!form.reportValidity())return;
  const {payload,materials}=gameAdminFormData(form,selected);
  const file=form.querySelector('[data-ga-image]')?.files?.[0]||null;
  if(file&&!GAME_ADMIN_IMAGE_TABLES.includes(table))throw new Error('이 항목은 대표 이미지 업로드를 지원하지 않습니다.');
  if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152||file.size===0))throw new Error('2MB 이하 PNG·JPG·WebP 이미지를 선택해 주세요.');
  if(!await gameAdminReviewDialog({table,record:selected,payload,materials,file}))return;
  if(mutationBusy)return;
  let uploadedPath=null;
  mutationBusy=true;
  const save=form.querySelector('[data-ga-save-button]');
  if(save){save.disabled=true;save.textContent='저장 중…';}
  try{
    const oldImageKey=gameAdminImageKey(table,selected);
    const newImageKey=gameAdminImageKey(table,payload);
    const imageRows=state.info?.data?.info_images||[];
    const previousImage=imageRows.find(row=>String(row.item_key||'')===oldImageKey)||null;
    const previousPath=String(previousImage?.image_path||'').trim();
    const previousPathShared=previousPath && imageRows.some(row=>String(row.item_key||'')!==oldImageKey&&String(row.image_path||'')===previousPath);
    // An upload gets a fresh immutable path; a failed DB transaction removes it.
    if(file)uploadedPath=await uploadGameInfoAdminImage(file);
    // Renaming an item/skill without choosing a new file keeps the existing art
    // attached to the new public name instead of making the image disappear.
    const imagePath=uploadedPath||(!file&&oldImageKey&&newImageKey&&oldImageKey!==newImageKey?previousPath:null)||null;
    const saved=await saveGameInfoAdminRow({table,id:selected?.id==null?null:String(selected.id),payload,
      expectedAt:selected?.updated_at||null,companyId:null,
      materials,imagePath});
    const committedUpload=uploadedPath;
    uploadedPath=null; // The image was committed; do not delete it on a later refresh error.
    // Replacing an image under the same key makes the old immutable object orphaned.
    // Remove it only when no other image association still points at that path.
    if(committedUpload&&previousPath&&oldImageKey===newImageKey&&!previousPathShared&&previousPath!==committedUpload){
      try{await cleanupUnlinkedGameInfoAdminImage(previousPath);}catch{/* stale storage objects do not invalidate a successful catalogue save */}
    }
    gameAdminResetForm();admin.selectedId=String(saved.id);admin.mode='edit';admin.showInactive ||= payload[table==='modbook_catalog'?'active':'is_active']===false;
    // Reload all read models so the viewer, list and search always agree.
    await loadGameInfo();
    await gameAdminRefreshHistory();
    if(table==='modbook_catalog')await gameAdminLoadModbookRequests();
    setNotice('게임정보를 저장했습니다. 일반 사용자 화면에도 반영되었습니다.');
  }catch(error){
    if(uploadedPath){try{await cleanupUnlinkedGameInfoAdminImage(uploadedPath);}catch{/* dangling uploaded object is safe; no data reference was written */}}
    gameAdminInlineError(error);
  }finally{
    mutationBusy=false;
    if(save?.isConnected){save.disabled=false;save.textContent=selected?'변경 내용 저장하기':'새 정보 등록하기';}
  }
}

root.addEventListener('click', async event => {
  const gameAdminButton=event.target.closest('[data-game-admin-action]');
  if(gameAdminButton){event.preventDefault();try{await gameAdminAction(gameAdminButton);}catch(error){setError(error);}return;}
  const pageBtn=event.target.closest('[data-page]');
  if(pageBtn){
    if(state.page==='hub-board'&&['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();
    if(pageBtn.dataset.page==='hub'){navigatePrimaryScreen('hub');state.accountMenuOpen=false;state.companyMenuOpen=false;render();return;}
    state.accountMenuOpen=false;
    navigatePrimaryScreen(pageBtn.dataset.page);
    localStorage.setItem('axe_product_page',state.page);
    render();
    void queueCompanyPageData(state.page);
    return;
  }
  const infoTab=event.target.closest('[data-info-table]');
  if(infoTab){if(!canOpenWebContent(state,'game_info'))return;state.info.table=infoTab.dataset.infoTable;state.info.craftGroup='근접무기';state.info.modbookCategory='';state.info.selectedId='';state.info.query='';state.info.filterPrimary='__all__';state.info.filterSecondary='__all__';syncPrimaryScreenRoute();render();return;}
  const infoFilter=event.target.closest('[data-info-filter]');
  if(infoFilter){const field=infoFilter.dataset.infoFilter;if(!['craftGroup','primary','secondary','modbookCategory'].includes(field))return;const key=field==='craftGroup'?'craftGroup':field==='primary'?'filterPrimary':field==='secondary'?'filterSecondary':'modbookCategory';const value=infoFilter.dataset.infoValue;state.info[key]=field==='secondary'&&state.info.table==='info_quests'&&state.info[key]===value?'__all__':value;if(field==='craftGroup'){state.info.filterPrimary='__all__';state.info.filterSecondary='__all__';}else if(field==='primary')state.info.filterSecondary='__all__';if(field!=='modbookCategory')state.info.modbookCategory='';state.info.query='';state.info.selectedId='';render();return;}
  // A global result opens its source category; the search text is cleared only after navigation.
  const infoResult=event.target.closest('[data-info-result-table]');
  if(infoResult){if(!canOpenWebContent(state,'game_info'))return;const source=infoResult.dataset.infoResultTable;if(!['info_crafts','info_material_recipes','info_processes','info_quests','info_skill_ranks','modbook_catalog'].includes(source))return;state.info.table=source==='info_material_recipes'?'info_crafts':source;state.info.craftGroup=source==='info_material_recipes'?'무기부품':source==='info_crafts'?infoResult.dataset.infoResultGroup:'근접무기';state.info.filterPrimary=infoResult.dataset.infoResultPrimary||'__all__';state.info.filterSecondary=infoResult.dataset.infoResultSecondary||'__all__';state.info.modbookCategory=infoResult.dataset.infoResultModbookCategory||'';state.info.selectedId=infoResult.dataset.infoResultId;state.info.query='';syncPrimaryScreenRoute();render();return;}
  const infoRow=event.target.closest('[data-info-id]');
  if(infoRow){
    // Render replaces the entire game-info list. Keep its current position when
    // selecting a different item (especially long '기타 제작품' lists).
    // Category/filter/search transitions still start at their intended position.
    const previousList=infoRow.closest('.axe-info-list__items');
    const previousScroll=previousList?.scrollTop;
    state.info.selectedId=infoRow.dataset.infoId;
    render();
    if(previousScroll!==undefined){
      const nextList=root.querySelector('.axe-info-list__items');
      if(nextList)nextList.scrollTop=previousScroll;
    }
    return;
  }
  const fundTab=event.target.closest('[data-fund-tab]');
  if(fundTab){state.fundTab=fundTab.dataset.fundTab;localStorage.setItem('axe_product_fund_tab',state.fundTab);syncPrimaryScreenRoute();render();if(state.fundTab==='weekly') await loadFundWeeklyMonth();return;}
  const memberFilter=event.target.closest('[data-member-filter]'); if(memberFilter){state.memberFilter=memberFilter.dataset.memberFilter;state.memberPage=1;render();return;}
  const assetTab=event.target.closest('[data-asset-tab]'); if(assetTab){state.assetTab=assetTab.dataset.assetTab;if(state.assetTab==='assets')state.assetPage=1;else state.returnPage=1;syncPrimaryScreenRoute();render();return;}
  const settingsTab=event.target.closest('[data-settings-tab]');
  if(settingsTab){
    const nextTab=String(settingsTab.dataset.settingsTab||'basic');
    if(nextTab==='modules' && state.settingsTab==='basic' && isOnboardingStep('roles')){
      if(discordCatalogPending()){setError('Discord 역할·채널 정보를 불러오는 중입니다. 잠시만 기다려 주세요.');startCatalogStatusPoll();return;}
      const activeForm=root.querySelector('form[data-form="settings-basic"]');
      if(!activeForm){setError('기본 설정 화면을 다시 열어 주세요.');return;}
      const activeData=new FormData(activeForm);
      await withMutation(async()=>{
        await saveBasicSettingsData(activeData,{requireOnboardingRoles:true});
        await loadBaseCompanyData();
        state.settingsTab='modules';
        localStorage.setItem('axe_product_settings_tab','modules');
        syncPrimaryScreenRoute();
        setNotice('역할 설정을 저장했습니다. 기능·채널 설정으로 이동합니다.');
      });
      return;
    }
    if(nextTab==='modules' && state.settingsTab==='basic' && isOnboardingStep('discord')){
      setError('먼저 Discord 서버를 연결해 주세요.');
      return;
    }
    state.settingsTab=nextTab;localStorage.setItem('axe_product_settings_tab',state.settingsTab);syncPrimaryScreenRoute();render();return;
  }
  if(event.target.matches('[data-support-image-backdrop]')){state.supportImageViewer=null;render();return;}
  if(event.target.matches('[data-modal-backdrop]')){ if(['cooking-menu'].includes(state.modal?.type))return; closeModal(); return; }

  const actionEl=event.target.closest('[data-action]'); if(!actionEl)return; const action=actionEl.dataset.action;
  if(action==='combat-select-member'){const id=String(actionEl.dataset.membershipId||'');if(!id||id===state.combat.selectedMembershipId)return;await loadCombatMember(id);return;}
  if(action==='combat-period'){const period=String(actionEl.dataset.period||'30d');if(!['7d','30d','all'].includes(period))return;state.combat.period=period;render();return;}
  if(action==='combat-rank-mode'){const mode=String(actionEl.dataset.rankMode||'kd');if(!['kd','kills','activity'].includes(mode))return;state.combat.rankMode=mode;render();return;}
  if(action==='refresh-combat'){await loadCombatOverview({selectFirst:true});setNotice('전투 기록을 새로고침했습니다.');return;}
  if(action==='company-preview-open'){
    event.preventDefault();
    const dialog=root.querySelector('[data-company-preview-dialog]');
    if(dialog && !dialog.open)dialog.showModal();
    return;
  }
  if(action==='company-preview-close'){
    event.preventDefault();
    root.querySelector('[data-company-preview-dialog]')?.close();
    root.querySelector('[data-action="company-preview-open"]')?.focus({preventScroll:true});
    return;
  }
  if(action==='list-page'){
    const key=String(actionEl.dataset.listKey||''); const page=Math.max(1,Number(actionEl.dataset.listPage||1));
    const map={fundLedger:'fundLedgerPage',fundReview:'fundReviewPage',members:'memberPage',assets:'assetPage',returns:'returnPage',accounts:'accountPage',cooking:'cookingPage',questions:'questionPage',suggestions:'suggestionPage',platform:'platformPage'};
    if(map[key]){state[map[key]]=page;render();}
    return;
  }
  if(action==='question-filter'){state.questionStatus=String(actionEl.dataset.questionStatus||'all');state.questionPage=1;render();return;}
  if(action==='question-scope'){state.questionScope=String(actionEl.dataset.questionScope||'all')==='mine'?'mine':'all';state.questionPage=1;render();return;}
  if(action==='suggestion-filter'){state.suggestionStatus=String(actionEl.dataset.suggestionStatus||'all');state.suggestionPage=1;render();return;}
  if(action==='suggestion-category'){state.suggestionCategory=String(actionEl.dataset.suggestionCategory||'all');state.suggestionPage=1;render();return;}
  if(action==='switch-hub-content-category'){
    const category=String(actionEl.dataset.contentCategory||'main');
    if(!/^[a-z0-9_-]{1,32}$/i.test(category))return;
    if(state.hubContentCategory===category)return;
    state.hubContentCategory=category;
    render();
    requestAnimationFrame(()=>root.querySelector(`[data-action="switch-hub-content-category"][data-content-category="${CSS.escape(category)}"]`)?.focus({preventScroll:true}));
    return;
  }
  if(action==='close-account-menu'){
    const profile=actionEl.closest('.hub-account__profile');
    if(profile){profile.open=false;profile.querySelector('.hub-account__trigger')?.focus();}
    if(state.accountMenuOpen){state.accountMenuOpen=false;render();}
    return;
  }
  if(action==='toggle-company-menu'){state.accountMenuOpen=false;state.companyMenuOpen=!state.companyMenuOpen;render();return;}
  if(action==='toggle-account-menu'){state.companyMenuOpen=false;state.accountMenuOpen=!state.accountMenuOpen;render();return;}
  if(action==='open-layout-studio'){if(!state.platformAdmin){state.accountMenuOpen=false;render();return;}state.accountMenuOpen=false;navigatePrimaryScreen('layout');localStorage.setItem('axe_product_page','layout');state.layoutSaved=loadLayoutStudioProfile();state.layoutDraft={...state.layoutSaved};state.layoutDirty=false;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='layout-toggle-advanced'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutAdvanced=!state.layoutAdvanced;render();return;}
  if(action==='layout-preset'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutDraft=applyLayoutStudioPreset(state.layoutDraft,String(actionEl.dataset.layoutType||''),String(actionEl.dataset.layoutValue||''));state.layoutDirty=true;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='layout-adjust'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutDraft=adjustLayoutStudioValue(state.layoutDraft,String(actionEl.dataset.layoutKey||''),Number(actionEl.dataset.layoutDelta||0));state.layoutDirty=true;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='layout-save'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutSaved=saveLayoutStudioProfile(state.layoutDraft);state.layoutDraft={...state.layoutSaved};state.layoutDirty=false;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='layout-revert'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutDraft={...state.layoutSaved};state.layoutDirty=false;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='layout-reset-default'){if(!state.platformAdmin||state.page!=='layout')return;state.layoutDraft=clearLayoutStudioProfile();state.layoutSaved={...state.layoutDraft};state.layoutDirty=false;applyLayoutStudioProfile(state.layoutDraft);render();return;}
  if(action==='open-pass-requests'){
    if(!state.platformAdmin)return;
    state.accountMenuOpen=false;
    state.platformView='pass-requests';
    state.adminPassView='pending';state.adminPassPage=1;
    navigatePrimaryScreen('platform');
    await loadAdminPassRequests();
    render();return;
  }
  if(action==='open-platform-admin'){if(!state.platformAdmin){state.accountMenuOpen=false;render();return;}state.accountMenuOpen=false;if(state.page!=='platform'&&state.page!=='layout')state.platformView='overview';navigatePrimaryScreen('platform');localStorage.setItem('axe_product_page','platform');state.platformSnapshot=await getPlatformCompanies().catch(()=>state.platformSnapshot||[]);await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports(),...(state.platformView==='contents'?[loadPlatformContentSettings()]:[]),...(state.platformView==='modbooks'?[loadPlatformModbookReviewCenter()]:[])]);render();return;}
  if(action==='info-refresh'){await loadGameInfo();return;}
  if(action==='open-test-center'){if(!state.platformAdmin){state.accountMenuOpen=false;render();return;}state.accountMenuOpen=false;state.testCenter=createTestCenterState();state.modal={type:'test-center'};render();return;}
  if(action==='test-center-exit'){state.testCenter=null;state.modal=null;render();return;}
  if(action==='test-center-reset'){if(!state.platformAdmin)return;state.testCenter=createTestCenterState();state.setupDemo=null;state.modal={type:'test-center'};render();return;}
  if(action==='test-center-go-hub'){if(!state.platformAdmin||!state.testCenter)return;state.testCenter.screen='hub';state.testCenter.content=null;render();return;}
  if(action==='test-center-open-new-company'){if(!state.platformAdmin||!state.testCenter)return;state.testCenter.screen='company-form';render();return;}
  if(action==='test-center-company-back'){if(!state.platformAdmin||!state.testCenter)return;state.testCenter.screen='hub';render();return;}
  if(action==='test-center-open-content'){
    if(!state.platformAdmin||!state.testCenter)return;
    if(!state.testCenter.companyCreated){state.testCenter.screen='company-form';render();return;}
    const key=String(actionEl.dataset.contentKey||'company');
    state.testCenter.content=key==='cook'?'cook':'company';
    state.testCenter.screen='content';
    render();return;
  }
  if(action==='test-center-request-pass'){
    if(!state.platformAdmin||!state.testCenter||!state.testCenter.companyCreated)return;
    if(state.testCenter.passStatus==='active')return;
    state.testCenter.passEditMode=false;
    state.testCenter.screen='pass-form';
    render();return;
  }
  if(action==='test-center-pass-back'){
    if(!state.platformAdmin||!state.testCenter)return;
    state.testCenter.passEditMode=false;
    state.testCenter.screen='content';
    render();return;
  }
  if(action==='test-center-edit-pass'){
    if(!state.platformAdmin||!state.testCenter||state.testCenter.passStatus!=='pending')return;
    state.testCenter.passEditMode=true;
    state.testCenter.screen='pass-form';
    render();return;
  }
  if(action==='test-center-cancel-pass'){
    if(!state.platformAdmin||!state.testCenter||state.testCenter.passStatus!=='pending')return;
    if(!window.confirm('현재 이용권 신청을 취소할까요? 취소 후 다시 신청할 수 있습니다.'))return;
    state.testCenter.passStatus='none';
    state.testCenter.passEditMode=false;
    state.testCenter.passCancelled=true;
    state.testCenter.screen='content';
    render();return;
  }
  if(action==='test-center-approve-pass'){
    if(!state.platformAdmin||!state.testCenter||state.testCenter.passStatus!=='pending')return;
    state.testCenter.passStatus='active';
    render();return;
  }
  if(action==='test-center-start-setup'){
    if(!state.platformAdmin||!state.testCenter||state.testCenter.passStatus!=='active')return;
    state.setupDemo=createSetupDemoState();
    state.setupDemo.step=0;
    state.modal={type:'setup-demo',returnToTestCenter:true};
    render();return;
  }
  if(action==='go-hub'){if(state.page==='hub-board'&&['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();state.accountMenuOpen=false;state.companyMenuOpen=false;navigatePrimaryScreen('hub');state.modal=null;render();return;}
  if(action==='hub-board-notices'){if(['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();clearHubBoardFiles();state.hubBoard.ticket=null;state.hubBoard.mode='list';state.hubBoard.tab='notices';navigatePrimaryScreen('hub-board');await loadHubBoard();render();return;}
  if(action==='hub-board-open'||action==='hub-board-compose'){
    if(['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();
    clearHubBoardFiles();state.hubBoard.ticket=null;state.hubBoard.mode=action==='hub-board-compose'?'compose':'list';state.hubBoard.tab='support';
    navigatePrimaryScreen('hub-board');render();if(action==='hub-board-open')await loadHubBoard();return;
  }
  if(action==='hub-board-quick'){const category=String(actionEl.dataset.boardCategory||'all');state.hubBoard.filterCategory=state.hubBoard.filterCategory===category?'all':category;state.hubBoard.mode='list';state.hubBoard.tab='support';syncPrimaryScreenRoute();render();return;}
  if(action==='hub-board-tab'){if(['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();clearHubBoardFiles();state.hubBoard.mode='list';state.hubBoard.tab=String(actionEl.dataset.boardTab||'support')==='notices'?'notices':'support';syncPrimaryScreenRoute();render();return;}
  if(action==='hub-board-cancel'){if(['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();clearHubBoardFiles();state.hubBoard.mode='list';state.hubBoard.ticket=null;render();return;}
  if(action==='hub-board-notice'){
    const id=String(actionEl.dataset.noticeId||'');
    if(['notice-compose','notice-edit'].includes(state.hubBoard.mode))await cleanupHubNoticeDraft();
    clearHubBoardFiles();state.hubBoard.tab='notices';
    if(state.page!=='hub-board')navigatePrimaryScreen('hub-board'); else syncPrimaryScreenRoute();
    state.hubBoard.noticeId=id;state.hubBoard.mode='notice';render();return;
  }
  if(action==='hub-board-notice-compose'){if(!state.platformAdmin)return;await cleanupHubNoticeDraft();clearHubBoardFiles();initHubNoticeEditor(null);state.hubBoard.noticeId=null;state.hubBoard.mode='notice-compose';state.hubBoard.tab='notices';render();return;}
  if(action==='hub-board-notice-edit'){
    if(!state.platformAdmin)return;
    const id=String(actionEl.dataset.noticeId||state.hubBoard.noticeId||'');
    const notice=(state.hubBoard.notices||[]).find(item=>String(item.id)===id);
    if(!id||!notice){setError('수정할 공지를 찾을 수 없습니다.');return;}
    await cleanupHubNoticeDraft();clearHubBoardFiles();initHubNoticeEditor(notice);state.hubBoard.noticeId=id;state.hubBoard.mode='notice-edit';state.hubBoard.tab='notices';render();return;
  }
  if(action==='hub-board-notice-image-remove'){
    if(!state.platformAdmin)return;
    await removeHubNoticeMediaByKey(actionEl.dataset.noticeImageKey);return;
  }
  if(action==='hub-board-notice-delete'){
    if(!state.platformAdmin)return;
    const id=String(actionEl.dataset.noticeId||state.hubBoard.noticeId||'');
    if(!id){setError('삭제할 공지를 찾을 수 없습니다.');return;}
    if(!await confirmHubDeletion({title:'공지 삭제',message:'이 공지사항을 삭제할까요? 삭제 후에는 복구할 수 없습니다.',confirmLabel:'공지 삭제'}))return;
    await withMutation(async()=>{
      const notice=(state.hubBoard.notices||[]).find(item=>String(item.id)===id);
      const imagePaths=noticeImagePaths(notice?.body||'');
      await deleteHubNotice(id);
      if(imagePaths.length)await removeHubNoticeImages(imagePaths).catch(()=>{});
      resetHubNoticeEditorState();state.hubBoard.noticeId=null;state.hubBoard.mode='list';state.hubBoard.tab='notices';
      await loadHubBoard();setNotice('공지사항을 삭제했습니다.');
    });
    return;
  }
  if(action==='platform-refresh-site-tickets'){
    if(!state.platformAdmin)return;
    await withMutation(loadHubBoard);return;
  }
  if(action==='platform-open-site-board'){
    if(!state.platformAdmin)return;
    clearHubBoardFiles();state.hubBoard.ticket=null;state.hubBoard.mode='list';state.hubBoard.tab='support';
    navigatePrimaryScreen('hub-board');render();await withMutation(loadHubBoard);return;
  }
  if(action==='platform-open-site-ticket'){
    if(!state.platformAdmin)return;
    const ticketId=String(actionEl.dataset.ticketId||'');
    if(!ticketId)return;
    state.hubBoard.tab='support';navigatePrimaryScreen('hub-board');
    await withMutation(async()=>{await openHubBoardTicket(ticketId);});return;
  }
  if(action==='hub-board-delete'){
    const ticketId=String(actionEl.dataset.ticketId||'');
    const ticket=state.page==='hub-board'&&state.hubBoard.mode==='detail'&&
      String(state.hubBoard.ticket?.id||'')===ticketId?state.hubBoard.ticket:null;
    const mayDelete=Boolean(ticket&&(state.platformAdmin||String(ticket.author_id)===String(state.session?.user?.id||'')));
    if(!mayDelete){setError('이 글을 삭제할 권한이 없습니다.');return;}
    if(!await confirmHubDeletion({title:'문의 · 건의 삭제',message:'이 글과 답변, 첨부사진을 모두 삭제할까요? 삭제 후에는 복구할 수 없습니다.',confirmLabel:'글 삭제'}))return;
    await withMutation(async()=>{
      await deleteHubTicket(ticketId);
      clearHubBoardFiles();state.hubBoard.ticket=null;state.hubBoard.mode='list';
      await loadHubBoard();
      setNotice('글을 삭제했습니다.');
    });
    return;
  }
  if(action==='hub-board-ticket'){
    state.hubBoard.tab='support';navigatePrimaryScreen('hub-board');await withMutation(async()=>{await openHubBoardTicket(actionEl.dataset.ticketId);});return;
  }
  if(action==='hub-board-image'){
    const imagePath=String(actionEl.dataset.imagePath||'');
    if(!imagePath)return;
    try{const url=await hubBoardImageUrl(imagePath);showHubBoardPhoto(actionEl,url);}
    catch(error){setError(error);}
    return;
  }
  if(action==='hub-board-file-remove'){
    const id=String(actionEl.dataset.fileId||'');const file=state.hubBoard.files.find(item=>item.id===id);
    if(file){try{URL.revokeObjectURL(file.url);}catch{}state.hubBoard.files=state.hubBoard.files.filter(item=>item.id!==id);syncHubBoardPreviews();}
    return;
  }
  if(action==='open-company-start'){if(state.companies.length){navigatePrimaryScreen('hub');render();return;}state.companyStartSource='company';navigatePrimaryScreen('company-start');render();return;}
  if(action==='open-company-start-game'){if(state.companies.length){navigatePrimaryScreen('hub');render();return;}state.companyStartSource='game';navigatePrimaryScreen('company-start');render();return;}
  if(action==='open-paid-content-guide'){
    const key=String(actionEl.dataset.contentKey||'');
    if(!hasCompany(state)) {navigatePrimaryScreen('company-start');render();return;}
    if(!['game_info','lac_build'].includes(key))return;
    state.requestedContent=key==='game_info'?'게임 정보':'개조서 세팅';
    navigatePrimaryScreen('paid-content-guide');render();return;
  }
  if(action==='open-hub-game-info'){
    if(!canOpenWebContent(state,'game_info')){navigatePrimaryScreen('hub');render();return;}
    navigatePrimaryScreen('game-info');
    if(!state.info.loaded || String(state.info.companyId||'')!==String(state.companyId||'')) await loadGameInfo();
    render();return;
  }
  if(action==='open-company-console'){
    if(!state.companyId || !state.companies.some(company=>company.id===state.companyId)){
      navigatePrimaryScreen('company-start');render();return;
    }
    state.requestedContent='회사 관리';
    state.accountMenuOpen=false;state.companyMenuOpen=false;
    navigatePrimaryScreen('dashboard');localStorage.setItem('axe_product_page','dashboard');
    if(companyContextFreshForCurrentCompany()){render();return;}
    if(!companyAccessFreshForCurrentCompany())state.companyAccessStatus='loading';
    state.companyDataLoading=true;
    render();
    void ensureCompanyData({force:true})
      .catch(error=>{state.companyAccess=null;state.companyAccessError=String(error?.message||error||'이용권 조회 실패');state.companyAccessStatus='error';state.companyAccessCheckedAt=Date.now();})
      .finally(()=>render());
    return;
  }
  if(action==='switch-company'){const next=String(actionEl.dataset.companyId||'');clearReconnectPoll();clearCatalogPoll();state.companyMenuOpen=false;if(!next||next===state.companyId){render();return;}resetScopedGameInfo();state.companyId=next;state.companyAccess=null;state.companyAccessError='';state.companyAccessStatus='loading';state.companyAccessCheckedAt=0;state.companyDataCompanyId='';state.companyDataLoadedAt=0;state.companyDataLoading=true;state.companyPassRequest=null;state.companyPassRequestError='';localStorage.setItem('axe_product_company_id',next);state.fundSnapshot=null;state.fundLedgerAttachments=[];state.assetsSnapshot=null;state.accountsSnapshot=null;state.combat={overview:null,detail:null,selectedMembershipId:'',period:'30d',rankMode:'kd',loading:false,detailLoading:false,error:''};state.fundMonthlyRows=[];state.fundLedgerPage=1;state.fundReviewPage=1;state.memberPage=1;state.assetPage=1;state.returnPage=1;state.accountPage=1;state.questionPage=1;state.suggestionPage=1;state.cookingPage=1;state.platformPage=1;render();void ensureCompanyData({force:true}).then(async()=>{if(state.page==='game-info'&&state.companyId===next)await loadGameInfo();}).catch(error=>{if(state.companyId!==next)return;state.companyAccess=null;state.companyAccessError=String(error?.message||error||'회사 정보를 불러오지 못했습니다.');state.companyAccessStatus='error';state.companyAccessCheckedAt=Date.now();}).finally(()=>{if(state.companyId===next)render();});return;}
  if(action==='dismiss-error'){state.error='';render();return;}
  if(action==='open-support-image'){const url=String(actionEl.dataset.imageUrl||'');if(!url)return;state.supportImageViewer={url,name:String(actionEl.dataset.imageName||'첨부 사진')};render();return;}
  if(action==='close-support-image'){state.supportImageViewer=null;render();return;}
  if(action==='close-modal'){closeModal();return;}
  if(action==='open-member-register'){if(!canAdmin(state)){setError('멤버 등록은 OWNER 또는 관리자만 할 수 있습니다.');return;}if(state.discordConnection?.status!=='connected'){setError('먼저 회사 설정에서 Discord 서버를 연결해 주세요.');return;}state.modal={type:'member-register',discordUserId:'',role:'member',error:'',pending:false};render();return;}
  if(action==='open-create-company'){
    // UI and direct-action guard: a user with an assigned company cannot
    // create another one from the HUB/company console, even when the RPC
    // reports eligibility because this account has never been the creator.
    if(state.companies.length&&!state.platformAdmin){setError('이미 소속 회사가 설정되어 있어 새 회사를 만들 수 없습니다.');return;}
    // Recheck at click time so an old tab or a stale UI cannot open the form.
    try { state.canCreateCompany=await canCreateCompany(); state.companyCreatePermissionError=false; }
    catch(error){state.canCreateCompany=false;state.companyCreatePermissionError=true;setError(error);return;}
    if(!state.canCreateCompany){setError('이미 회사를 생성한 계정은 새 회사를 추가로 만들 수 없습니다. 기존 회사에 멤버로 가입하는 것은 가능합니다.');return;}
    state.modal={type:'create-company'};render();return;
  }
  if(action==='open-pass-application'||action==='edit-pass-application'){
    if(!hasCompany(state)){setError('먼저 회사 소속을 확인해 주세요.');return;}
    if(action==='edit-pass-application'&&(!state.companyPassRequest?.viewer_can_edit||state.companyPassRequest?.status!=='pending')){setError('현재 신청은 직접 수정할 수 없습니다.');return;}
    state.modal={type:'pass-application',editing:action==='edit-pass-application'};render();return;
  }
  if(action==='cancel-pass-application'){
    const requestId=String(state.companyPassRequest?.id||'');
    if(!requestId||!state.companyPassRequest?.viewer_can_cancel){setError('현재 신청은 직접 취소할 수 없습니다.');return;}
    if(!window.confirm('현재 회사 이용 신청을 취소할까요? 취소 후 6시간 동안 재신청할 수 없습니다.'))return;
    await withMutation(async()=>{
      await cancelCompanyPassRequest(requestId);
      state.companyPassRequest=await getCompanyPassRequest(state.companyId);
      state.companyPassRequestError='';
      if(state.platformAdmin)await loadAdminPassRequests();
      setNotice('회사 이용 신청을 취소했습니다. 6시간 후 다시 신청할 수 있습니다.');
    });return;
  }

  if(action==='copy-registration-info'){
    const discord=currentDiscordIdentity();
    if(!discord.id){setError('Discord 계정 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');return;}
    const text=`회사 대표·관리자에게 멤버 등록 요청\nDiscord 이름: ${discord.name}\nDiscord ID: ${discord.id}`;
    try{await navigator.clipboard.writeText(text);setNotice('대표에게 전달할 등록 정보를 복사했습니다.');}catch{setError('등록 정보를 복사하지 못했습니다. Discord ID를 직접 전달해 주세요.');}
    return;
  }
  if(action==='check-member-registration'){
    await withMutation(async()=>{
      await claimDiscordMemberships();
      await loadCompanies();
      if(!state.companies.length) throw new Error('아직 회사 멤버로 등록되지 않았습니다. 회사 대표 또는 관리자에게 등록을 요청해 주세요.');
      await loadCompanyData();
      if(!currentMembership(state)) throw new Error('현재 계정의 회사 멤버 권한을 확인하지 못했습니다. 대표 또는 관리자에게 문의해 주세요.');
      await loadWebContentPolicies();
      if(!state.contentPoliciesLoaded) throw new Error('콘텐츠 이용 정책을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      state.ready=true;
      // A registration check must never take users directly into a restricted
      // company screen. Start at HUB, then re-check each selected content.
      navigatePrimaryScreen('hub');
      setNotice('회사 멤버 등록을 확인했습니다. HUB에서 이용할 콘텐츠를 선택해 주세요.');
    });
    return;
  }
  if(action==='go-dashboard'){state.accountMenuOpen=false;state.requestedContent='회사 관리';navigatePrimaryScreen('dashboard');localStorage.setItem('axe_product_page','dashboard');render();if(!hasUnifiedPass(state))return;if(!state.fundSnapshot)await withMutation(loadFundSnapshot);if(!state.assetsSnapshot)await withMutation(loadAssetsAndAccounts);render();return;}
  if(action==='open-setup-guide'){
    if(!hasUnifiedPass(state)){setError('회사 이용 승인 후 초기설정을 진행할 수 있습니다.');return;}
    if(!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    const saved=savedSetupGuideProgress();
    const requestedStep=saved&&!saved.completed?Math.max(0,Math.min(6,Number(saved.step||0))):0;
    openSetupGuide(resolveSetupGuideResumeStep(requestedStep)); return;
  }
  if(action==='setup-guide-back'){if(!state.setupGuide)return;state.setupGuide.step=Math.max(0,Number(state.setupGuide.step||0)-1);render();return;}
  if(action==='setup-guide-jump'){if(!state.setupGuide)return;const target=Number(actionEl.dataset.step||0);if(target<=Number(state.setupGuide.step||0)){state.setupGuide.step=Math.max(0,Math.min(6,target));render();}return;}
  if(action==='setup-guide-next'){
    if(!state.setupGuide)return;
    const step=Number(state.setupGuide.step||0);
    if(step===1){if(state.discordConnection?.status!=='connected'){setError('먼저 Discord 서버를 연결해 주세요.');return;}if(state.onboardingStatus?.catalog_ready===false){setError('Discord 역할·채널 정보를 불러오는 중입니다. 잠시만 기다려 주세요.');startCatalogStatusPoll();return;}}
    state.setupGuide.step=Math.min(6,step+1);await withMutation(async()=>{await persistSetupGuideProgress(state.setupGuide.step);});return;
  }
  if(action==='setup-guide-connect'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{localStorage.setItem('axe_product_setup_resume','1');localStorage.removeItem('axe_product_setup_resume_step');const started=await startDiscordConnection(state.companyId);location.assign(started.authorize_url);});return;
  }
  if(action==='setup-guide-reapprove-channels'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{
      localStorage.setItem('axe_product_setup_resume','1');
      localStorage.setItem('axe_product_setup_resume_step','4');
      const started=await startDiscordPermissionReapproval(state.companyId);
      location.assign(started.authorize_url);
    });return;
  }
  if(action==='setup-guide-save-roles'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{await saveSetupGuideRoles();await persistSetupGuideProgress(3);setNotice('Discord 역할 설정을 저장했습니다.');});return;
  }
  if(action==='setup-guide-toggle-module'){
    if(!state.setupGuide)return;const key=String(actionEl.dataset.moduleKey||'');if(Object.prototype.hasOwnProperty.call(state.setupGuide.modules||{},key)){state.setupGuide.modules[key]=!state.setupGuide.modules[key];render();}return;
  }
  if(action==='setup-guide-save-modules'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{await saveSetupGuideModules();await persistSetupGuideProgress(4);setNotice('사용 기능을 저장했습니다.');});return;
  }
  if(action==='setup-guide-channel-mode'){if(!state.setupGuide)return;state.setupGuide.channelMode=String(actionEl.dataset.mode||'quick')==='direct'?'direct':'quick';if(state.setupGuide.channelMode==='direct'){state.setupGuide.permissionIssue=null;state.setupGuide.permissionMessage='';}render();return;}
  if(action==='setup-guide-create-channels'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{
      const plan=setupGuideChannelPlan();
      const category=String(state.setupGuide.categoryName||'LAC HUB').trim();
      if(!category)throw new Error('카테고리 이름을 입력해 주세요.');
      if(plan.some(row=>!String(row.name||'').trim()))throw new Error('생성할 채널 이름을 모두 입력해 주세요.');
      const normalizedNames=plan.map(row=>String(row.name||'').trim().toLocaleLowerCase('ko-KR'));
      if(new Set(normalizedNames).size!==normalizedNames.length)throw new Error('같은 채널명을 두 번 사용할 수 없습니다. 채널명을 다르게 지정해 주세요.');
      let result;
      try{
        result=await createGuidedSetupChannels(state.companyId,category,plan.map(row=>({key:row.key,name:row.name,type:row.type||'text'})));
      }catch(error){
        const message=String(error?.message||error||'');
        if(Number(error?.statusCode||0)===403 || /채널 관리 권한/.test(message)){
          state.setupGuide.permissionIssue='manage_channels';
          state.setupGuide.permissionMessage='회사 관리에서 Discord 채널을 자동 생성하려면 현재 연결된 서버에서 채널 관리 권한 승인이 필요합니다.';
          render();
          return;
        }
        throw error;
      }
      state.setupGuide.permissionIssue=null;
      state.setupGuide.permissionMessage='';
      const map={};for(const row of result?.channels||[])if(row?.key&&row?.id)map[String(row.key)]=String(row.id);
      await persistSetupGuideChannels(map);
      await loadQuestionBoard();
      state.setupGuide=createSetupGuideState(5);await persistSetupGuideProgress(5);
      setNotice(`${Object.keys(map).length}개 Discord 채널을 준비하고 기능에 연결했습니다.`);
    });return;
  }
  if(action==='setup-guide-save-direct-channels'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{
      const plan=setupGuideChannelPlan(); const map={};
      for(const row of plan){const id=String(state.setupGuide.directChannels?.[row.key]||'');if(!id)throw new Error(`${row.label}에 연결할 Discord 채널을 선택해 주세요.`);map[row.key]=id;}
      await persistSetupGuideChannels(map);await loadQuestionBoard();state.setupGuide=createSetupGuideState(5);await persistSetupGuideProgress(5);setNotice('기존 Discord 채널을 회사 관리 기능에 연결했습니다.');
    });return;
  }
  if(action==='setup-guide-load-members'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(loadSetupGuideMembers);return;
  }
  if(action==='setup-guide-select-members'){
    if(!state.setupGuide)return;const ids=(state.setupGuide.memberCandidates||[]).map(m=>String(m.discord_user_id));const selected=new Set((state.setupGuide.memberSelected||[]).map(String));const all=ids.length>0&&ids.every(id=>selected.has(id));ids.forEach(id=>all?selected.delete(id):selected.add(id));state.setupGuide.memberSelected=[...selected];render();return;
  }
  if(action==='setup-guide-import-members'){
    if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}
    await withMutation(async()=>{
      const selected=new Set((state.setupGuide.memberSelected||[]).map(String));const members=(state.setupGuide.memberCandidates||[]).filter(m=>selected.has(String(m.discord_user_id)));
      if(!members.length)throw new Error('등록할 멤버를 한 명 이상 선택해 주세요.');
      const result=await bulkRegisterDiscordMembers(state.companyId,state.setupGuide.memberFilterRoleId,members.map(m=>String(m.discord_user_id)),state.setupGuide.memberTargetRole||'member');
      await loadBaseCompanyData();state.setupGuide.memberImportDone=true;state.setupGuide.memberImportSkipped=false;await persistSetupGuideProgress(6);
      const insertedCount=Number(result?.inserted?.length||0);const existingCount=Number(result?.skipped?.length||0);const inactiveCount=Number(result?.requires_manual_reactivation?.length||0);
      setNotice(`${insertedCount}명 등록 완료 · ${existingCount}명 기존 등록${inactiveCount?` · ${inactiveCount}명은 퇴사/정지 이력으로 멤버 관리에서 상태 확인 필요`:''}`);
    });return;
  }
  if(action==='setup-guide-skip-members'){if(!state.setupGuide)return;state.setupGuide.memberImportDone=true;state.setupGuide.memberImportSkipped=true;await withMutation(async()=>{await persistSetupGuideProgress(6);});return;}
  if(action==='setup-guide-finish'){if(!state.setupGuide||!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 완료할 수 있습니다.');return;}await withMutation(async()=>{await persistSetupGuideProgress(6,{completed:true});state.setupGuide=null;state.modal=null;navigatePrimaryScreen('dashboard',{replace:true});localStorage.setItem('axe_product_page','dashboard');setNotice('초기설정이 완료됐습니다. 대시보드에서 현재 운영 상태를 확인하세요.');});return;}
  if(action==='open-setup-demo'){state.setupDemo=createSetupDemoState();state.modal={type:'setup-demo'};render();return;}
  if(action==='setup-demo-connect'){if(!state.setupDemo)return;state.setupDemo.connected=true;render();return;}
  if(action==='setup-demo-next'){if(!state.setupDemo)return;if(state.setupDemo.step===1&&!state.setupDemo.connected){state.setupDemo.connected=true;render();return;}state.setupDemo.step=Math.min(6,Number(state.setupDemo.step||0)+1);render();return;}
  if(action==='setup-demo-back'){if(!state.setupDemo)return;state.setupDemo.step=Math.max(0,Number(state.setupDemo.step||0)-1);render();return;}
  if(action==='setup-demo-restart'){if(!state.setupDemo)return;state.setupDemo=createSetupDemoState();render();return;}
  if(action==='setup-demo-finish'){const back=Boolean(state.modal?.returnToTestCenter);if(back&&state.testCenter){state.testCenter.setupComplete=true;state.testCenter.screen='content';state.testCenter.content='company';}state.setupDemo=null;state.modal=back?{type:'test-center'}:null;render();return;}
  if(action==='setup-demo-jump'){if(!state.setupDemo)return;const target=Number(actionEl.dataset.step||0);if(target<=Number(state.setupDemo.step||0)){state.setupDemo.step=Math.max(0,Math.min(6,target));render();}return;}
  if(action==='setup-demo-toggle-module'){if(!state.setupDemo)return;const key=String(actionEl.dataset.moduleKey||'');if(key){state.setupDemo.modules[key]=!Boolean(state.setupDemo.modules[key]);state.setupDemo.channelsGenerated=false;render();}return;}
  if(action==='setup-demo-channel-mode'){if(!state.setupDemo)return;const mode=String(actionEl.dataset.mode||'quick');state.setupDemo.channelMode=mode==='direct'?'direct':'quick';state.setupDemo.channelsGenerated=false;render();return;}
  if(action==='setup-demo-generate-channels'){if(!state.setupDemo)return;state.setupDemo.channelsGenerated=true;render();return;}
  if(action==='setup-demo-select-visible-members'){
    if(!state.setupDemo)return;
    const groups={member:['m1','m2','m3','m4','m5','m6'],admin:['a1','a2'],guest:['g1','g2','g3','g4','g5','g6','g7','g8','g9','g10']};
    const visible=groups[state.setupDemo.memberFilter]||groups.member;
    const selected=new Set(state.setupDemo.memberSelected||[]);
    const allSelected=visible.every(id=>selected.has(id));
    visible.forEach(id=>allSelected?selected.delete(id):selected.add(id));
    state.setupDemo.memberSelected=[...selected];state.setupDemo.memberImportDone=false;state.setupDemo.memberImportSkipped=false;render();return;
  }
  if(action==='setup-demo-import-members'){
    if(!state.setupDemo)return;
    if(!(state.setupDemo.memberSelected||[]).length){setNotice('등록할 멤버를 한 명 이상 선택해 주세요.');return;}
    state.setupDemo.memberImportDone=true;state.setupDemo.memberImportSkipped=false;render();return;
  }
  if(action==='setup-demo-skip-members'){if(!state.setupDemo)return;state.setupDemo.memberImportDone=true;state.setupDemo.memberImportSkipped=true;render();return;}
  if(action==='refresh-questions'){await withMutation(loadQuestionBoard);return;}
  if(action==='platform-inbox-filter'){state.platformInboxFilter=String(actionEl.dataset.inboxFilter||'all');syncPrimaryScreenRoute();render();return;}
  if(action==='refresh-platform-inbox'){await withMutation(async()=>{await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);});return;}
  if(action==='open-platform-build-report'){
    const id=Number(actionEl.dataset.reportId||0);
    const report=(state.platformBuildReports?.items||[]).find(item=>Number(item.id)===id);
    if(!report){setError('개조서 세팅 제보를 찾을 수 없습니다.');return;}
    let evidenceUrl='';
    if(report.evidence_path)evidenceUrl=await getPlatformBuildReportEvidenceUrl(report.evidence_path).catch(()=> '');
    state.modal={type:'platform-build-report',report:{...report,evidenceUrl}};render();return;
  }
  if(action==='review-platform-build-report'){
    const id=Number(actionEl.dataset.reportId||state.modal?.report?.id||0);
    const approve=String(actionEl.dataset.review||'')==='approve';
    if(!id||!state.platformAdmin){setError('제보 검수 권한을 확인해 주세요.');return;}
    await withMutation(async()=>{await reviewPlatformBuildReport(id,approve);state.modal=null;await loadPlatformBuildReports();setNotice(approve?'개조서 세팅 제보를 승인했습니다.':'개조서 세팅 제보를 반려했습니다.');});return;
  }
  if(action==='refresh-platform-support'){await withMutation(loadPlatformSupport);return;}
  if(action==='open-question-create'){clearQuestionPendingFiles();state.modal={type:'support-question-create'};render();return;}
  if(action==='open-question'){
    const questionId=String(actionEl.dataset.questionId||'');
    await withMutation(async()=>{await openSupportQuestion(questionId);});return;
  }
  if(action==='remove-question-pending'){
    const id=String(actionEl.dataset.pendingId||'');
    const item=(state.questionPendingFiles||[]).find(x=>x.id===id);
    try{if(item?.previewUrl)URL.revokeObjectURL(item.previewUrl);}catch{}
    state.questionPendingFiles=(state.questionPendingFiles||[]).filter(x=>x.id!==id);
    refreshQuestionPendingAttachmentUi();
    return;
  }
  if(action==='delete-question'){
    const questionId=String(actionEl.dataset.questionId||'');
    const question=state.modal?.type==='support-question'&&String(state.modal.questionId||'')===questionId?state.modal.question:null;
    if(!question?.viewer_can_delete){setError('이 질문을 삭제할 권한이 없습니다.');return;}
    if(!await confirmHubDeletion({title:'질문 삭제',message:'이 질문과 답변, 첨부사진을 모두 삭제할까요? 삭제 후에는 복구할 수 없습니다.',confirmLabel:'질문 삭제'}))return;
    await withMutation(async()=>{
      const paths=supportQuestionStoragePaths(question);
      if(paths.length) await removeSupportAttachments(paths);
      await deleteSupportQuestion(questionId);
      clearQuestionPendingFiles();
      state.modal=null;
      await loadQuestionBoard();
      if(state.platformAdmin)await loadPlatformSupport();
      setNotice('질문을 삭제했습니다.');
    });
    return;
  }
  if(action==='question-status'){
    if(!state.platformAdmin){setError('질문 상태 변경은 PLATFORM OWNER만 가능합니다.');return;}
    const questionId=String(actionEl.dataset.questionId||'');const status=String(actionEl.dataset.status||'');
    await withMutation(async()=>{
      await updateQuestionStatus(questionId,status);
      let notifyResult=null;
      if(status==='complete') notifyResult=await notifySupportQuestionAnswer(questionId).catch(()=>({sent:false,reason:'dm_failed'}));
      await loadPlatformSupport();
      if(state.companyId) await loadQuestionBoard();
      const question=await hydrateSupportQuestion(await getSupportQuestion(questionId));
      question.unread=false;
      state.modal={type:'support-question',questionId,question};
      setNotice(status==='complete'?(notifyResult?.sent?'답변완료 처리 후 작성자에게 Discord DM을 보냈습니다.':'답변완료 처리했습니다. 사이트 알림은 유지되고 Discord DM은 전달되지 않았습니다.'):'질문 상태를 변경했습니다.');
    });return;
  }
  if(action==='refresh-suggestions'){await withMutation(loadSuggestionBoard);return;}
  if(action==='refresh-platform-suggestions'){await withMutation(loadPlatformSuggestions);return;}
  if(action==='open-suggestion-create'){clearSuggestionPendingFiles();state.modal={type:'suggestion-create'};render();return;}
  if(action==='open-suggestion'){
    const suggestionId=String(actionEl.dataset.suggestionId||'');
    await withMutation(async()=>{await openSuggestion(suggestionId);});return;
  }
  if(action==='remove-suggestion-pending'){
    const id=String(actionEl.dataset.pendingId||'');
    const item=(state.suggestionPendingFiles||[]).find(x=>x.id===id);
    try{if(item?.previewUrl)URL.revokeObjectURL(item.previewUrl);}catch{}
    state.suggestionPendingFiles=(state.suggestionPendingFiles||[]).filter(x=>x.id!==id);
    refreshSuggestionPendingAttachmentUi();
    return;
  }
  if(action==='delete-suggestion'){
    const suggestionId=String(actionEl.dataset.suggestionId||'');
    const suggestion=state.modal?.type==='suggestion-thread'&&String(state.modal.suggestionId||'')===suggestionId?state.modal.suggestion:null;
    if(!suggestion?.viewer_can_delete){setError('이 건의를 삭제할 권한이 없습니다.');return;}
    if(!await confirmHubDeletion({title:'건의 삭제',message:'이 건의와 답변, 첨부사진을 모두 삭제할까요? 삭제 후에는 복구할 수 없습니다.',confirmLabel:'건의 삭제'}))return;
    await withMutation(async()=>{
      const paths=suggestionStoragePaths(suggestion);
      if(paths.length) await removeSuggestionAttachments(paths);
      await deleteSuggestion(suggestionId);
      clearSuggestionPendingFiles();
      state.modal=null;
      await loadSuggestionBoard();
      if(state.platformAdmin)await loadPlatformSuggestions();
      setNotice('건의를 삭제했습니다.');
    });
    return;
  }
  if(action==='suggestion-status'){
    if(!state.platformAdmin){setError('건의 상태 변경은 PLATFORM OWNER만 가능합니다.');return;}
    const suggestionId=String(actionEl.dataset.suggestionId||'');const status=String(actionEl.dataset.status||'');
    await withMutation(async()=>{
      await updateSuggestionStatus(suggestionId,status);
      let notifyResult=null;
      if(status==='complete') notifyResult=await notifySuggestionAnswer(suggestionId).catch(()=>({sent:false,reason:'dm_failed'}));
      await loadPlatformSuggestions();
      if(state.companyId) await loadSuggestionBoard();
      const suggestion=await hydrateSuggestion(await getSuggestion(suggestionId));
      suggestion.unread=false;
      state.modal={type:'suggestion-thread',suggestionId,suggestion};
      setNotice(status==='complete'?(notifyResult?.sent?'답변완료 처리 후 작성자에게 Discord DM을 보냈습니다.':'답변완료 처리했습니다. 사이트 알림은 유지되고 Discord DM은 전달되지 않았습니다.'):'건의 상태를 변경했습니다.');
    });return;
  }
  if(action==='dashboard-jump'){
    const page=String(actionEl.dataset.page||'dashboard');
    if(actionEl.dataset.fundTab){state.fundTab=String(actionEl.dataset.fundTab);localStorage.setItem('axe_product_fund_tab',state.fundTab);}
    if(actionEl.dataset.settingsTab){state.settingsTab=String(actionEl.dataset.settingsTab);localStorage.setItem('axe_product_settings_tab',state.settingsTab);}
    if(validPages.includes(page)){navigatePrimaryScreen(page);localStorage.setItem('axe_product_page',page);}
    if(['dashboard','fund'].includes(state.page)&&!state.fundSnapshot) await withMutation(loadFundSnapshot);
    if(['dashboard','assets','accounts'].includes(state.page)&&!state.assetsSnapshot) await withMutation(loadAssetsAndAccounts);
    if(state.page==='questions') await withMutation(loadQuestionBoard);
    if(state.page==='suggestions') await withMutation(loadSuggestionBoard);
    if(state.page==='platform'&&state.platformAdmin){state.platformSnapshot=await getPlatformCompanies().catch(()=>state.platformSnapshot||[]);await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);}
    render();return;
  }
  if(action==='open-ledger'){clearLedgerPendingFiles();state.modal={type:'ledger',entryId:null};render();return;}
  if(action==='edit-ledger'){clearLedgerPendingFiles();const entryId=actionEl.dataset.entryId;const row=(state.fundSnapshot?.ledger||[]).find(r=>String(r.id)===String(entryId));state.modal={type:row?.can_edit?'ledger':'ledger-correction',entryId};render();return;}
  if(action==='remove-ledger-pending'){const id=String(actionEl.dataset.pendingId||'');const item=(state.ledgerPendingFiles||[]).find(x=>x.id===id);try{if(item?.previewUrl)URL.revokeObjectURL(item.previewUrl);}catch{}state.ledgerPendingFiles=(state.ledgerPendingFiles||[]).filter(x=>x.id!==id);render();return;}
  if(action==='open-ledger-evidence'){
    const entryId=String(actionEl.dataset.entryId||'');
    const entry=(state.fundSnapshot?.ledger||[]).find(row=>String(row.id)===entryId);
    const paths=[entry?.evidence_path,...(state.fundLedgerAttachments||[]).filter(item=>String(item.entry_id)===entryId).map(item=>item.storage_path)].filter(Boolean);
    if(paths.length===1){
      try{const url=await getFundEvidenceSignedUrl(paths[0],300);if(url)showHubBoardPhoto(actionEl,url);}
      catch(error){setError(error);}
      return;
    }
    if(paths.length>1){
      try{
        const urls=await Promise.all(paths.map(path=>getFundEvidenceSignedUrl(path,300)));
        state.modal={type:'ledger-evidence',entryId,previewUrls:Object.fromEntries(paths.map((path,index)=>[path,urls[index]]))};
      }catch(error){setError(error);return;}
    }else state.modal={type:'ledger-evidence',entryId};
    render();return;
  }
  if(action==='open-ledger-attachment'){
    const path=String(actionEl.dataset.storagePath||'');if(!path)return;
    try{const url=await getFundEvidenceSignedUrl(path,300);if(url)showHubBoardPhoto(actionEl,url);}
    catch(error){setError(error);}
    return;
  }
  if(action==='pass-admin-tab'){
    if(!state.platformAdmin)return;
    const view=String(actionEl.dataset.view||'pending');
    if(!['pending','recent','all'].includes(view))return;
    state.adminPassView=view;state.adminPassPage=1;syncPrimaryScreenRoute();render();return;
  }
  if(action==='pass-admin-page'){
    if(!state.platformAdmin)return;
    const page=Math.max(1,Number(actionEl.dataset.page||1));
    state.adminPassPage=page;render();return;
  }
  if(action==='pass-admin-toggle-company'){
    if(!state.platformAdmin)return;
    const companyId=String(actionEl.dataset.companyId||'');if(!companyId)return;
    state.adminPassExpandedCompanies={...(state.adminPassExpandedCompanies||{}),[companyId]:!state.adminPassExpandedCompanies?.[companyId]};
    render();return;
  }
  if(action==='pass-admin-clear-search'){
    if(!state.platformAdmin)return;
    state.adminPassQuery='';state.adminPassPage=1;render();return;
  }
  if(action==='refresh-pass-requests'){
    if(!state.platformAdmin)return;
    await withMutation(loadAdminPassRequests);return;
  }
  if(action==='admin-edit-pass-application'){
    if(!state.platformAdmin)return;
    const id=String(actionEl.dataset.requestId||'');
    const request=(state.adminPassRequests||[]).find(row=>String(row.id)===id);
    if(!request){setError('수정할 신청 정보를 찾지 못했습니다.');return;}
    state.modal={type:'admin-pass-application',requestId:id};render();return;
  }
  if(action==='toggle-pass-application-block'){
    if(!state.platformAdmin)return;
    const companyId=String(actionEl.dataset.companyId||'');
    const request=(state.adminPassRequests||[]).find(row=>String(row.company_id)===companyId);
    if(!request){setError('회사 신청 정보를 찾지 못했습니다.');return;}
    const nextBlocked=String(request.application_blocked)!=='true' && request.application_blocked!==true;
    let reason='';
    if(nextBlocked){
      const input=window.prompt(`${request.company_name} 회사의 신규 이용 신청을 제한합니다. 운영 메모를 입력해 주세요.`, String(request.application_block_reason||''));
      if(input===null)return;
      reason=String(input||'').trim();
      if(reason.length>300){setError('신청 제한 사유는 300자 이내로 입력해 주세요.');return;}
    }else if(!window.confirm(`${request.company_name} 회사의 신규 이용 신청 제한을 해제할까요?`))return;
    await withMutation(async()=>{
      await setAdminCompanyPassApplicationBlock(companyId,nextBlocked,reason);
      await loadAdminPassRequests();
      setNotice(nextBlocked?'이 회사의 신규 이용 신청을 제한했습니다. 현재 대기 중인 신청은 별도로 승인 또는 반려해 주세요.':'회사 이용 신청 제한을 해제했습니다.');
    });return;
  }
  if(action==='approve-pass-request'||action==='reject-pass-request'){
    if(!state.platformAdmin)return;
    const id=String(actionEl.dataset.requestId||'');
    const request=(state.adminPassRequests||[]).find(row=>row.id===id && row.status==='pending');
    if(!request)return;
    const approve=action==='approve-pass-request';
    let days=null;
    if(approve){
      const input=window.prompt(`${request.company_name} 회사에 새로 발급할 기간을 입력해 주세요 (7 / 30 / 90일). 기존 이용권이 남았다면 먼저 즉시 만료해야 합니다.`, '30');
      if(input===null)return;
      days=Number(input);
      if(![7,30,90].includes(days)){window.alert('7·30·90일 중 선택해 주세요.');return;}
    }
    if(!window.confirm(`${request.company_name} 회사의 통합 이용권 신청을 ${approve?`승인하고 지금부터 ${days}일 이용권을 새로 발급`:'반려'}할까요?`))return;
    await withMutation(async()=>{
      if(approve){
        await managePlatformPassLifecycle(request.company_id,'issue',days,id);
      }else{
        await reviewCompanyPassRequest(id,false);
      }
      await Promise.all([loadAdminPassRequests(),loadPlatformCompanyAccessAfterReview()]);
      state.platformSnapshot=await getPlatformCompanies();
      if(state.companyId===request.company_id)await loadCompanyData();
      setNotice(approve?'이용권을 새로 발급했습니다. 발급 시각부터 선택한 기간이 계산됩니다.':'이용권 신청을 반려했습니다.');
    });return;
  }
  if(action==='platform-pass-lifecycle'){
    if(!state.platformAdmin)return;
    const companyId=String(actionEl.dataset.companyId||'');
    const op=String(actionEl.dataset.passOp||'');
    const company=(state.platformSnapshot||[]).find(row=>String(row.company_id)===companyId);
    if(!company||!['issue','expire','pause','resume'].includes(op))return;
    const days=op==='issue'?Number(actionEl.closest('.lac-pass-lifecycle')?.querySelector('[data-pass-issue-days]')?.value):null;
    if(op==='issue'&&![7,30,90].includes(days)){setError('발급 기간은 7·30·90일 중 선택해 주세요.');return;}
    const labels={issue:`${days}일 이용권을 새로 발급`,expire:'현재 이용권을 남은 기간과 관계없이 즉시 만료',pause:'현재 이용권을 일시정지',resume:'현재 이용권 이용을 재개'};
    const caution=op==='issue'?'기존 기간을 승계하지 않고 지금부터 새로 계산됩니다.':op==='expire'?'현재 이용권의 남은 기간은 사라지며, 재발급은 별도 작업입니다.':'기존 종료 시각은 바뀌지 않습니다.';
    if(!window.confirm(`${company.company_name} 회사의 이용권을 ${labels[op]}할까요?\n${caution}`))return;
    await withMutation(async()=>{
      await managePlatformPassLifecycle(companyId,op,days);
      await loadCompanies();
      state.platformSnapshot=await getPlatformCompanies();
      state.platformCompanyAccess=await listPlatformCompanyAccess();
      state.platformPassEvents=await listPlatformPassLifecycle(companyId);
      if(state.companyId===companyId)await loadCompanyData();
      setNotice(op==='issue'?`새 ${days}일 이용권을 발급했습니다. 발급 시각부터 기간이 시작됩니다.`:op==='expire'?'기존 이용권을 즉시 만료했습니다. 새 이용권은 별도로 발급해 주세요.':op==='pause'?'기존 이용권을 일시정지했습니다. 종료 시각은 그대로 유지됩니다.':'이용권을 재개했습니다. 종료 시각은 그대로 유지됩니다.');
    });return;
  }
  if(action==='edit-platform-subscription'){
    if(!state.platformAdmin){setError('PLATFORM OWNER 권한이 필요합니다.');return;}
    const companyId=String(actionEl.dataset.companyId||'');
    state.modal={type:'platform-subscription',companyId};
    state.platformPassEvents=null;
    render();
    await withMutation(async()=>{state.platformPassEvents=await listPlatformPassLifecycle(companyId);});
    return;
  }
  if(action==='platform-view'){
    if(!state.platformAdmin){setError('서비스 운영자 권한이 필요합니다.');return;}
    const view=String(actionEl.dataset.platformView||'companies');
    if(!['overview','companies','pass-requests','modbooks','support','suggestions','contents'].includes(view))return;
    state.platformView=view==='suggestions'?'support':view;
    if(state.page!=='platform'){navigatePrimaryScreen('platform');localStorage.setItem('axe_product_page','platform');}
    else syncPrimaryScreenRoute();
    if(view==='support'||view==='suggestions')await withMutation(async()=>{state.platformView='support';await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);});
    else if(view==='contents')await withMutation(loadPlatformContentSettings);
    else if(view==='pass-requests')await withMutation(loadAdminPassRequests);
    else if(view==='modbooks')await withMutation(()=>loadPlatformModbookReviewCenter());
    else render();
    return;
  }
  if(action==='refresh-platform-contents'){
    if(!state.platformAdmin){setError('서비스 운영자 권한이 필요합니다.');return;}
    await withMutation(loadPlatformContentSettings);
    return;
  }
  if(action==='toggle-platform-content'){
    if(!state.platformAdmin){setError('서비스 운영자 권한이 필요합니다.');return;}
    const key=String(actionEl.dataset.contentKey||'');
    const field=String(actionEl.dataset.field||'');
    if(!['is_published','is_free'].includes(field))return;
    const current=(state.platformContentSettings||[]).find(item=>item.content_key===key);
    if(!current)return;
    // These flags are configuration only in phase 2; access gates are NOT wired.
    await withMutation(async()=>{
      await updatePlatformContentSetting(key,
        field==='is_published'?!current.is_published:current.is_published,
        field==='is_free'?!current.is_free:current.is_free);
      // Reload persisted values rather than assuming a successful optimistic flip.
      await Promise.all([loadPlatformContentSettings(),loadWebContentPolicies()]);
      if (state.platformContentError || state.contentPolicyError) throw new Error(state.platformContentError||state.contentPolicyError);
      if (isCookRoute()) showCookPreview();
      setNotice('콘텐츠 설정을 저장했습니다. HUB 진입 설정을 새로 확인했습니다.');
    });
    return;
  }
  if(action==='open-delete-company'){if(!state.platformAdmin){setError('회사 삭제는 PLATFORM OWNER만 할 수 있습니다.');return;}const companyId=String(actionEl.dataset.companyId||'');const row=(state.platformSnapshot||[]).find(r=>String(r.company_id)===companyId);if(!row){setError('삭제할 회사를 찾지 못했습니다.');return;}state.modal={type:'company-delete',companyId};render();return;}
  if(action==='edit-member'){state.modal={type:'member',membershipId:actionEl.dataset.membershipId};render();return;}
  if(action==='open-asset'){state.modal={type:'asset',assetId:null};render();return;}
  if(action==='edit-asset'){state.modal={type:'asset',assetId:actionEl.dataset.assetId};render();return;}
  if(action==='open-account-request'){state.modal={type:'account'};render();return;}
  if(action==='open-account-row'){const membershipId=String(actionEl.dataset.membershipId||'');state.modal=membershipId===currentMembership(state)?.id?{type:'account'}:{type:'account-detail',membershipId};render();return;}
  if(action==='reset-fund-filter'){state.fundFilters={person:'all',type:'all',account:'all'};state.fundLedgerPage=1;render();return;}
  if(action==='open-discord-reconnect'){if(!canAdmin(state)){setError('관리자 권한이 필요합니다.');return;}if(state.discordConnection?.status!=='connected'){setError('현재 연결된 Discord 서버가 없습니다.');return;}state.modal={type:'discord-reconnect'};render();return;}
  await withMutation(async()=>{
    if(action==='discord-login'){await signInWithDiscord();return;}
    if(action==='logout'){clearReconnectPoll();manualSignOutUntil=Date.now()+6000;await signOut();state.modal=null;state.setupGuide=null;return;}
    if(action==='refresh-company-subscription'){const companyId=state.companyId; if(!companyId || !(state.companies||[]).some(company=>company.id===companyId))return; const [subscription, access]=await Promise.all([getCompanySubscription(companyId),getMyCompanyAccess(companyId)]); if(state.companyId!==companyId)return;state.companyAccess=access||null;state.companyAccessError='';state.companyAccessStatus='ready';state.companyAccessCheckedAt=Date.now(); state.currentSubscription=subscription||null; render(); if(state.page==='hub')root.querySelector('.hub-account__profile')?.setAttribute('open',''); return;}
    if(action==='refresh'){await refreshAll();setNotice('최신 데이터를 불러왔습니다.');return;}
    if(action==='refresh-platform'){if(!state.platformAdmin)throw new Error('PLATFORM OWNER 권한이 필요합니다.');await loadCompanies();state.platformSnapshot=await getPlatformCompanies();state.platformCompanyAccess=await listPlatformCompanyAccess().catch(()=>null);await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports(),...(state.platformView==='contents'?[loadPlatformContentSettings()]:[])]);const changed=applyPlatformCompanyVisibility();if(changed)await loadCompanyData();setNotice('서비스 현황을 새로고침했습니다.');return;}
    if(action==='refresh-fund'){await loadFundSnapshot();if(state.fundTab==='weekly')await loadFundWeeklyMonth();setNotice('공금 데이터를 새로고침했습니다.');return;}
    if(action==='connect-discord'){if(!canAdmin(state))throw new Error('관리자 권한이 필요합니다.');if(['reset_requested','resetting'].includes(String(state.onboardingStatus?.status||'')))throw new Error('기존 Discord 연결을 정리 중입니다. 완료 후 다시 연결해 주세요.');const started=await startDiscordConnection(state.companyId);location.assign(started.authorize_url);return;}
    if(action==='toggle-module'){
      if(!canAdmin(state))throw new Error('관리자 권한이 필요합니다.');if(['reset_requested','resetting'].includes(String(state.onboardingStatus?.status||'')))throw new Error('Discord 연결을 정리 중에는 기능 설정을 변경할 수 없습니다.'); const key=actionEl.dataset.moduleKey; const current=moduleRow(state,key); if(!current)throw new Error('기능 설정을 찾지 못했습니다.');
      await setCompanyModule(state.companyId,key,!current.enabled,state.session.user.id); await loadCompanyData(); setNotice(`${(current.enabled?'기능을 껐습니다.':'기능을 켰습니다.')}`); return;
    }
    if(action==='open-cooking-menu'){if(!canAdmin(state))throw new Error('요리 메뉴 관리는 OWNER 또는 관리자만 가능합니다.');state.modal={type:'cooking-menu',typeKey:null};render();return;}
    if(action==='edit-cooking-menu'){if(!canAdmin(state))throw new Error('요리 메뉴 관리는 OWNER 또는 관리자만 가능합니다.');state.modal={type:'cooking-menu',typeKey:String(actionEl.dataset.typeKey||'')};render();return;}
    if(action==='toggle-cooking-menu'){
      if(!canAdmin(state))throw new Error('요리 메뉴 관리는 OWNER 또는 관리자만 가능합니다.');
      const typeKey=String(actionEl.dataset.typeKey||''); const current=state.cookingOrderTypes.find(x=>String(x.type_key)===typeKey);
      if(!current)throw new Error('요리 메뉴를 찾지 못했습니다.');
      await setCookingOrderTypeEnabled(state.companyId,typeKey,current.enabled===false);
      state.cookingOrderTypes=await getCookingOrderTypes(state.companyId);
      setNotice(current.enabled===false?'요리 메뉴를 사용하도록 변경했습니다.':'요리 메뉴를 숨겼습니다.');return;
    }
    if(action==='cancel-ledger-approval'){
      // A linked payment needs its approval request AND ledger reversed atomically.
      // Never route this button through fund_admin_cancel_ledger_entry.
      const id=String(actionEl.dataset.entryId||'');
      const row=(state.fundSnapshot?.ledger||[]).find(item=>String(item.id)===id);
      if(!row || row.entry_type!=='payment' || !row.request_id || (row.status && row.status!=='active')){
        throw new Error('취소할 납부 내역을 확인할 수 없습니다. 공금 내역을 새로고침해 주세요.');
      }
      const requestId=String(row.request_id);
      const request=(state.fundRequests||[]).find(item=>String(item.request_id||item.id)===requestId);
      if(request && request.status!=='approved'){
        throw new Error('승인 완료된 납부 신청만 취소할 수 있습니다. 공금 내역을 새로고침해 주세요.');
      }
      // Existing correction entries are separate ledger rows. An approval reversal
      // does NOT automatically reverse them; refuse when this snapshot detects one.
      const reference=`원본 ${id.slice(0,8)} 정정`;
      if((state.fundSnapshot?.ledger||[]).some(item=>item.id!==row.id && item.status!=='cancelled' && String(item.memo||'').includes(reference))){
        throw new Error('이 납부 건에는 별도 정정 차액 내역이 있습니다. 정정 내역과 잔액을 먼저 확인한 뒤 취소해 주세요.');
      }
      const reason=await requestHubActionNote({
        title:'주간공금 납부 승인 취소',
        message:'이 납부 승인과 연결된 공금 내역이 함께 취소되며 취소 사유가 기록됩니다. 이미 별도로 정정한 차액은 자동 취소되지 않습니다. 실제 취소할 때만 사유를 입력하고 확인해 주세요.',
        label:'승인 취소 사유 (필수)', confirmLabel:'내역 취소',
        required:true, requiredMessage:'승인 취소 사유를 입력해 주세요.', danger:true,
      });
      if(reason===null)return;
      if(reason.length>1000)throw new Error('승인 취소 사유는 1000자 이하로 입력해 주세요.');
      await cancelFundApproval(state.companyId,requestId,reason);
      clearLedgerPendingFiles();state.modal=null;
      await loadFundSnapshot();
      state.fundMonthlyRows=[];
      if(state.fundTab==='weekly')await loadFundWeeklyMonth();
      setNotice('납부 승인과 연결된 공금 내역을 취소했습니다.');return;
    }
    if(action==='cancel-ledger'){
      const id=actionEl.dataset.entryId;
      const reason=await requestHubActionNote({title:'공금 내역 취소',message:'취소 사유를 입력하고 확인해 주세요. 취소한 내역은 원래 상태로 되돌릴 수 없습니다.',label:'취소 사유 (필수)',confirmLabel:'내역 취소',required:true,requiredMessage:'취소 사유를 입력해 주세요.',danger:true});
      if(reason===null)return;
      await cancelFundLedgerEntry(state.companyId,id,reason);
      state.modal=null;await loadFundSnapshot();setNotice('공금 내역을 취소했습니다.');return;
    }
    if(action==='return-asset'){
      const id=actionEl.dataset.assetId;
      const note=await requestHubActionNote({title:'자산 반납 처리',message:'이 자산을 반납 처리할까요? 필요한 경우 반납 메모를 남길 수 있습니다.',label:'반납 메모 (선택)',confirmLabel:'반납 처리'});
      if(note===null)return;
      await manageWebAsset(state.companyId,id,'return',note);
      state.modal=null;await loadAssetsAndAccounts();setNotice('자산을 반납 처리했습니다.');return;
    }
    if(action==='account-review'){
      const req=actionEl.dataset.requestId;const reviewAction=actionEl.dataset.reviewAction;
      let note='';
      if(reviewAction==='reject'){
        note=await requestHubActionNote({title:'계좌 신청 반려',message:'신청을 반려할까요? 사유를 남기면 신청자가 확인할 수 있습니다.',label:'반려 사유 (선택)',confirmLabel:'반려',danger:true});
        if(note===null)return;
      }
      await reviewWebAccountRequest(state.companyId,req,reviewAction,note);
      await loadAssetsAndAccounts();setNotice(reviewAction==='approve'?'계좌 신청을 승인했습니다.':'계좌 신청을 반려했습니다.');return;
    }
    if(action==='fund-review'){
      const req=actionEl.dataset.requestId;const reviewAction=actionEl.dataset.reviewAction;
      let note='';
      if(reviewAction!=='approve'){
        const isReject=reviewAction==='reject';
        note=await requestHubActionNote({title:isReject?'납부 신청 반려':'납부 신청 보류',message:isReject?'이 납부 신청을 반려할까요?':'이 납부 신청을 보류할까요?',label:isReject?'반려 사유 (선택)':'보류 메모 (선택)',confirmLabel:isReject?'반려':'보류 처리',danger:isReject});
        if(note===null)return;
      }
      await reviewFundRequest(state.companyId,req,reviewAction,note);
      await loadFundSnapshot();setNotice(reviewAction==='approve'?'납부를 승인했습니다.':reviewAction==='hold'?'납부 신청을 보류했습니다.':'납부 신청을 반려했습니다.');return;
    }
    if(action==='open-evidence'){const url=await getFundEvidenceSignedUrl(actionEl.dataset.evidencePath,300);if(url)showHubBoardPhoto(actionEl,url);return;}
  });
});

root.addEventListener('change', async event => {
  if(state.platformAdmin&&event.target.matches('[data-ga-multi] input[type="checkbox"]')){gameAdminUpdateMultiChoice(event.target);if(state.gameAdminOpen)state.gameAdmin.dirty=true;return;}
  if(state.gameAdminOpen&&state.platformAdmin&&event.target.matches('[data-game-admin-inactive]')){
    state.gameAdmin.showInactive=event.target.checked;
    // Rebuild only the result list. The editor DOM (and any unsaved draft) stays mounted.
    gameAdminRefreshList();
    return;
  }
  if(state.gameAdminOpen&&event.target.matches('[data-ga-image]')){
    const file=event.target.files?.[0];const preview=root.querySelector('[data-ga-image-preview]');
    if(state.gameAdmin.previewUrl){URL.revokeObjectURL(state.gameAdmin.previewUrl);state.gameAdmin.previewUrl='';}
    if(file&&preview){state.gameAdmin.previewUrl=URL.createObjectURL(file);preview.textContent='';
      const img=document.createElement('img');img.src=state.gameAdmin.previewUrl;img.alt='업로드할 이미지 미리보기';
      const span=document.createElement('span');span.textContent=file.name;preview.append(img,span);state.gameAdmin.dirty=true;}
    return;
  }
  try{
    if(event.target.matches('[data-hub-board-images]')){addHubBoardFiles(event.target.files);event.target.value='';return;}
    if(event.target.matches('[data-hub-notice-images]')){const input=event.target;await addHubNoticeImages(input.files,root.querySelector('[data-hub-notice-body]'));input.value='';return;}
    if(event.target.matches('[data-hub-board-filter]')){const key=event.target.dataset.hubBoardFilter;if(key==='content')state.hubBoard.filterContent=event.target.value;else if(key==='category')state.hubBoard.filterCategory=event.target.value;else if(key==='status')state.hubBoard.filterStatus=event.target.value;render();return;}
    if(event.target.matches('[data-hub-board-status]')){if(!state.platformAdmin)return;const ticketId=String(event.target.dataset.ticketId||'');await withMutation(async()=>{await setHubTicketStatus(ticketId,event.target.value);await openHubBoardTicket(ticketId);await loadHubBoard();});return;}
    if(event.target.matches('[data-info-filter-select]')){const field=event.target.dataset.infoFilterSelect;if(!['primary','secondary'].includes(field))return;state.info[field==='primary'?'filterPrimary':'filterSecondary']=event.target.value;if(field==='primary')state.info.filterSecondary='__all__';state.info.selectedId='';render();return;}
    if(event.target.matches('[data-info-inactive]')){state.info.showInactive=Boolean(event.target.checked);state.info.selectedId='';await loadGameInfo();return;}
    if(event.target.matches('[data-fund-ledger-month]')){state.fundMonth=event.target.value;state.fundLedgerPage=1;await withMutation(loadFundSnapshot);return;}
    if(event.target.matches('[data-fund-weekly-month]')){state.fundWeeklyMonth=event.target.value;state.fundMonthlyRows=[];await loadFundWeeklyMonth();return;}
    if(event.target.matches('[data-fund-filter]')){state.fundFilters[event.target.dataset.fundFilter]=event.target.value;state.fundLedgerPage=1;render();return;}
    if(event.target.matches('[data-member-role]')){state.memberRole=event.target.value;state.memberPage=1;render();return;}
    if(event.target.matches('[data-asset-category]')){state.assetCategory=event.target.value;state.assetPage=1;render();return;}
    if(event.target.matches('[data-asset-status]')){state.assetStatus=event.target.value;state.assetPage=1;render();return;}
    if(event.target.matches('[data-account-status]')){state.accountStatus=event.target.value;state.accountPage=1;render();return;}
    if(event.target.matches('[data-cooking-status]')){state.cookingStatus=String(event.target.value||'all');state.cookingPage=1;render();return;}
    if(event.target.matches('[data-asset-holder]')){const status=root.querySelector('[data-asset-modal-status]');if(status)status.value=event.target.value?'보유':'미배정';return;}
    if(event.target.matches('[data-asset-modal-status]')){const holder=root.querySelector('[data-asset-holder]');if(event.target.value==='미배정'&&holder)holder.value='';return;}
    if(event.target.matches('[data-guide-role]')){if(!state.setupGuide)return;state.setupGuide[event.target.dataset.guideRole]=String(event.target.value||'');render();return;}
    if(event.target.matches('[data-guide-direct-channel]')){if(!state.setupGuide)return;const key=String(event.target.dataset.guideDirectChannel||'');state.setupGuide.directChannels=state.setupGuide.directChannels||{};state.setupGuide.directChannels[key]=String(event.target.value||'');render();return;}
    if(event.target.matches('[data-guide-category-name]')){if(!state.setupGuide)return;state.setupGuide.categoryName=String(event.target.value||'').trim()||'LAC HUB';render();return;}
    if(event.target.matches('[data-guide-generated-channel]')){if(!state.setupGuide)return;const key=String(event.target.dataset.guideGeneratedChannel||'');state.setupGuide.generatedChannels=state.setupGuide.generatedChannels||{};state.setupGuide.generatedChannels[key]=String(event.target.value||'').replace(/^#+/,'').trim();render();return;}
    if(event.target.matches('[data-guide-member-filter]')){if(!state.setupGuide)return;state.setupGuide.memberFilterRoleId=String(event.target.value||'');state.setupGuide.memberListLoaded=false;state.setupGuide.memberCandidates=[];state.setupGuide.memberSelected=[];if(state.setupGuide.memberFilterRoleId)await withMutation(loadSetupGuideMembers);else render();return;}
    if(event.target.matches('[data-guide-member-target-role]')){if(!state.setupGuide)return;state.setupGuide.memberTargetRole=String(event.target.value||'')==='admin'?'admin':'member';render();return;}
    if(event.target.matches('[data-guide-member-select]')){if(!state.setupGuide)return;const id=String(event.target.dataset.guideMemberSelect||'');const selected=new Set((state.setupGuide.memberSelected||[]).map(String));event.target.checked?selected.add(id):selected.delete(id);state.setupGuide.memberSelected=[...selected];render();return;}
    if(event.target.matches('[data-setup-role]')){if(!state.setupDemo)return;state.setupDemo[event.target.dataset.setupRole]=String(event.target.value||'');render();return;}
    if(event.target.matches('[data-platform-status]')){state.platformStatus=String(event.target.value||'all');state.platformPage=1;render();return;}
    if(event.target.matches('[data-platform-query]')){state.platformQuery=String(event.target.value||'');render();return;}
    if(event.target.matches('[data-ledger-evidence-input]')){addLedgerPendingFiles(event.target.files);event.target.value='';return;}
    if(event.target.matches('[data-support-attachment-input]')){addQuestionPendingFiles(event.target.files);event.target.value='';return;}
    if(event.target.matches('[data-suggestion-attachment-input]')){addSuggestionPendingFiles(event.target.files);event.target.value='';return;}
    if(event.target.matches('[data-setup-channel]')){if(!state.setupDemo)return;const key=String(event.target.dataset.setupChannel||'');state.setupDemo.channels=state.setupDemo.channels||{};const map={'공금현황판':'fund','3시-총알':'ammo3','10시-총알':'ammo10','전적-등록':'outlaw','개조서':'modbook','핀볼-모집':'pinball','요리-주문':'cooking','계좌조회':'accountLookup'};state.setupDemo.channels[map[key]||key]=String(event.target.value||'');render();return;}
    if(event.target.matches('[data-setup-category-name]')){if(!state.setupDemo)return;state.setupDemo.categoryName=String(event.target.value||'').trim()||'LAC HUB';state.setupDemo.channelsGenerated=false;render();return;}
    if(event.target.matches('[data-setup-generated-channel]')){if(!state.setupDemo)return;const key=String(event.target.dataset.setupGeneratedChannel||'');state.setupDemo.generatedChannels=state.setupDemo.generatedChannels||{};state.setupDemo.generatedChannels[key]=String(event.target.value||'').replace(/^#+/,'').trim();state.setupDemo.channelsGenerated=false;render();return;}
    if(event.target.matches('[data-setup-member-filter]')){
      if(!state.setupDemo)return;
      const filter=String(event.target.value||'member');
      const groups={member:['m1','m2','m3','m4','m5','m6'],admin:['a1','a2'],guest:['g1','g2','g3','g4','g5','g6','g7','g8','g9','g10']};
      state.setupDemo.memberFilter=['member','admin','guest'].includes(filter)?filter:'member';
      state.setupDemo.memberSelected=[...(groups[state.setupDemo.memberFilter]||groups.member)];
      if(state.setupDemo.memberFilter==='admin')state.setupDemo.memberTargetRole='admin';
      if(state.setupDemo.memberFilter==='member')state.setupDemo.memberTargetRole='member';
      state.setupDemo.memberImportDone=false;state.setupDemo.memberImportSkipped=false;render();return;
    }
    if(event.target.matches('[data-setup-member-target-role]')){if(!state.setupDemo)return;state.setupDemo.memberTargetRole=String(event.target.value||'member')==='admin'?'admin':'member';state.setupDemo.memberImportDone=false;state.setupDemo.memberImportSkipped=false;render();return;}
    if(event.target.matches('[data-setup-member-select]')){if(!state.setupDemo)return;const id=String(event.target.dataset.setupMemberSelect||'');const selected=new Set(state.setupDemo.memberSelected||[]);event.target.checked?selected.add(id):selected.delete(id);state.setupDemo.memberSelected=[...selected];state.setupDemo.memberImportDone=false;state.setupDemo.memberImportSkipped=false;render();return;}
  }catch(error){setError(error);}
});
// Keep the original input element alive while Korean/Japanese/Chinese IME is
// composing. renderShell() replaces root.innerHTML, which otherwise interrupts
// the native composition session and splits Korean syllables into jamo.
const liveSearchSelector = '[data-hub-board-search], [data-info-query], [data-member-query], [data-asset-query], [data-account-query], [data-cooking-query], [data-platform-query]';
const composingSearchInputs = new WeakSet();
root.addEventListener('compositionstart', event => {
  const field = event.target;
  if(field?.matches?.(liveSearchSelector)) composingSearchInputs.add(field);
});
root.addEventListener('compositionend', event => {
  const field = event.target;
  if(!field?.matches?.(liveSearchSelector) || !composingSearchInputs.has(field)) return;
  composingSearchInputs.delete(field);
  // Apply the complete syllable once, after the browser has committed the text.
  // Reuse the normal search handler to preserve selection and pagination logic.
  field.dispatchEvent(new Event('input', {bubbles:true}));
});

// Refresh game-info results without remounting the active search box.
// A full render() replaces #app.innerHTML on each input and can cancel Korean
// IME composition even when we defer its on-composition input events.
function refreshGameInfoSearchResults(field) {
  const currentPage=field?.closest('section.axe-info');
  if(!currentPage || !root.contains(currentPage)) return;
  const toolbar=currentPage.querySelector(':scope > .axe-info-toolbar');
  if(!toolbar || !toolbar.contains(field)) return;

  // Render the existing view using the same state and data, but off-DOM.
  const scratch=document.createElement('div');
  scratch.innerHTML=renderInfoPage(state,{standalone:currentPage.classList.contains('game-info-rework')});
  const nextPage=scratch.querySelector('section.axe-info');
  const nextToolbar=nextPage?.querySelector(':scope > .axe-info-toolbar');
  if(!nextToolbar) return;

  // Search hint changes with the query; input and its parent stay mounted.
  const oldHint=toolbar.querySelector(':scope > .axe-info-search-hint');
  const nextHint=nextToolbar.querySelector(':scope > .axe-info-search-hint');
  if(nextHint){
    if(oldHint) oldHint.replaceWith(nextHint);
    else toolbar.insertBefore(nextHint,toolbar.querySelector('label'));
  }else oldHint?.remove();

  // Leave the header and search toolbar (including input/caret/IME) untouched;
  // replace only filters, lists and detail/search-result panes.
  for(const child of [...currentPage.children])
    if(child!==toolbar && !child.classList.contains('axe-info-header')) child.remove();
  for(const child of [...nextPage.children])
    if(!child.classList.contains('axe-info-header') && !child.classList.contains('axe-info-toolbar'))
      currentPage.appendChild(child);
}

// The member search field must remain the SAME DOM input across every keystroke.
// Delaying full render until compositionend is insufficient: Chrome's IME may
// still be committing its last input, and Latin/paste input also loses focus.
// Build the next member list off-DOM, then update only results below the toolbar.
// Never detach or replace the live search input or its parent while editing.
function refreshMemberSearchResults(field) {
  const currentBoard=field?.closest('.ops-mgmt-page--members .ops-mgmt-board');
  if(!currentBoard || !root.contains(currentBoard)) return;
  const scratch=document.createElement('div');
  renderShell(scratch,state);
  const nextBoard=scratch.querySelector('.ops-mgmt-page--members .ops-mgmt-board');
  if(!nextBoard) return;
  const toolbar=currentBoard.querySelector(':scope > .ops-mgmt-toolbar');
  if(!toolbar || !toolbar.contains(field)) return;
  // Only meta, column headings, filtered rows and pager are replaced.
  // toolbar (and its IME composition state) stays mounted and focused.
  for(const child of [...currentBoard.children]) if(child!==toolbar) child.remove();
  for(const child of [...nextBoard.children])
    if(!child.classList.contains('ops-mgmt-toolbar')) currentBoard.appendChild(child);
}

root.addEventListener('input', event => {
  if(state.platformAdmin&&state.gameAdminOpen&&event.target.matches('[data-game-admin-search]')){
    state.gameAdmin.query=event.target.value;
    gameAdminApplyListSearch();
    return;
  }
  if(state.platformAdmin&&state.gameAdminOpen&&event.target.closest('[data-ga-form]'))state.gameAdmin.dirty=true;

  if (state.modal?.type === 'member-register' && event.target.matches('form[data-form="member-register"] input[name="discord_user_id"]')) {
    state.modal.discordUserId = event.target.value;
    return;
  }
  if(event.target?.matches?.(liveSearchSelector) && (event.isComposing || composingSearchInputs.has(event.target))) return;
  if(event.target.matches('[data-hub-board-search]')){state.hubBoard.searchQuery=String(event.target.value||'');const pos=event.target.selectionStart;render();const el=root.querySelector('[data-hub-board-search]');el?.focus();el?.setSelectionRange?.(pos,pos);return;}
  if(event.target.matches('[data-hub-notice-body]')){state.hubBoard.noticeEditorBody=String(event.target.value||'');state.hubBoard.noticeCaret=event.target.selectionStart??event.target.value.length;return;}
  if(event.target.matches('[data-layout-scale]')&&state.platformAdmin&&state.page==='layout'){state.layoutDraft={fontScale:Number(event.target.value)};state.layoutDirty=true;applyLayoutStudioProfile(state.layoutDraft);const label=root.querySelector('[data-layout-scale-label]');if(label)label.textContent=`${state.layoutDraft.fontScale}%`;const saved=root.querySelector('.layout-studio-saved');if(saved){saved.textContent='저장되지 않은 변경 사항';saved.classList.add('is-dirty');}return;}
  if(event.target.matches('[data-info-query]')){state.info.query=event.target.value;state.info.selectedId='';refreshGameInfoSearchResults(event.target);return;}
  if(event.target.matches('[data-member-query]')){state.memberQuery=event.target.value;state.memberPage=1;refreshMemberSearchResults(event.target);return;}
  if(event.target.matches('[data-asset-query]')){state.assetQuery=event.target.value;state.assetPage=1;const pos=event.target.selectionStart;render();const el=root.querySelector('[data-asset-query]');el?.focus();el?.setSelectionRange?.(pos,pos);}
  if(event.target.matches('[data-account-query]')){state.accountQuery=event.target.value;state.accountPage=1;const pos=event.target.selectionStart;render();const el=root.querySelector('[data-account-query]');el?.focus();el?.setSelectionRange?.(pos,pos);}
  if(event.target.matches('[data-cooking-query]')){state.cookingQuery=event.target.value;state.cookingPage=1;const pos=event.target.selectionStart;render();const el=root.querySelector('[data-cooking-query]');el?.focus();el?.setSelectionRange?.(pos,pos);}
  if(event.target.matches('[data-platform-query]')){state.platformQuery=event.target.value;state.platformPage=1;const pos=event.target.selectionStart;render();const el=root.querySelector('[data-platform-query]');el?.focus();el?.setSelectionRange?.(pos,pos);}
});

document.addEventListener('click', event => {
  let changed=false;
  if(state.companyMenuOpen && !event.target.closest('.runtime-company-picker')){state.companyMenuOpen=false;changed=true;}
  if(state.accountMenuOpen && !event.target.closest('.runtime-account-picker')){state.accountMenuOpen=false;changed=true;}
  const hubProfile=root.querySelector('.hub-account__profile[open]');
  if(hubProfile && !event.target.closest('.hub-account__profile'))hubProfile.open=false;
  if(changed)render();
});

document.addEventListener('keydown', event=>{
  if(event.key==='Escape'){
    const hubProfile=root.querySelector('.hub-account__profile[open]');
    if(hubProfile){hubProfile.open=false;hubProfile.querySelector('.hub-account__trigger')?.focus();event.preventDefault();}
    if(state.accountMenuOpen){state.accountMenuOpen=false;render();event.preventDefault();}
  }
  if(event.key==='Escape' && state.supportImageViewer){event.preventDefault();state.supportImageViewer=null;render();}
  if(event.key==='Escape' && ['member','member-register'].includes(state.modal?.type) && !document.querySelector('dialog[open]')){
    event.preventDefault();
    void closeModal();
  }
});

root.addEventListener('paste', async event=>{
  const clipboard=event.clipboardData;const files=[...Array.from(clipboard?.files||[]),...Array.from(clipboard?.items||[]).filter(item=>item.kind==='file'&&item.type?.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean)].filter((file,index,all)=>file?.type?.startsWith('image/')&&all.indexOf(file)===index);
  if(!files.length)return;
  const noticeForm=event.target.closest('form[data-form="hub-board-notice"],form[data-form="hub-board-notice-edit"]');
  if(state.page==='hub-board'&&noticeForm){event.preventDefault();try{await addHubNoticeImages(files,noticeForm.querySelector('[data-hub-notice-body]'));}catch(error){setError(error);}return;}
  if(state.page==='hub-board' && event.target.closest('.hub-board__form')){event.preventDefault();try{addHubBoardFiles(files);}catch(error){setError(error);}return;}
  if(event.target.closest('[data-ledger-evidence-drop]')){event.preventDefault();addLedgerPendingFiles(files);return;}
  if(['support-question-create','support-question'].includes(state.modal?.type)){event.preventDefault();addQuestionPendingFiles(files);return;}
  if(['suggestion-create','suggestion-thread'].includes(state.modal?.type)){event.preventDefault();addSuggestionPendingFiles(files);}
});
root.addEventListener('keyup',event=>{if(event.target?.matches?.('[data-hub-notice-body]'))state.hubBoard.noticeCaret=event.target.selectionStart??event.target.value.length;});
root.addEventListener('mouseup',event=>{if(event.target?.matches?.('[data-hub-notice-body]'))state.hubBoard.noticeCaret=event.target.selectionStart??event.target.value.length;});
root.addEventListener('dragover', event=>{if(event.target.closest('[data-hub-board-drop],[data-ledger-evidence-drop],[data-support-attachment-drop],[data-suggestion-attachment-drop]'))event.preventDefault();});
root.addEventListener('drop', event=>{
  const supportDrop=event.target.closest('[data-support-attachment-drop]');
  const suggestionDrop=event.target.closest('[data-suggestion-attachment-drop]');
  const ledgerDrop=event.target.closest('[data-ledger-evidence-drop]');
  const hubDrop=event.target.closest('[data-hub-board-drop]');
  if(!supportDrop&&!suggestionDrop&&!ledgerDrop&&!hubDrop)return;
  event.preventDefault();
  const files=Array.from(event.dataTransfer?.files||[]).filter(f=>f.type?.startsWith('image/'));
  if(!files.length)return;
  if(hubDrop){try{addHubBoardFiles(files);}catch(error){setError(error);}return;}
  if(supportDrop)addQuestionPendingFiles(files);
  else if(suggestionDrop)addSuggestionPendingFiles(files);
  else addLedgerPendingFiles(files);
});

root.addEventListener('change', event => {
  if(event.target.matches('form[data-form="pass-application"] select[name="requester_role"], form[data-form="admin-pass-application"] select[name="requester_role"]')){
    const field=event.target.closest('form').querySelector('[data-pass-representative-field]');
    if(field){const isRepresentative=event.target.value==='representative';field.hidden=isRepresentative;const input=field.querySelector('input');if(input){input.disabled=isRepresentative;input.required=!isRepresentative;}}
  }
  if (state.modal?.type === 'member-register' && event.target.matches('form[data-form="member-register"] select[name="role"]')) {
    state.modal.role = event.target.value;
  }
});

root.addEventListener('submit', async event => {
  const form=event.target.closest('form[data-form]'); if(!form)return; event.preventDefault(); const type=form.dataset.form; const data=new FormData(form);
  if(type==='game-admin-save'){try{await gameAdminSaveForm(form);}catch(error){gameAdminInlineError(error);}return;}
  if(type==='member-register') { await submitMemberRegistration(form,data); return; }
  if(type==='platform-subscription'){setError('이전 이용권 편집 방식은 지원하지 않습니다. 관리 화면에서 새로 발급하거나 즉시 만료해 주세요.');return;}
  if(type==='pass-admin-search'){
    if(!state.platformAdmin)return;
    state.adminPassQuery=String(data.get('query')||'').trim();state.adminPassPage=1;render();return;
  }
  if(type==='pass-application'){
    await withMutation(async()=>{
      const payload=passApplicationPayload(data);
      const requestId=String(data.get('request_id')||'').trim();
      let created=false;
      if(requestId){
        await updateCompanyPassRequest(requestId,payload);
      }else{
        created=await submitUnifiedPassRequest(payload);
      }
      state.companyPassRequest=await getCompanyPassRequest(state.companyId);
      state.companyPassRequestError='';
      if(state.platformAdmin)await loadAdminPassRequests();
      state.modal=null;
      setNotice(requestId?'회사 이용 신청 정보를 수정했습니다.':created?'회사 이용 신청이 접수되었습니다. 운영자 확인 후 승인됩니다.':'이미 접수된 회사 이용 신청이 있습니다.');
    });
    return;
  }
  if(type==='admin-pass-application'){
    if(!state.platformAdmin){setError('운영자만 인증정보를 수정할 수 있습니다.');return;}
    await withMutation(async()=>{
      const payload=passApplicationPayload(data,{requireConsent:false});
      const requestId=String(data.get('request_id')||'').trim();
      if(!requestId)throw new Error('수정할 신청을 찾지 못했습니다.');
      await adminUpdateCompanyPassRequest(requestId,payload);
      await loadAdminPassRequests();
      state.modal=null;
      setNotice('인증정보를 수정했습니다. 이용 상태와 이용 기간은 변경되지 않았습니다.');
    });
    return;
  }
  // Confirm a new departure BEFORE withMutation renders/replaces the form.
  // Cancel or Escape from the dialog must never issue a DB request.
  if (type === 'member') {
    if (memberClosePending || mutationBusy) return;
    const row = state.memberships.find(item => item.id === String(data.get('membership_id')) && item.company_id === state.companyId);
    if (!row || state.modal?.type !== 'member' || state.modal.membershipId !== row.id) {
      setError('편집 중인 멤버 정보를 다시 확인해 주세요.'); return;
    }
    let changes;
    try { changes = memberChanges(row, data); }
    catch (error) { setError(error); return; }
    if (changes.status === 'left') {
      memberClosePending = true;
      let accepted = false;
      try {
        accepted = await confirmHubDeletion({
          title: '멤버를 퇴사 처리할까요?',
          message: '퇴사 처리하면 이 멤버에게 배정된 자산이 자동으로 미배정되고 반납·감사 기록이 생성될 수 있습니다. 계속 진행할까요?',
          confirmLabel: '퇴사 처리 및 저장',
        });
      } finally { memberClosePending = false; }
      if (!accepted || state.modal?.type !== 'member' || state.modal.membershipId !== row.id || mutationBusy) return;
    }
  }
  await withMutation(async()=>{
    if(type==='hub-board-ticket'){
      if(state.page!=='hub-board')throw new Error('게시판에서 작성해 주세요.');
      const contentKey=String(data.get('content_key')||'');const category=String(data.get('category')||'');
      const title=String(data.get('title')||'').trim();const body=String(data.get('body')||'').trim();
      checkHubBoardFiles(state.hubBoard.files.map(item=>item.file));
      const ticketId=await createHubTicket({contentKey,category,title,body});
      try{await storeHubBoardFiles(ticketId,null);}catch(error){state.hubBoard.mode='list';await loadHubBoard();setNotice('글은 등록됐지만 사진 첨부에 실패했습니다. 글을 열고 추가 답변에 사진을 다시 첨부해 주세요.');throw error;}
      await loadHubBoard();await openHubBoardTicket(ticketId);setNotice('문의가 등록됐습니다.');return;
    }
    if(type==='hub-board-reply'){
      const ticketId=String(state.hubBoard.ticket?.id||'');
      if(!ticketId)throw new Error('게시글을 먼저 선택해 주세요.');
      const body=String(data.get('body')||'').trim();checkHubBoardFiles(state.hubBoard.files.map(item=>item.file));
      const messageId=await replyHubTicket(ticketId,body);
      try{await storeHubBoardFiles(ticketId,messageId);}catch(error){await openHubBoardTicket(ticketId);setNotice('답변은 등록됐지만 사진 첨부에 실패했습니다.');throw error;}
      await openHubBoardTicket(ticketId);await loadHubBoard();setNotice('답변을 등록했습니다.');return;
    }
    if(type==='hub-board-notice'){
      if(!state.platformAdmin)throw new Error('운영자만 공지를 등록할 수 있습니다.');
      if(state.hubBoard.noticeUploading)throw new Error('이미지 업로드가 끝난 뒤 저장해 주세요.');
      const title=String(data.get('title')||'').trim();
      const editorBody=String(data.get('body')||'');
      const body=serializeNoticeEditorBody(editorBody,state.hubBoard.noticeMedia);
      const referenced=new Set(noticeImagePaths(body));
      const unused=(state.hubBoard.noticeMedia||[]).filter(item=>item.isNew&&item.path&&!referenced.has(item.path)).map(item=>item.path);
      const noticeId=await publishHubNotice(title,body);
      if(unused.length)await removeHubNoticeImages(unused).catch(()=>{});
      resetHubNoticeEditorState();state.hubBoard.noticeId=noticeId||null;state.hubBoard.mode='list';state.hubBoard.tab='notices';await loadHubBoard();setNotice('공지사항을 등록했습니다.');return;
    }
    if(type==='hub-board-notice-edit'){
      if(!state.platformAdmin)throw new Error('운영자만 공지를 수정할 수 있습니다.');
      if(state.hubBoard.noticeUploading)throw new Error('이미지 업로드가 끝난 뒤 저장해 주세요.');
      const noticeId=String(state.hubBoard.noticeId||'');
      if(!noticeId)throw new Error('수정할 공지를 찾을 수 없습니다.');
      const existing=(state.hubBoard.notices||[]).find(item=>String(item.id)===noticeId);
      const oldPaths=new Set(noticeImagePaths(existing?.body||''));
      const title=String(data.get('title')||'').trim();
      const editorBody=String(data.get('body')||'');
      const body=serializeNoticeEditorBody(editorBody,state.hubBoard.noticeMedia);
      const newPaths=new Set(noticeImagePaths(body));
      await updateHubNotice(noticeId,title,body);
      const unused=[...(state.hubBoard.noticeMedia||[]).filter(item=>item.isNew&&item.path&&!newPaths.has(item.path)).map(item=>item.path),...([...oldPaths].filter(path=>!newPaths.has(path)))];
      if(unused.length)await removeHubNoticeImages(unused).catch(()=>{});
      resetHubNoticeEditorState();await loadHubBoard();state.hubBoard.noticeId=noticeId;state.hubBoard.mode='notice';state.hubBoard.tab='notices';setNotice('공지사항을 수정했습니다.');return;
    }
    if(type==='test-center-company'){
      if(!state.platformAdmin||!state.testCenter)throw new Error('PLATFORM OWNER 테스트 모드가 아닙니다.');
      const name=String(data.get('name')||'').trim();
      const representative=String(data.get('representative_name')||'').trim();
      if(!name||!representative)throw new Error('테스트 회사 이름과 대표명을 입력해 주세요.');
      state.testCenter.fakeCompanyName=name;
      state.testCenter.fakeRepresentativeName=representative;
      state.testCenter.companyCreated=true;
      state.testCenter.passStatus='none';
      state.testCenter.passEditMode=false;
      state.testCenter.passCancelled=false;
      state.testCenter.passApplication={...createTestCenterState().passApplication};
      state.testCenter.setupComplete=false;
      state.testCenter.screen='hub';
      state.testCenter.content=null;
      render();
      return;
    }
    if(type==='test-center-pass-application'){
      if(!state.platformAdmin||!state.testCenter||!state.testCenter.companyCreated)throw new Error('테스트 회사가 먼저 필요합니다.');
      if(state.testCenter.passStatus==='active')throw new Error('이미 승인된 이용권은 수정할 수 없습니다.');
      const requesterRole=String(data.get('requester_role')||'representative');
      const ingameNickname=String(data.get('ingame_nickname')||'').trim();
      const representativeIngameNickname=String(data.get('representative_ingame_nickname')||'').trim();
      const ingamePhone=String(data.get('ingame_phone')||'').trim();
      const availableTime=String(data.get('available_time')||'').trim();
      const note=String(data.get('note')||'').trim();
      const consent=String(data.get('consent')||'');
      if(!['representative','admin','member'].includes(requesterRole))throw new Error('회사에서의 역할을 선택해 주세요.');
      if(!ingameNickname)throw new Error('인게임 닉네임을 입력해 주세요.');
      if(requesterRole!=='representative'&&!representativeIngameNickname)throw new Error('대표가 아닌 경우 대표자 인게임 닉네임을 입력해 주세요.');
      if(consent!=='on')throw new Error('인게임 인증 절차 확인에 동의해 주세요.');
      const now=new Date().toISOString();
      const prev=state.testCenter.passApplication||{};
      state.testCenter.passApplication={
        applicationId:prev.applicationId||'PASS-TEST-0001',
        requesterRole,
        ingameNickname,
        representativeIngameNickname,
        ingamePhone,
        availableTime,
        note,
        submittedAt:prev.submittedAt||now,
        updatedAt:now
      };
      state.testCenter.passStatus='pending';
      state.testCenter.passEditMode=false;
      state.testCenter.passCancelled=false;
      state.testCenter.screen='content';
      render();
      return;
    }
    if(type==='create-company'){
      if(state.companies.length&&!state.platformAdmin)throw new Error('이미 소속 회사가 설정되어 있어 새 회사를 만들 수 없습니다.');
      // Recheck immediately before creation. The DB migration also enforces the
      // ordinary-account one-company rule, so stale tabs cannot bypass it.
      state.canCreateCompany=await canCreateCompany();
      if(!state.canCreateCompany)throw new Error('이미 소속 회사가 있는 계정은 새 회사를 추가로 만들 수 없습니다.');
      const requestedName=String(data.get('name')||'').trim();
      const representativeName=String(data.get('representative_name')||'').trim();
      if(!requestedName||!representativeName)throw new Error('회사 이름과 대표명을 입력해 주세요.');
      const created=await createCompany(requestedName);
      state.canCreateCompany=await canCreateCompany().catch(()=>false);
      if(!created?.id)throw new Error('회사 등록 상태를 확인하지 못했습니다. 새로고침 후 회사 목록을 확인해 주세요.');
      state.companyId=created.id;
      localStorage.setItem('axe_product_company_id',created.id);
      await claimDiscordMemberships().catch(()=>null);
      const ownerRows=await getMemberships(created.id).catch(()=>[]);
      const owner=ownerRows.find(row=>row.role==='owner' && String(row.user_id||'')===String(state.session?.user?.id||'')) || ownerRows.find(row=>row.role==='owner');
      if(owner?.id) await updateMembershipAlias(owner.id,representativeName).catch(()=>null);
      state.modal=null;
      navigatePrimaryScreen('hub');
      localStorage.setItem('axe_product_page','dashboard');
      await loadCompanies();await loadCompanyData();
      state.ready=true;
      if(!isCurrentCompanyOwner())throw new Error('회사 등록은 확인됐지만 OWNER 권한 연결을 확인하지 못했습니다. 새로고침 후에도 같다면 관리자에게 문의해 주세요.');
      state.setupGuide=null;state.setupGuideDismissed=false;
      setNotice('회사를 만들었습니다. 콘텐츠를 둘러보고 회사 전용 베타 기능이 필요하면 이용 신청을 진행해 주세요.');
      return;
    }
    if(type==='reconnect-discord'){clearCatalogPoll();if(data.get('confirm')!=='yes')throw new Error('Discord 연결 초기화 안내를 확인해 주세요.');const jobId=await requestCompanyDiscordReconnect(state.companyId);state.modal=null;state.onboardingStatus=await getCompanyOnboardingStatus(state.companyId);setNotice(`Discord 연결 정리를 시작했습니다. 작업 ${jobId.slice(0,8)}…`);startReconnectStatusPoll();return;}
    if(type==='suggestion-create'){
      const category=String(data.get('category')||'improvement').trim(); const title=String(data.get('title')||'').trim(); const body=String(data.get('body')||'').trim();
      const suggestionId=await createSuggestion(state.companyId,category,title,body);
      const attachmentResult=suggestionId?await uploadSuggestionPendingAttachments(suggestionId,null):{uploaded:0,failed:0};
      clearSuggestionPendingFiles();
      state.modal=null; state.suggestionStatus='all'; state.suggestionCategory='all'; state.suggestionPage=1;
      await loadSuggestionBoard(); if(state.platformAdmin)await loadPlatformSuggestions();
      setNotice(attachmentResult.failed?`건의는 등록됐지만 사진 ${attachmentResult.failed}장은 첨부하지 못했습니다.`:'건의를 등록했습니다. 건의게시판에서 확인할 수 있습니다.');
      return;
    }
    if(type==='suggestion-reply'){
      const suggestionId=String(data.get('suggestion_id')||'').trim(); const body=String(data.get('body')||'').trim();
      const result=await addSuggestionMessage(suggestionId,body);
      const targetCompanyId=state.modal?.type==='suggestion-thread'?String(state.modal.suggestion?.company_id||state.companyId||''):state.companyId;
      const attachmentResult=result?.message_id?await uploadSuggestionPendingAttachments(suggestionId,result.message_id,targetCompanyId):{uploaded:0,failed:0};
      clearSuggestionPendingFiles();
      let notifyResult=null;
      if(state.platformAdmin&&result?.status==='complete') notifyResult=await notifySuggestionAnswer(suggestionId).catch(()=>({sent:false,reason:'dm_failed'}));
      if(state.platformAdmin)await loadPlatformSuggestions(); if(state.companyId)await loadSuggestionBoard();
      const suggestion=await hydrateSuggestion(await getSuggestion(suggestionId)); await markSuggestionSeen(suggestionId).catch(()=>false); suggestion.unread=false;
      state.modal={type:'suggestion-thread',suggestionId,suggestion};
      if(attachmentResult.failed) setNotice(`${state.platformAdmin?'답변':'추가 메시지'}은 등록됐지만 사진 ${attachmentResult.failed}장은 첨부하지 못했습니다.`);
      else if(state.platformAdmin) setNotice(notifyResult?.sent?'답변을 등록하고 Discord DM을 보냈습니다.':'답변을 등록했습니다. 사이트 알림은 표시되고 Discord DM은 전달되지 않았습니다.');
      else setNotice('추가 메시지를 등록했습니다. 답변대기로 전환되었습니다.');
      return;
    }
    if(type==='support-question-create'){
      const title=String(data.get('title')||'').trim(); const body=String(data.get('body')||'').trim();
      const questionId=await createSupportQuestion(state.companyId,title,body);
      const attachmentResult=questionId?await uploadQuestionPendingAttachments(questionId,null):{uploaded:0,failed:0};
      clearQuestionPendingFiles();
      state.modal=null; state.questionScope='mine'; state.questionStatus='all'; state.questionPage=1;
      await loadQuestionBoard(); if(state.platformAdmin)await loadPlatformSupport();
      setNotice(attachmentResult.failed?`질문은 등록됐지만 사진 ${attachmentResult.failed}장은 첨부하지 못했습니다.`:'질문을 등록했습니다. 내 질문 목록에서 바로 확인할 수 있습니다.');
      return;
    }
    if(type==='support-question-reply'){
      const questionId=String(data.get('question_id')||'').trim(); const body=String(data.get('body')||'').trim();
      const result=await addSupportQuestionMessage(questionId,body);
      const attachmentResult=result?.message_id?await uploadQuestionPendingAttachments(questionId,result.message_id):{uploaded:0,failed:0};
      clearQuestionPendingFiles();
      let notifyResult=null;
      if(state.platformAdmin&&result?.status==='complete') notifyResult=await notifySupportQuestionAnswer(questionId).catch(()=>({sent:false,reason:'dm_failed'}));
      if(state.platformAdmin)await loadPlatformSupport(); if(state.companyId)await loadQuestionBoard();
      const question=await hydrateSupportQuestion(await getSupportQuestion(questionId)); await markSupportQuestionSeen(questionId).catch(()=>false); question.unread=false;
      state.modal={type:'support-question',questionId,question};
      if(attachmentResult.failed) setNotice(`${state.platformAdmin?'답변':'추가 질문'}은 등록됐지만 사진 ${attachmentResult.failed}장은 첨부하지 못했습니다.`);
      else if(state.platformAdmin) setNotice(notifyResult?.sent?'답변을 등록하고 Discord DM을 보냈습니다.':'답변을 등록했습니다. 사이트 알림은 표시되고 Discord DM은 전달되지 않았습니다.');
      else setNotice('추가 질문을 등록했습니다. 답변대기로 전환되었습니다.');
      return;
    }
    if(type==='ledger'){const existingId=String(data.get('entry_id')||'')||null;const payload={entryId:existingId,direction:String(data.get('direction')||''),amount:Number(data.get('amount')||0),account:String(data.get('account')||'공용계좌'),category:String(data.get('category')||'').trim(),membershipId:String(data.get('membership_id')||'')||null,memo:String(data.get('memo')||'').trim(),ledgerDate:String(data.get('ledger_date')||'')};const hadEvidence=(state.ledgerPendingFiles||[]).length>0;const saved=await saveFundLedgerEntry(state.companyId,payload);let entryId=existingId||ledgerEntryIdFromSave(saved);if((state.ledgerPendingFiles||[]).length&&!entryId){const [yy,mm]=payload.ledgerDate.split('-').map(Number);const fresh=await getFundTreasurySnapshot(state.companyId,yy||null,mm||null,200);const signed=payload.direction==='지출'?-Math.abs(payload.amount):Math.abs(payload.amount);const matches=(fresh?.ledger||[]).filter(r=>String(r.category||'')===payload.category&&String(r.account||'')===payload.account&&dateKey(r.ledger_date)===payload.ledgerDate&&Number(r.amount||0)===signed);entryId=String(matches.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]?.id||'');}if((state.ledgerPendingFiles||[]).length&&!entryId)throw new Error('내역은 저장됐지만 첨부사진 연결 대상을 확인하지 못했습니다. 해당 내역의 수정 화면에서 사진만 다시 첨부해 주세요.');if(entryId)await uploadLedgerPendingEvidence(entryId);clearLedgerPendingFiles();state.modal=null;await loadFundSnapshot();setNotice(hadEvidence?'공금 내역과 첨부사진을 저장했습니다.':'공금 내역을 저장했습니다.');return;}
    if(type==='ledger-correction'){const entryId=String(data.get('entry_id')||'');const row=(state.fundSnapshot?.ledger||[]).find(r=>String(r.id)===entryId);if(!row)throw new Error('정정할 공금 내역을 찾지 못했습니다.');const oldSigned=Number(row.amount||0);const targetAmount=Math.abs(Number(data.get('amount')||0));if(!Number.isFinite(targetAmount)||targetAmount<=0)throw new Error('최종 금액을 확인해 주세요.');const targetDirection=String(data.get('direction')||'수입');const targetSigned=targetDirection==='지출'?-targetAmount:targetAmount;const delta=targetSigned-oldSigned;if(delta===0)throw new Error('현재 금액과 동일합니다. 변경할 금액 또는 구분을 입력해 주세요.');const reason=String(data.get('reason')||'').trim();if(!reason)throw new Error('정정 사유를 입력해 주세요.');const correctionPayload={entryId:null,direction:delta<0?'지출':'수입',amount:Math.abs(delta),account:String(row.account||'공용계좌'),category:`${row.entry_type==='payment'?'주간공금':(row.category||'공금')} 정정`,membershipId:String(row.membership_id||'')||null,memo:`원본 ${entryId.slice(0,8)} 정정 · ${reason}`,ledgerDate:String(data.get('ledger_date')||dateKey(new Date()))};const hadEvidence=(state.ledgerPendingFiles||[]).length>0;const saved=await saveFundLedgerEntry(state.companyId,correctionPayload);let correctionId=ledgerEntryIdFromSave(saved);if(hadEvidence&&!correctionId){const [yy,mm]=correctionPayload.ledgerDate.split('-').map(Number);const fresh=await getFundTreasurySnapshot(state.companyId,yy||null,mm||null,200);const signed=correctionPayload.direction==='지출'?-Math.abs(correctionPayload.amount):Math.abs(correctionPayload.amount);const matches=(fresh?.ledger||[]).filter(r=>String(r.category||'')===correctionPayload.category&&String(r.account||'')===correctionPayload.account&&dateKey(r.ledger_date)===correctionPayload.ledgerDate&&Number(r.amount||0)===signed&&String(r.memo||'')===correctionPayload.memo);correctionId=String(matches.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]?.id||'');}if(hadEvidence&&!correctionId)throw new Error('정정은 반영됐지만 첨부사진 연결 대상을 확인하지 못했습니다. 새 정정 내역의 수정 화면에서 사진을 다시 첨부해 주세요.');if(correctionId)await uploadLedgerPendingEvidence(correctionId);clearLedgerPendingFiles();state.modal=null;await loadFundSnapshot();setNotice(hadEvidence?'정정 차액과 첨부사진을 반영했습니다.':'원본을 보존한 상태로 정정 차액을 반영했습니다.');return;}
    if(type==='company-delete'){
      if(!state.platformAdmin)throw new Error('회사 삭제는 PLATFORM OWNER만 할 수 있습니다.');
      const companyId=String(data.get('company_id')||'').trim();
      const expectedName=String(data.get('company_name')||'').trim();
      const confirmName=String(data.get('confirm_name')||'').trim();
      if(!companyId||!expectedName)throw new Error('삭제할 회사 정보를 확인하지 못했습니다.');
      if(confirmName!==expectedName)throw new Error('회사 이름이 일치하지 않습니다. 표시된 회사 이름을 정확히 입력해 주세요.');
      const deletingCurrent=String(state.companyId||'')===companyId;
      await deletePlatformCompany(companyId,confirmName);
      state.modal=null; state.platformPage=1;
      await loadCompanies();
      state.platformSnapshot=await getPlatformCompanies();
      await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);
      if(deletingCurrent) await loadCompanyData();
      setNotice(`회사 ${expectedName}을(를) 삭제했습니다.`);
      return;
    }
    if(type==='member'){
      if(!canAdmin(state))throw new Error('멤버 관리는 대표 또는 관리자만 할 수 있습니다.');
      const id=String(data.get('membership_id')||'');
      const row=state.memberships.find(m=>m.id===id && m.company_id===state.companyId);
      if(!row || state.modal?.type!=='member' || state.modal.membershipId!==id)throw new Error('편집 중인 멤버 정보를 다시 확인해 주세요.');
      const changes=memberChanges(row,data);
      if(!Object.keys(changes).length){state.modal=null;setNotice('변경된 내용이 없습니다.');return;}
      const saved=await updateMembershipDetails(state.companyId,id,changes,row);
      // A successful DB response is authoritative even if another panel fails
      // to refresh afterwards. Do not report a false save failure in that case.
      state.memberships=state.memberships.map(m=>m.id===id?{...m,...saved}:m);
      state.modal=null;
      try { await loadCompanyData(); setNotice('멤버 정보를 저장했습니다.'); }
      catch(error){console.warn('Member saved but company reload failed',error);setNotice('멤버 정보는 저장됐지만 목록 새로고침에 실패했습니다. 새로고침 후 확인해 주세요.');}
      return;
    }
    if(type==='asset'){let membershipId=String(data.get('membership_id')||'')||null;let status=String(data.get('status')||'').trim()||(membershipId?'보유':'미배정');if(status==='미배정')membershipId=null;if(membershipId)status='보유';const holder=membershipId?(state.assetsSnapshot?.members||[]).find(m=>m.id===membershipId):null;const assetId=String(data.get('asset_id')||'')||null;const existing=assetId?(state.assetsSnapshot?.assets||[]).find(a=>a.id===assetId):null;await saveWebAsset(state.companyId,{assetId,legacyNo:existing?.legacy_no||null,membershipId,ownerName:holder?.display_name||'미배정',category:String(data.get('asset_category')||'기타').trim(),name:String(data.get('asset_name')||'').trim(),acquisitionMethod:String(data.get('acquisition_method')||'').trim()||null,status,note:String(data.get('note')||'').trim()||null});state.modal=null;await loadAssetsAndAccounts();setNotice(membershipId?'자산을 저장하고 보유자를 배정했습니다.':'자산을 미배정 상태로 저장했습니다.');return;}
    if(type==='account-request'){await submitWebAccountRequest(state.companyId,String(data.get('account')||''),String(data.get('note')||''));state.modal=null;await loadAssetsAndAccounts();setNotice('계좌 등록·변경 신청을 제출했습니다.');return;}
    if(type==='fund-balance'){const game=Number(data.get('game_balance'));if(!Number.isFinite(game)||game<0)throw new Error('게임 내 공용계좌 잔액을 확인해 주세요.');const settings={...(state.companySettings?.settings||{}),fund_balance_check:{game_balance:game,note:String(data.get('note')||'').trim(),calculated_balance:Number(state.fundSnapshot?.balance?.public||0),checked_at:new Date().toISOString()}};await updateCompanySettings(state.companyId,{settings},state.session.user.id);state.companySettings=await getCompanySettings(state.companyId);setNotice('잔액 점검을 저장했습니다.');return;}
    if(type==='fund-fee-rule'){const feeMonth=String(data.get('fee_month')||state.fundMonth||state.currentMonth);const [feeYear,feeMonthNo]=feeMonth.split('-').map(Number);if(!feeYear||!feeMonthNo)throw new Error('적용 월을 확인해 주세요.');await setFundFeeRule(state.companyId,feeYear,feeMonthNo,Number(data.get('week')),Number(data.get('weekly_fee')),'WEB 공금 설정');const settings={...(state.companySettings?.settings||{}),fund_default_account:String(data.get('default_account')||'공용계좌')};await updateCompanySettings(state.companyId,{settings},state.session.user.id);state.companySettings=await getCompanySettings(state.companyId);state.fundMonth=feeMonth;await loadFundSnapshot();setNotice(`${feeYear}년 ${feeMonthNo}월 공금 설정을 저장했습니다.`);return;}
    if(type==='cooking-guide'){
      if(!canAdmin(state))throw new Error('요리 주문 안내 관리는 OWNER 또는 관리자만 가능합니다.');
      const membershipId=currentMembership(state)?.id||null;
      if(!membershipId)throw new Error('현재 회사 멤버 정보를 확인하지 못했습니다.');
      state.cookingDiscordConfig=await saveCookingDiscordGuide(state.companyId,{
        scheduleText:String(data.get('schedule_text')||''),
        extraGuide:String(data.get('extra_guide')||''),
      },membershipId);
      setNotice('주문 안내를 저장했습니다. Discord 패널에는 BOT 동기화 후 반영됩니다.');return;
    }
    if(type==='cooking-menu'){
      if(!canAdmin(state))throw new Error('요리 메뉴 관리는 OWNER 또는 관리자만 가능합니다.');
      const existingKey=String(data.get('type_key')||'').trim();
      const randomPart=(globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'').slice(0,12);
      const typeKey=existingKey||`m_${randomPart}`;
      const label=String(data.get('label')||'').trim(); const shortLabel=String(data.get('short_label')||'').trim();
      if(!label)throw new Error('메뉴 이름을 입력해 주세요.');
      await saveCookingOrderType(state.companyId,{typeKey,label,shortLabel:shortLabel||label,detail:String(data.get('detail')||'').trim(),pricePerSet:Number(data.get('price_per_set')||0),sortOrder:Number(data.get('sort_order')||0),enabled:data.get('enabled')==='on'});
      state.cookingOrderTypes=await getCookingOrderTypes(state.companyId); state.modal=null;
      setNotice(existingKey?'요리 메뉴를 저장했습니다.':'요리 메뉴를 추가했습니다.');return;
    }
    if(type==='settings-basic'){
      const wasRoleStep=isOnboardingStep('roles');
      await saveBasicSettingsData(data,{requireOnboardingRoles:wasRoleStep});
      await loadCompanies();
      await loadBaseCompanyData();
      if(wasRoleStep || state.onboardingStatus?.current_step==='modules'){
        state.settingsTab='modules';
        localStorage.setItem('axe_product_settings_tab','modules');
        syncPrimaryScreenRoute();
      }
      setNotice(wasRoleStep?'역할 설정을 저장했습니다. 기능·채널 설정으로 이동합니다.':'기본 정보를 저장했습니다.');return;
    }
    if(type==='settings-modules'){
      const wasModuleStep=isOnboardingStep('modules');
      await saveModuleSettingsData(form,data);
      await loadBaseCompanyData();
      const completed=wasModuleStep && (String(state.onboardingStatus?.status||'')==='ready' || String(state.onboardingStatus?.current_step||'')==='complete');
      setNotice(completed?'초기 설정이 완료됐습니다.':'기능 설정을 저장했습니다.');return;
    }
  });
});

cleanupLegacyPwa();
boot();

// New applications surface in the owner's account menu while HUB remains open.
// The DB inbox is authoritative; Discord DM delivery is supplemental.
setInterval(async()=>{
  if(document.visibilityState!=='visible'||!state.ready||!state.session?.user)return;
  try{
    if(state.platformAdmin){
      const before=JSON.stringify(state.adminPassRequests||[]);
      const inboxBefore=platformInboxOpenCount();
      await loadAdminPassRequests();
      await Promise.all([loadPlatformSupport(),loadPlatformSuggestions(),loadHubBoard(),loadPlatformBuildReports()]);
      const inboxAfter=platformInboxOpenCount();
      if(inboxAfter>inboxBefore)setNotice(`새 문의 · 제보 ${inboxAfter-inboxBefore}건이 접수되었습니다.`);
      else if(state.page==='platform')render();
      else if(before!==JSON.stringify(state.adminPassRequests||[]) && state.page==='hub')render();
    }
    if(hasCompany(state) && ['pending','canceled','rejected'].includes(String(state.companyPassRequest?.status||''))){
      const companyId=state.companyId;
      const beforeRequest=JSON.stringify(state.companyPassRequest||null);
      const beforeStatus=String(state.companyPassRequest?.status||'');
      const result=await getCompanyPassRequest(companyId);
      if(companyId!==state.companyId)return;
      state.companyPassRequest=result;
      state.companyPassRequestError='';
      const requestChanged=beforeRequest!==JSON.stringify(result||null);
      const statusChanged=String(result?.status||'')!==beforeStatus;
      if(statusChanged){
        state.companyAccess=await getMyCompanyAccess(companyId);
        state.companyAccessStatus='ready';state.companyAccessCheckedAt=Date.now();state.companyAccessError='';
      }
      if(requestChanged && (state.page==='hub'||state.page==='paid-content-guide'))render();
      if(statusChanged && isCookRoute())showCookPreview();
    }
  }catch{ /* Poll errors do not erase previously fetched, access-checked state. */ }
},45000);


// -----------------------------------------------------------------------------
// Standalone GAME INFO: platform administrator's self-service content editor.
// This view does not change any user-facing game-info DOM or its existing handlers.
// -----------------------------------------------------------------------------
