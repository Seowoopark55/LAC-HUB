import {envReady,supabase} from './lib/supabase.js';

const app=document.getElementById('app');
document.title='COMPANY COOK';
document.documentElement.style.colorScheme='dark';
const manifest=document.createElement('link');
manifest.rel='manifest'; manifest.href='/company-cook/manifest.webmanifest';
document.head.append(manifest);
const style=document.createElement('style');
style.textContent=`html,body,#app{height:100%;margin:0;background:#080b10;color:#f2f4f7;font-family:Inter,Pretendard,system-ui,sans-serif}#app{min-height:100%;}.cc-status{min-height:100vh;display:grid;place-items:center;padding:20px;box-sizing:border-box}.cc-box{width:min(460px,100%);border:1px solid #293442;background:#121820;border-radius:18px;padding:28px;text-align:center}.cc-box h1{font-size:23px}.cc-box p{color:#a8b6c6;line-height:1.7}.cc-box button{background:#dcb35a;border:0;border-radius:10px;padding:12px 19px;font-weight:700;cursor:pointer}.cc-app{width:100%;height:100vh;border:0;display:block;background:#090b0e}`;
document.head.append(style);
let frame=null;
let nextPoll=null;
let generation=0;
function panel(title,detail,retry=false){
  frame=null;
  app.replaceChildren();
  const outer=document.createElement('main'); outer.className='cc-status';
  const box=document.createElement('section');box.className='cc-box';
  const h=document.createElement('h1');h.textContent=title;
  const p=document.createElement('p');p.textContent=detail;
  box.append(h,p);
  if(retry){const button=document.createElement('button');button.textContent='다시 확인';button.addEventListener('click',()=>void checkStatus());box.append(button);}
  outer.append(box);app.append(outer);
}
async function checkStatus(){
  const seq=++generation;
  if(!envReady || !supabase){panel('연결 설정 확인 필요','앱 서버 연결 설정이 없습니다.');return;}
  // A failed status check is always fail-closed; cached ON state never authorizes a session.
  const {data,error}=await supabase.rpc('my_apps_company_cook_status');
  if(seq!==generation)return;
  if(error){panel('연결 확인 중단','운영 상태를 확인할 수 없습니다. 인터넷 연결 상태를 확인해 주세요.',true);return;}
  if(data!==true){panel('COMPANY COOK 이용 중지','운영자가 이 앱의 이용을 중지했습니다.');return;}
  if(!frame){
    app.replaceChildren();
    frame=document.createElement('iframe');frame.title='COMPANY COOK 요리 계산기';
    frame.className='cc-app';frame.src='/cook-preview/index.html?lacCookHostPreview=1';
    frame.setAttribute('referrerpolicy','same-origin');app.append(frame);
  }
}
// Strict online-only behavior: status checks on focus, return, online, and at an interval.
function tick(){if(document.visibilityState==='visible')void checkStatus();}
document.addEventListener('visibilitychange',tick);
window.addEventListener('focus',tick);
window.addEventListener('online',tick);
window.addEventListener('offline',()=>{generation++;panel('인터넷 연결 필요','온라인에서만 COMPANY COOK을 이용할 수 있습니다.',true);});
nextPoll=window.setInterval(tick,15000);
if(!navigator.onLine)panel('인터넷 연결 필요','온라인에서만 COMPANY COOK을 이용할 수 있습니다.',true);
else {panel('COMPANY COOK','앱 이용 상태를 확인하고 있습니다.');void checkStatus();}
