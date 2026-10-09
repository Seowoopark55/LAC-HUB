// LAC HUB browser routing.
// Primary screens now have stable, shareable paths while keeping the existing
// single-page application and in-memory screen model intact.
export const SCREEN_HISTORY_KEY = 'lac_hub_primary_screen_v1';
export const AUTH_RETURN_STORAGE_KEY = 'lac_hub_auth_return_v1';

const SCREENS = new Set([
  'hub', 'hub-board', 'company-start', 'paid-content-guide',
  'dashboard', 'fund', 'members', 'assets', 'accounts', 'questions',
  'suggestions', 'settings', 'info', 'combat', 'game-info', 'platform', 'layout',
]);

const COMPANY_PATHS = {
  dashboard: '/company/',
  fund: '/company/fund/',
  members: '/company/members/',
  assets: '/company/assets/',
  accounts: '/company/accounts/',
  combat: '/company/combat/',
  info: '/company/combat/',
  questions: '/company/questions/',
  suggestions: '/company/suggestions/',
  settings: '/company/settings/',
};

const PLATFORM_PATHS = {
  overview: '/admin/',
  companies: '/admin/companies/',
  'pass-requests': '/admin/applications/',
  modbooks: '/admin/modbooks/',
  contents: '/admin/content/',
  support: '/admin/inbox/',
  suggestions: '/admin/inbox/',
};

function normalizedPathname(value) {
  let path = String(value || '/').split('?')[0].split('#')[0] || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function pathEquals(left, right) {
  return normalizedPathname(left) === normalizedPathname(right);
}

export function routeForPathname(pathname) {
  const path = normalizedPathname(pathname);
  if (path === '/') return { kind: 'app', page: 'hub', canonicalPath: '/' };
  if (path === '/build') return { kind: 'build', page: 'hub', canonicalPath: '/build/' };
  if (path === '/cook') return { kind: 'cook', page: 'hub', canonicalPath: '/cook/' };
  if (path === '/game') return { kind: 'app', page: 'game-info', canonicalPath: '/game/' };
  if (path === '/notices') return { kind: 'app', page: 'hub-board', hubBoardTab: 'notices', canonicalPath: '/notices/' };
  if (path === '/support') return { kind: 'app', page: 'hub-board', hubBoardTab: 'support', canonicalPath: '/support/' };
  if (path === '/company/start') return { kind: 'app', page: 'company-start', canonicalPath: '/company/start/' };
  if (path === '/company/access') return { kind: 'app', page: 'paid-content-guide', canonicalPath: '/company/access/' };

  for (const [page, route] of Object.entries(COMPANY_PATHS)) {
    if (pathEquals(path, route)) return { kind: 'app', page, canonicalPath: route };
  }

  if (path === '/admin/type-scale') return { kind: 'app', page: 'layout', canonicalPath: '/admin/type-scale/' };
  for (const [platformView, route] of Object.entries(PLATFORM_PATHS)) {
    if (pathEquals(path, route)) return { kind: 'app', page: 'platform', platformView, canonicalPath: route };
  }

  return { kind: 'unknown', page: 'hub', canonicalPath: '/' };
}

export function routePathForScreen(screen, { platformView = 'overview', hubBoardTab = 'support' } = {}) {
  if (screen === 'hub') return '/';
  if (screen === 'game-info') return '/game/';
  if (screen === 'hub-board') return hubBoardTab === 'notices' ? '/notices/' : '/support/';
  if (screen === 'company-start') return '/company/start/';
  if (screen === 'paid-content-guide') return '/company/access/';
  if (screen === 'platform') return PLATFORM_PATHS[platformView] || '/admin/';
  if (screen === 'layout') return '/admin/type-scale/';
  return COMPANY_PATHS[screen] || '/';
}

export function isKnownHubPath(pathname) {
  return routeForPathname(pathname).kind !== 'unknown';
}

export function safeInternalReturnPath(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  try {
    const url = new URL(raw, 'https://lachub.cloud');
    const route = routeForPathname(url.pathname);
    if (route.kind === 'unknown') return '/';
    // OAuth credentials never belong in a stored return path.
    for (const key of ['code','access_token','refresh_token','provider_token','provider_refresh_token','error','error_code','error_description']) {
      url.searchParams.delete(key);
    }
    return `${route.canonicalPath}${url.search}`;
  } catch {
    return '/';
  }
}

export function readPrimaryScreen(entry) {
  const value = entry && typeof entry === 'object' ? entry[SCREEN_HISTORY_KEY] : null;
  return SCREENS.has(value) ? value : null;
}

export function initializePrimaryScreenHistory(browserHistory, initialScreen = 'hub', url = null) {
  const previous = readPrimaryScreen(browserHistory.state);
  if (previous) return previous;
  browserHistory.replaceState(
    {...(browserHistory.state || {}), [SCREEN_HISTORY_KEY]: initialScreen},
    '',
    url || undefined,
  );
  return initialScreen;
}

export function recordPrimaryScreen(browserHistory, nextScreen, url = null) {
  if (!SCREENS.has(nextScreen)) throw new Error('Invalid HUB screen');
  browserHistory.pushState(
    {...(browserHistory.state || {}), [SCREEN_HISTORY_KEY]: nextScreen},
    '',
    url || undefined,
  );
}

export function replacePrimaryScreen(browserHistory, nextScreen, url = null) {
  if (!SCREENS.has(nextScreen)) throw new Error('Invalid HUB screen');
  browserHistory.replaceState(
    {...(browserHistory.state || {}), [SCREEN_HISTORY_KEY]: nextScreen},
    '',
    url || undefined,
  );
}
