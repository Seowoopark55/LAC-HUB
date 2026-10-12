import { getDiscordBotToken } from '../../server/discordSecurity.js';
import { requireUser, requireCompanyAdmin, getCompanyDiscordConnection } from '../../server/supabaseUser.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SNOWFLAKE=/^\d{15,22}$/;
const DISCORD_API='https://discord.com/api/v10';

function fail(message,status=502,code='SYNC_FAILED'){const error=new Error(message);error.statusCode=status;error.code=code;throw error;}
async function readJson(response){try{return await response.json();}catch{return null;}}
async function discordList(guildId,type,botToken){
  const response=await fetch(`${DISCORD_API}/guilds/${guildId}/${type}`,{
    headers:{Authorization:`Bot ${botToken}`,'User-Agent':'LACHUB (https://lachub.cloud, 1.0)'},
  });
  const data=await readJson(response);
  if(response.status===429)fail('Discord API 요청 제한이 적용됐습니다. 잠시 후 다시 시도해 주세요.',429,'DISCORD_RATE_LIMIT');
  if(!response.ok)fail('Discord 봇이 서버의 역할·채널을 읽지 못했습니다. 봇 설치 및 권한을 확인해 주세요.',502,'DISCORD_BOT_ACCESS');
  if(!Array.isArray(data))fail('Discord 응답 형식이 올바르지 않습니다.');
  return data;
}
async function upsertCatalog(table,conflict,rows,env){
  if(!rows.length)return;
  const response=await fetch(`${env.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`,{
    method:'POST',
    headers:{apikey:env.key,Authorization:`Bearer ${env.key}`,'Content-Type':'application/json',
      'Content-Profile':'axe_product',Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(rows),
  });
  if(!response.ok){
    const detail=await readJson(response);
    // Avoid sending schema internals or credentials to browsers.
    console.error('LAC HUB catalog upsert failed',table,response.status,detail?.code||'',detail?.message||'');
    fail('Supabase 역할·채널 동기화 저장에 실패했습니다. 관리자에게 DB 권한과 고유 인덱스를 확인해 달라고 요청해 주세요.',502,'CATALOG_DB_WRITE');
  }
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
  try{
    const companyId=String(req.body?.company_id||'').trim();
    if(!UUID.test(companyId))fail('회사 ID가 올바르지 않습니다.',400);
    const {token,user}=await requireUser(req);
    await requireCompanyAdmin(token,user.id,companyId);
    const linked=await getCompanyDiscordConnection(token,companyId);
    const guildId=String(linked.guild_id||'');
    if(!SNOWFLAKE.test(guildId))fail('Discord 서버 연결 정보가 올바르지 않습니다.',409);
    // Service role is never exposed to the browser. This option enables
    // instant sync without waiting for the separate bot's 10-minute worker.
    const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
    const supabaseUrl=String(process.env.VITE_SUPABASE_URL||'').trim().replace(/\/+$/,'');
    if(!serviceKey||!supabaseUrl)fail('즉시 동기화 서버 설정이 아직 준비되지 않았습니다. 기존 봇 동기화를 계속 기다립니다.',503,'SYNC_ENV_MISSING');
    let botToken;
    try{botToken=getDiscordBotToken();}catch{fail('Discord 봇 토큰이 서버에 설정되지 않았습니다.',503,'BOT_TOKEN_MISSING');}
    const [roles,channels]=await Promise.all([
      discordList(guildId,'roles',botToken),discordList(guildId,'channels',botToken),
    ]);
    if(!roles.length)fail('Discord 역할 정보를 받지 못했습니다.',502);
    if(roles.some(role=>!SNOWFLAKE.test(String(role.id||''))) || channels.some(ch=>!SNOWFLAKE.test(String(ch.id||'')))){
      fail('Discord 서버 데이터 형식이 올바르지 않습니다.');
    }
    const now=new Date().toISOString();
    const metadata={company_id:companyId,guild_id:guildId,synced_at:now,updated_at:now};
    const roleRows=roles.map(role=>({
      ...metadata,role_id:String(role.id),role_name:String(role.name||''),position:Number(role.position||0),
      color:Number(role.color||0),managed:role.managed===true,mentionable:role.mentionable===true,
      hoist:role.hoist===true,permissions:String(role.permissions||'0'),
    }));
    const channelRows=channels.map(channel=>({
      ...metadata,channel_id:String(channel.id),channel_name:String(channel.name||''),
      channel_type:Number(channel.type||0),position:Number(channel.position||0),
      parent_id:channel.parent_id?String(channel.parent_id):null,
      is_text_based:[0,5,15,16].includes(Number(channel.type)),
      is_voice_based:[2,13].includes(Number(channel.type)),
    }));
    // Re-check linked guild before writing: reconnect may have started during HTTP.
    const recheck=await getCompanyDiscordConnection(token,companyId);
    if(String(recheck.guild_id)!==guildId)fail('연결된 Discord 서버가 변경되어 동기화를 취소했습니다.',409);
    const env={url:supabaseUrl,key:serviceKey};
    await upsertCatalog('discord_guild_roles','company_id,role_id',roleRows,env);
    await upsertCatalog('discord_guild_channels','company_id,channel_id',channelRows,env);
    return res.status(200).json({ok:true,role_count:roleRows.length,channel_count:channelRows.length});
  }catch(error){
    const status=Number(error?.statusCode||500);
    if(status>=500)console.error('LAC HUB immediate catalog sync failed',status,error.message);
    return res.status(status).json({error:status>=500&&status!==503?'Discord 즉시 동기화를 완료하지 못했습니다. 기존 동기화로 다시 시도합니다.':error.message,code:error?.code||'SYNC_FAILED'});
  }
}
