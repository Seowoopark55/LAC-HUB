import { getDiscordBotToken, getHubAppUrl } from '../../server/discordSecurity.js';
import { requireUser } from '../../server/supabaseUser.js';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISCORD_ID_RE=/^\d{15,22}$/;
function cfg(){
  const url=String(process.env.VITE_SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const key=String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'').trim();
  if(!url||!key)throw new Error('Supabase server config missing.');
  return {url,key};
}
async function readJson(response){try{return await response.json();}catch{return null;}}
async function verifyRecord(token,user,kind,recordId){
  const {url,key}=cfg();
  if(kind==='hub_ticket'){
    if(!UUID_RE.test(recordId))return null;
    const qs=new URLSearchParams({id:`eq.${recordId}`,author_id:`eq.${user.id}`,select:'id,title,content_key,category',limit:'1'});
    const r=await fetch(`${url}/rest/v1/hub_tickets?${qs}`,{headers:{apikey:key,Authorization:`Bearer ${token}`,'Accept-Profile':'axe_product'}});
    const rows=await readJson(r);return r.ok&&Array.isArray(rows)?rows[0]||null:null;
  }
  if(kind==='build_report'){
    if(!/^\d{1,18}$/.test(recordId))return null;
    const qs=new URLSearchParams({id:`eq.${recordId}`,reporter_id:`eq.${user.id}`,select:'id,name,report_type,status',limit:'1'});
    const r=await fetch(`${url}/rest/v1/modbook_reports?${qs}`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    const rows=await readJson(r);return r.ok&&Array.isArray(rows)?rows[0]||null:null;
  }
  return null;
}
async function discordJson(path,init={}){
  const r=await fetch(`https://discord.com/api/v10${path}`,{...init,headers:{Authorization:`Bot ${getDiscordBotToken()}`,'Content-Type':'application/json',...(init.headers||{})}});
  const data=await readJson(r);if(!r.ok)throw new Error(data?.message||'Discord DM failed.');return data;
}
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
  try{
    const auth=await requireUser(req);const kind=String(req.body?.kind||'');const recordId=String(req.body?.record_id||'').trim();
    const record=await verifyRecord(auth.token,auth.user,kind,recordId);if(!record)return res.status(403).json({error:'접수 건을 확인하지 못했습니다.'});
    const targets=[...new Set(String(process.env.LAC_PLATFORM_OWNER_DISCORD_IDS||process.env.LAC_PLATFORM_OWNER_DISCORD_ID||'').split(/[\s,;]+/).map(v=>v.trim()).filter(v=>DISCORD_ID_RE.test(v)))];
    if(!targets.length)return res.status(200).json({sent:false,reason:'target_not_configured'});
    const label=kind==='build_report'?'개조서 세팅 제보':({cook:'요리 계산기',build:'개조서 세팅',game_info:'게임 정보',company:'회사 관리',hub:'사이트 문의'})[record.content_key]||'LAC HUB 문의 · 제보';
    const title=String(record.title||record.name||'새 접수').slice(0,160);const appUrl=getHubAppUrl();let sent=0;
    for(const id of targets){try{const dm=await discordJson('/users/@me/channels',{method:'POST',body:JSON.stringify({recipient_id:id})});if(!dm?.id)continue;await discordJson(`/channels/${dm.id}/messages`,{method:'POST',body:JSON.stringify({content:[`**LAC HUB 새 ${label}가 접수되었습니다.**`,`> ${title}`,appUrl,'관리 센터 → **문의 · 제보**에서 확인해 주세요.'].join('\n'),allowed_mentions:{parse:[]}})});sent++;}catch{}}
    return res.status(200).json({sent:sent>0,count:sent});
  }catch(error){const status=Number(error?.statusCode||500);return res.status(status>=500?200:status).json(status>=500?{sent:false,reason:'dm_failed'}:{error:error?.message||'알림 요청 실패'});}
}
