// Optional source-only integrity check. Run from the repository root.
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
const feature=read('hub/src/features/together.js');
const main=read('hub/src/main.js');
const css=read('hub/src/styles/togetherCanonicalV214.css');
const sql=read('sql/LAC_HUB_TOGETHER_V215_PAGINATION.sql');
assert.ok(feature.includes('const TOGETHER_PAGE_SIZE=6;'));
assert.ok(feature.includes('if(pages<=1'));
assert.ok(feature.includes("rpc('list_page'"));
assert.ok(feature.includes('p_page:ui.page,p_page_size:TOGETHER_PAGE_SIZE'));
assert.ok(feature.includes('if(ui.page>maxPage)'));
assert.ok(feature.includes('ui.page=1;'));
assert.ok(main.includes('togetherOnFilter(event.target.value,state,render)'));
assert.ok(main.includes("import './styles/togetherCanonicalV214.css'"));
assert.ok(!css.includes('!important')&&!css.includes('@import'));
assert.ok(css.includes('height:298px;min-height:298px;'));
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
assert.ok(css.includes('lac-together__pagination'));
assert.ok(sql.includes('CREATE OR REPLACE FUNCTION axe_product.together_list_page'));
assert.ok(sql.includes('COUNT(*)::int FROM ranked'));
assert.ok(sql.includes('LIMIT p_page_size OFFSET (p_page - 1) * p_page_size'));
for(const p of ['hub/src/features/together.js','hub/src/main.js']){
  assert.ok(existsSync(p));execFileSync(process.execPath,['--check',p]);
}
console.log('PASS: Together v2.15 pagination structure, 6-per-page threshold, alignment CSS, and JS syntax.');
console.log('NOTE: Does not execute SQL against Supabase or test production builds.');
