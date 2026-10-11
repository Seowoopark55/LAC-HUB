// Game-only phone format. Legacy stored strings remain readable without migration.
export function phoneDigits(value){return String(value ?? '').replace(/\D/g, '').slice(0,11);}
export function formatIngamePhone(value){
  const digits=phoneDigits(value);
  if(!digits)return '';
  if(digits.length<=3)return '('+digits+(digits.length===3?')':'');
  if(digits.length<=7)return `(${digits.slice(0,3)})${digits.slice(3)}`;
  return `(${digits.slice(0,3)})${digits.slice(3,7)}-${digits.slice(7)}`;
}
export function formatStoredIngamePhone(value){
  const raw=String(value??'').trim();
  return raw.replace(/\D/g,'').length===11?formatIngamePhone(raw):raw;
}
export function normalizeIngamePhone(value){
  if(!String(value??'').trim())return '';
  const digits=String(value).replace(/\D/g,'');
  if(digits.length!==11)throw new Error('인게임 전화번호는 11자리로 입력해 주세요. 예: (310)7621-3004');
  return digits;
}
// Preserve digit-relative cursor position while the live mask inserts punctuation.
export function maskIngamePhoneInput(input){
  if(!input||input.dataset?.phoneMasking==='true')return;
  const before=String(input.value||'');
  const cursor=input.selectionStart??before.length;
  const digitPos=before.slice(0,cursor).replace(/\D/g,'').length;
  const next=formatIngamePhone(before);
  input.value=next;
  let position=0,count=0;
  if(digitPos===0)position=next.startsWith('(')?1:0;
  else {position=next.length;for(let i=0;i<next.length;i++){if(/\d/.test(next[i]))count++;if(count===digitPos){position=i+1;break;}}}
  input.setSelectionRange?.(position,position);
}
