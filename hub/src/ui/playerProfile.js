import {formatStoredIngamePhone, normalizeIngamePhone} from '../lib/ingamePhone.js';

function escapeHtml(value){
  return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// Compact, self-contained profile dialog: only opened by an authenticated user.
export function renderPlayerProfileModal(state){
  const modal=state.modal||{};
  if(modal.type!=='player-profile')return '';
  const profile=state.playerProfile||{};
  const fields=modal.draft||profile;
  const loading=Boolean(modal.loading);
  const nickname=escapeHtml(fields.ingame_nickname||'');
  const phone=escapeHtml(formatStoredIngamePhone(fields.ingame_phone||''));
  const error=modal.error?`<p class="lac-player-profile__error" role="alert">${escapeHtml(modal.error)}</p>`:'';
  return `<div class="runtime-modal-backdrop lac-player-profile-backdrop" data-modal-backdrop>
    <section class="runtime-modal lac-player-profile" role="dialog" aria-modal="true" aria-labelledby="player-profile-title" aria-describedby="player-profile-desc">
      <header class="lac-player-profile__header"><div><h2 id="player-profile-title">${profile.user_id?'내 인게임 프로필':'인게임 프로필 등록'}</h2><p id="player-profile-desc">게임에서 사용하는 정보를 입력해 주세요.</p></div><button type="button" data-action="close-modal" aria-label="닫기">×</button></header>
      ${loading?'<div class="lac-player-profile__loading" role="status">프로필 정보를 불러오는 중입니다…</div>':`<form class="lac-player-profile__form" data-form="player-profile" autocomplete="off">
        <label class="lac-player-profile__field"><span>인게임 닉네임 <b>필수</b></span><input type="text" name="ingame_nickname" required minlength="2" maxlength="40" autocomplete="off" placeholder="인게임 닉네임" value="${nickname}" ${modal.loadFailed?'disabled':''}></label>
        <label class="lac-player-profile__field lac-player-profile__field--phone"><span>인게임 전화번호 <em>선택</em></span><input type="text" name="ingame_phone" maxlength="14" inputmode="numeric" data-ingame-phone-mask autocomplete="off" placeholder="(310)7621-3004" value="${phone}" ${modal.loadFailed?'disabled':''}></label>
        <p class="lac-player-profile__help">입력한 정보는 HUB의 플레이어 프로필에 저장됩니다.<br>Discord 로그인 계정에 연결되며 회사 권한은 변경되지 않습니다.</p>
        ${error}
        <footer class="lac-player-profile__actions"><button type="button" class="lac-player-profile__cancel" data-action="close-modal">취소</button><button type="submit" class="lac-player-profile__submit" ${modal.loadFailed?'disabled':''}>${profile.user_id?'변경사항 저장':'프로필 등록'}</button></footer>
      </form>`}
    </section>
  </div>`;
}

export function playerProfileFormData(formData){
  const ingameNickname=String(formData.get('ingame_nickname')||'').trim();
  const ingamePhone=String(formData.get('ingame_phone')||'').trim();
  if(ingameNickname.length<2||ingameNickname.length>40)throw new Error('인게임 닉네임은 2~40자로 입력해 주세요.');
  if(/[\x00-\x1F\x7F]/.test(ingameNickname))throw new Error('닉네임에 제어 문자를 입력할 수 없습니다.');
  return {ingameNickname,ingamePhone:normalizeIngamePhone(ingamePhone)};
}
