import fs from 'node:fs';

const render=fs.readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/lib/productApi.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles/management.css',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../database/migrations/SUPABASE_MIGRATION_3_26_4H_COMPANY_DELETE_AUDIT_ORDER_FIX.sql',import.meta.url),'utf8');

const checks=[
  ['platform delete RPC API', api.includes("platform_admin_delete_company") && api.includes('deletePlatformCompany')],
  ['platform-only delete gate', main.includes("회사 삭제는 PLATFORM OWNER만 할 수 있습니다.")],
  ['exact name confirmation', main.includes("confirmName!==expectedName") && render.includes('정확히 입력하세요')],
  ['irreversible warning', render.includes('이 작업은 되돌릴 수 없습니다.')],
  ['discord cleanup warning', render.includes('Discord 서버에 이미 만들어진 채널이나 메시지는 자동으로 삭제하지 않습니다.')],
  ['service management tabs', render.includes('platform-service-tabs') && render.includes('회사 관리') && render.includes('고객 질문') && render.includes('건의 · 제보')],
  ['bounded platform page size', render.includes('platform:6') && render.includes('pageRows(rows,state.platformPage,OPS_PAGE_SIZE.platform)')],
  ['platform tab state', main.includes("platformView:'companies'") && main.includes("action==='platform-view'")],
  ['delete audit table', sql.includes('platform_company_deletion_log')],
  ['delete function security definer', sql.includes('platform_admin_delete_company') && sql.includes('security definer') && sql.includes('platform_is_admin()')],
  ['delete company parent row', sql.includes('delete from axe_product.companies')],
  ['authenticated grant only', sql.includes('grant execute on function axe_product.platform_admin_delete_company(uuid,text) to authenticated')],
  ['scale CSS', css.includes('.platform-service-view') && css.includes('.platform-company-list{min-height:336px}')],
  ['platform owner survives zero companies', render.includes("(state.page === 'platform' || state.page === 'layout') ? (state.platformAdmin ? renderManagementCenter(state)") && render.includes('if (!state.session?.user || state.platformAdmin !== true) return renderPermission(state)') && render.includes('<main class="main main--${esc(state.page)} platform-center__main">${renderPage(state)}</main>')],
];
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(ok)pass++;}
console.log(`RESULT ${pass}/${checks.length}`);
if(pass!==checks.length)process.exit(1);
