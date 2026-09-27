// WEB presentation/entry rules. These do not replace RLS, RPC authorization, or protected server delivery.
export const WEB_CONTENT_KEYS = Object.freeze(['company_management','game_info','lac_build','lac_cook']);
export function contentPolicy(state,key){
  if(!state?.contentPoliciesLoaded)return null;
  return (state.contentPolicies||[]).find(row=>row.content_key===key)||null;
}
export function contentIsVisible(state,key){return contentPolicy(state,key)?.is_published===true;}
export function hasCompany(state){return Boolean(state?.companyId&&(state.companies||[]).some(c=>c.id===state.companyId));}
export function hasUnifiedPass(state){
  return hasCompany(state) && state?.companyAccessStatus==='ready' && state.companyAccess?.company_id===state.companyId && state.companyAccess?.can_use===true;
}
export function companyAccessPending(state){
  if(!hasCompany(state))return false;
  return ['idle','loading'].includes(String(state?.companyAccessStatus||'idle'));
}
export function contentAccessPending(state,key){
  if(!state?.session?.user||!contentIsVisible(state,key))return false;
  if(key!=='company_management'&&contentPolicy(state,key)?.is_free===true)return false;
  return companyAccessPending(state);
}
export function canOpenWebContent(state,key){
  if(!state?.session?.user||!contentIsVisible(state,key))return false;
  if(key==='company_management')return hasUnifiedPass(state); // free flag NEVER exposes private company records.
  if(['game_info','lac_build','lac_cook'].includes(key))return contentPolicy(state,key)?.is_free===true||hasUnifiedPass(state);
  return false;
}
export function contentCardStatus(state,key){
  if(!contentIsVisible(state,key))return null;
  if(key!=='company_management'&&contentPolicy(state,key)?.is_free===true)return '자유 이용';
  if(!hasCompany(state))return '회사 등록 후';
  if(companyAccessPending(state))return '확인 중';
  if(hasUnifiedPass(state))return '이용 가능';
  if(state.companyAccess?.company_id===state.companyId && state.companyAccess?.entitlement_enabled===true && state.companyAccess?.subscription_status!=='expired')return '이용 제한';
  return '이용 신청';
}

// Company management is considered ready after the explicit guided setup is
// completed. Existing companies created before the wizard was introduced are
// treated as ready when their Discord connection and both core roles are already
// configured, so this change never forces a legacy company through setup again.
export function companySetupComplete(state){
  if(!hasCompany(state) || !hasUnifiedPass(state)) return false;
  const guided=state?.companySettings?.settings?.guided_setup;
  if(guided?.completed===true) return true;
  const connected=state?.discordConnection?.status==='connected';
  const rolesReady=Boolean(state?.discordCompanyConfig?.admin_role_id && state?.discordCompanyConfig?.member_role_id);
  const onboarding=String(state?.onboardingStatus?.status||'');
  return Boolean(connected && rolesReady && onboarding==='ready');
}
