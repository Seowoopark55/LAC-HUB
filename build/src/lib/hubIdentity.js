// LAC BUILD embedded under HUB: read identity without changing legacy author records.
// Uses the existing HUB Supabase client (axe_product schema + RLS).
// public.profiles.is_admin remains the authority for legacy BUILD admin rights.
import { supabase as hubSupabase } from '../../../hub/src/lib/supabase.js';
import { loadPlayerProfile } from '../../../hub/src/lib/playerProfileApi.js';

export async function loadBuildHubIdentity(userId) {
  const empty = { hub_identity_mode: true, hub_ingame_nickname: '', hub_company_name: '' };
  if (!userId || !hubSupabase) return empty;

  // A missing/unmigrated profile must never block viewing old builds.
  let nickname = '';
  try {
    const player = await loadPlayerProfile(userId);
    nickname = String(player?.ingame_nickname || '').trim();
  } catch (error) {
    console.warn('HUB 인게임 프로필 조회 실패 (기존 BUILD 데이터는 보존):', error);
  }

  // A company tag must come from a real active HUB membership, not the old
  // manually claimed BUILD company string. Database RLS restricts visibility.
  let companyName = '';
  try {
    const { data: memberships, error: membershipError } = await hubSupabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(25);
    if (membershipError) throw membershipError;
    const ids = (memberships || []).map(row => row.company_id).filter(Boolean);
    if (ids.length) {
      let preferred = '';
      try { preferred = String(localStorage.getItem('axe_product_company_id') || ''); } catch {}
      const id = ids.includes(preferred) ? preferred : ids[0];
      const { data: company, error: companyError } = await hubSupabase
        .from('companies').select('name').eq('id', id).maybeSingle();
      if (companyError) throw companyError;
      companyName = String(company?.name || '').trim();
    }
  } catch (error) {
    console.warn('HUB 회사 소속 조회 실패: BUILD 회사 태그를 생략합니다.', error);
  }
  return { ...empty, hub_ingame_nickname: nickname, hub_company_name: companyName };
}
