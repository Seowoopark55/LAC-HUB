import {companySetupComplete} from './contentPolicy.js';
function escapeHtml(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
function remainingCooldown(value){
  const until=Date.parse(String(value||''));
  if(!Number.isFinite(until))return '';
  const ms=until-Date.now();
  if(ms<=0)return '';
  const minutes=Math.ceil(ms/60000);
  if(minutes<60)return `${minutes}분`;
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return rest?`${hours}시간 ${rest}분`:`${hours}시간`;
}
// Shared company-wide beta gate for company management and LAC COOK.
// One company has one application and one approval state across gated content.
export function renderCompanyPassNotice(view,targetLabel=''){
  const error=view.companyAccessError||view.companyPassRequestError;
  const access=view.companyAccess;
  const request=view.companyPassRequest;
  const target=String(targetLabel||view.requestedContent||(view.page==='paid-content-guide'?'콘텐츠':'회사 관리')).trim()||'콘텐츠';
  const naturallyExpired=access?.subscription_status==='expired';
  const entitled=access?.entitlement_enabled===true&&!naturallyExpired;
  const paused=['paused','pending','unassigned'].includes(access?.subscription_status);
  const cooldown=remainingCooldown(request?.cooldown_until);
  let heading='회사 단위로 제공되는 베타 기능입니다';
  let detail='회사 이용 신청 후 운영자 확인이 완료되면 회사 멤버에게 함께 적용됩니다.';
  let phase='회사 이용 신청';
  let icon='🔒';
  let action='';
  if(error){
    phase='상태 확인 필요';icon='⚠️';
    heading='이용 승인 상태를 확인하지 못했어요';
    detail='잠시 후 다시 접속해 주세요. 확인 전에는 기능 이용과 신청이 제한됩니다.';
  }else if(entitled && paused){
    phase='현재 이용 제한';icon='🔒';
    heading='이용 승인은 되어 있지만 현재 기능이 제한돼요';
    detail='회사 이용 상태가 일시정지·만료 또는 시작 대기 중입니다. 대표·관리자에게 문의해 주세요.';
  }else if(entitled){
    phase='이용 승인 완료';icon='✅';
    if(target==='회사 관리'){
      if(companySetupComplete(view)){
        heading='회사 관리 이용 준비가 완료되었어요';
        detail='이제 회사 관리 대시보드와 운영 기능을 사용할 수 있습니다.';
        action='<button type="button" class="lac-pass-application__submit" data-action="go-dashboard"><span aria-hidden="true">✓</span><span>회사 관리 시작</span><span class="lac-pass-application__arrow" aria-hidden="true">→</span></button>';
      }else{
        heading='회사 이용 승인이 완료되었어요';
        detail='이제 Discord 서버와 회사 운영 환경을 연결하는 초기 설정을 진행해 주세요.';
        action='<button type="button" class="lac-pass-application__submit" data-action="open-setup-guide"><span aria-hidden="true">⚙️</span><span>초기 설정 시작</span><span class="lac-pass-application__arrow" aria-hidden="true">→</span></button>';
      }
    }else{
      heading='우리 회사의 이용 승인이 완료되었어요';
      detail='별도 신청 없이 회사 전용 베타 기능을 이용할 수 있습니다.';
    }
  }else if(request?.status==='pending'){
    phase='신청 접수 완료';icon='⏳';
    heading='회사 이용 승인 대기 중이에요';
    detail='운영자가 신청 정보를 확인하고 있습니다. 승인되면 회사 멤버에게 함께 적용됩니다.';
    const controls=[];
    if(request?.viewer_can_edit)controls.push('<button type="button" class="lac-pass-application__secondary" data-action="edit-pass-application">신청 수정</button>');
    if(request?.viewer_can_cancel)controls.push('<button type="button" class="lac-pass-application__secondary is-danger" data-action="cancel-pass-application">신청 취소</button>');
    action=`<div class="lac-pass-application__pending-row"><span class="lac-pass-application__pending" role="status">⏳ 승인 대기 중</span>${controls.join('')}</div>`;
  }else{
    if(target==='회사 관리'){
      heading='회사 관리는 이용 승인이 필요해요';
      detail='화면 구성은 미리 볼 수 있으며, 승인 후 처음 한 번만 회사 운영 초기 설정을 진행합니다.';
    }else if(target==='요리 계산기'){
      heading='요리 계산기는 회사 단위 승인 후 이용할 수 있어요';
      detail='화면 구성은 미리 볼 수 있으며, 승인되면 별도 설치 없이 바로 사용할 수 있습니다.';
    }
    if(naturallyExpired){heading='이전 이용 기간이 종료되었어요';detail='새로 신청하면 운영자 승인 시점부터 새 이용 기간이 시작됩니다.';}
    if(access?.subscription_status==='paused')detail='승인 후 이용 상태가 발급됩니다. 현재 회사 일시정지는 별도 해제가 필요합니다.';
    if(request?.status==='rejected'){
      heading='이전 신청이 반려되었어요';
      detail=cooldown?`반려 후 재신청 제한이 적용 중입니다. 약 ${cooldown} 뒤 다시 신청할 수 있습니다.`:'신청 정보를 확인한 뒤 다시 신청할 수 있습니다.';
    }
    if(request?.status==='canceled'){
      heading='이전 신청을 취소했어요';
      detail=cooldown?`취소 후 재신청 제한이 적용 중입니다. 약 ${cooldown} 뒤 다시 신청할 수 있습니다.`:'신청 정보를 확인한 뒤 다시 신청할 수 있습니다.';
    }
    action=cooldown
      ? `<span class="lac-pass-application__cooldown" role="status">재신청 가능까지 약 ${escapeHtml(cooldown)}</span>`
      : '<button type="button" class="lac-pass-application__submit" data-action="open-pass-application"><span aria-hidden="true">✉️</span><span>회사 이용 신청</span><span class="lac-pass-application__arrow" aria-hidden="true">→</span></button>';
  }
  return `<section class="lac-company-pass-guide lac-pass-application" aria-label="회사 전용 베타 이용 승인"><div class="lac-pass-application__icon" aria-hidden="true">${icon}</div><div class="lac-pass-application__body"><span class="lac-pass-application__phase">${escapeHtml(phase)} <span aria-hidden="true">·</span> 회사 전용 BETA</span><strong>${escapeHtml(heading)}</strong><p>${escapeHtml(detail)}</p>${action}</div></section>`;
}
