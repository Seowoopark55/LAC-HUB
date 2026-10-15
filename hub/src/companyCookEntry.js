// COMPANY COOK: standalone online-only PWA. HUB authentication and pass boot are
// intentionally not invoked on this route. No privileged company data is loaded.
import {envReady, supabase} from './lib/supabase.js';
import {mountCompanyTaskTabs,mountCompanyFavoriteGroups,mountCompanyWaterUnits} from './companyCookWorkbench.js';

const app = document.getElementById('app');
document.title = '요리계산기';
document.documentElement.style.colorScheme = 'dark';
if(!document.querySelector('link[rel=manifest]')) {
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = '/company-cook/manifest.webmanifest';
  document.head.append(manifest);
}
const theme = document.createElement('meta');
theme.name = 'theme-color';
theme.content = '#0c1015';
document.head.append(theme);
const styles = document.createElement('style');
styles.textContent = `
  html,body,#app {margin:0;min-height:100%;background:#090d12;color:#f3f5f7;font-family:Inter,Pretendard,system-ui,sans-serif}
  * {box-sizing:border-box}
  #app {min-height:100dvh}
  /* The background belongs to the stage, not an oversized iframe. */
  .cc-layout {
    min-height:100dvh;display:flex;flex-direction:column;align-items:center;
    padding:0 0 28px;
    background:
      radial-gradient(ellipse 42% 34% at 50% 76%,rgba(195,141,73,.09),transparent 78%),
      radial-gradient(ellipse 36% 45% at 90% 56%,rgba(61,94,112,.10),transparent 80%),
      linear-gradient(180deg,rgba(7,10,14,.46) 0%,rgba(7,11,15,.65) 52%,rgba(5,9,13,.88) 100%),
      url('/brand/lac-one-shell-clean.png') center center / cover fixed no-repeat,
      #090d12;
  }
  /* A full workbench, like the previous cooking app: content fills the stage. */
  .cc-panel {
    flex:none;width:min(1460px,calc(100% - 32px));margin:12px auto 0;overflow:hidden;
    background:#101519;border:1px solid rgba(192,146,79,.28);border-radius:15px;
    box-shadow:0 20px 65px #0009,0 0 0 1px #ffffff04;
  }
  .cc-header {
    width:100%;min-height:68px;display:grid;grid-template-columns:minmax(160px,1fr) auto minmax(160px,1fr);
    align-items:center;gap:12px;padding:9px max(18px,calc((100vw - 1460px)/2));
    background:linear-gradient(180deg,#0f141a,#0b1015);border-bottom:1px solid #27313a;
  }
  .cc-header-title{display:flex;gap:12px;align-items:center;min-width:0}
  .cc-header-title b{font-size:19px;color:#f1f3f5;white-space:nowrap}
  .cc-header-icon{width:35px;height:35px;flex:none;display:grid;place-items:center;background:#dba956;
    border-radius:9px;color:#181715;font-size:19px;font-weight:900;box-shadow:0 0 22px #b879302a}
  .cc-nav{display:flex;justify-content:center;align-items:center;gap:5px;border:1px solid #303842;
    border-radius:999px;padding:4px;background:#14191f;min-width:0}
  .cc-nav-button{border:0;border-radius:999px;background:transparent;color:#aebbc9;font-size:12px;font-weight:800;
    padding:9px 15px;cursor:pointer;white-space:nowrap}
  .cc-nav-button:hover{background:#252e38;color:#fff}
  .cc-nav-button[aria-current="page"]{background:#e9b452;color:#151617}
  .cc-nav-button:focus-visible{outline:2px solid #ecc37c;outline-offset:2px}
  .cc-view{padding:25px;min-height:450px;color:#dce5ed}
  .cc-view[hidden],.cc-frame[hidden]{display:none!important}
  .cc-view-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
  .cc-view h2{font-size:19px;margin:0;color:#fff}
  .cc-view p{font-size:12px;line-height:1.7;color:#a9b8c6}
  .cc-view-card{background:#151c23;border:1px solid #34404b;border-radius:13px;padding:19px;margin:0 0 12px}
  .cc-view-card h3{font-size:15px;margin:0 0 10px;color:#f2eee5}
  .cc-view-filters{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}
  .cc-view-filters input,.cc-view-filters select{padding:9px 11px;border-radius:8px;border:1px solid #465362;
    background:#0d141b;color:#eef2f5;font:inherit;font-size:12px}
  .cc-view-filters input{flex:1 1 240px}
  .cc-data-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:490px;overflow:auto}
  .cc-data-item{border:1px solid #34404b;border-radius:9px;padding:12px;background:#10161c}
  .cc-data-item strong{display:block;font-size:12px;color:#f1e5d2}
  .cc-data-item small{display:block;font-size:10px;color:#92a4b4;margin-top:5px;line-height:1.6}

  /* Public catalog and protected editor live together in Data, not in another app route. */
  .cc-view-head .cc-manage-status{font-size:11px;color:#b8c8d5}
  .cc-data-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:9px 0 12px}
  .cc-data-toolbar .cc-button{min-height:33px}
  .cc-data-item{display:flex;gap:9px;align-items:center;justify-content:space-between;min-width:0}
  .cc-data-select{min-width:0;flex:1;text-align:left;cursor:pointer;border:0;padding:0;background:none;color:inherit}
  .cc-data-select strong{font-size:12px}
  .cc-data-select:hover strong,.cc-data-select:focus-visible strong{color:#f3c57c}
  .cc-data-select:focus-visible{outline:2px solid #ecc37c;outline-offset:3px}
  .cc-data-active{border-color:#b08a52;background:#1c2024}
  .cc-data-detail{padding:16px;border:1px solid #695335;border-radius:11px;background:#121a20;margin-top:12px}
  .cc-data-detail h3{margin:0 0 7px;font-size:16px;color:#f1e8d9}
  .cc-data-detail .cc-data-meta{font-size:11px;color:#a9b9c5;margin:0 0 9px}
  .cc-data-parts{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 14px}
  .cc-data-part{border:1px solid #3b4853;border-radius:8px;padding:6px 9px;background:#1a242b;color:#dfe9f0;font-size:11px}
  .cc-data-toolbar .cc-link{font-size:11px}
  .cc-editor-dialog{max-width:min(660px,calc(100vw - 28px));width:100%;max-height:min(85dvh,800px);
    overflow-y:auto;border:1px solid #8b6c40;border-radius:14px;background:#171f27;color:#eef3f8;
    box-shadow:0 25px 70px #000b;padding:21px}
  .cc-editor-dialog::backdrop{background:#000c}
  .cc-editor-dialog h2{font-size:18px;margin:0 0 12px}
  .cc-editor-dialog label{display:grid;gap:5px;font-size:11px;font-weight:750;color:#c4d0dd}
  .cc-editor-dialog input,.cc-editor-dialog select{width:100%;min-width:0;background:#0e151b;color:#f4f5f5;border:1px solid #485461;
    border-radius:8px;padding:9px;font-size:12px}
  .cc-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
  .cc-editor-grid .cc-span-all{grid-column:1/-1}
  .cc-editor-ingredients{display:grid;gap:8px;margin:10px 0}
  .cc-editor-ingredient-row{display:grid;grid-template-columns:minmax(0,1fr) 100px 32px;gap:6px;align-items:center}
  .cc-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:13px}
  .cc-editor-status{font-size:11px;min-height:20px;color:#f0be83}
  .cc-data-help{font-size:11px;color:#9fb1c0;margin:8px 0}
  @media(max-width:600px){.cc-editor-dialog{padding:13px}.cc-editor-grid{grid-template-columns:1fr}
    .cc-editor-ingredient-row{grid-template-columns:minmax(0,1fr) 74px 30px}}
  .cc-link{display:inline-flex;align-items:center;text-decoration:none;padding:9px 13px;border-radius:9px;
    border:1px solid #af8a51;background:#302515;color:#f3d09a;font-size:12px;font-weight:800}
  .cc-link:hover{background:#48341b}
  .cc-hero-text{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;color:#f6d89a;text-shadow:0 2px 12px #020304,0 2px 4px #020304;padding:8px 15px}
  .cc-hero-mark{font-size:31px;line-height:1;margin-bottom:1px;font-weight:900}
  .cc-hero-text strong{font-size:clamp(25px,3.2vw,43px);font-weight:900;letter-spacing:-.045em;line-height:1.18}
  .cc-hero-text em{font-style:normal;font-size:11px;font-weight:800;letter-spacing:.5em;margin:3px 0 7px}
  .cc-hero-text small{font-size:12px;font-weight:750;color:#f6e5ca}

  /* Decorative brand-neutral kitchen hero inside the unified calculator card. */
  .cc-hero {
    height:clamp(160px,12.2vw,205px);
    background:
      linear-gradient(90deg,rgba(7,10,13,.05) 0%,transparent 20%,transparent 80%,rgba(7,10,13,.05) 100%),
      url('/company-cook/hero-kitchen.webp') center center / cover no-repeat,
      #12171b;
    border-bottom:1px solid rgba(194,147,80,.26);
  }
  .cc-brand {display:flex;align-items:center;gap:9px;min-width:0}
  .cc-logo {width:24px;height:24px;flex:none;display:grid;place-items:center;border:1px solid #705732;
    border-radius:7px;background:#2e261a;color:#ffce80;font-size:12px;font-weight:900}
  .cc-brand strong {display:block;font-size:13px;line-height:1.1;letter-spacing:.01em}
  .cc-brand small {display:block;margin-top:2px;color:#8e9eab;font-size:9px}
  .cc-actions {display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}
  .cc-button {min-height:29px;padding:5px 10px;border-radius:7px;border:1px solid #45515d;
    background:#1d252e;color:#e6edf3;font-size:11px;font-weight:750;cursor:pointer}
  .cc-button:hover {background:#273340}
  .cc-button:focus-visible {outline:2px solid #f0bf76;outline-offset:3px}
  .cc-button--primary {border-color:#bd904e;background:#d5ad68;color:#151616}
  .cc-button--primary:hover {background:#ecc782}
  /* Resized to the calculator's real height; never an internally scrolling viewport. */
  .cc-frame {width:100%;height:1px;border:0;display:block;overflow:hidden;background:#101519}
  .cc-status {min-height:100dvh;display:grid;place-items:center;padding:22px}
  .cc-box {width:min(465px,100%);padding:28px;border:1px solid #354152;border-radius:16px;background:#151c24;text-align:center}
  .cc-box h1 {font-size:20px;margin:0 0 10px}
  .cc-box p {font-size:13px;line-height:1.7;color:#b0becc;margin:0 0 16px}
  .cc-dialog {border:1px solid #44515f;border-radius:16px;width:min(440px,calc(100vw - 32px));
    padding:22px;background:#19212a;color:#e9eff5;box-shadow:0 24px 70px #000a}
  .cc-dialog::backdrop {background:#000b}
  .cc-dialog h2 {font-size:17px;margin:0 0 12px}
  .cc-dialog p,.cc-dialog li {font-size:12px;line-height:1.8;color:#c0ccd7}
  .cc-dialog ol {padding-left:21px}
  .cc-dialog button {float:right;margin-top:10px}
  /* Desktop PWA: controls remain within the page, never under OS buttons. */
  /* Keep the hero when possible; narrow/tiny windows favour actual controls. */
  @media(max-height:680px) and (min-width:751px){
    .cc-hero{height:112px}
  }
  @media(max-height:500px){.cc-hero{display:none}}
  @media(max-width:720px){.cc-hero{height:114px}.cc-hero-text strong{font-size:25px}.cc-hero-text small{font-size:10px}}
  @media(max-width:970px){
    .cc-header{grid-template-columns:1fr auto;gap:7px;padding:10px 14px}
    .cc-nav{grid-column:1/-1;grid-row:2;justify-self:center}
    .cc-actions{grid-column:2;grid-row:1}
  }
  @media(max-width:620px){
    .cc-panel{width:calc(100% - 16px);border-radius:11px}
    .cc-header{padding:9px}
    .cc-header-title b{font-size:15px}
    .cc-header-icon{width:28px;height:28px;font-size:14px}
    .cc-nav-button{padding:8px 10px;font-size:11px}
    .cc-button{padding:5px 8px}
    .cc-data-list{grid-template-columns:1fr}
    .cc-view{padding:13px;min-height:330px}
  }

`;
styles.textContent += `

  /* Gold chef-hat identity · no company branding */
  .cc-header-icon{width:39px;height:39px;display:grid;place-items:center;border-radius:12px;
    border:1px solid #a98249;background:linear-gradient(145deg,#3e3020,#171b20 82%);
    box-shadow:inset 0 1px #f0cb8750,0 3px 12px #0009}
  .cc-title-lockup{display:flex;flex-direction:column;min-width:0;gap:3px}
  .cc-title-lockup>b{font-size:18px;line-height:1.1;color:#f7f1e5}
  .cc-title-lockup>small{font-size:10px;line-height:1.2;color:#c2a77e;
    font-weight:700;letter-spacing:.035em}
  @media(max-width:600px){.cc-header-icon{width:33px;height:33px}
    .cc-title-lockup>b{font-size:15px}.cc-title-lockup>small{font-size:9px}}

  /* COMPANY COOK · Order desk: structured ticket layout, independently scrollable. */
  .cc-order-dialog{box-sizing:border-box;width:min(1030px,calc(100vw - 30px));max-width:1030px;
    max-height:min(90dvh,820px);padding:0;overflow:hidden;border:1px solid #45565d;
    border-radius:17px;background:#10181e;color:#eaf0f2;font-family:Inter,Pretendard,system-ui,sans-serif;
    box-shadow:0 32px 100px #000d,0 0 0 1px #edbd6120}
  .cc-order-dialog::backdrop{background:#02070bce;backdrop-filter:blur(5px)}
  .cc-order-dialog button,.cc-order-dialog input{box-sizing:border-box;font-family:inherit}
  .cc-order-dialog button{cursor:pointer;transition:background-color .14s,border-color .14s,color .14s}
  .cc-order-dialog button:focus-visible,.cc-order-dialog input:focus-visible{
    outline:2px solid #f4c77c;outline-offset:2px}
  .cc-order-shell{display:flex;flex-direction:column;max-height:min(90dvh,820px);min-height:0}
  .cc-order-bar{position:relative;display:flex;align-items:center;justify-content:space-between;
    gap:14px;padding:19px 26px 17px;border-bottom:1px solid #2c3a40;
    background:linear-gradient(110deg,#202b30 0%,#131d23 64%,#0e161c 100%)}
  .cc-order-bar::before{content:'';position:absolute;left:26px;bottom:-1px;width:92px;height:2px;
    background:linear-gradient(90deg,#eec67e,transparent)}
  .cc-order-title span{display:block;margin-bottom:5px;color:#d8ac68;font-size:10px;letter-spacing:.18em;font-weight:850}
  .cc-order-title h2{margin:0;color:#f7f1e7;font-size:23px;line-height:1.25;letter-spacing:-.04em}
  .cc-order-title p{display:none}
  .cc-order-close{display:grid;place-items:center;width:38px;height:38px;padding:0;flex-shrink:0;
    border:1px solid #40515d;background:#1b2931;color:#d9e5eb;font-size:18px;border-radius:10px}
  .cc-order-close:hover{background:#2b3a44;border-color:#6b8190}
  .cc-order-content{display:grid;grid-template-columns:minmax(345px,.94fr) minmax(0,1.06fr);
    flex:1;min-height:0;overflow:hidden}
  .cc-order-editor,.cc-order-manager{box-sizing:border-box;min-width:0;min-height:0;
    padding:24px;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#52606b transparent}
  .cc-order-editor{border-right:1px solid #2d3d43;background:#131d23}
  .cc-order-manager{background:#0e171d}
  .cc-order-section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px}
  .cc-order-section-title h3{display:flex;align-items:center;gap:9px;margin:0;font-size:17px;
    font-weight:850;letter-spacing:-.025em;color:#f1ede4}
  .cc-order-editor .cc-order-section-title h3::before,.cc-order-manager .cc-order-section-title h3::before{
    content:'01';display:grid;place-items:center;width:27px;height:27px;border:1px solid #806139;
    border-radius:8px;color:#f0c278;background:#352b1d;font-size:11px;letter-spacing:0}
  .cc-order-manager .cc-order-section-title h3::before{content:'02'}
  .cc-order-section-title>span,.cc-order-list-count{display:none!important}
  .cc-order-form{display:flex;flex-direction:column;gap:13px}
  .cc-order-form-section{border:1px solid #31424a;border-radius:12px;padding:15px;
    background:linear-gradient(150deg,#17242c,#111b21)}
  .cc-order-section-caption{display:block;margin:0 0 10px;color:#b99766;font-size:10px;
    font-weight:900;letter-spacing:.14em}
  .cc-order-field{display:grid;gap:9px;font-size:13px;font-weight:800;color:#dce7ec}
  .cc-order-field input,.cc-order-food-row input{min-width:0;width:100%;height:42px;padding:9px 12px;
    border:1px solid #485c68;border-radius:9px;background:#0c161c;color:#f3f5f5;font-size:14px}
  .cc-order-field input:hover,.cc-order-food-row input:hover{border-color:#70808b}
  .cc-order-field input:focus,.cc-order-food-row input:focus{border-color:#e5b96d;
    box-shadow:0 0 0 3px #e5b96d1a}
  .cc-order-field input::placeholder,.cc-order-food-row input::placeholder{color:#82939f}
  .cc-order-food-head{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:11px}
  .cc-order-food-head strong{font-size:13px;color:#dce7ec;font-weight:800}
  .cc-order-add{display:inline-flex;align-items:center;justify-content:center;min-height:34px;
    padding:6px 11px;border-radius:8px;border:1px solid #947249;background:#3a2c1d;
    color:#f7d39e;font-size:12px;font-weight:850}
  .cc-order-add:hover{background:#594025;border-color:#cf9f5a}
  .cc-order-add:disabled{opacity:.45;cursor:not-allowed}
  .cc-order-food-rows{display:grid;gap:8px}
  .cc-order-food-row{display:grid;grid-template-columns:minmax(0,1fr) 64px 25px 32px;
    align-items:center;gap:6px;min-width:0;padding:8px;background:#0e181e;border:1px solid #334550;border-radius:10px}
  .cc-order-food-row input[type=number]{height:39px;padding:7px 2px;text-align:center;font-weight:850;
    color:#f5c982;border-color:#735d40;background:#251f19}
  .cc-order-unit{text-align:center;color:#b1bdc5;font-size:11px;white-space:nowrap}
  .cc-order-remove{height:34px;width:32px;padding:0;display:grid;place-items:center;
    border:1px solid #5c464b;border-radius:8px;background:#291f24;color:#e7aba7;font-size:17px}
  .cc-order-remove:hover{background:#432b30;border-color:#a56c70}
  .cc-order-totals{display:flex;justify-content:space-between;align-items:center;gap:9px;
    margin-top:12px;padding-top:11px;border-top:1px dashed #42515a;font-size:12px;color:#a6b9c3}
  .cc-order-totals strong{font-size:13px;color:#f2cb8e;white-space:nowrap}
  .cc-order-form-actions{display:flex;align-items:center;justify-content:flex-start;gap:9px;flex-wrap:wrap;margin-top:3px}
  .cc-order-save,.cc-order-quiet{min-height:41px;padding:9px 20px;border-radius:9px;
    border:1px solid #bc965d;font-size:13px;font-weight:900}
  .cc-order-save{background:linear-gradient(180deg,#f5d18c,#dcac5b);border-color:#e4bc72;color:#241a0b;
    box-shadow:0 2px 0 #9e7337}
  .cc-order-save:hover{background:#ffe0a2}
  .cc-order-quiet{background:#21303a;color:#d6e1e6;border-color:#4d626d}
  .cc-order-quiet:hover{background:#30404a}
  .cc-order-feedback{margin:0;color:#efbd81;font-size:12px;line-height:1.5}
  .cc-order-feedback:empty{display:none}
  .cc-order-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;
    position:sticky;top:-24px;z-index:2;margin-bottom:14px;padding:5px;
    background:#0a1319;border:1px solid #354951;border-radius:11px}
  .cc-order-tab{min-width:0;min-height:41px;padding:8px;border:1px solid transparent;
    border-radius:8px;background:transparent;color:#aabcc7;font-size:13px;font-weight:850}
  .cc-order-tab[aria-selected='true']{background:#44321e;color:#ffe0a3;border-color:#aa8249;
    box-shadow:inset 0 1px 0 #fff1}
  .cc-order-tab:hover:not([aria-selected='true']){background:#213039;color:#f0f3f3}
  .cc-order-list{display:grid;align-content:start;gap:11px}
  .cc-order-record{position:relative;overflow:hidden;padding:15px 16px 12px;
    border:1px solid #3b5059;border-radius:12px;background:linear-gradient(145deg,#1a2930,#131f26);
    box-shadow:0 5px 17px #0002}
  .cc-order-record::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
    background:linear-gradient(180deg,#f0c983,#9c7745)}
  .cc-order-record[data-stage=delivered]::before{background:linear-gradient(180deg,#77ba99,#376d54)}
  .cc-order-record-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
  .cc-order-record-identity{display:grid;gap:3px;min-width:0}
  .cc-order-record-index{font-size:10px;font-weight:850;color:#a1b4bf;letter-spacing:.08em}
  .cc-order-record-identity strong{font-size:16px;font-weight:900;color:#f5f0e9;overflow-wrap:anywhere}
  .cc-order-stage{flex-shrink:0;padding:5px 9px;border-radius:999px;border:1px solid #886943;
    background:#382a1d;color:#f0c989;font-size:11px;font-weight:900;white-space:nowrap}
  .cc-order-record[data-stage=delivered] .cc-order-stage{background:#193b31;border-color:#4a7b63;color:#b2ebc4}
  .cc-order-record-items{display:grid;gap:0;margin-bottom:11px;padding:5px 0;
    border-top:1px dashed #425158;border-bottom:1px dashed #425158}
  .cc-order-record-item{display:flex;align-items:center;justify-content:space-between;gap:8px;
    padding:8px 1px;color:#d1dce1;font-size:13px}
  .cc-order-record-item+.cc-order-record-item{border-top:1px solid #2c3c45}
  .cc-order-item-caption{display:flex;align-items:center;gap:8px;min-width:0}
  .cc-order-item-no{display:grid;place-items:center;width:22px;height:22px;flex-shrink:0;
    background:#27343d;border-radius:6px;color:#9fb4c1;font-size:10px;font-weight:800}
  .cc-order-item-caption>span:last-child{overflow-wrap:anywhere}
  .cc-order-record-item b{flex-shrink:0;padding:4px 8px;border-radius:7px;background:#34291b;
    border:1px solid #675135;color:#f5d092;font-size:12px;white-space:nowrap}
  .cc-order-record-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .cc-order-record-actions button{min-height:31px;padding:6px 11px;border-radius:7px;
    border:1px solid #435a67;background:#24333c;color:#d3e0e5;font-size:12px;font-weight:800}
  .cc-order-record-actions button:hover{background:#354752;border-color:#718391}
  .cc-order-record-actions .cc-order-next{margin-left:auto;background:#e6bb70;border-color:#e6bb70;
    color:#241a0d;font-weight:900}
  .cc-order-record-actions .cc-order-next:hover{background:#ffdb99}
  .cc-order-record-actions .cc-order-danger{background:transparent;border-color:#554047;color:#c99b9d}
  .cc-order-record-actions .cc-order-danger:hover{background:#39252b;color:#ffc0bf}
  .cc-order-empty{display:grid;place-items:center;min-height:170px;padding:26px 12px;
    border:1px dashed #3a4e57;border-radius:12px;background:#121c22;
    color:#a5b8c5;text-align:center;font-size:13px;line-height:1.6}
  @media(max-width:760px){
    .cc-order-dialog{max-height:93dvh;width:min(100vw - 16px,600px)}
    .cc-order-shell{max-height:93dvh}
    .cc-order-content{display:flex;flex-direction:column;overflow-y:auto}
    .cc-order-editor,.cc-order-manager{flex:0 0 auto;overflow:visible;padding:17px}
    .cc-order-editor{border-right:0;border-bottom:1px solid #35454f}
    .cc-order-bar{padding:15px 17px}
    .cc-order-bar::before{left:17px}
    .cc-order-title h2{font-size:21px}
    .cc-order-tabs{top:-17px}
  }
  @media(max-width:390px){
    .cc-order-form-section{padding:11px}
    .cc-order-food-row{grid-template-columns:minmax(0,1fr) 54px 22px 29px;gap:4px;padding:5px}
    .cc-order-food-row input{padding:7px 8px}
    .cc-order-food-row input[type=number]{padding:7px 1px}
    .cc-order-editor,.cc-order-manager{padding:12px}
    .cc-order-record{padding:12px}
  }
  @media(prefers-reduced-motion:reduce){.cc-order-dialog button{transition:none}}

`;
styles.textContent += '\n\n/* COMPANY COOK: compact customer tickets and bounded pagination. */\n.cc-order-manager{display:flex;flex-direction:column;gap:0}\n.cc-order-list{display:grid;align-content:start;gap:7px;min-height:0;overflow-y:auto;overscroll-behavior:contain}\n.cc-order-record{padding:10px 12px 9px!important;border-radius:10px}\n.cc-order-record-top{margin:0 0 5px!important;gap:8px}\n.cc-order-record-identity{display:flex;align-items:center;gap:8px;min-width:0}\n.cc-order-record-index{font-size:9px;white-space:nowrap}\n.cc-order-record-identity strong{font-size:14px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.cc-order-stage{font-size:10px;padding:3px 7px;white-space:nowrap}\n.cc-order-record-items{display:block;margin:0 0 8px!important;padding:5px 0 7px!important}\n.cc-order-record-summary{display:block;font-size:12px;color:#dce5e8;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.cc-order-record-more{margin-top:5px;border-top:1px dashed #3d4e56;padding-top:5px}\n.cc-order-record-more>summary{cursor:pointer;width:max-content;max-width:100%;padding:3px 0;color:#e6bd79;font-size:11px;font-weight:800}\n.cc-order-record-more .cc-order-record-item{padding:5px 2px;min-height:26px}\n.cc-order-record-more .cc-order-record-item+.cc-order-record-item{border-top:1px solid #29363e}\n.cc-order-record-actions{gap:5px}\n.cc-order-record-actions button{padding:5px 9px;min-height:28px;font-size:11px}\n.cc-order-record-actions .cc-order-next{margin-left:auto}\n.cc-order-pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #2d4049}\n.cc-order-pagination[hidden]{display:none!important}\n.cc-order-pagination button{min-height:30px;padding:5px 11px;border:1px solid #53646e;border-radius:8px;background:#1b2a33;color:#e5edf0;font-size:11px;font-weight:800}\n.cc-order-pagination button:disabled{opacity:.35;cursor:default}\n.cc-order-page-label{font-size:12px;color:#dfc18d;font-variant-numeric:tabular-nums;white-space:nowrap}\n.cc-update-notice{position:fixed;z-index:80;top:78px;right:18px;display:flex;align-items:center;gap:10px;max-width:min(460px,calc(100vw - 26px));padding:9px 12px;border:1px solid #98734b;border-radius:11px;background:#1b252c;color:#f4e9d4;box-shadow:0 12px 35px #000b;font-size:12px}\n.cc-update-notice[hidden]{display:none!important}\n.cc-update-notice button{cursor:pointer;border-radius:7px;border:1px solid #bb9157;background:#dcb46c;color:#21180f;padding:6px 10px;font-size:12px;font-weight:850;white-space:nowrap}\n.cc-update-notice button:disabled{opacity:.6;cursor:wait}\n@media(max-width:760px){\n .cc-order-list{overflow:visible}\n .cc-update-notice{top:auto;bottom:12px;right:12px;left:12px;max-width:none;justify-content:space-between}\n}\n';
document.head.append(styles);
const studioStyles = document.createElement('link');
studioStyles.rel='stylesheet';
studioStyles.href='/company-cook/data-studio.css';
document.head.append(studioStyles);
const reportStyles=document.createElement('link');reportStyles.rel='stylesheet';reportStyles.href='/company-cook/report-center.css';document.head.append(reportStyles);

const CURRENT_COOK_REVISION = import.meta.env.VITE_COMPANY_COOK_VERSION || '';
let newestCookRevision = '';
let lastCookVersionCheck = 0;
let cookVersionChecking = false;
let cookUpdateNotice = null;
let cookUpdateMessage = null;
let frame = null;
let seq = 0;
let statusInFlight = false;
let pendingInstallEvent = null;
let frameResizeObserver = null;
let frameResizeCleanup = null;
let currentView = 'home';
let dataLoaded = false;
let dataLoadInFlight = false;
let dataCache = [];
let dataError = '';
let viewHost = null;
let navButtons = null;
let catalogSnapshot = null;
let adminStatus = 'unknown';
let dataSelectedKey = '';
let dataFilterText = '';
let dataKind = 'food';
let dataModifiedOnly = false;
let dataEditing = null;
let studioRefs = null;
let dataNotice = '';
let dataFetchEpoch = 0;
let pendingHomeRefresh = false;
let fishDbReady = false;
let fishDbError = '';
let fishSourceError = '';
let fishAreaFilter = 'general';
let fishResearchOnly = false;
let companyReportDialog=null;
let reportAdminTab='pending';
let settingsCategory='general';
let reportInbox=[];
let reportInboxLoading=false;
let reportInboxError='';
let reportInboxLoaded=false;
let reportPage=0;
let reportMutationBusy=false;


function resetView(){
  clearCompanyOrderDialog();
  if(companyReportDialog?.open)companyReportDialog.close();
  frameResizeObserver?.disconnect();
  frameResizeObserver = null;
  frameResizeCleanup?.();
  frameResizeCleanup = null;
  frame = null;
  dataEditing = null;studioRefs = null;
  viewHost = null;
  navButtons = null;
  currentView = 'home';
  app.replaceChildren();
}
function showStatus(title, detail, retry = false){
  resetView();
  const outer = document.createElement('main');
  outer.className = 'cc-status';
  const box = document.createElement('section');
  box.className = 'cc-box';
  const heading = document.createElement('h1'); heading.textContent = title;
  const message = document.createElement('p'); message.textContent = detail;
  box.append(heading, message);
  if(retry){
    const button = document.createElement('button');
    button.className = 'cc-button cc-button--primary';
    button.type = 'button'; button.textContent = '다시 확인';
    button.addEventListener('click', () => void checkStatus());
    box.append(button);
  }
  outer.append(box); app.append(outer);
}
function installedMode(){
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true;
}
// Installed apps use the same balanced workbench; only the install button differs.
function syncDisplayMode(){
  const compact = installedMode();
  document.documentElement.classList.toggle('cc-compact-mode',compact);
  try {
    frame?.contentDocument?.documentElement?.classList.toggle('cc-compact-mode',compact);
  } catch { /* Only same-origin COOK is mounted. */ }
  updateInstallButton();
}
for(const mode of ['standalone','window-controls-overlay']){
  window.matchMedia(`(display-mode: ${mode})`).addEventListener?.('change',syncDisplayMode);
}
function openInstallGuide(){
  const dialog = document.createElement('dialog');
  dialog.className = 'cc-dialog';
  dialog.innerHTML = `<h2>요리계산기 설치</h2>
    <p>설치 버튼이 브라우저에서 지원되지 않으면 아래 방법으로 설치할 수 있습니다.</p>
    <ol><li>Chrome: 주소창의 설치 아이콘 또는 메뉴에서 <b>앱 설치</b></li>
    <li>Edge: 메뉴 → <b>앱</b> → <b>이 사이트를 앱으로 설치</b></li>
    <li>설치 뒤에는 바탕화면 또는 시작 메뉴의 요리계산기 아이콘으로 실행</li></ol>
    <button class="cc-button cc-button--primary" type="button">확인</button>`;
  dialog.querySelector('button').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => dialog.remove(),{once:true});
  document.body.append(dialog);
  dialog.showModal();
}
function updateInstallButton(){
  const button = document.getElementById('cc-install');
  if(button) button.hidden = installedMode();
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstallEvent = event;
  updateInstallButton();
});
window.addEventListener('appinstalled', () => {
  pendingInstallEvent = null;
  updateInstallButton();
});
async function handleInstall(){
  if(installedMode()) return;
  if(!pendingInstallEvent){openInstallGuide();return;}
  const event = pendingInstallEvent;
  pendingInstallEvent = null;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {openInstallGuide();}
  updateInstallButton();
}

// The build writes this release marker from the same revision injected into Vite.
// A changed marker means updated production files are available; never force reload.
async function checkCompanyCookVersion(){
  if(!CURRENT_COOK_REVISION || cookVersionChecking || document.visibilityState==='hidden')return;
  const now=Date.now();
  if(now-lastCookVersionCheck<60000)return;
  lastCookVersionCheck=now;cookVersionChecking=true;
  try{
    const response=await fetch('/company-cook/version.json?t='+now,{cache:'no-store',credentials:'same-origin'});
    if(!response.ok)return;
    const data=await response.json();
    const version=data?.revision;
    if(typeof version!=='string'||!/^[a-f0-9]{12,64}$/.test(version))return;
    if(version!==CURRENT_COOK_REVISION){
      newestCookRevision=version;
      if(cookUpdateNotice){cookUpdateMessage.textContent='새 버전이 준비됐습니다.';cookUpdateNotice.hidden=false;}
    }else{
      newestCookRevision='';
      if(cookUpdateNotice)cookUpdateNotice.hidden=true;
    }
  }catch{/* Offline or unavailable version marker: keep the calculator usable. */}
  finally{cookVersionChecking=false;}
}
async function applyCompanyCookUpdate(button){
  if(!newestCookRevision)return;
  // Never destroy unsaved customer orders or active recipe edits.
  if(companyOrderDialog?.open){cookUpdateMessage.textContent='주문 입력을 저장하거나 창을 닫은 뒤 업데이트해 주세요.';return;}
  if(companyReportDialog?.open){cookUpdateMessage.textContent='제보 작성을 마친 뒤 업데이트해 주세요.';return;}
  if(dataEditing){
    if(dataEditing.saving){cookUpdateMessage.textContent='레시피 저장이 끝나면 업데이트해 주세요.';return;}
    if(!studioConfirmExit())return;
  }
  button.disabled=true;
  cookUpdateMessage.textContent='업데이트를 적용합니다…';
  try{
    const reg=await navigator.serviceWorker?.getRegistration?.('/company-cook');
    if(reg)await reg.update();
  }catch{/* Older browser or unavailable service worker. */}
  // URL stays inside the standalone PWA scope; cache buster avoids a stale HTML shell.
  const target=new URL('/company-cook',window.location.origin);
  target.searchParams.set('app-revision',newestCookRevision);
  window.location.replace(target.href);
}

function createAppShell(){
  const layout = document.createElement('main');layout.className = 'cc-layout';
  const header = document.createElement('header');header.className = 'cc-header';
  const identity = document.createElement('div');identity.className='cc-header-title';
  const logo=document.createElement('span');logo.className='cc-header-icon';
  logo.innerHTML='<svg viewBox="0 0 48 48" width="26" height="26" fill="none" aria-hidden="true"><path d="M14 30.5c-4.2-1.5-6.4-5.8-4.7-9.8a8 8 0 0 1 7.8-4.9c.7-5.9 5.1-9.6 11-8.7a10 10 0 0 1 8.2 9.6c5.4 1.1 8 7.1 4.2 11.3-1 2.2-2.7 3.8-5.1 4.5" stroke="#F7D18A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 28v10.5c4.8 2.8 15.3 2.8 20 0V28M19 35v-6m10 6v-6" stroke="#F7D18A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="38" cy="8" r="2.3" fill="#FFE4AC"/></svg>';
  logo.setAttribute('aria-hidden','true');
  const titleBox=document.createElement('span');titleBox.className='cc-title-lockup';
  const title=document.createElement('b');title.textContent='요리계산기';
  const maker=document.createElement('small');maker.textContent='crafted by 영포티';
  titleBox.append(title,maker);identity.append(logo,titleBox);
  const nav=document.createElement('nav');nav.className='cc-nav';nav.setAttribute('aria-label','요리계산기 메뉴');
  navButtons=new Map();
  const addNav=(key,text,handler)=>{
    const button=document.createElement('button');button.type='button';button.className='cc-nav-button';
    button.textContent=text;button.addEventListener('click',handler);nav.append(button);navButtons.set(key,button);
  };
  addNav('home','⌂  홈',()=>switchAppView('home'));
  addNav('data','▦  데이터',()=>switchAppView('data'));
  addNav('settings','⚙  설정',()=>switchAppView('settings'));
  const actions=document.createElement('div');actions.className='cc-actions';
  const install=document.createElement('button');install.id='cc-install';install.type='button';
  install.className='cc-button cc-button--primary';install.textContent='앱 설치';
  install.addEventListener('click',()=>void handleInstall());
  const refresh=document.createElement('button');refresh.type='button';refresh.className='cc-button';
  refresh.textContent='새로고침';refresh.addEventListener('click',()=>window.location.reload());
  const reportButton=makeText('button','cc-button cc-report-open','✎  요리 제보');
  reportButton.type='button';reportButton.addEventListener('click',openCompanyReportDialog);
  actions.append(reportButton,install,refresh);header.append(identity,nav,actions);
  const updateNotice=document.createElement('aside');updateNotice.id='cc-update-notice';updateNotice.className='cc-update-notice';
  updateNotice.hidden=true;updateNotice.setAttribute('role','status');updateNotice.setAttribute('aria-live','polite');
  const updateText=document.createElement('span');updateText.textContent='새 버전이 준비됐습니다.';
  const updateAction=document.createElement('button');updateAction.type='button';updateAction.textContent='지금 업데이트';
  updateAction.addEventListener('click',()=>void applyCompanyCookUpdate(updateAction));
  updateNotice.append(updateText,updateAction);cookUpdateNotice=updateNotice;cookUpdateMessage=updateText;
  const panel=document.createElement('section');panel.className='cc-panel';
  panel.setAttribute('aria-label','요리계산기');
  const hero=document.createElement('div');hero.className='cc-hero';
  hero.setAttribute('aria-label','요리계산기 · LAC COOK');
  const text=document.createElement('div');text.className='cc-hero-text';
  const mark=document.createElement('span');mark.className='cc-hero-mark';mark.innerHTML='<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 13a4 4 0 0 1-1-7.87 5 5 0 0 1 9.5-1.1A4 4 0 0 1 19 11v9H5v-7"/><path d="M8 20v-4m8 4v-4"/></svg>';mark.setAttribute('aria-hidden','true');
  const main=document.createElement('strong');main.textContent='요리계산기';
  const sub=document.createElement('em');sub.textContent='LAC COOK';
  const detail=document.createElement('small');detail.textContent='요리 계산부터 재료 준비까지, 더 빠르고 편하게';
  text.append(mark,main,sub,detail);hero.append(text);
  viewHost=document.createElement('section');viewHost.className='cc-view';viewHost.hidden=true;
  viewHost.setAttribute('aria-live','polite');
  panel.append(hero,viewHost);layout.append(header,panel,updateNotice);app.replaceChildren(layout);
  void checkCompanyCookVersion();
  switchAppView('home');updateInstallButton();return panel;
}
function switchAppView(view){
  if(!['home','data','settings'].includes(view) || !viewHost)return;
  if(view===currentView && dataEditing)return;
  if(currentView==='data'&&view!=='data'&&!studioConfirmExit())return;
  currentView=view;
  for(const [name,button] of navButtons||[]){
    if(name===view)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  const hero=app.querySelector('.cc-hero');
  if(hero) hero.hidden=view!=='home';
  viewHost.hidden=view==='home';
  if(frame){frame.hidden=view!=='home';
    if(view==='home')requestAnimationFrame(()=>frame?.contentWindow?.dispatchEvent(new Event('resize')));
  }
  if(view==='home'){
    if(pendingHomeRefresh && frame){
      pendingHomeRefresh=false;
      frame.style.visibility='hidden';
      // Local recipe workspace is autosaved by the existing calculator.
      frame.src='/cook-preview/index.html?lacCookHostPreview=1';
    }
    return;
  }
  if(view==='settings'){
    paintAppSettings();
    if(adminStatus==='unknown')void checkEditorAdmin().then(()=>{if(currentView==='settings'){paintAppSettings();if(settingsCategory==='management'&&adminStatus==='admin'&&!reportInboxLoaded)void loadCompanyReports();}});
  }
  if(view==='data'){
    paintAppData();
    if(!dataLoaded && !dataLoadInFlight)void loadAppData();
    if(adminStatus==='unknown')void checkEditorAdmin().then(()=>{if(currentView==='data')paintAppData();});
  }
}
function makeText(tag,className,text){
  const item=document.createElement(tag);if(className)item.className=className;
  if(text!=null)item.textContent=text;return item;
}
// SETTINGS -> MANAGEMENT · report review is admin-only. Nothing automatically edits a recipe.
function paintAppSettings(){
  if(!viewHost)return;
  viewHost.replaceChildren();
  const root=makeText('section','cc-report-settings');
  root.append(makeText('h2','','설정'));
  const tabs=makeText('nav','cc-report-settings-tabs');tabs.setAttribute('aria-label','설정 카테고리');
  for(const [category,label] of [['general','일반'],['management','관리']]){
    const tab=makeText('button','cc-report-settings-tab',label);tab.type='button';
    tab.setAttribute('aria-current',settingsCategory===category?'page':'false');
    tab.addEventListener('click',()=>{settingsCategory=category;paintAppSettings();
      if(category==='management'&&adminStatus==='admin'&&!reportInboxLoaded)void loadCompanyReports();});
    tabs.append(tab);
  }
  root.append(tabs);
  if(settingsCategory==='general'){
    const box=makeText('section','cc-report-settings-card');
    box.append(makeText('h3','','일반 설정'),makeText('p','','계산기 설정 항목은 추후 필요할 때 추가합니다. 현재 저장 방식은 그대로 유지합니다.'));
    const legacy=frame?.contentDocument?.getElementById('legacy-restore');
    const restore=frame?.contentDocument?.getElementById('load-workspace-legacy');
    if(legacy&&!legacy.hidden&&restore){
      const button=makeText('button','cc-button','이전 수동 저장본 불러오기');button.type='button';
      button.addEventListener('click',()=>{switchAppView('home');restore.click();});box.append(button);
    }
    root.append(box);
  }else if(adminStatus!=='admin'){
    const card=makeText('section','cc-report-settings-card');
    card.append(makeText('h3','','관리자 권한 확인'),makeText('p','','제보 내용은 플랫폼 관리자만 열람할 수 있습니다. HUB에 로그인한 다음 권한 확인을 눌러주세요.'));
    const btn=makeText('button','cc-report-action','관리자 권한 확인');btn.type='button';
    btn.addEventListener('click',async()=>{btn.disabled=true;await checkEditorAdmin();
      if(currentView==='settings'){paintAppSettings();if(adminStatus==='admin')void loadCompanyReports();}});
    const link=makeText('a','cc-report-admin-link','HUB 로그인 ↗');link.href='/';link.target='_blank';link.rel='noopener noreferrer';
    card.append(btn,link);root.append(card);
  }else{
    const box=makeText('section','cc-report-settings-card cc-report-inbox');
    const heading=makeText('div','cc-report-inbox-heading');
    heading.append(makeText('h3','','요리 제보 관리'));
    const reload=makeText('button','cc-report-action cc-report-quiet','새로고침');reload.type='button';
    reload.addEventListener('click',()=>{reportInboxLoaded=false;void loadCompanyReports();});
    heading.append(reload);box.append(heading);
    const statuses=makeText('div','cc-report-review-tabs');
    for(const [key,label] of [['pending','검토 대기'],['applied','반영 완료'],['dismissed','보류']]){
      const count=reportInbox.filter(x=>x.status===key).length;
      const button=makeText('button','cc-report-review-tab',`${label} ${count}`);button.type='button';
      button.setAttribute('aria-selected',String(reportAdminTab===key));
      button.addEventListener('click',()=>{reportAdminTab=key;reportPage=0;paintAppSettings();});
      statuses.append(button);
    }
    box.append(statuses);
    const list=makeText('div','cc-report-review-list');
    if(reportInboxLoading)list.append(makeText('p','cc-report-help','제보를 불러오는 중입니다…'));
    else if(reportInboxError)list.append(makeText('p','cc-report-error',reportInboxError));
    else{
      const all=reportInbox.filter(x=>x.status===reportAdminTab);const pageSize=8;
      const pages=Math.max(1,Math.ceil(all.length/pageSize));reportPage=Math.min(reportPage,pages-1);
      if(!all.length)list.append(makeText('p','cc-report-empty','표시할 제보가 없습니다.'));
      for(const entry of all.slice(reportPage*pageSize,(reportPage+1)*pageSize)){
        const item=makeText('article','cc-report-review-card');
        const top=makeText('div','cc-report-review-head');
        const label={food_add:'새 요리',food_edit:'레시피 수정',process:'가공 재료',other:'기타 제보'}[entry.kind]||'요리 제보';
        top.append(makeText('span','cc-report-tag',label),makeText('strong','',entry.food_name));item.append(top);
        item.append(makeText('p','cc-report-review-content',entry.detail));
        const meta=makeText('div','cc-report-review-meta');
        const dt=new Date(entry.created_at);meta.textContent=`${entry.reporter_name||'익명'} · ${Number.isNaN(dt.getTime())?'':dt.toLocaleString('ko-KR')}`;
        item.append(meta);
        if(entry.admin_note)item.append(makeText('p','cc-report-review-note',`관리 메모 · ${entry.admin_note}`));
        const actions=makeText('div','cc-report-review-actions');
        const edit=makeText('button','cc-report-action cc-report-quiet','데이터에서 확인');edit.type='button';
        edit.addEventListener('click',()=>{
          dataKind=entry.kind==='process'?'process':'food';dataSelectedKey='';dataFilterText=entry.food_name;
          dataModifiedOnly=false;settingsCategory='general';switchAppView('data');
        });actions.append(edit);
        for(const [status,text] of [['applied','반영 완료'],['dismissed','보류'],['pending','대기로 되돌리기']]){
          if(entry.status===status)continue;
          const button=makeText('button','cc-report-action'+(status==='applied'?' cc-report-accent':''),text);button.type='button';
          button.disabled=reportMutationBusy;
          button.addEventListener('click',()=>void updateCompanyReport(entry,status));actions.append(button);
        }
        item.append(actions);list.append(item);
      }
      if(pages>1){
        const controls=makeText('div','cc-report-review-pager');
        const previous=makeText('button','cc-report-action cc-report-quiet','이전');previous.type='button';previous.disabled=reportPage===0;
        previous.addEventListener('click',()=>{reportPage--;paintAppSettings();});
        const next=makeText('button','cc-report-action cc-report-quiet','다음');next.type='button';next.disabled=reportPage===pages-1;
        next.addEventListener('click',()=>{reportPage++;paintAppSettings();});
        controls.append(previous,makeText('span','',`${reportPage+1} / ${pages}`),next);list.append(controls);
      }
    }
    box.append(list);root.append(box);
  }
  viewHost.append(root);
}
async function loadCompanyReports(){
  if(reportInboxLoading||currentView!=='settings'||settingsCategory!=='management')return;
  reportInboxLoading=true;reportInboxError='';paintAppSettings();
  try{
    if(!await checkEditorAdmin())throw Error('관리자 권한을 확인할 수 없습니다.');
    const {data,error}=await supabase.from('company_cook_reports')
      .select('id,created_at,kind,food_name,detail,reporter_name,status,admin_note,reviewed_at')
      .order('created_at',{ascending:false}).limit(150);
    if(error)throw error;
    reportInbox=Array.isArray(data)?data:[];reportInboxLoaded=true;
  }catch(error){reportInboxError='제보를 불러오지 못했습니다. 운영 SQL 적용 및 관리자 권한을 확인해 주세요. '+String(error?.message||'');}
  finally{reportInboxLoading=false;if(currentView==='settings'&&settingsCategory==='management')paintAppSettings();}
}
async function updateCompanyReport(entry,newStatus){
  if(reportMutationBusy||!['pending','applied','dismissed'].includes(newStatus))return;
  if(newStatus==='applied'&&!window.confirm('레시피를 실제로 등록·수정한 후 반영 완료로 표시했나요? 제보 승인만으로 레시피가 수정되지는 않습니다.'))return;
  reportMutationBusy=true;
  try{
    if(!await checkEditorAdmin())throw Error('관리자 권한을 확인할 수 없습니다.');
    const running=await supabase.rpc('my_apps_company_cook_status');
    if(running.error||running.data!==true)throw Error('요리계산기가 중지되어 있습니다.');
    const {data,error}=await supabase.from('company_cook_reports')
      .update({status:newStatus,reviewed_at:newStatus==='pending'?null:new Date().toISOString()})
      .eq('id',entry.id).eq('status',entry.status).select('id').maybeSingle();
    if(error)throw error;
    if(!data)throw Error('다른 관리자가 먼저 처리했습니다. 새로고침 후 다시 시도하세요.');
    reportInbox=reportInbox.map(row=>row.id===entry.id?{...row,status:newStatus}:row);
    reportAdminTab=newStatus;reportPage=0;
  }catch(error){window.alert('상태 변경 실패: '+String(error?.message||'다시 시도해 주세요.'));}
  finally{reportMutationBusy=false;if(currentView==='settings')paintAppSettings();}
}
function openCompanyReportDialog(){
  if(!companyReportDialog){
    const dialog=makeText('dialog','cc-report-dialog');dialog.setAttribute('aria-label','요리 제보');
    const body=makeText('div','cc-report-dialog-body');
    const head=makeText('div','cc-report-dialog-head');
    const words=makeText('div','');words.append(makeText('span','cc-report-eyebrow','RECIPE REQUEST'),makeText('h2','','요리 제보'));
    const close=makeText('button','cc-report-close','×');close.type='button';close.setAttribute('aria-label','닫기');
    close.addEventListener('click',()=>dialog.close());head.append(words,close);
    const form=makeText('form','cc-report-form');form.noValidate=true;
    const kindWrap=makeText('label','cc-report-field');kindWrap.append(makeText('span','','제보 종류'));
    const kind=makeText('select','');kind.name='report_kind';
    for(const [value,label] of [['food_add','새 요리 레시피'],['food_edit','기존 레시피 수정'],['process','가공 재료'],['other','기타 정보']]){
      const option=makeText('option','',label);option.value=value;kind.append(option);
    }kindWrap.append(kind);
    const field=(name,label,placeholder,max,tag='input')=>{
      const wrap=makeText('label','cc-report-field');wrap.append(makeText('span','',label));
      const input=makeText(tag,'');input.name=name;input.maxLength=max;input.placeholder=placeholder;
      if(tag==='textarea')input.rows=5;
      wrap.append(input);return {wrap,input};
    };
    const food=field('food','요리·재료 이름','예: 계란 샐러드',90);
    const detail=field('detail','제보 내용','재료와 수량, 제작시간 또는 수정 근거를 구체적으로 적어주세요.',2000,'textarea');
    const reporter=field('reporter','제보자 닉네임 · 선택','미입력 시 익명',40);
    const trap=field('website','', '',100);trap.wrap.classList.add('cc-report-trap');trap.input.autocomplete='off';
    const message=makeText('p','cc-report-form-message','');message.setAttribute('role','status');
    const foot=makeText('div','cc-report-dialog-actions');
    const cancel=makeText('button','cc-report-action cc-report-quiet','취소');cancel.type='button';cancel.addEventListener('click',()=>dialog.close());
    const submit=makeText('button','cc-report-action cc-report-accent','제보 보내기');submit.type='submit';
    foot.append(cancel,submit);form.append(kindWrap,food.wrap,detail.wrap,reporter.wrap,trap.wrap,message,foot);
    let saving=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving)return;
      const name=food.input.value.trim(),content=detail.input.value.trim(),nickname=reporter.input.value.trim();
      if(name.length<1||name.length>90||content.length<10||content.length>2000||nickname.length>40){
        message.textContent='요리 이름과 제보 내용(10~2000자)을 확인해 주세요.';return;
      }
      saving=true;submit.disabled=true;cancel.disabled=true;message.textContent='제보를 접수하고 있습니다…';
      try{
        const running=await supabase.rpc('my_apps_company_cook_status');
        if(running.error||running.data!==true)throw Error('현재 요리계산기 이용이 중지되어 있습니다.');
        const {data,error}=await supabase.rpc('company_cook_submit_report',{
          p_kind:kind.value,p_food_name:name,p_detail:content,p_reporter_name:nickname,p_website:trap.input.value,
        });
        if(error)throw error;
        if(data!==true)throw Error('접수할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        message.textContent='제보가 접수됐습니다. 관리자가 반영 여부를 검토합니다.';
        form.reset();
        submit.textContent='접수 완료';
      }catch(error){message.textContent='제보 접수 실패: '+String(error?.message||'서버 연결을 확인해 주세요.');}
      finally{saving=false;submit.disabled=false;cancel.disabled=false;}
    });
    dialog.addEventListener('close',()=>{if(!saving){message.textContent='';submit.textContent='제보 보내기';}});
    dialog.append(body);body.append(head,form);document.body.append(dialog);companyReportDialog=dialog;
  }
  if(!companyReportDialog.open)companyReportDialog.showModal();
}
// Same public catalog snapshot + DB overlays that the HUB calculator uses.
// All edits are in this parent context. The anonymous iframe never receives credentials.
const dataKey=item=>`${item.kind}:${item.id}`;
const normName=value=>String(value||'').trim().toLocaleLowerCase('ko');
const validPosInt=(value,max)=>String(value).trim()!==''&&Number.isSafeInteger(Number(value))&&Number(value)>0&&Number(value)<=max;
function baselineProcessRows(name){
  return (catalogSnapshot?.processes||[]).filter(row=>row.is_active==='TRUE'&&row.process_material_name===name);
}
function ingredientNames(){
  const rows=catalogSnapshot||{};
  return [...new Set([
    ...(rows.materials||[]).map(row=>row.material_name),
    ...(rows.farms||[]).map(row=>row.material_name),
    ...(rows.fish||[]).map(row=>row.result_material_name),
    ...(rows.processes||[]).flatMap(row=>[row.input_material_name,row.process_material_name]),
    ...(rows.recipes||[]).map(row=>row.material_name),
  ].filter(Boolean))];
}
function normalizeData(catalog,recipeRows,processRows){
  const foods=new Map();
  for(const row of catalog.foods||[]){
    if(row.is_active!=='TRUE')continue;
    const ingredients=(catalog.recipes||[]).filter(part=>part.is_active==='TRUE'&&part.food_name===row.food_name)
      .map(part=>({name:part.material_name,qty:Number(part.required_qty)})).filter(p=>p.name&&validPosInt(p.qty,999999));
    foods.set(row.food_id,{id:row.food_id,kind:'food',name:row.food_name,time:row.cook_time,qty:row.set_qty,
      ingredients,version:null,sourceKind:'baseline'});
  }
  for(const row of recipeRows){
    const previous=foods.get(row.food_id);
    foods.set(row.food_id,{...previous,id:row.food_id,kind:'food',name:row.food_name,time:row.cook_time,
      qty:row.set_qty,ingredients:row.ingredients||[],version:row.version,sourceKind:row.source_kind});
  }
  const processes=new Map();
  for(const row of catalog.processes||[]){
    if(row.is_active!=='TRUE'||!row.process_material_name)continue;
    const name=row.process_material_name;
    const record=processes.get(name)||{id:name,kind:'process',name,time:row.process_time,qty:row.result_qty,
      ingredients:[],version:null,sourceKind:'baseline'};
    if(row.input_material_name&&validPosInt(row.required_qty,999999))
      record.ingredients.push({name:row.input_material_name,qty:Number(row.required_qty)});
    processes.set(name,record);
  }
  for(const row of processRows){
    const previous=processes.get(row.process_material_name);
    processes.set(row.process_material_name,{...previous,id:row.process_material_name,kind:'process',name:row.process_material_name,
      time:row.process_time||previous?.time||'',qty:row.result_qty,
      ingredients:row.ingredients===null?(previous?.ingredients||[]):row.ingredients||[],
      dbIngredients:row.ingredients,version:row.version,sourceKind:row.source_kind});
  }
  return [...foods.values(),...processes.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
// Fish processing is its own data family, NOT a cooking or general processing recipe.
// The coastal baseline comes from the existing COOK catalog; freshwater successes and
// failed experiments are maintained as separate research records.
function normalizeFishData(coastalRows,freshwaterRows,storedRows){
  const fish=new Map();
  const key=(area,name)=>`${area}:${name}`;
  for(const row of coastalRows||[]){
    if(row.is_active!=='TRUE'||!row.fish_name)continue;
    const name=String(row.fish_name);
    fish.set(key('general',name),{
      id:key('general',name),kind:'fish',name,area:'general',status:'confirmed',
      inputQty:Number(row.input_qty),outputQty:Number(row.result_qty),
      outputMaterial:String(row.result_material_name||''),time:String(row.process_time||'10초'),
      failedAttempts:[],note:'',version:null,sourceKind:'baseline'
    });
  }
  for(const row of freshwaterRows||[]){
    if(!row||typeof row.fish_name!=='string')continue;
    const name=row.fish_name.trim();if(!name)continue;
    fish.set(key('freshwater',name),{
      id:key('freshwater',name),kind:'fish',name,area:'freshwater',
      status:row.status==='confirmed'?'confirmed':'research',
      inputQty:row.input_qty==null?null:Number(row.input_qty),
      outputQty:row.output_qty==null?null:Number(row.output_qty),
      outputMaterial:row.output_material||'',time:row.process_time||'10초',
      failedAttempts:Array.isArray(row.failed_attempts)?row.failed_attempts:[],
      note:String(row.note||''),version:null,sourceKind:'baseline'
    });
  }
  for(const row of storedRows||[]){
    if(!row||!['general','freshwater'].includes(row.area)||typeof row.fish_name!=='string')continue;
    const name=row.fish_name;
    fish.set(key(row.area,name),{
      id:key(row.area,name),kind:'fish',name,area:row.area,
      status:row.status==='confirmed'?'confirmed':'research',
      inputQty:row.input_qty==null?null:Number(row.input_qty),
      outputQty:row.output_qty==null?null:Number(row.output_qty),
      outputMaterial:row.output_material||'',time:row.process_time||'10초',
      failedAttempts:Array.isArray(row.failed_attempts)?row.failed_attempts:[],
      note:String(row.note||''),version:row.version,sourceKind:'override'
    });
  }
  return [...fish.values()].sort((a,b)=>a.area===b.area?a.name.localeCompare(b.name,'ko'):(a.area==='general'?-1:1));
}
async function checkEditorAdmin(){
  adminStatus='checking';
  try{
    const {data:user,error:userError}=await supabase.auth.getUser();
    if(userError||!user?.user){adminStatus='guest';return false;}
    const {data,error}=await supabase.rpc('platform_is_admin');
    adminStatus=(!error&&data===true)?'admin':'denied';
  }catch{adminStatus='denied';}
  return adminStatus==='admin';
}
async function refreshAdminButton(button){
  if(button)button.disabled=true;
  await checkEditorAdmin();
  if(currentView==='data')paintAppData();
}
async function loadAppData(){
  if(dataLoadInFlight)return;
  const epoch=++dataFetchEpoch;
  dataLoadInFlight=true;dataError='';
  try{
    const catalogUrl = new URL('/cook-preview/data/catalog.js',window.location.origin).href;
    const {default:catalog} = await import(/* @vite-ignore */ catalogUrl);
    const [recipes,processes,fishSource,fishRows]=await Promise.all([
      supabase.from('lac_cook_recipe_entries').select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').order('food_name'),
      supabase.from('lac_cook_process_entries').select('process_material_name,result_qty,process_time,ingredients,source_kind,version').order('process_material_name'),
      fetch('/company-cook/freshwater-fishing.json',{cache:'no-store'}).then(r=>{
        if(!r.ok)throw Error('민물 연구 자료를 불러올 수 없습니다.');return r.json();
      }).catch(error=>({error:String(error?.message||error),entries:[]})),
      supabase.from('lac_cook_fish_entries').select('area,fish_name,status,input_qty,output_material,output_qty,process_time,failed_attempts,note,version').order('fish_name'),
    ]);
    if(recipes.error||processes.error)throw Error('공통 DB 조회 실패');
    if(epoch!==dataFetchEpoch)return;
    fishDbReady=!fishRows.error;
    fishDbError=fishRows.error?'생선 전용 DB 연결 전입니다. 확정된 기존 자료는 조회할 수 있지만, 앱에서 수정하려면 생선 SQL을 먼저 적용해야 합니다.':'';
    fishSourceError=fishSource?.error||'';
    catalogSnapshot=catalog;
    dataCache=[...normalizeData(catalog,recipes.data||[],processes.data||[]),
      ...normalizeFishData(catalog.fish||[],fishSource.entries||[],fishDbReady?(fishRows.data||[]):[])];
    dataLoaded=true;
  }catch(error){
    if(epoch!==dataFetchEpoch)return;
    dataError='데이터를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.';
    console.warn('COOK 데이터 로딩:',error?.message||error);
  }finally{
    if(epoch===dataFetchEpoch){dataLoadInFlight=false;if(currentView==='data')paintAppData();}
  }
}
/* Company-only recipe library. The HUB calculator and its editor remain untouched. */
function studioPartName(kind){return kind==='food'?'요리 레시피':kind==='process'?'가공 재료':'생선 가공';}
function studioTime(item){return item.kind==='food'?`${item.time??'미확인'}초`:(item.time||'미확인');}
function studioStatus(item){return item.kind==='fish'?(item.status==='confirmed'?'확인됨':'연구 중'):(item.sourceKind==='new'?'신규 등록':item.version!=null?'수정됨':'기본 데이터');}
function studioElement(tag,className='',value=null){return makeText(tag,className,value);}
function studioButton(label,className='cc-studio-btn',fn){
  const button=studioElement('button',className,label);button.type='button';
  if(fn)button.addEventListener('click',fn);
  return button;
}
function studioConfirmExit(){
  if(!dataEditing)return true;
  if(dataEditing.saving)return false;
  if(dataEditing.dirty&&!window.confirm('저장하지 않은 레시피 변경 내용이 있습니다. 버리고 이동할까요?'))return false;
  dataEditing=null;return true;
}
function studioCancelEdit(){
  const returnKey=dataEditing?.returnKey||'';
  if(!studioConfirmExit())return;
  if(returnKey)dataSelectedKey=returnKey;
  studioRefs?.renderList?.();
}
function studioChoose(kind,item){
  if(!studioConfirmExit())return;
  dataKind=kind;
  dataSelectedKey=item?dataKey(item):'';
  studioRefs?.renderList?.();
  if(item&&window.matchMedia('(max-width: 760px)').matches){
    requestAnimationFrame(()=>viewHost?.querySelector('.cc-studio-content')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
}
function studioBeginEdit(kind,item=null){
  if(adminStatus!=='admin'||!dataLoaded)return;
  if(!studioConfirmExit())return;
  const returnKey=dataSelectedKey;
  if(kind==='fish'&&!fishDbReady)return;
  dataKind=kind;dataSelectedKey=item?dataKey(item):'';
  dataEditing={kind,item,returnKey,dirty:false,saving:false};
  studioRefs?.renderList?.();
}
function paintAppData(){
  if(!viewHost||currentView!=='data')return;
  studioRefs=null;viewHost.replaceChildren();
  viewHost.classList.add('cc-studio-host');
  const root=studioElement('div',`cc-studio ${dataKind==='fish'?'cc-studio--fish':''}`);
  const heading=studioElement('div','cc-studio-heading');
  const identity=studioElement('div','cc-studio-identity');
  identity.append(studioElement('span','cc-studio-eyebrow','LAC COOK  /  LIBRARY'),
    studioElement('h2','','데이터 라이브러리'),
    studioElement('p','',dataKind==='fish'?'일반 낚시터와 민물낚시터의 생선 가공 기록을 확인합니다.':'요리와 가공 자료를 검색하고 관리합니다.'));
  const headActions=studioElement('div','cc-studio-head-actions');
  const roleText=adminStatus==='admin'?'관리자 · 편집 가능':adminStatus==='checking'?'권한 확인 중':adminStatus==='guest'?'일반 이용 · 읽기 전용':adminStatus==='denied'?'일반 이용 · 읽기 전용':'읽기 전용';
  headActions.append(studioElement('span',`cc-studio-role ${adminStatus==='admin'?'is-admin':''}`,roleText));
  const authBtn=studioButton('권한 확인','cc-studio-btn cc-studio-btn-quiet',()=>{
    if(!studioConfirmExit())return;
    authBtn.disabled=true;
    void checkEditorAdmin().then(()=>{if(currentView==='data')paintAppData();});
  });
  headActions.append(authBtn);
  heading.append(identity,headActions);root.append(heading);

  const toolbar=studioElement('div','cc-studio-toolbar');
  const tabs=studioElement('div','cc-studio-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','데이터 종류');
  const categoryButtons=new Map();
  const foodTotal=dataCache.filter(item=>item.kind==='food').length;
  const processTotal=dataCache.filter(item=>item.kind==='process').length;
  const fishTotal=dataCache.filter(item=>item.kind==='fish').length;
  for(const [kind,label,count] of [['food','요리 레시피',foodTotal],['process','가공 재료',processTotal],['fish','생선 가공',fishTotal]]){
    const button=studioButton('',`cc-studio-tab ${kind===dataKind?'is-active':''}`,()=>{
      if(kind===dataKind)return;
      if(!studioConfirmExit())return;
      dataKind=kind;dataSelectedKey='';dataFilterText='';dataModifiedOnly=false;fishResearchOnly=false;paintAppData();
    });
    button.setAttribute('role','tab');button.setAttribute('aria-selected',String(kind===dataKind));
    const icon=studioElement('span','cc-studio-tab-icon',kind==='food'?'♨':kind==='process'?'⚙':'♧');icon.setAttribute('aria-hidden','true');
    const name=studioElement('span','',label);const countEl=studioElement('span','cc-studio-tab-count',String(count));
    button.append(icon,name,countEl);tabs.append(button);categoryButtons.set(kind,button);
  }
  const right=studioElement('div','cc-studio-toolbar-right');
  const refresh=studioButton('↻  데이터 새로고침','cc-studio-btn cc-studio-btn-quiet',()=>{
    if(!studioConfirmExit())return;
    if(dataLoadInFlight)return;
    refresh.disabled=true;void loadAppData();
  });
  right.append(refresh);
  if(adminStatus==='admin'&&(dataKind!=='fish'||fishDbReady)){
    right.append(studioButton(dataKind==='food'?'+  새 요리 등록':dataKind==='process'?'+  새 가공 재료':'+  생선 기록 등록',
      'cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit(dataKind)));
  }
  toolbar.append(tabs,right);root.append(toolbar);
  if(dataNotice){const notice=studioElement('div','cc-studio-success',dataNotice);root.append(notice);dataNotice='';}
  if(dataKind==='fish'){
    // Fishing areas are direct category buttons, not a secondary dropdown.
    const areaTabs=studioElement('nav','cc-fish-area-tabs');
    areaTabs.setAttribute('aria-label','낚시터 분류');
    for(const [area,label] of [['general','일반 낚시터'],['freshwater','민물 낚시터'],['research','연구 중']]){
      const selected=fishAreaFilter===area;
      const tab=studioButton(label,`cc-fish-area-tab ${selected?'is-active':''}`,()=>{
        if(area===fishAreaFilter)return;
        if(!studioConfirmExit())return;
        fishAreaFilter=area;
        dataSelectedKey='';dataFilterText='';fishResearchOnly=false;
        paintAppData();
      });
      tab.setAttribute('aria-current',selected?'page':'false');
      areaTabs.append(tab);
    }
    root.append(areaTabs);
    if(fishDbError||fishSourceError)root.append(studioElement('p','cc-studio-fish-warning',[fishDbError,fishSourceError].filter(Boolean).join(' ')));
  }
  if(adminStatus!=='admin'){
    const tip=studioElement('div','cc-studio-tip');
    tip.append(studioElement('span','',dataKind==='fish'?'생선 자료는 누구나 볼 수 있으며, 등록·수정은 플랫폼 관리자만 가능합니다.':'레시피는 자유롭게 조회할 수 있습니다. 추가·수정은 플랫폼 관리자만 가능합니다.'));
    const login=studioElement('a','cc-studio-tip-link','HUB 관리자 로그인 ↗');login.href='/';login.target='_blank';login.rel='noopener noreferrer';tip.append(login);
    root.append(tip);
  }
  if(dataError){
    const error=studioElement('div','cc-studio-feedback');error.append(studioElement('strong','','데이터 연결 실패'),
      studioElement('p','',dataError),studioButton('다시 불러오기','cc-studio-btn cc-studio-btn-accent',()=>void loadAppData()));
    root.append(error);viewHost.append(root);return;
  }
  if(!dataLoaded){
    const loading=studioElement('div','cc-studio-feedback');loading.append(studioElement('strong','','레시피를 불러오는 중입니다'),studioElement('p','','공통 요리·가공 데이터를 확인하고 있습니다.'));
    root.append(loading);viewHost.append(root);return;
  }

  const workspace=studioElement('div','cc-studio-workspace');
  const browser=studioElement('aside','cc-studio-browser');browser.setAttribute('aria-label','레시피 목록');
  const browserTop=studioElement('div','cc-studio-browser-top');
  const searchLabel=studioElement('label','cc-studio-search-label');
  const searchSymbol=studioElement('span','','⌕');searchSymbol.setAttribute('aria-hidden','true');
  const search=studioElement('input','cc-studio-search');search.type='search';search.value=dataFilterText;
  search.placeholder=dataKind==='food'?'요리 이름으로 검색':dataKind==='process'?'가공 재료 이름으로 검색':'물고기 이름으로 검색';search.setAttribute('aria-label','레시피 검색');
  searchLabel.append(searchSymbol,search);browserTop.append(searchLabel);
  const filterBar=studioElement('div','cc-studio-filter-line');
  const quantity=studioElement('span','cc-studio-count','');
  let modifiedCheck=null;
  filterBar.append(quantity);
  if(dataKind!=='fish'){
    const modified=studioElement('label','cc-studio-modified');modifiedCheck=studioElement('input');
    modifiedCheck.type='checkbox';modifiedCheck.checked=dataModifiedOnly;
    modified.append(modifiedCheck,studioElement('span','','수정된 데이터만'));filterBar.append(modified);
  }
  browserTop.append(filterBar);
  const list=studioElement('div','cc-studio-list');list.setAttribute('role','list');list.setAttribute('aria-label',studioPartName(dataKind));
  browser.append(browserTop,list);
  const content=studioElement('section','cc-studio-content');content.setAttribute('aria-label','레시피 상세 및 편집');
  workspace.append(browser,content);root.append(workspace);viewHost.append(root);

  const shown=()=>dataCache.filter(item=>item.kind===dataKind &&
    (dataKind==='fish'?(fishAreaFilter==='research'?item.status==='research':item.area===fishAreaFilter):
      (!dataModifiedOnly||item.version!=null)) &&
    normName(item.name).includes(normName(dataFilterText)));
  const renderList=()=>{
    const entries=shown();list.replaceChildren();
    quantity.textContent=`${entries.length.toLocaleString('ko-KR')}개 항목`;
    if(!dataEditing && !entries.some(item=>dataKey(item)===dataSelectedKey))
      dataSelectedKey=entries[0]?dataKey(entries[0]):'';
    if(!entries.length){
      const empty=studioElement('div','cc-studio-list-empty');empty.append(studioElement('strong','','검색 결과가 없습니다'),
        studioElement('p','','검색어 또는 필터를 변경해 주세요.'));
      list.append(empty);
    }
    for(const item of entries){
      const selected=dataKey(item)===dataSelectedKey;
      const tile=studioButton('',`cc-studio-list-item ${item.kind==='fish'?'cc-fish-list-item':''} ${selected?'is-selected':''}`,()=>studioChoose(dataKind,item));
      tile.setAttribute('aria-pressed',String(selected));
      const top=studioElement('span','cc-studio-list-main');top.append(studioElement('strong','',item.name));
      if(item.kind==='fish'){
        // Compact fish library: the list displays fish names only. Details live on the right.
        tile.append(top);
      }else{
        const tag=studioElement('span',`cc-studio-tag ${item.version!=null?'is-revised':''}`,studioStatus(item));top.append(tag);
        const bottom=studioElement('span','cc-studio-list-meta',
          `생산 ${item.qty||'미확인'}  ·  ${studioTime(item)}  ·  재료 ${(item.ingredients||[]).length}종`);
        tile.append(top,bottom);
      }
      list.append(tile);
    }
    renderDetail();
  };
  const renderDetail=()=>{
    if(dataEditing && content.firstElementChild?.__editing===dataEditing)return;
    content.replaceChildren();
    if(dataEditing){renderStudioEditor(content,dataEditing);return;}
    const item=dataCache.find(row=>dataKey(row)===dataSelectedKey && row.kind===dataKind);
    if(!item){
      const empty=studioElement('div','cc-studio-detail-empty');empty.append(studioElement('span','cc-studio-empty-icon','♨'),
        studioElement('h3','','레시피를 선택해 주세요'),studioElement('p','','왼쪽 목록에서 요리나 가공 재료를 선택하면 상세 정보가 표시됩니다.'));
      content.append(empty);return;
    }
    if(item.kind==='fish'){renderFishDetail(content,item);return;}
    const detailTop=studioElement('div','cc-studio-detail-top');
    const text=studioElement('div','cc-studio-detail-title');
    text.append(studioElement('span','cc-studio-eyebrow',item.kind==='food'?'COOKING RECIPE':'PROCESSING RECIPE'),
      studioElement('h3','',item.name));
    const meta=studioElement('div','cc-studio-detail-tags');
    meta.append(studioElement('span','cc-studio-label-chip',studioPartName(item.kind)),
      studioElement('span',`cc-studio-label-chip ${item.version!=null?'is-accent':''}`,studioStatus(item)));
    text.append(meta);detailTop.append(text);
    if(adminStatus==='admin'){
      detailTop.append(studioButton('✎  레시피 수정','cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit(item.kind,item)));
    }
    content.append(detailTop);
    const metrics=studioElement('div','cc-studio-metrics');
    const addMetric=(label,value,icon)=>{
      const cell=studioElement('div','cc-studio-metric');cell.append(studioElement('span','',`${icon}  ${label}`),studioElement('strong','',String(value)));metrics.append(cell);
    };
    addMetric(item.kind==='food'?'1세트 완성 수량':'1회 가공 생산량',item.qty||'미확인','◈');
    addMetric(item.kind==='food'?'조리 시간':'가공 소요시간',studioTime(item),'◷');
    addMetric('투입 재료',`${(item.ingredients||[]).length}종`,'▤');
    content.append(metrics);
    const section=studioElement('div','cc-studio-ingredient-section');
    const title=studioElement('div','cc-studio-section-title');
    title.append(studioElement('div','',null));title.firstChild.append(studioElement('span','cc-studio-section-index','01'),studioElement('strong','','필요 재료'));
    title.append(studioElement('span','cc-studio-section-note',item.kind==='food'?'1세트 제작 기준':'1회 가공 기준'));
    section.append(title);
    const ingredients=studioElement('div','cc-studio-ingredient-list');
    if((item.ingredients||[]).length){
      for(const [i,part] of item.ingredients.entries()){
        const row=studioElement('div','cc-studio-ingredient-display');
        row.append(studioElement('span','cc-studio-ingredient-index',String(i+1).padStart(2,'0')),
          studioElement('strong','',part.name),studioElement('span','cc-studio-ingredient-qty',`× ${part.qty}`));
        ingredients.append(row);
      }
    }else{ingredients.append(studioElement('p','cc-studio-no-ingredients','등록된 재료 정보가 없습니다.'));}
    section.append(ingredients);content.append(section);
    const foot=studioElement('div','cc-studio-detail-foot');
    foot.append(studioElement('span','','공통 데이터 · 변경 사항은 HUB COOK과 공유됩니다.'));
    if(item.version!=null)foot.append(studioElement('span','',`버전 ${item.version}`));
    content.append(foot);
  };
  studioRefs={renderList,renderDetail};
  search.addEventListener('input',()=>{dataFilterText=search.value;renderList();});
  modifiedCheck?.addEventListener('change',()=>{
    dataModifiedOnly=modifiedCheck.checked;dataSelectedKey='';renderList();
  });
  renderList();
}
// Fish-only library detail. No food/process catalog mutation and no fish auto-crafting recipes.
function renderFishDetail(content,item){
  const card=studioElement('div','cc-fish-detail');
  const head=studioElement('div','cc-fish-detail-head');
  const info=studioElement('div','cc-fish-title');
  info.append(studioElement('span','cc-studio-eyebrow',item.area==='general'?'GENERAL FISHING':'FRESHWATER FISHING'),
    studioElement('h3','',item.name));
  const tags=studioElement('div','cc-studio-detail-tags');
  tags.append(studioElement('span','cc-studio-label-chip',item.area==='general'?'일반 낚시터':'민물 낚시터'),
    studioElement('span',`cc-studio-label-chip ${item.status==='confirmed'?'is-accent':''}`,studioStatus(item)));
  info.append(tags);head.append(info);
  if(adminStatus==='admin'&&fishDbReady)
    head.append(studioButton('✎  기록 수정','cc-studio-btn cc-studio-btn-accent',()=>studioBeginEdit('fish',item)));
  card.append(head);
  if(item.status!=='confirmed'){
    const research=studioElement('div','cc-fish-research-card');
    research.append(studioElement('span','cc-fish-research-icon','◌'),
      studioElement('strong','','가공 결과 연구 중'),
      studioElement('p','','확인된 산출량이 없어 가공 수량을 계산하지 않습니다.'));
    if(item.failedAttempts?.length)
      research.append(studioElement('div','cc-fish-failure-line',
        '실패 기록  ·  '+item.failedAttempts.map(n=>`${n}마리`).join(' · ')));
    if(item.note)research.append(studioElement('p','cc-fish-note',item.note));
    card.append(research);
  }else{
    const recipe=studioElement('div','cc-fish-recipe');
    const from=studioElement('div','cc-fish-recipe-unit');
    from.append(studioElement('span','','투입'),studioElement('strong','',`${item.inputQty}마리`),studioElement('small','',item.name));
    const arrow=studioElement('span','cc-fish-recipe-arrow','→');arrow.setAttribute('aria-hidden','true');
    const to=studioElement('div','cc-fish-recipe-unit is-output');
    to.append(studioElement('span','','산출'),studioElement('strong','',`${item.outputQty}개`),studioElement('small','',item.outputMaterial));
    recipe.append(from,arrow,to);card.append(recipe);
    const time=studioElement('div','cc-fish-time');
    time.append(studioElement('span','','◷'),studioElement('span','',`1회 가공 ${studioTime(item)}`));
    card.append(time);
    const calc=studioElement('div','cc-fish-calculator');
    const calcHeading=studioElement('strong','','보유 생선으로 가공하기');
    const calcRow=studioElement('div','cc-fish-calc-layout');
    const label=studioElement('label','cc-fish-input');label.append(studioElement('span','','보유 마릿수'));
    const input=studioElement('input');input.type='number';input.min='0';input.step='1';input.max='999999';
    input.value=String(item.inputQty);input.setAttribute('aria-label','보유 생선 마릿수');label.append(input);
    const output=studioElement('div','cc-fish-result');output.setAttribute('role','status');
    const recalc=()=>{
      const valid=/^\d+$/.test(input.value)&&Number.isSafeInteger(Number(input.value))&&Number(input.value)<=999999;
      if(!valid){output.textContent='0 이상의 정수 마릿수를 입력해 주세요.';return;}
      const amount=Number(input.value),runs=Math.floor(amount/item.inputQty),remain=amount%item.inputQty;
      output.replaceChildren(studioElement('strong','',`${item.outputMaterial} ${(runs*item.outputQty).toLocaleString('ko-KR')}개`),
        studioElement('small','',`가공 ${runs.toLocaleString('ko-KR')}회 · ${remain}마리 남음`));
    };
    input.addEventListener('input',recalc);calcRow.append(label,output);calc.append(calcHeading,calcRow);card.append(calc);recalc();
  }
  content.append(card);
}
function renderFishEditor(content,editing){
  const item=editing.item;
  const form=studioElement('form','cc-studio-editor cc-studio-fish-editor');form.noValidate=true;
  const top=studioElement('div','cc-studio-editor-heading');
  const title=studioElement('div');title.append(studioElement('span','cc-studio-eyebrow',item?'EDIT FISH':'NEW FISH RECORD'),
    studioElement('h3','',item?'생선 가공 정보 수정':'새 생선 기록 등록'),
    studioElement('p','','가공 투입량과 생선살 산출량을 저장합니다. 연구 중인 조합은 성공 결과를 비워두세요.'));
  top.append(title,studioButton('←  상세로 돌아가기','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit));form.append(top);
  const card=studioElement('div','cc-studio-form-block');
  const grid=studioElement('div','cc-studio-form-grid');
  const field=(label,value,type='text')=>{
    const wrap=studioElement('label','cc-studio-field');wrap.append(studioElement('span','',label));
    const input=studioElement('input');input.type=type;input.value=value==null?'':String(value);
    if(type==='number'){input.min='1';input.max='100000';input.step='1';input.inputMode='numeric';}
    if(type==='text')input.maxLength=100;
    wrap.append(input);return {wrap,input};
  };
  const name=field('물고기 이름',item?.name||'');if(item)name.input.readOnly=true;
  const areaWrap=studioElement('label','cc-studio-field');areaWrap.append(studioElement('span','','낚시터'));
  const area=studioElement('select');area.className='cc-studio-fish-select';
  for(const [value,label] of [['general','일반 낚시터'],['freshwater','민물 낚시터']]){
    const option=studioElement('option','',label);option.value=value;area.append(option);
  }
  area.value=item?.area||'general';area.disabled=Boolean(item);areaWrap.append(area);
  const statusWrap=studioElement('label','cc-studio-field');statusWrap.append(studioElement('span','','연구 상태'));
  const status=studioElement('select');status.className='cc-studio-fish-select';
  for(const [value,label] of [['confirmed','가공 결과 확인'],['research','연구 중 / 미확정']]){
    const option=studioElement('option','',label);option.value=value;status.append(option);
  }
  status.value=item?.status||'research';statusWrap.append(status);
  const inputQty=field('1회 투입 생선 수',''+(item?.inputQty??''),'number');
  const material=field('생선살 종류',item?.outputMaterial||'');
  const choices=studioElement('datalist');choices.id='cc-fish-material-options';
  for(const n of ['흰살생선','분홍살생선','민물 생선살']){const opt=studioElement('option');opt.value=n;choices.append(opt);}
  material.input.setAttribute('list',choices.id);
  const outputQty=field('1회 획득 생선살 수',item?.outputQty,'number');
  const time=field('가공 소요시간',item?.time||'10초');
  grid.append(name.wrap,areaWrap,statusWrap,inputQty.wrap,material.wrap,outputQty.wrap,time.wrap,choices);
  card.append(grid);
  const extra=studioElement('div','cc-studio-fish-experiment');
  const failed=field('실패한 투입 마릿수',item?.failedAttempts?.join(', ')||'');
  failed.input.placeholder='예: 1, 2, 3, 5';extra.append(failed.wrap);
  const note=studioElement('label','cc-studio-field');note.append(studioElement('span','','연구 메모'));
  const memo=studioElement('textarea');memo.maxLength=500;memo.placeholder='가공 실패나 추가 연구 정보를 기록하세요.';memo.value=item?.note||'';
  note.append(memo);extra.append(note);card.append(extra);
  const toggle=()=>{
    const isResearch=status.value==='research';
    for(const input of [inputQty.input,material.input,outputQty.input]){
      input.disabled=isResearch;input.closest('label')?.classList.toggle('cc-studio-fish-muted',isResearch);
    }
    extra.hidden=!isResearch;
  };
  status.addEventListener('change',toggle);toggle();form.append(card);
  const error=studioElement('p','cc-studio-form-status','');error.setAttribute('role','status');
  const actions=studioElement('div','cc-studio-form-actions');
  actions.append(studioElement('span','','생선 라이브러리 전용 기록으로 저장되며 기존 COOK 자동 제작 계산은 변경하지 않습니다.'));
  const buttons=studioElement('div');
  buttons.append(studioButton('취소','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit));
  const save=studioButton(item?'변경사항 저장':'생선 기록 등록','cc-studio-btn cc-studio-btn-accent');save.type='submit';buttons.append(save);
  actions.append(buttons);form.append(error,actions);
  const track=()=>{editing.dirty=true;};
  form.addEventListener('input',track);form.addEventListener('change',track);
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();if(editing.saving||!fishDbReady)return;
    const fishName=name.input.value.trim(),sp=area.value,st=status.value;
    const int=(raw,max=100000)=>/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))&&Number(raw)>=1&&Number(raw)<=max?Number(raw):null;
    const input=int(inputQty.input.value),output=int(outputQty.input.value);
    const outputMaterial=material.input.value.trim();const processTime=time.input.value.trim();
    let attempts=[];
    if(st==='research'){
      const raw=failed.input.value.trim();
      if(raw){
        if(!/^\d+(\s*,\s*\d+)*$/.test(raw)){error.textContent='실패 마릿수는 숫자를 쉼표로 구분해 입력해 주세요.';return;}
        attempts=[...new Set(raw.split(',').map(x=>Number(x.trim())))];
        if(attempts.length>30||attempts.some(n=>!Number.isSafeInteger(n)||n<1||n>100000)){
          error.textContent='실패한 마릿수는 1~100000 범위에서 최대 30개입니다.';return;
        }
      }
    }
    if(!fishName||fishName.length>90||!['general','freshwater'].includes(sp)||!processTime||processTime.length>40){
      error.textContent='물고기 이름과 낚시터·가공시간을 확인해 주세요.';return;
    }
    if(st==='confirmed'&&(!input||!output||!outputMaterial||outputMaterial.length>90)){
      error.textContent='확정된 가공식에는 투입 마릿수, 생선살 종류, 산출량이 모두 필요합니다.';return;
    }
    if(!item&&dataCache.some(x=>x.kind==='fish'&&x.area===sp&&normName(x.name)===normName(fishName))){
      error.textContent='이미 등록된 생선입니다. 목록에서 기존 기록을 수정해 주세요.';return;
    }
    const record={area:sp,fish_name:fishName,status:st,input_qty:st==='confirmed'?input:null,
      output_material:st==='confirmed'?outputMaterial:null,output_qty:st==='confirmed'?output:null,
      process_time:processTime,failed_attempts:st==='research'?attempts:[],note:st==='research'?memo.value.trim():''};
    editing.saving=true;save.disabled=true;error.textContent='생선 기록을 저장하고 있습니다…';
    try{
      if(!(await checkEditorAdmin()))throw Error('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
      let result;
      if(item?.version!=null){
        const version=Number(item.version);
        if(!Number.isSafeInteger(version)||version<1)throw Error('생선 기록의 버전 정보가 올바르지 않습니다.');
        result=await supabase.from('lac_cook_fish_entries').update({...record,version:version+1,updated_at:new Date().toISOString()})
          .eq('area',item.area).eq('fish_name',item.name).eq('version',version)
          .select('area,fish_name,version').maybeSingle();
        if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 최신 자료를 불러온 후 다시 시도해 주세요.');
      }else{
        result=await supabase.from('lac_cook_fish_entries').insert(record).select('area,fish_name,version').single();
      }
      if(result.error)throw result.error;
      dataEditing=null;dataNotice='생선 기록을 안전하게 저장했습니다.';
      dataSelectedKey=`fish:${sp}:${fishName}`;fishAreaFilter=sp;fishResearchOnly=false;dataLoaded=false;
      await loadAppData();
    }catch(ex){error.textContent='저장하지 못했습니다. '+String(ex?.message||ex);}
    finally{editing.saving=false;if(save.isConnected)save.disabled=false;}
  });
  content.append(form);form.__editing=editing;
}
function renderStudioEditor(content,editing){
  if(editing.kind==='fish'){renderFishEditor(content,editing);return;}
  const kind=editing.kind,item=editing.item,edit=Boolean(item);
  const form=studioElement('form','cc-studio-editor');form.noValidate=true;
  const top=studioElement('div','cc-studio-editor-heading');
  const titleArea=studioElement('div');titleArea.append(studioElement('span','cc-studio-eyebrow',edit?'EDIT RECIPE':'NEW RECIPE'),
    studioElement('h3','',`${kind==='food'?'요리':'가공 재료'} ${edit?'수정':'등록'}`),
    studioElement('p','',edit?'기본 정보와 투입 재료를 확인한 뒤 필요한 부분만 변경하세요.':'제작 정보와 투입 재료를 입력해 새 레시피를 등록하세요.'));
  const back=studioButton('←  상세로 돌아가기','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit);
  top.append(titleArea,back);form.append(top);
  const core=studioElement('section','cc-studio-form-block');
  const head=studioElement('div','cc-studio-section-title');head.append(studioElement('div','',null));
  head.firstChild.append(studioElement('span','cc-studio-section-index','01'),studioElement('strong','','기본 정보'));
  head.append(studioElement('span','cc-studio-section-note','필수 입력'));
  core.append(head);
  const fields=studioElement('div','cc-studio-form-grid');
  const field=(label,type,value,description='')=>{
    const wrapper=studioElement('label','cc-studio-field');wrapper.append(studioElement('span','',label));
    const input=studioElement('input');input.type=type;input.value=value==null?'':String(value);
    if(type==='text')input.maxLength=90;
    if(type==='number'){input.min='1';input.step='1';input.inputMode='numeric';}
    if(description)input.placeholder=description;
    wrapper.append(input);return {wrapper,input};
  };
  const name=field(kind==='food'?'요리 이름':'가공 결과물 이름','text',item?.name||'','이름을 입력해 주세요');
  if(edit&&kind==='process'){
    name.input.readOnly=true;
    name.wrapper.append(studioElement('small','cc-studio-readonly-note','기존 가공 결과물의 이름은 변경할 수 없습니다.'));
  }
  const qty=field(kind==='food'?'1세트 생산량':'1회 생산량','number',item?.qty??'','생산 수량');
  const time=field(kind==='food'?'조리시간 · 초':'가공 소요시간','text',item?.time??'','가공시간 예: 10초');
  if(kind==='food')time.input.placeholder='예: 13.5';
  fields.append(name.wrapper,qty.wrapper,time.wrapper);core.append(fields);form.append(core);
  const ingredientsBlock=studioElement('section','cc-studio-form-block');
  const ingHead=studioElement('div','cc-studio-section-title');ingHead.append(studioElement('div','',null));
  ingHead.firstChild.append(studioElement('span','cc-studio-section-index','02'),studioElement('strong','','투입 재료'));
  const ingredientCount=studioElement('span','cc-studio-section-note','');ingHead.append(ingredientCount);ingredientsBlock.append(ingHead);
  const preservation=kind==='process'&&edit&&item.sourceKind!=='new';
  const preserveLabel=studioElement('label','cc-studio-preserve');
  const keep=studioElement('input');keep.type='checkbox';keep.checked=preservation;
  if(preservation){
    const words=studioElement('span');words.append(studioElement('strong','','기존 가공 재료 구성 유지'),
      studioElement('small','','투입 재료는 유지하고 생산량·시간만 변경합니다. 필요하면 체크를 해제하고 재료를 직접 수정하세요.'));
    preserveLabel.append(keep,words);ingredientsBlock.append(preserveLabel);
  }
  const list=studioElement('div','cc-studio-edit-parts');
  const candidates=ingredientNames();
  const datalist=studioElement('datalist');datalist.id='cc-studio-part-options';
  for(const candidate of candidates){const o=studioElement('option');o.value=candidate;datalist.append(o);}
  const updateCount=()=>{
    const n=list.querySelectorAll('.cc-studio-edit-part').length;
    ingredientCount.textContent=`${n} / 24종`;
    const addButton=ingredientsBlock.querySelector('.cc-studio-add-part');
    if(addButton)addButton.disabled=n>=24;
    for(const button of list.querySelectorAll('.cc-studio-remove-part'))button.disabled=n<=1;
  };
  const createPart=(existing='')=>{
    if(list.querySelectorAll('.cc-studio-edit-part').length>=24)return null;
    const row=studioElement('div','cc-studio-edit-part');
    const index=studioElement('span','cc-studio-ingredient-index','');
    const material=studioElement('input');material.type='text';material.maxLength=90;material.placeholder='재료 선택 또는 입력';
    material.value=existing?.name||'';material.setAttribute('list',datalist.id);material.setAttribute('aria-label','투입 재료 이름');
    const amount=studioElement('input');amount.type='number';amount.min='1';amount.max='999999';amount.step='1';amount.inputMode='numeric';
    amount.value=existing?.qty==null?'':String(existing.qty);amount.placeholder='수량';amount.setAttribute('aria-label','투입 수량');
    const remove=studioButton('×','cc-studio-remove-part',()=>{row.remove();renumber();editing.dirty=true;});remove.setAttribute('aria-label','이 재료 삭제');
    row.append(index,material,amount,remove);list.append(row);renumber();return material;
  };
  const renumber=()=>{
    [...list.children].forEach((row,i)=>{row.firstChild.textContent=String(i+1).padStart(2,'0');});updateCount();
  };
  const initial=item?.ingredients||[];
  for(const part of initial.slice(0,24))createPart(part);
  if(!list.childElementCount)createPart();
  const add=studioButton('+  재료 추가','cc-studio-btn cc-studio-add-part',()=>{
    if(editing.saving)return;
    const input=createPart();if(input){editing.dirty=true;input.focus();}
  });
  const showPreservation=()=>{
    const on=preservation&&keep.checked;
    list.hidden=on;add.hidden=on;
    if(on){
      const msg=ingredientsBlock.querySelector('.cc-studio-preserved-data');
      if(!msg){
        const reminder=studioElement('div','cc-studio-preserved-data');
        reminder.append(studioElement('strong','','기존 투입 재료 보존 중'));
        for(const part of item.ingredients||[]){
          reminder.append(studioElement('span','',`${part.name}  × ${part.qty}`));
        }
        if(!(item.ingredients||[]).length)reminder.append(studioElement('span','','기존 기본 가공식을 유지합니다.'));
        preserveLabel.insertAdjacentElement('afterend',reminder);
      }
    }else{ingredientsBlock.querySelector('.cc-studio-preserved-data')?.remove();}
  };
  ingredientsBlock.append(list,datalist,add);
  if(preservation)keep.addEventListener('change',()=>{editing.dirty=true;showPreservation();});
  showPreservation();updateCount();form.append(ingredientsBlock);
  const status=studioElement('p','cc-studio-form-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actionRow=studioElement('div','cc-studio-form-actions');
  actionRow.append(studioElement('span','','이 변경은 공통 DB에 저장되고 HUB COOK에도 반영됩니다.'));
  const buttons=studioElement('div');
  const cancel=studioButton('취소','cc-studio-btn cc-studio-btn-quiet',studioCancelEdit);
  const save=studioElement('button','cc-studio-btn cc-studio-btn-accent',edit?'변경사항 저장':'새 레시피 등록');save.type='submit';
  buttons.append(cancel,save);actionRow.append(buttons);form.append(status,actionRow);
  form.addEventListener('input',()=>{if(!editing.saving)editing.dirty=true;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(editing.saving)return;
    editing.saving=true;save.disabled=true;cancel.disabled=true;back.disabled=true;
    for(const control of form.querySelectorAll('input'))control.disabled=true;
    status.textContent='저장 권한과 입력 내용을 확인하고 있습니다…';status.dataset.kind='info';
    try{
      if(!await checkEditorAdmin())throw Error('관리자 권한을 확인하지 못했습니다. HUB에서 로그인한 뒤 다시 확인하세요.');
      const on=await supabase.rpc('my_apps_company_cook_status');
      if(on.error||on.data!==true)throw Error('운영자가 요리계산기를 중지해 현재 저장할 수 없습니다.');
      const title=name.input.value.trim(),count=qty.input.value.trim(),timeText=time.input.value.trim();
      if(!title||title.length>90)throw Error('레시피 이름은 1~90자로 입력하세요.');
      if(!validPosInt(count,100000))throw Error('생산량은 1~100000 사이 정수여야 합니다.');
      if(kind==='food'&&(timeText===''||!Number.isFinite(Number(timeText))||Number(timeText)<0||Number(timeText)>86400||
        Math.abs(Math.round(Number(timeText)*100)-Number(timeText)*100)>1e-6))throw Error('조리시간은 0~86400초, 소수점 둘째 자리까지 입력하세요.');
      if(kind==='process'&&timeText.length>40)throw Error('가공시간은 40자 이내로 입력하세요.');
      const preserve=preservation&&keep.checked;
      const parts=preserve?(Array.isArray(item.dbIngredients)?item.dbIngredients:null):
        [...list.querySelectorAll('.cc-studio-edit-part')].map(row=>({name:row.children[1].value.trim(),qty:Number(row.children[2].value)}));
      if(!preserve){
        if(!parts.length||parts.length>24||parts.some(p=>!p.name||p.name.length>90||!validPosInt(p.qty,999999)))
          throw Error('재료 1~24종의 이름과 수량을 확인하세요.');
        if(new Set(parts.map(p=>normName(p.name))).size!==parts.length)throw Error('같은 재료가 중복되어 있습니다.');
        const known=new Set(candidates.map(normName));
        if(parts.some(p=>!known.has(normName(p.name))))throw Error('등록된 재료명만 사용할 수 있습니다. 검색 목록에서 선택해 주세요.');
        if(kind==='process'&&parts.some(p=>normName(p.name)===normName(title)))throw Error('가공 결과물 자신을 투입 재료로 사용할 수 없습니다.');
      }
      if(kind==='process'&&!edit&&(catalogSnapshot?.materials||[]).concat(catalogSnapshot?.farms||[])
        .some(row=>normName(row.material_name)===normName(title)))throw Error('기존 구매·농장 재료와 이름이 겹칩니다.');
      if(dataCache.some(row=>row.kind===kind&&normName(row.name)===normName(title)&&(!edit||dataKey(row)!==dataKey(item))))
        throw Error('동일한 이름의 레시피가 있습니다. 기존 항목을 수정해 주세요.');
      const sourceKind=edit?(item.sourceKind==='new'?'new':'override'):'new';
      let result;
      if(kind==='food'){
        const entry={food_id:edit?item.id:`lac_new_${crypto.randomUUID().replace(/-/g,'')}`,
          food_name:title,set_qty:Number(count),cook_time:Number(timeText),ingredients:parts,source_kind:sourceKind};
        if(edit&&item.version!=null){
          result=await supabase.from('lac_cook_recipe_entries').update(entry)
            .eq('food_id',item.id).eq('version',item.version).select('food_id,version').maybeSingle();
          if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 데이터 새로고침 후 다시 시도하세요.');
        }else result=await supabase.from('lac_cook_recipe_entries').insert(entry).select('food_id,version').single();
      }else{
        const entry={process_material_name:title,result_qty:Number(count),process_time:timeText,ingredients:parts,source_kind:sourceKind};
        if(edit&&item.version!=null){
          const version=Number(item.version);
          if(!Number.isSafeInteger(version)||version<1||version>=2147483645)throw Error('수정 버전이 올바르지 않습니다.');
          result=await supabase.from('lac_cook_process_entries')
            .update({...entry,version:version+1,updated_at:new Date().toISOString()})
            .eq('process_material_name',item.id).eq('version',version).select('process_material_name,version').maybeSingle();
          if(!result.error&&!result.data)throw Error('다른 관리자가 먼저 수정했습니다. 데이터 새로고침 후 다시 시도하세요.');
        }else result=await supabase.from('lac_cook_process_entries').insert(entry).select('process_material_name,version').single();
      }
      if(result.error)throw result.error;
      const selected=`${kind}:${kind==='food'?(edit?item.id:result.data?.food_id):title}`;
      dataEditing=null;dataSelectedKey=selected;dataKind=kind;dataNotice='공통 데이터에 정상 저장했습니다.';
      dataLoaded=false;pendingHomeRefresh=true;
      await loadAppData();
    }catch(error){
      status.textContent=`저장하지 못했습니다 · ${String(error?.message||error)}`;
      status.dataset.kind='error';
    }finally{
      editing.saving=false;save.disabled=false;cancel.disabled=false;back.disabled=false;
      for(const control of form.querySelectorAll('input'))control.disabled=false;
    }
  });
  form.__editing=editing;
  content.append(form);
}

// COMPANY-only display/interaction polish. Does not modify HUB COOK's renderer.
let companyPolishCleanup = null;
function mountCompanyWorkbenchPolish(doc, iframe){
  companyPolishCleanup?.();companyPolishCleanup=null;
  if(frame!==iframe || !iframe.isConnected)return;
  const win=iframe.contentWindow;
  if(!win)return;
  const search=doc.getElementById('search');
  const results=doc.getElementById('results');
  const searchPanel=doc.querySelector('.search-panel');
  const ordersRoot=doc.getElementById('orders');
  const ordersPanel=doc.querySelector('.orders-panel');
  const purchases=doc.getElementById('purchases');
  const cleanups=[];
  function on(target,type,callback,options){
    if(!target)return;
    target.addEventListener(type,callback,options);
    cleanups.push(()=>target.removeEventListener(type,callback,options));
  }
  // Keep the real search behaviour, but allow one-click/keyboard dismissal.
  if(search&&results&&searchPanel){
    const close=doc.createElement('button');close.type='button';
    close.className='cc-search-dismiss';close.textContent='닫기';
    close.setAttribute('aria-label','요리 검색 결과 닫기');
    const dismiss=()=>{
      if(!search.value)return;
      search.value='';search.dispatchEvent(new win.Event('input',{bubbles:true}));
    };
    const refreshClose=()=>{close.hidden=!search.value.trim();};
    searchPanel.append(close);cleanups.push(()=>close.remove());
    on(search,'input',refreshClose);on(close,'click',dismiss);
    on(search,'keydown',event=>{if(event.key==='Escape'){dismiss();search.blur();}});
    on(results,'click',event=>{
      if(event.target.closest('button.accent,button.favorite-toggle')){
        // Native add/favourite listeners complete before clearing the results.
        win.setTimeout(dismiss,0);
      }
    });
    on(doc,'pointerdown',event=>{
      if(search.value && !searchPanel.contains(event.target))dismiss();
    });
    refreshClose();
  }
  // Inform, don't restrict, when there are more than two distinct work items.
  if(ordersRoot&&ordersPanel){
    const toast=doc.createElement('div');toast.className='cc-work-hint';
    toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;
    ordersPanel.append(toast);cleanups.push(()=>toast.remove());
    let count=ordersRoot.querySelectorAll('.order-row').length;
    let timer=null,armed=false,armTimer=null;
    // Initial autosaved work is not a new user action: only notify on clicks.
    on(doc,'click',event=>{
      if(event.target.closest('#results button.accent,.favorites-panel button[aria-label*="작업 목록에 추가"]')){
        armed=true;
        if(armTimer!==null)win.clearTimeout(armTimer);
        armTimer=win.setTimeout(()=>{armed=false;},400);
      }
    },true);
    const watch=new win.MutationObserver(()=>{
      const next=ordersRoot.querySelectorAll('.order-row').length;
      if(armed && next>count && next>2){
        toast.textContent='작업목록은 2가지 정도로 운영하는 것을 추천합니다.';
        toast.hidden=false;
        if(timer!==null)win.clearTimeout(timer);
        timer=win.setTimeout(()=>{toast.hidden=true;},4700);
      }
      count=next;
    });
    watch.observe(ordersRoot,{childList:true,subtree:true});
    cleanups.push(()=>{watch.disconnect();if(timer!==null)win.clearTimeout(timer);
      if(armTimer!==null)win.clearTimeout(armTimer);});
  }
  // The game's stall is the fixed buying choice when offered; otherwise use mart.
  // Keep the existing chooser for unknown sellers instead of guessing a price.
  if(purchases){
    let syncing=false;
    const reconcile=()=>{
      if(syncing || frame!==iframe || !iframe.isConnected)return;
      const selects=[...purchases.querySelectorAll('select.choice-select')];
      for(const select of selects){
        const options=[...select.options].filter(option=>option.value);
        const preferred=options.find(o=>o.textContent.includes('노점상')) || options.find(o=>o.textContent.includes('마트'));
        if(!preferred)continue;
        if(select.value!==preferred.value){
          syncing=true;
          select.value=preferred.value;
          select.dispatchEvent(new win.Event('change',{bubbles:true}));
          syncing=false;
          // The calculator redraws purchase rows during this change.
          return;
        }
        const field=select.closest('.choice-label');
        if(field){
          const seller=preferred.textContent.includes('노점상')?'노점상':'마트';
          const type=field.closest('.supply-card')?.querySelector('.check-type');
          if(type){type.textContent=seller;type.title='고정 구매처 · '+seller;}
          // No extra row: keep shopping cards equal-height for eggs and berries.
          field.remove();
        }
      }
    };
    const observer=new win.MutationObserver(()=>reconcile());
    observer.observe(purchases,{childList:true});
    cleanups.push(()=>observer.disconnect());
    reconcile();
  }
  companyPolishCleanup=()=>{for(const stop of cleanups)stop();};
}

function sizeCompanyFrame(iframe, doc){
  if(frame!==iframe || !iframe.isConnected)return;
  const content = doc.querySelector('.frame');
  const shell = doc.querySelector('.shell');
  if(!content || !shell)throw new Error('COOK 화면 높이를 계산할 수 없습니다.');
  const childWindow = iframe.contentWindow;
  const measure = () => {
    if(frame!==iframe || !iframe.isConnected)return;
    // The company stylesheet removes all viewport-height rules inside the iframe.
    // Content grows with recipes, checklists and expanded detail sections.
    const measured = Math.ceil(Math.max(content.scrollHeight, shell.getBoundingClientRect().bottom - content.getBoundingClientRect().top));
    const nextHeight = `${Math.max(1,measured + 1)}px`;
    if(iframe.style.height!==nextHeight) iframe.style.height = nextHeight;
  };
  if(typeof childWindow.ResizeObserver==='function'){
    frameResizeObserver = new childWindow.ResizeObserver(measure);
    frameResizeObserver.observe(content);
    frameResizeObserver.observe(shell);
  } else if(typeof childWindow.MutationObserver==='function'){
    const observer = new childWindow.MutationObserver(measure);
    observer.observe(shell,{subtree:true,childList:true,characterData:true,attributes:true});
    frameResizeCleanup = () => observer.disconnect();
  }
  childWindow.addEventListener('resize',measure);
  const priorCleanup = frameResizeCleanup;
  frameResizeCleanup = () => {
    childWindow.removeEventListener('resize',measure);
    priorCleanup?.();
  };
  measure();
  childWindow.document.fonts?.ready?.then(() => measure()).catch(()=>{});
}

// Company-only customer order ledger. Preserves the legacy v1 storage key and
// single-dish records; never writes into the COOK workspace or the company DB.
const COMPANY_MEMO_KEY = 'lac-company-cook-private-memo-v1'; // Retained; never deleted.
const COMPANY_DELIVERY_KEY = 'lac-company-cook-delivery-ledger-v1';
const COMPANY_DELIVERY_STAGES = ['received','cooked','delivered'];
const COMPANY_MAX_DISHES = 16;
let companyOrderDialog = null;
function readCompanyDeliveries(storage){
  try {
    const raw=JSON.parse(storage.getItem(COMPANY_DELIVERY_KEY)||'[]');
    if(!Array.isArray(raw))return [];
    const seen=new Set(), output=[];
    for(const row of raw.slice(0,120)){
      if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||row.id.length>100||seen.has(row.id)||
        typeof row.customer!=='string'||!row.customer.trim()||row.customer.length>60||
        !COMPANY_DELIVERY_STAGES.includes(row.stage))continue;
      // Upgrade in memory only; legacy data is left untouched until the next save.
      const input=Array.isArray(row.items)?row.items:[{food:row.food,sets:row.sets}];
      if(!input.length||input.length>COMPANY_MAX_DISHES)continue;
      const items=[];
      for(const part of input){
        if(!part||typeof part.food!=='string'||!part.food.trim()||part.food.length>90||
          !Number.isSafeInteger(part.sets)||part.sets<1||part.sets>10000){items.length=0;break;}
        items.push({food:part.food.trim(),sets:part.sets});
      }
      if(items.length!==input.length||new Set(items.map(item=>item.food.toLocaleLowerCase('ko'))).size!==items.length)continue;
      seen.add(row.id);
      output.push({id:row.id,customer:row.customer.trim(),items,stage:row.stage});
    }
    return output;
  }catch{return [];}
}
function clearCompanyOrderDialog(){
  if(!companyOrderDialog)return;
  try{if(companyOrderDialog.open)companyOrderDialog.close();}catch{}
  companyOrderDialog.remove();companyOrderDialog=null;
}
function mountCompanyMemo(doc, iframe){
  if(frame!==iframe||!iframe.isConnected)return;
  const sidebar=doc.querySelector('.cook-sidebar');
  if(!sidebar||sidebar.querySelector('#cc-memo'))return;
  clearCompanyOrderDialog();
  // Fixed-height summary card replaces the old memo and tall inline order form.
  const section=doc.createElement('section');section.id='cc-memo';section.className='panel cc-memo-panel';
  const heading=doc.createElement('div');heading.className='panel-title';
  const h=doc.createElement('h3');h.textContent='주문관리';heading.append(h);
  const summary=doc.createElement('div');summary.className='cc-order-summary';
  const open=doc.createElement('button');open.type='button';open.className='cc-order-open';open.textContent='주문관리 열기  ↗';
  section.append(heading,summary,open);sidebar.append(section);

  let storage=null;
  try{storage=window.localStorage;}catch{}
  let orders=storage?readCompanyDeliveries(storage):[];
  const dialog=document.createElement('dialog');dialog.className='cc-order-dialog';
  dialog.setAttribute('aria-label','주문관리');
  companyOrderDialog=dialog;
  const shell=document.createElement('div');shell.className='cc-order-shell';
  const bar=document.createElement('header');bar.className='cc-order-bar';
  const titlebox=document.createElement('div');titlebox.className='cc-order-title';
  const eyebrow=document.createElement('span');eyebrow.textContent='LAC COOK  /  ORDER SHEET';
  const title=document.createElement('h2');title.textContent='주문관리';
  titlebox.append(eyebrow,title);
  const close=document.createElement('button');close.type='button';close.className='cc-order-close';close.setAttribute('aria-label','주문 관리 닫기');close.textContent='✕';
  bar.append(titlebox,close);
  const content=document.createElement('div');content.className='cc-order-content';
  const editor=document.createElement('section');editor.className='cc-order-editor';
  const editorHead=document.createElement('div');editorHead.className='cc-order-section-title';
  const editorTitle=document.createElement('h3');editorTitle.textContent='새 주문 접수';
  editorHead.append(editorTitle);
  const form=document.createElement('form');form.className='cc-order-form';form.autocomplete='off';
  const customerLabel=document.createElement('label');customerLabel.className='cc-order-field';
  const customerTitle=document.createElement('span');customerTitle.textContent='주문자 이름';
  const customer=document.createElement('input');customer.type='text';customer.maxLength=60;customer.required=true;
  customer.placeholder='주문자 이름';customerLabel.append(customerTitle,customer);
  const foodsHeader=document.createElement('div');foodsHeader.className='cc-order-food-head';
  const foodTitle=document.createElement('strong');foodTitle.textContent='주문 요리';
  const addDish=document.createElement('button');addDish.type='button';addDish.className='cc-order-add';addDish.textContent='+ 요리 추가';
  foodsHeader.append(foodTitle,addDish);
  const foodRows=document.createElement('div');foodRows.className='cc-order-food-rows';
  const suggestions=document.createElement('datalist');suggestions.id='cc-order-food-suggestions';
  const actionRow=document.createElement('div');actionRow.className='cc-order-form-actions';
  const submit=document.createElement('button');submit.type='submit';submit.className='cc-order-save';submit.textContent='주문 등록';
  const cancelEdit=document.createElement('button');cancelEdit.type='button';cancelEdit.className='cc-order-quiet';cancelEdit.textContent='수정 취소';cancelEdit.hidden=true;
  actionRow.append(submit,cancelEdit);
  const feedback=document.createElement('p');feedback.className='cc-order-feedback';feedback.setAttribute('role','status');
  const buyerBlock=document.createElement('div');buyerBlock.className='cc-order-form-section';
  const buyerStep=document.createElement('span');buyerStep.className='cc-order-section-caption';buyerStep.textContent='CUSTOMER  /  01';
  buyerBlock.append(buyerStep,customerLabel);
  const menuBlock=document.createElement('div');menuBlock.className='cc-order-form-section';
  const menuStep=document.createElement('span');menuStep.className='cc-order-section-caption';menuStep.textContent='MENU  /  02';
  const totals=document.createElement('div');totals.className='cc-order-totals';totals.setAttribute('aria-live','polite');
  const totalsLabel=document.createElement('span');totalsLabel.textContent='주문 합계';
  const totalsValue=document.createElement('strong');totals.append(totalsLabel,totalsValue);
  menuBlock.append(menuStep,foodsHeader,foodRows,suggestions,totals);
  form.append(buyerBlock,menuBlock,actionRow,feedback);
  editor.append(editorHead,form);
  const manager=document.createElement('section');manager.className='cc-order-manager';
  const listHead=document.createElement('div');listHead.className='cc-order-section-title';
  const listTitle=document.createElement('h3');listTitle.textContent='주문 현황';
  listHead.append(listTitle);
  const tabs=document.createElement('div');tabs.className='cc-order-tabs';tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','주문 진행 상태');
  const activeTab=document.createElement('button');activeTab.type='button';activeTab.className='cc-order-tab';
  activeTab.setAttribute('role','tab');activeTab.id='cc-orders-active-tab';
  const deliveredTab=document.createElement('button');deliveredTab.type='button';deliveredTab.className='cc-order-tab';
  deliveredTab.setAttribute('role','tab');deliveredTab.id='cc-orders-delivered-tab';
  tabs.append(activeTab,deliveredTab);
  const list=document.createElement('div');list.className='cc-order-list';list.setAttribute('role','tabpanel');
  list.id='cc-orders-list';list.setAttribute('aria-label','주문 목록');
  activeTab.setAttribute('aria-controls',list.id);deliveredTab.setAttribute('aria-controls',list.id);
  const pager=document.createElement('nav');pager.className='cc-order-pagination';pager.setAttribute('aria-label','주문 페이지');pager.hidden=true;
  const prevPage=document.createElement('button');prevPage.type='button';prevPage.textContent='이전';
  const pageLabel=document.createElement('span');pageLabel.className='cc-order-page-label';
  const nextPage=document.createElement('button');nextPage.type='button';nextPage.textContent='다음';
  pager.append(prevPage,pageLabel,nextPage);
  manager.append(listHead,tabs,list,pager);content.append(editor,manager);shell.append(bar,content);dialog.append(shell);document.body.append(dialog);

  const pickRows=()=>[...foodRows.querySelectorAll('.cc-order-food-row')];
  function addDishRow(name='',count=1){
    if(pickRows().length>=COMPANY_MAX_DISHES){feedback.textContent=`한 주문에는 최대 ${COMPANY_MAX_DISHES}종까지 등록할 수 있습니다.`;return;}
    const row=document.createElement('div');row.className='cc-order-food-row';
    const input=document.createElement('input');input.type='text';input.maxLength=90;input.required=true;
    input.placeholder='요리 이름';input.setAttribute('list','cc-order-food-suggestions');input.setAttribute('aria-label','요리 종류');input.value=name;
    const countInput=document.createElement('input');countInput.type='number';countInput.min='1';countInput.max='10000';countInput.step='1';countInput.required=true;
    countInput.inputMode='numeric';countInput.setAttribute('aria-label','세트 수');countInput.value=String(count);
    const units=document.createElement('span');units.textContent='세트';units.className='cc-order-unit';
    const remove=document.createElement('button');remove.type='button';remove.className='cc-order-remove';remove.title='요리 제거';remove.setAttribute('aria-label','요리 제거');remove.textContent='×';
    remove.addEventListener('click',()=>{if(pickRows().length>1)row.remove();updateAddDish();});
    row.append(input,countInput,units,remove);foodRows.append(row);updateAddDish();return input;
  }
  function updateAddDish(){
    const rows=pickRows();addDish.disabled=rows.length>=COMPANY_MAX_DISHES;
    const sum=rows.reduce((acc,row)=>{
      const raw=row.children[1].value.trim();const amount=/^\d{1,5}$/.test(raw)?Number(raw):0;
      return acc+(Number.isSafeInteger(amount)&&amount>=1&&amount<=10000?amount:0);
    },0);
    totalsValue.textContent=`${rows.length}종 · ${sum.toLocaleString('ko-KR')}세트`;
  }
  foodRows.addEventListener('input',updateAddDish);
  let editingId=null,formBaseline='';
  const snapshot=()=>JSON.stringify([customer.value.trim(),pickRows().map(row=>[row.children[0].value.trim(),row.children[1].value.trim()])]);
  function resetForm(){
    editingId=null;editorTitle.textContent='새 주문 접수';submit.textContent='주문 등록';cancelEdit.hidden=true;
    customer.value='';foodRows.replaceChildren();addDishRow();feedback.textContent='';formBaseline=snapshot();
  }
  function populateForm(order){
    editingId=order.id;editorTitle.textContent='주문 수정';submit.textContent='변경 저장';cancelEdit.hidden=false;
    customer.value=order.customer;foodRows.replaceChildren();
    for(const item of order.items)addDishRow(item.food,item.sets);
    feedback.textContent='';updateAddDish();formBaseline=snapshot();customer.focus();
  }
  function confirmDiscard(){
    return snapshot()===formBaseline || window.confirm('저장하지 않은 주문 입력을 버릴까요?');
  }
  function closeDialog(){if(!confirmDiscard())return;resetForm();dialog.close();}
  close.addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
  cancelEdit.addEventListener('click',()=>{if(confirmDiscard())resetForm();});
  addDish.addEventListener('click',()=>{addDishRow()?.focus();});
  let orderTab='active',orderPage=0;
  const ORDER_PAGE_SIZE=5;
  activeTab.addEventListener('click',()=>{orderTab='active';orderPage=0;renderList();});
  deliveredTab.addEventListener('click',()=>{orderTab='delivered';orderPage=0;renderList();});
  for(const tab of [activeTab,deliveredTab])tab.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();const next=tab===activeTab?deliveredTab:activeTab;next.click();next.focus();
  });
  prevPage.addEventListener('click',()=>{if(orderPage>0){orderPage--;renderList();list.scrollTop=0;}});
  nextPage.addEventListener('click',()=>{orderPage++;renderList();list.scrollTop=0;});
  open.addEventListener('click',()=>{if(companyOrderDialog!==dialog)return;resetForm();orderTab='active';orderPage=0;renderList();dialog.showModal();customer.focus();});
  resetForm();
  const optionNames=new Set();
  const addOptions=foods=>{
    for(const row of foods||[]){
      const name=String(row.food_name||row.name||'').trim();
      if(!name||name.length>90||optionNames.has(name))continue;
      if(row.is_active&&row.is_active!=='TRUE')continue;
      optionNames.add(name);const option=document.createElement('option');option.value=name;suggestions.append(option);
    }
  };
  addOptions(dataCache.filter(row=>row.kind==='food'));
  const catalogUrl=new URL('/cook-preview/data/catalog.js',window.location.origin).href;
  import(/* @vite-ignore */catalogUrl).then(({default:catalog})=>{if(companyOrderDialog===dialog)addOptions(catalog.foods);}).catch(()=>{});

  function persist(next){
    if(!storage){feedback.textContent='저장 공간에 접근할 수 없습니다.';return false;}
    try{storage.setItem(COMPANY_DELIVERY_KEY,JSON.stringify(next.map(row=>({...row,food:row.items[0].food,sets:row.items[0].sets}))));orders=next;return true;}
    catch{feedback.textContent='저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.';return false;}
  }
  const button=(text,action,kind='')=>{
    const element=document.createElement('button');element.type='button';element.textContent=text;element.className=kind;
    element.addEventListener('click',action);return element;
  };
  function renderSummary(){
    summary.replaceChildren();
    const stats=[['접수',orders.filter(row=>row.stage==='received').length],['조리 완료',orders.filter(row=>row.stage==='cooked').length],['전달 완료',orders.filter(row=>row.stage==='delivered').length]];
    for(const [label,count] of stats){
      const cell=doc.createElement('div');cell.className='cc-order-summary-cell';
      const value=doc.createElement('strong');value.textContent=String(count);
      const key=doc.createElement('span');key.textContent=label;cell.append(value,key);summary.append(cell);
    }
  }
  function renderList(){
    renderSummary();list.replaceChildren();
    const activeOrders=orders.filter(row=>row.stage!=='delivered');
    const deliveredOrders=orders.filter(row=>row.stage==='delivered');
    activeTab.textContent=`진행 중  ${activeOrders.length}`;
    deliveredTab.textContent=`전달 완료  ${deliveredOrders.length}`;
    activeTab.setAttribute('aria-selected',String(orderTab==='active'));
    deliveredTab.setAttribute('aria-selected',String(orderTab==='delivered'));
    activeTab.tabIndex=orderTab==='active'?0:-1;
    deliveredTab.tabIndex=orderTab==='delivered'?0:-1;
    list.setAttribute('aria-labelledby',orderTab==='active'?activeTab.id:deliveredTab.id);
    const visible=orderTab==='active'?activeOrders:deliveredOrders;
    const pageCount=Math.max(1,Math.ceil(visible.length/ORDER_PAGE_SIZE));
    orderPage=Math.max(0,Math.min(orderPage,pageCount-1));
    pager.hidden=visible.length<=ORDER_PAGE_SIZE;
    pageLabel.textContent=`${orderPage+1} / ${pageCount}`;
    prevPage.disabled=orderPage===0;nextPage.disabled=orderPage>=pageCount-1;
    if(!visible.length){
      const empty=document.createElement('p');empty.className='cc-order-empty';
      empty.textContent=orderTab==='active'?'진행 중인 주문이 없습니다.':'전달 완료된 주문이 없습니다.';
      list.append(empty);return;
    }
    for(const [position,order] of visible.slice(orderPage*ORDER_PAGE_SIZE,(orderPage+1)*ORDER_PAGE_SIZE).entries()){
      const card=document.createElement('article');card.className='cc-order-record';card.dataset.stage=order.stage;
      const top=document.createElement('div');top.className='cc-order-record-top';
      const ident=document.createElement('div');ident.className='cc-order-record-identity';
      const number=document.createElement('span');number.className='cc-order-record-index';number.textContent=`#${String(orderPage*ORDER_PAGE_SIZE+position+1).padStart(2,'0')}`;
      const name=document.createElement('strong');name.textContent=order.customer;ident.append(number,name);
      const badge=document.createElement('span');badge.className='cc-order-stage';badge.textContent=order.stage==='received'?'접수':order.stage==='cooked'?'조리 완료':'전달 완료';
      top.append(ident,badge);
      const parts=document.createElement('div');parts.className='cc-order-record-items';
      const summaryLine=document.createElement('span');summaryLine.className='cc-order-record-summary';
      summaryLine.textContent=order.items.slice(0,2).map(x=>`${x.food} ${x.sets}세트`).join('  ·  ')+(order.items.length>2?`  ·  외 ${order.items.length-2}종`:'');
      summaryLine.title=order.items.map(x=>`${x.food} ${x.sets}세트`).join(' · ');
      parts.append(summaryLine);
      if(order.items.length>2){
        const more=document.createElement('details');more.className='cc-order-record-more';
        const trigger=document.createElement('summary');trigger.textContent=`전체 ${order.items.length}종 보기`;
        more.append(trigger);
        for(const [itemIndex,item] of order.items.entries()){
          const line=document.createElement('div');line.className='cc-order-record-item';
          const caption=document.createElement('div');caption.className='cc-order-item-caption';
          const num=document.createElement('span');num.className='cc-order-item-no';num.textContent=String(itemIndex+1).padStart(2,'0');
          const name=document.createElement('span');name.textContent=item.food;caption.append(num,name);
          const qty=document.createElement('b');qty.textContent=`${item.sets}세트`;
          line.append(caption,qty);more.append(line);
        }
        parts.append(more);
      }
      const actions=document.createElement('div');actions.className='cc-order-record-actions';
      const index=COMPANY_DELIVERY_STAGES.indexOf(order.stage);
      actions.append(button('수정',()=>{
        if(!confirmDiscard())return;
        populateForm(order);
        editor.scrollIntoView({block:'nearest',behavior:'smooth'});
      }));
      if(index<2)actions.append(button(index===0?'조리 완료':'전달 완료',()=>{
        if(persist(orders.map(row=>row.id===order.id?{...row,stage:COMPANY_DELIVERY_STAGES[index+1]}:row)))renderList();
      },'cc-order-next'));
      if(index>0)actions.append(button('되돌리기',()=>{
        if(persist(orders.map(row=>row.id===order.id?{...row,stage:COMPANY_DELIVERY_STAGES[index-1]}:row)))renderList();
      }));
      actions.append(button('삭제',()=>{
        if(!window.confirm(`${order.customer}님의 주문 기록을 삭제할까요?`))return;
        if(persist(orders.filter(row=>row.id!==order.id))){if(editingId===order.id)resetForm();renderList();}
      },'cc-order-danger'));
      card.append(top,parts,actions);list.append(card);
    }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const name=customer.value.trim();
    const items=[];
    for(const row of pickRows()){
      const food=row.children[0].value.trim(),raw=row.children[1].value.trim();
      const sets=/^\d{1,5}$/.test(raw)?Number(raw):0;
      if(!food||food.length>90||!Number.isSafeInteger(sets)||sets<1||sets>10000){
        feedback.textContent='요리 이름과 세트 수(1~10,000)를 확인해 주세요.';return;
      }
      items.push({food,sets});
    }
    if(!name||name.length>60||items.length<1||items.length>COMPANY_MAX_DISHES){
      feedback.textContent='주문자 이름과 요리 종류를 확인해 주세요.';return;
    }
    if(new Set(items.map(x=>x.food.toLocaleLowerCase('ko'))).size!==items.length){
      feedback.textContent='같은 요리는 한 줄에 세트 수를 합쳐 입력해 주세요.';return;
    }
    if(!editingId&&orders.length>=120){feedback.textContent='보관 가능한 주문은 최대 120건입니다.';return;}
    const id=typeof crypto?.randomUUID==='function'?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
    const next=editingId
      ? orders.map(row=>row.id===editingId?{...row,customer:name,items}:row)
      : [{id,customer:name,items,stage:'received'},...orders];
    if(persist(next)){resetForm();renderList();customer.focus();}
  });
  renderSummary();
}

function installCompanyWorkspace(iframe){
  if(frame!==iframe || !iframe.isConnected) return;
  const doc = iframe.contentDocument;
  if(!doc?.head || !doc.querySelector('.workspace')) return;
  doc.title = '요리계산기';
  doc.documentElement.classList.toggle('cc-compact-mode',installedMode());
  const innerTitle = doc.querySelector('.header h1');
  if(innerTitle) innerTitle.textContent = '요리계산기';
  // Content styles are ONLY injected into the company iframe. Original HUB COOK is unaffected.
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/company-cook/company-style.css';
  stylesheet.onload = () => {
    if(frame!==iframe) return;
    try {
      // Companion UI stays company-only and is never loaded by the HUB COOK route.
      if(!mountCompanyTaskTabs(doc, iframe))return;
      mountCompanyMemo(doc, iframe);
      mountCompanyWorkbenchPolish(doc, iframe);
      mountCompanyFavoriteGroups(doc, iframe);
      mountCompanyWaterUnits(doc, iframe);
      sizeCompanyFrame(iframe, doc);
    } catch (error) {
      console.error('요리계산기 화면 크기 조정 실패',error);
      // A sizing issue must not hide the functional calculator.
      iframe.style.height = 'max(460px,80dvh)';
    } finally {
      if(frame===iframe && iframe.dataset.ccTabReloading!=='1') iframe.style.visibility = 'visible';
    }
  };
  stylesheet.onerror = () => {
    if(frame===iframe) showStatus('화면 스타일을 불러오지 못했습니다','잠시 후 다시 접속해 주세요.',true);
  };
  doc.head.append(stylesheet);
}
async function checkStatus(){
  // Never briefly show an unauthorised/offline app while checking its ON/OFF state.
  if(statusInFlight)return;
  statusInFlight = true;
  const current = ++seq;
  let timeoutId = null;
  try {
    if(!envReady || !supabase){showStatus('연결 설정 확인 필요','앱 서버 연결 설정이 없습니다.');return;}
    if(!navigator.onLine){showStatus('인터넷 연결 필요','온라인에서만 요리계산기를 이용할 수 있습니다.',true);return;}
    const {data,error} = await Promise.race([
      supabase.rpc('my_apps_company_cook_status'),
      new Promise((_,reject) => {timeoutId = window.setTimeout(() => reject(new Error('status timeout')),10000);}),
    ]);
    if(current!==seq)return;
    if(error){showStatus('운영 상태 조회 실패','인터넷 연결을 확인한 뒤 다시 시도해 주세요.',true);return;}
    if(data!==true){showStatus('요리계산기 이용 중지','운영자가 앱 이용을 중지했습니다.');return;}
    if(!frame){
      const layout = createAppShell();
      const iframe = document.createElement('iframe');
      iframe.className = 'cc-frame';iframe.title = '요리계산기';
      iframe.style.visibility = 'hidden';
      iframe.src = '/cook-preview/index.html?lacCookHostPreview=1';
      iframe.setAttribute('referrerpolicy','same-origin');
      iframe.addEventListener('load',() => installCompanyWorkspace(iframe));
      frame = iframe;
      layout.append(iframe);
    }
  } catch {
    if(current===seq)showStatus('연결 확인 실패','앱 상태를 확인할 수 없습니다.',true);
  } finally {
    if(timeoutId!==null) window.clearTimeout(timeoutId);
    statusInFlight = false;
  }
}

// Read-only bridge: same public recipe/process tables as HUB COOK, with no OAuth or writes.
window.addEventListener('message',async event => {
  if(!frame || event.origin!==window.location.origin || event.source!==frame.contentWindow ||
    !event.data || typeof event.data!=='object' || Array.isArray(event.data) ||
    event.data.type!=='lac-cook:recipes:request:v1')return;
  const {requestId,action} = event.data;
  if(typeof requestId!=='string' || !requestId || requestId.length>80)return;
  const sourceFrame = frame;
  const respond = result => {
    if(frame===sourceFrame && sourceFrame.contentWindow===event.source)
      event.source.postMessage({type:'lac-cook:recipes:response:v1',requestId,...result},event.origin);
  };
  if(action!=='list'){
    respond({ok:false,error:'요리계산기 앱에서는 레시피를 수정할 수 없습니다.'});return;
  }
  try {
    const [recipes,processes] = await Promise.all([
      supabase.from('lac_cook_recipe_entries').select('food_id,food_name,set_qty,cook_time,ingredients,source_kind,version').order('food_name'),
      supabase.from('lac_cook_process_entries').select('process_material_name,result_qty,process_time,ingredients,source_kind,version').order('process_material_name'),
    ]);
    if(frame!==sourceFrame)return;
    if(recipes.error || processes.error)throw new Error('공통 데이터 조회 실패');
    respond({ok:true,entries:recipes.data||[],canEdit:false,processReady:true,processEntries:processes.data||[]});
  } catch {
    respond({ok:false,error:'공통 요리·가공 DB 조회 실패'});
    if(frame===sourceFrame)showStatus('공통 데이터 연결 실패','최신 요리·가공 데이터를 불러오지 못했습니다. 다시 시도해 주세요.',true);
  }
});

function tick(){if(document.visibilityState==='visible'){void checkStatus();void checkCompanyCookVersion();}}
document.addEventListener('visibilitychange',tick);
window.addEventListener('focus',tick);
window.addEventListener('online',tick);
window.addEventListener('offline',() => {seq++;showStatus('인터넷 연결 필요','온라인에서만 이용할 수 있습니다.',true);});
window.setInterval(tick,15000);
// Apply PWA layout before first paint; do not show the HUB logo or login screen.
syncDisplayMode();
// No logo/status flash on fast connections: leave neutral background until the check resolves.
void checkStatus();
