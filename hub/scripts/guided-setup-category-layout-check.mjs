import fs from 'node:fs';
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('../src/ui/render.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../api/discord/setup/channels.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/productApi.js',import.meta.url),'utf8');
const checks=[
  ['current setup supports a named single category', main.includes("categoryName:'LAC HUB'") && main.includes('state.setupGuide.categoryName')],
  ['single-category selection remains visible in live UI', render.includes('data-guide-category-name')],
  ['client submits selected category name', main.includes('createGuidedSetupChannels(state.companyId,category,') && client.includes('category_name: categoryName')],
  ['server validates company admin and connected guild', api.includes('await requireCompanyAdmin(token, user.id, companyId)') && api.includes('getCompanyDiscordConnection(token, companyId)')],
  ['server accepts category using bounded cleanName', api.includes("cleanName(req.body?.category_name, 'LAC HUB')")],
  ['server caps auto-created channels', api.includes('const MAX_CHANNELS = 8') && api.includes('slice(0, MAX_CHANNELS)')],
  ['server rejects duplicate channel keys', api.includes('new Set(normalizedKeys).size !== normalizedKeys.length')],
  ['server rejects duplicate names', api.includes('new Set(normalizedNames).size !== normalizedNames.length')],
  ['server checks for existing category before creating it', api.includes('existingRows.find') && api.includes('Number(row?.type) === 4') && api.includes('if (!category)')],
  ['new channel belongs to selected category', api.includes('parent_id: String(category.id)')],
  ['existing channel reuse stays scoped to category', api.includes("String(entry?.parent_id || '') === String(category.id)")],
  ['server returns channel mapping by key', api.includes('channels: results') && api.includes('key: item.key')],
  ['client persists key/id mapping not category label', main.includes('persistSetupGuideChannels(map)') && !main.includes('parent_id:row.categoryName')],
];
let pass=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(ok)pass++;}
console.log(`Current single-category contract: ${pass}/${checks.length} PASS`);
if(pass!==checks.length)process.exit(1);
