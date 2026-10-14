// Mounts only inside the authenticated platform admin screen.
export function mountMyAppsAdmin(root,state,supabase){
  if(!state.platformAdmin||state.page!=='platform'||!state.session?.user||!supabase)return;
  const wrap=document.createElement('section');
  wrap.className='lac-my-apps';
  wrap.style.cssText='margin:20px auto;max-width:1050px;padding:18px;border:1px solid #354050;border-radius:14px;background:#131a22;color:#f5f7fa;';
  const heading=document.createElement('h2');heading.textContent='MY APPS';heading.style.cssText='font-size:19px;margin:0 0 8px';
  const sub=document.createElement('p');sub.textContent='COMPANY COOK · 로그인 없는 독립 PWA · 운영자 ON/OFF';sub.style.color='#abb8c7';
  const line=document.createElement('div');line.style.cssText='display:flex;gap:12px;align-items:center;flex-wrap:wrap';
  const status=document.createElement('span');status.textContent='상태 확인 중';
  const button=document.createElement('button');button.type='button';button.textContent='조회 중';button.disabled=true;
  button.style.cssText='padding:10px 18px;border-radius:8px;background:#dbb65f;border:0;color:#141820;font-weight:bold;cursor:pointer';
  const link=document.createElement('a');link.href='/company-cook/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='앱 열기 ↗';link.style.color='#dbb65f';
  line.append(status,button,link);wrap.append(heading,sub,line);root.append(wrap);
  let enabled=false,busy=false;
  const load=async()=>{
    const {data,error}=await supabase.rpc('my_apps_company_cook_status');
    if(!wrap.isConnected)return;
    if(error){status.textContent='상태 조회 실패';button.disabled=true;return;}
    enabled=data===true;status.textContent=enabled?'● 운영 중':'○ 이용 중지';
    button.textContent=enabled?'앱 OFF':'앱 ON';button.disabled=false;
  };
  button.addEventListener('click',async()=>{
    if(busy)return;
    const next=!enabled;
    if(!window.confirm(next?'COMPANY COOK을 모든 사용자에게 공개할까요?':'COMPANY COOK 진입을 차단할까요?'))return;
    busy=true;button.disabled=true;status.textContent='변경 중…';
    const {error}=await supabase.rpc('my_apps_set_company_cook_enabled',{p_enabled:next});
    if(!wrap.isConnected)return;
    busy=false;
    if(error){status.textContent='변경 실패: 권한 또는 서버 상태를 확인해 주세요.';button.disabled=false;return;}
    await load();
  });
  void load();
}
