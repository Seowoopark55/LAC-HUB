// TEST PILOT ONLY. Keep HUB mounted and host the existing BUILD React app
// inside an isolated shadow tree; switching the URL does not reload HUB.
import React from 'react';
import { createRoot } from 'react-dom/client';
import BuildApp from '../../build/src/App.jsx';
import buildCss from '../../build/src/styles.css?inline';
import hubReturnCss from './styles/hub-return.css?inline';
import sharedAccountTriggerCss from './styles/sharedAccountTrigger.css?inline';

let mounted = false;

export function mountEmbeddedBuild(host) {
  if (mounted) return;
  mounted = true;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  // BUILD's :root variables belong to its isolated host, not the HUB document.
  style.textContent = buildCss.replace(/:root\b/g, ':host') + hubReturnCss + sharedAccountTriggerCss + `
    :host { display: block; min-height: 100vh; color: #f4f4f5;
      font-family: Inter, Pretendard, "Noto Sans KR", system-ui, sans-serif;
      background: url('/brand/lac-one-shell-clean.png') center top / cover no-repeat, #030507; }
    /* Unified HUB side artwork remains outside a single centered BUILD panel.
       Keep overflow visible: existing fixed menus, dialogs and sticky header
       must not be clipped by the decorative frame. */
    .app {
      box-sizing:border-box;width:min(1280px,calc(100% - 80px));
      min-width:0;min-height:calc(100vh - 32px);margin:16px auto;
      border:1px solid rgba(213,163,67,.16);border-radius:17px;
      background:var(--bg,#09090a);
      box-shadow:0 26px 78px rgba(0,0,0,.52);
    }
    .app > .topbar {border-radius:16px 16px 0 0;}
    @media(max-width:980px) {
      .app {width:calc(100% - 40px);margin:12px auto;}
    }
    @media(max-width:760px) {
      .app {width:100%;min-height:100vh;margin:0;border:0;border-radius:0;box-shadow:none;}
      .app > .topbar {border-radius:0;}
    }
    /* A common content header, with BUILD's original navigation on its own
       inner row. Only the HUB-embedded BUILD receives these rules. */
    .lac-build-unified .lac-build-unified-header {
      display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
      align-items:center;gap:12px;min-height:64px;
    }
    .lac-build-unified .lac-build-unified-title {
      margin:0;color:#f4efe7;font-size:22px;font-weight:800;
      line-height:1.25;letter-spacing:-.025em;text-align:center;white-space:nowrap;
    }
    .lac-build-unified-header>.header-actions {
      margin-left:0;justify-self:end;min-width:0;
    }
    /* BUILD uses the identical chip dimensions provided by sharedAccountTriggerCss. */
    .lac-build-unified-header .lac-build-inline-return[data-hub-return] {
      box-sizing: border-box; display: inline-flex; align-items: center;
      justify-content: center; flex: 0 0 auto; gap: 7px;
      min-width: 111px; min-height: 38px; padding: 8px 10px;
      border: 1px solid rgba(226,180,105,.52);
      border-radius: 9px; background: rgba(159,109,43,.13); color: #f3d39d;
      font: inherit; font-size: 12px; font-weight: 750;
      line-height: 1.25; white-space: nowrap; cursor: pointer;
      justify-self:start;
    }
    .lac-build-unified-header .lac-build-inline-return[data-hub-return]:hover {
      border-color: #ecc58a;
      background: rgba(185,133,57,.23); color: #ffe8bd;
    }
    .lac-build-unified .topbar-inner {
      position:relative;min-height:58px;padding:0 20px;
      display:flex;align-items:center;justify-content:center;gap:0!important;
      border-top:1px solid rgba(226,180,105,.10);
    }
    .lac-build-unified .topbar-inner .brand-btn {
      display:none;
    }
    .lac-build-unified .brand-v114__copy {display:none;}
    .lac-build-unified .topbar-inner .nav {
      width:100%;max-width:100%;min-width:0;
      display:flex;align-items:center;justify-content:center;overflow-x:auto;
      padding:0 6px; scrollbar-width:thin;
      scrollbar-color:rgba(226,180,105,.48) transparent;
      overscroll-behavior-x:contain;
    }
    .lac-build-unified .topbar-inner .nav button {
      flex:0 0 auto;
    }
    @media (max-width: 760px) {
      :host {background:#030507;}
      .lac-build-unified .topbar-inner {padding:0 10px;}
      .lac-build-unified .topbar-inner .nav {width:100%;max-width:100%;justify-content:flex-start;}
      .lac-build-unified .topbar-inner .nav button {flex:0 0 auto;}
    }
    @media (max-width: 620px) {
      .lac-build-unified .lac-build-unified-header {row-gap:0;padding:7px 0;}
      .lac-build-unified .lac-build-unified-title {font-size:16px;}
      .lac-build-unified-header>.header-actions {grid-column:1 / -1;justify-self:end;}
      .lac-build-unified-header .lac-build-inline-return[data-hub-return] {
        min-width:103px; min-height:36px; font-size:11px; padding:7px 9px;
      }
    }
    `;
  shadow.appendChild(style);
  const appRoot = document.createElement('div');
  appRoot.id = 'lac-build-react-root';
  shadow.appendChild(appRoot);
  createRoot(appRoot).render(<BuildApp onHubReturn={() => {
    window.dispatchEvent(new CustomEvent('lac:navigate-hub'));
  }} />);
}
