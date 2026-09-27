import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/lib/productApi.js',import.meta.url),'utf8');
const registerMembers=fs.readFileSync(new URL('../api/discord/setup/register-members.js',import.meta.url),'utf8');
const registerMember=fs.readFileSync(new URL('../api/discord/setup/register-member.js',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

const checks=[];
const expect=(label,ok)=>checks.push([label,Boolean(ok)]);

expect('3.26.3 web package version',pkg.version==='1.7.41-web-ui.79');
expect('company slug remains internal and automatic',api.includes('makeInternalCompanySlug')&&api.includes('p_slug: internalSlug'));
expect('company create keeps a stable pending attempt',api.includes('COMPANY_CREATE_ATTEMPT_KEY')&&api.includes('writePendingCompanyCreate')&&api.includes('readPendingCompanyCreate'));
expect('company create retries recover by the same slug before another insert',api.indexOf('const recovered = await findCompanyBySlug(internalSlug)')<api.indexOf("result = await supabase.rpc('create_company'"));
expect('company create accepts scalar/object/array RPC result shapes',api.includes("if (typeof data === 'string')")&&api.includes('if (Array.isArray(data))')&&api.includes('data.id || data.company_id'));
expect('company create verifies canonical company row after RPC',api.includes('findCompanyById(returnedId)')&&api.includes('findCompanyBySlug(internalSlug)'));
expect('ambiguous old company result error removed',!main.includes('생성된 회사 정보를 받지 못했습니다.'));
expect('company create success message is customer-readable',main.includes('회사를 만들었습니다. 콘텐츠를 둘러보고 필요한 이용권을 신청해 주세요.'));
expect('company create unresolved state gives recovery instruction',api.includes('회사 등록 상태를 확인하지 못했습니다. 새로고침 후 회사 목록을 확인해 주세요.'));

expect('guided setup uses one shared resume resolver',main.includes('function resolveSetupGuideResumeStep(requestedStep = 0)'));
const resolverAt=main.indexOf('function resolveSetupGuideResumeStep(requestedStep = 0)');
expect('resume resolver checks Discord connection/catalog prerequisite',main.indexOf("state.discordConnection?.status!=='connected'||state.onboardingStatus?.catalog_ready===false",resolverAt)>resolverAt);
expect('resume resolver checks role prerequisite',main.indexOf('!state.discordCompanyConfig?.admin_role_id||!state.discordCompanyConfig?.member_role_id',resolverAt)>resolverAt);
expect('setup is resumed only after explicit user action',main.includes('openSetupGuide(resolveSetupGuideResumeStep(requestedStep));')&&!main.includes('const step=resolveSetupGuideResumeStep(Math.max(1,Math.min(6,Number(saved.step||1))))'));
expect('manual setup open uses shared resolver',main.includes('openSetupGuide(resolveSetupGuideResumeStep(requestedStep));'));
expect('OAuth setup resume uses shared resolver',main.includes('const resumeStep=resolveSetupGuideResumeStep(requestedStep);'));
expect('unfinished setup no longer auto-resumes before user action',!main.includes("currentMembership(state)?.role==='owner' && saved && !saved.completed")&&render.includes('초기 설정 이어하기'));

expect('live module order includes modbook and pinball',render.includes("const MODULE_ORDER = ['fund','ammo','outlaw','modbook','pinball','cooking','assets']"));
expect('test preview derives module cards from live module definitions',render.includes("const previewModuleCards=MODULE_ORDER.filter(key=>MODULE_UI[key]).map(key=>moduleCard(key,MODULE_UI[key].name,MODULE_UI[key].desc)).join('');"));
expect('test preview step uses the shared preview module list',render.includes('<div class="setup-demo-module-grid">${previewModuleCards}</div>'));
expect('test preview can toggle newly added shared modules',main.includes("if(action==='setup-demo-toggle-module')")&&main.includes('state.setupDemo.modules[key]=!Boolean(state.setupDemo.modules[key])'));
expect('test preview channel plan also includes modbook and pinball',render.includes("if(modules.modbook)channelPlan.push")&&render.includes("if(modules.pinball)channelPlan.push"));

expect('first-run stays registration-gated with no company search/join code',render.includes('회사 대표에게 멤버 등록 요청하기')&&render.includes('회사에서 멤버 등록 후 이용할 수 있어요')&&!render.includes('data-form="join-company"'));
expect('registration verification still claims before company listing',main.indexOf('await claimDiscordMemberships();',main.indexOf("if(action==='check-member-registration')"))<main.indexOf('await loadCompanies();',main.indexOf("if(action==='check-member-registration')")));
expect('server re-verifies selected Discord members before registration',registerMembers.includes('// Re-scan on the server so the browser cannot submit arbitrary Discord IDs.')&&registerMembers.includes('findSelectedRoleMembers(guildId, roleId, selectedIds)'));
expect('inactive historical members are not silently reactivated',registerMembers.includes('requires_manual_reactivation')&&main.includes('퇴사/정지 이력으로 멤버 관리에서 상태 확인 필요'));
expect('flow lab test center remains non-writing',main.includes("if(action==='test-center-request-pass')")&&main.includes("state.testCenter.passStatus='pending'")&&!main.match(/if\(action==='test-center-request-pass'\)[\s\S]{0,700}(createCompanyPassRequest|createCompany|claimDiscordMemberships)\(/));


expect('company creation is offered only in onboarding, not an existing company console',!render.includes('state.canCreateCompany===true?`<div class="company-quick-actions')&&render.includes('canCreateCompany?`<button')&&api.includes("supabase.rpc('lac_can_create_company')"));
expect('regular configured-company action and submission reject second company while platform owner stays exempt',main.includes("if(state.companies.length&&!state.platformAdmin){setError('이미 소속 회사가 설정되어 있어 새 회사를 만들 수 없습니다.')")&&main.includes("if(state.companies.length&&!state.platformAdmin)throw new Error('이미 소속 회사가 설정되어 있어 새 회사를 만들 수 없습니다.')"));
expect('first-run creation CTA respects DB eligibility',render.includes('canCreateCompany:state.canCreateCompany===true')&&render.includes('canCreateCompany?`<button'));
expect('click and submission recheck eligibility immediately before company creation',main.includes("if(action==='open-create-company'){ ".trim())&&main.includes('state.canCreateCompany=await canCreateCompany();')&&main.includes('if(!state.canCreateCompany)throw new Error(')&&!main.includes('redeemCompanyCreateCode('));
expect('direct member registration is available to company admins',render.includes('data-action="open-member-register"')&&render.includes('data-form="member-register"')&&api.includes("'/api/discord/setup/register-member'"));
expect('direct member registration revalidates company admin server-side',registerMember.includes('await requireCompanyAdmin(token, user.id, companyId)'));
expect('direct member registration verifies actual Discord guild membership',registerMember.includes("/guilds/${guildId}/members/${discordUserId}"));
expect('direct member registration fails clearly when Discord is not connected',registerMember.includes("status(409)")&&registerMember.includes('먼저 회사 설정에서 Discord 서버를 연결해 주세요.'));
expect('direct member registration never grants owner role',registerMember.includes("new Set(['admin','manager','member'])")&&!registerMember.includes("'owner','admin','manager','member'"));
expect('direct member registration preserves inactive historical state',main.includes("result?.membership?.status && result.membership.status!=='active'")&&main.includes('멤버 관리에서 현재 상태를 확인해 주세요.'));
expect('guided setup launcher is owner-only',render.includes("const previewAction=currentMembership(state)?.role==='owner'")&&main.includes("if(!isCurrentCompanyOwner()){setError('초기설정은 회사 OWNER만 진행할 수 있습니다.');return;}"));
expect('guided setup mutations are owner-only',!main.includes("!state.setupGuide||!canAdmin(state)")&&main.includes("setup-guide-finish'){if(!state.setupGuide||!isCurrentCompanyOwner()"));
expect('company creation verifies owner membership before setup',main.includes("if(!isCurrentCompanyOwner())throw new Error('회사 등록은 확인됐지만 OWNER 권한 연결을 확인하지 못했습니다."));

let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++;}
console.log(`Onboarding flow integrity: ${checks.length-failed}/${checks.length} PASS`);
if(failed)process.exit(1);
