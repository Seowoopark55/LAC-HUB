import {supabase} from './supabase.js';

// This profile belongs to a Supabase account, never to a company membership.
// RLS on axe_product.player_profiles is authoritative for every operation.
function client(){if(!supabase)throw new Error('Supabase 연결이 필요합니다.');return supabase;}

export async function loadPlayerProfile(userId){
  if(!userId)throw new Error('로그인이 필요합니다.');
  const {data,error}=await client().from('player_profiles')
    .select('user_id,ingame_nickname,ingame_phone,created_at,updated_at')
    .eq('user_id',userId).maybeSingle();
  if(error)throw error;
  return data||null;
}

export async function upsertPlayerProfile(userId,profile){
  if(!userId)throw new Error('로그인이 필요합니다.');
  const {data,error}=await client().from('player_profiles')
    .upsert({user_id:userId,ingame_nickname:profile.ingameNickname,ingame_phone:profile.ingamePhone||null},{onConflict:'user_id'})
    .select('user_id,ingame_nickname,ingame_phone,created_at,updated_at').single();
  if(error)throw error;
  return data;
}
