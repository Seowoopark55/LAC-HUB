// COMPANY COOK admin control: isolated adapter for the existing authenticated HUB.
// Keeps company management and the main HUB renderer unchanged.
import {supabase} from '../lib/supabase.js';
import {mountMyAppsAdmin} from './myAppsAdmin.js';

const app = document.getElementById('app');
let checking = false;
let checkedAt = 0;
let authorizedUser = null;
let isAdmin = false;
const CACHE_MS = 20000;

function onAdminRoute() {
  return /^\/admin(?:\/|$)/.test(location.pathname);
}

async function mountIfAllowed() {
  if (!supabase || !onAdminRoute() || !app || app.querySelector('.lac-my-apps') || checking) return;
  checking = true;
  try {
    // The UI is cosmetic; only DB RPCs authorize mutations.
    const {data: {user} = {}, error: authError} = await supabase.auth.getUser();
    if (authError || !user) { isAdmin = false; authorizedUser = null; return; }
    if (authorizedUser !== user.id || Date.now() - checkedAt > CACHE_MS) {
      const {data, error} = await supabase.rpc('platform_is_admin');
      authorizedUser = user.id;
      checkedAt = Date.now();
      isAdmin = !error && data === true;
    }
    if (!isAdmin || !onAdminRoute() || !app.isConnected || app.querySelector('.lac-my-apps')) return;
    // Existing admin view must be present; avoid inserting controls into a login screen.
    if (!app.querySelector('[data-action],button')) return;
    const state = {platformAdmin:true, page:'platform', session:{user}};
    mountMyAppsAdmin(app, state, supabase);
  } catch {
    // Never expose management UI when identity checks fail.
  } finally {
    checking = false;
  }
}

// The HUB replaces #app contents on navigation and refresh.
// A MutationObserver mounts the control without interfering with the HUB renderer.
const observer = new MutationObserver(() => { void mountIfAllowed(); });
observer.observe(app, {childList:true,subtree:false});
window.addEventListener('popstate', () => { void mountIfAllowed(); });
void mountIfAllowed();
