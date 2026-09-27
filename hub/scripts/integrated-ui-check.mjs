import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const checks=[];
function expect(label, condition){ checks.push([label,Boolean(condition)]); if(!condition) failures.push(label); }

const main=read('src/main.js');
const render=read('src/ui/render.js');
const api=read('src/lib/productApi.js');
const supabase=read('src/lib/supabase.js');
const css=read('src/styles.css');
const settingsCss=read('src/styles/settings.css');

for (const name of [
  'getFundTreasurySnapshot','saveFundLedgerEntry','cancelFundLedgerEntry',
  'getWebAssetsSnapshot','saveWebAsset','manageWebAsset',
  'getWebAccountsSnapshot','submitWebAccountRequest','reviewWebAccountRequest',
  'submitProductFeedback'
]) expect(`WEB bridge helper: ${name}`, api.includes(`function ${name}`));

for (const rpc of [
  'fund_admin_get_treasury_snapshot','fund_admin_save_ledger_entry','fund_admin_cancel_ledger_entry',
  'web_assets_admin_snapshot','web_assets_admin_save','web_assets_admin_manage',
  'web_accounts_admin_snapshot','web_accounts_submit_request','web_accounts_review_request',
  'submit_product_feedback'
]) expect(`RPC binding: ${rpc}`, api.includes(`'${rpc}'`));

expect('axe_product schema lock', /schema:\s*['"]axe_product['"]/.test(supabase));
expect('No browser BOT runtime RPC usage', !/bot_runtime_/i.test(`${main}\n${render}\n${api}`));
expect('No raw fund ledger browser write', !/\.from\(\s*['"]fund_ledger['"]\s*\)[\s\S]{0,250}\.(insert|update|delete|upsert)\(/i.test(api));
expect('No raw company asset browser write', !/\.from\(\s*['"]asset_company_assets['"]\s*\)[\s\S]{0,250}\.(insert|update|delete|upsert)\(/i.test(api));
expect('No raw member account browser write', !/\.from\(\s*['"]asset_member_accounts['"]\s*\)[\s\S]{0,250}\.(insert|update|delete|upsert)\(/i.test(api));

expect('Accepted sidebar group label', render.includes('회사 운영'));
for (const label of ['공금 관리','멤버 관리','자산 관리','계좌 관리','회사 설정','질문게시판','건의게시판']) expect(`Sidebar/page label: ${label}`, render.includes(label));
expect('Boxed AXE header mark removed', !render.includes('brand-mark'));
expect('Legacy feedback modal removed', !render.includes('feedbackModal') && !main.includes("type==='feedback'"));
expect('Historic suggestion thread remains routed but company menu is replaced by HUB archive', main.includes("'suggestions'") && render.includes('supportTabNav(state) + renderSuggestions(state)') && !render.includes("navItem(state,'questions','문의 · 건의')") && read('src/ui/hubBoard.js').includes('이전 회사 문의 기록') && read('src/ui/hubBoard.js').includes('data-page=\"suggestions\"'));
expect('Mandatory ledger cancellation reason', main.includes('취소 사유를 입력해 주세요.') && api.includes('normalizedReason'));
expect('Fund monthly selector', render.includes('data-fund-weekly-month'));
expect('Fund weekly tab always reloads live status', main.includes("if(state.fundTab==='weekly') await loadFundWeeklyMonth();") && !main.includes("state.fundTab==='weekly'&&!state.fundMonthlyRows.length"));
expect('Fund refresh reloads weekly status when active', main.includes("if(action==='refresh-fund'){await loadFundSnapshot();if(state.fundTab==='weekly')await loadFundWeeklyMonth();"));
expect('Fund weekly RPC skips nonexistent 5th week', main.includes('function fundWeekNumbersForMonth(year, month)') && main.includes('const weekNumbers=fundWeekNumbersForMonth(year,month);') && main.includes('Promise.all(weekNumbers.map(async week =>') && !main.includes('Promise.all([1,2,3,4,5].map(async week =>'));
expect('Approved weekly payment renders as weekly fund, never manual extra income', render.includes("const isWeeklyPayment=r.entry_type==='payment'") && render.includes("const title=isWeeklyPayment?'주간공금':(r.category||'기타')") && !render.includes("'추가입금'"));
expect('Fund dense ledger lane structure', render.includes('axe-fund-ledger-columns') && render.includes('axe-fund-ledger-row') && render.includes('renderLedgerRow(r,state)'));
expect('Settings basic/module tabs', render.includes("ops-settings-nav-row") && render.includes("ops-settings-tabs") && render.includes("data-settings-tab=\"basic\"") && render.includes("data-settings-tab=\"modules\""));
expect('Power-style module controls', render.includes('runtime-power') && render.includes("icon('power')") && render.includes('ops-settings-module--channels-${ui.channels.length}'));
expect('No onboarding flash while company list loads', render.includes('!state.ready ? renderStartupLoading()'));
expect('Stable custom company picker', render.includes('runtime-company-picker') && main.includes("action==='toggle-company-menu'") && main.includes("action==='switch-company'"));
expect('Asset compact mode contract', render.includes("state.assetTab==='returns'?'is-returns':'is-assets'") && render.includes('ops-mgmt-tabs-row'));
expect('Fund settings compact runtime override', css.includes('.axe-fund-subview--settings .axe-fund-setting{grid-template-columns:205px minmax(0,1fr)'));
expect('Customer settings hide internal code badge', !render.includes('<span>${esc(m.module_key)}</span>') && render.includes('<div class="ops-settings-module-copy"><strong>${esc(ui.name)}</strong>'));
expect('Compact save action visual', settingsCss.includes('.ops-settings-save-action'));
expect('Onboarding status RPC binding', api.includes("'web_get_company_onboarding_status'") && api.includes('function getCompanyOnboardingStatus'));
expect('Reconnect request RPC binding', api.includes("'request_company_discord_reconnect'") && api.includes('function requestCompanyDiscordReconnect'));
expect('Reconnect confirmation modal', render.includes("data-form=\"reconnect-discord\"") && render.includes('그대로 보존되는 항목'));
expect('Reconnect poll lifecycle', main.includes('startReconnectStatusPoll') && main.includes("['reset_requested','resetting']"));
expect('New company returns to HUB before pass-gated setup', main.includes("setNotice('회사를 만들었습니다. 콘텐츠를 둘러보고 필요한 이용권을 신청해 주세요.')") && !main.includes("state.setupGuide=createSetupGuideState(1);state.modal={type:'setup-guide'};"));
expect('Onboarding role forward navigation auto-saves', main.includes("nextTab==='modules' && state.settingsTab==='basic' && isOnboardingStep('roles')") && main.includes("saveBasicSettingsData(activeData,{requireOnboardingRoles:true})"));
expect('Onboarding role validation', main.includes('관리자 역할을 선택해 주세요.') && main.includes('일반 멤버 역할을 선택해 주세요.'));
expect('Onboarding dynamic save CTA', render.includes("return '저장하고 다음'") && render.includes("return '설정 완료'"));
expect('Onboarding save guidance copy', render.includes('기능 설정으로 이동하면 현재 입력값이 자동 저장됩니다.'));
expect('Onboarding completion notice', main.includes('초기 설정이 완료됐습니다.'));
expect('BOT bridge remains connected-state aware without redundant footer copy', render.includes("state.discordConnection?.status==='connected'") && !render.includes('BOT 자동 반영 연결됨'));
expect('Prototype CSS system imported', ['tokens.css','layout.css','fund.css','management.css','settings.css','overlays.css'].every(x=>css.includes(x)));

expect('Cooking menu settings tab', render.includes('요리 메뉴') && render.includes('renderCookingMenuSettings'));
expect('Cooking menu modal', render.includes('cookingMenuModal') && render.includes('data-form=\"cooking-menu\"'));
expect('Cooking menu direct RLS CRUD API', api.includes("from('cooking_order_types')") && api.includes('saveCookingOrderType') && api.includes('setCookingOrderTypeEnabled'));
expect('Cooking menu state wiring', main.includes('cookingOrderTypes') && main.includes('getCookingOrderTypes') && main.includes("action==='toggle-cooking-menu'"));
expect('Cooking menu avoids hard delete', !api.includes(".from('cooking_order_types').delete") && !main.includes('deleteCookingOrderType'));
expect('Cooking Discord guide direct RLS config API', api.includes("from('cooking_discord_config')") && api.includes('getCookingDiscordConfig') && api.includes('saveCookingDiscordGuide'));
expect('Cooking Discord guide state wiring', main.includes('cookingDiscordConfig') && main.includes("type==='cooking-guide'"));
expect('Cooking compact settings UX', render.includes('ops-cooking-guide-card') && render.includes('ops-cooking-menu-tools') && render.includes('안내 저장'));
expect('Cooking guide SET baseline field removed', !render.includes('name="set_guide"') && !main.includes("data.get('set_guide')"));
expect('Cooking menu modal ignores backdrop click', main.includes("['cooking-menu'].includes(state.modal?.type)"));

if(failures.length){
  console.error('LAC ONE INTEGRATED UI CHECK: FAIL');
  for(const [label,ok] of checks) console.error(`${ok?' PASS':' FAIL'} ${label}`);
  process.exit(1);
}
console.log('LAC ONE INTEGRATED UI CHECK: PASS');
console.log(`${checks.length}/${checks.length} checks passed.`);
for(const [label] of checks) console.log(` - ${label}: PASS`);
