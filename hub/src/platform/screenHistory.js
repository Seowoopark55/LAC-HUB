// LAC HUB browser routing.
// Primary screens and meaningful sub-views have stable, shareable paths while
// keeping the existing single-page application and in-memory screen model intact.
export const SCREEN_HISTORY_KEY = 'lac_hub_primary_screen_v1';
export const AUTH_RETURN_STORAGE_KEY = 'lac_hub_auth_return_v1';

const SCREENS = new Set([
  'hub', 'hub-board', 'company-start', 'paid-content-guide',
  'dashboard', 'fund', 'members', 'assets', 'accounts', 'questions',
  'suggestions', 'settings', 'info', 'combat', 'game-info', 'platform', 'layout',
]);

const GAME_INFO_PATHS = {
  info_crafts: '/game/crafting/',
  info_processes: '/game/processing/',
  info_quests: '/game/quests/',
  info_skill_ranks: '/game/skills/',
  modbook_catalog: '/game/modbooks/',
};

const FUND_PATHS = {
  ledger: '/company/fund/',
  weekly: '/company/fund/weekly/',
  review: '/company/fund/review/',
  balance: '/company/fund/balance/',
  settings: '/company/fund/settings/',
};

const ASSET_PATHS = {
  assets: '/company/assets/',
  returns: '/company/assets/returns/',
};

const SETTINGS_PATHS = {
  basic: '/company/settings/',
  modules: '/company/settings/modules/',
  cooking: '/company/settings/cooking/',
};

const PASS_REQUEST_PATHS = {
  pending: '/admin/applications/',
  recent: '/admin/applications/recent/',
  all: '/admin/applications/history/',
};

const INBOX_PATHS = {
  all: '/admin/inbox/',
  content: '/admin/inbox/content/',
  site: '/admin/inbox/site/',
  company: '/admin/inbox/company/',
};

const COMPANY_PATHS = {
  dashboard: '/company/',
  members: '/company/members/',
  accounts: '/company/accounts/',
  combat: '/company/combat/',
  info: '/company/combat/',
  questions: '/company/questions/',
  suggestions: '/company/suggestions/',
};

const PLATFORM_PATHS = {
  overview: '/admin/',
  companies: '/admin/companies/',
  modbooks: '/admin/modbooks/',
  contents: '/admin/content/',
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

function routeFromMap(path, map, extra = {}) {
  for (const [key, route] of Object.entries(map)) {
    if (pathEquals(path, route)) return { ...extra, key, canonicalPath: route };
  }
  return null;
}

export function routeForPathname(pathname) {
  const path = normalizedPathname(pathname);
  if (path === '/') return { kind: 'app', page: 'hub', canonicalPath: '/' };
  if (path === '/build') return { kind: 'build', page: 'hub', canonicalPath: '/build/' };
  if (path === '/cook') return { kind: 'cook', page: 'hub', canonicalPath: '/cook/' };

  // /game/ remains a backwards-compatible entry point and resolves to the
  // first category. Category routes are the canonical shareable URLs.
  if (path === '/game') return { kind: 'app', page: 'game-info', infoTable: 'info_crafts', canonicalPath: GAME_INFO_PATHS.info_crafts };
  const gameRoute = routeFromMap(path, GAME_INFO_PATHS, { kind: 'app', page: 'game-info' });
  if (gameRoute) return { ...gameRoute, infoTable: gameRoute.key };

  if (path === '/notices') return { kind: 'app', page: 'hub-board', hubBoardTab: 'notices', canonicalPath: '/notices/' };
  if (path === '/support') return { kind: 'app', page: 'hub-board', hubBoardTab: 'support', canonicalPath: '/support/' };
  if (path === '/company/start') return { kind: 'app', page: 'company-start', canonicalPath: '/company/start/' };
  if (path === '/company/access') return { kind: 'app', page: 'paid-content-guide', canonicalPath: '/company/access/' };

  const fundRoute = routeFromMap(path, FUND_PATHS, { kind: 'app', page: 'fund' });
  if (fundRoute) return { ...fundRoute, fundTab: fundRoute.key };
  const assetRoute = routeFromMap(path, ASSET_PATHS, { kind: 'app', page: 'assets' });
  if (assetRoute) return { ...assetRoute, assetTab: assetRoute.key };
  const settingsRoute = routeFromMap(path, SETTINGS_PATHS, { kind: 'app', page: 'settings' });
  if (settingsRoute) return { ...settingsRoute, settingsTab: settingsRoute.key };

  for (const [page, route] of Object.entries(COMPANY_PATHS)) {
    if (pathEquals(path, route)) return { kind: 'app', page, canonicalPath: route };
  }

  if (path === '/admin/type-scale') return { kind: 'app', page: 'layout', canonicalPath: '/admin/type-scale/' };
  const passRoute = routeFromMap(path, PASS_REQUEST_PATHS, { kind: 'app', page: 'platform', platformView: 'pass-requests' });
  if (passRoute) return { ...passRoute, adminPassView: passRoute.key };
  const inboxRoute = routeFromMap(path, INBOX_PATHS, { kind: 'app', page: 'platform', platformView: 'support' });
  if (inboxRoute) return { ...inboxRoute, platformInboxFilter: inboxRoute.key };
  for (const [platformView, route] of Object.entries(PLATFORM_PATHS)) {
    if (pathEquals(path, route)) return { kind: 'app', page: 'platform', platformView, canonicalPath: route };
  }

  return { kind: 'unknown', page: 'hub', canonicalPath: '/' };
}

export function routePathForScreen(screen, {
  platformView = 'overview',
  hubBoardTab = 'support',
  infoTable = 'info_crafts',
  fundTab = 'ledger',
  assetTab = 'assets',
  settingsTab = 'basic',
  adminPassView = 'pending',
  platformInboxFilter = 'all',
} = {}) {
  if (screen === 'hub') return '/';
  if (screen === 'game-info') return GAME_INFO_PATHS[infoTable] || GAME_INFO_PATHS.info_crafts;
  if (screen === 'hub-board') return hubBoardTab === 'notices' ? '/notices/' : '/support/';
  if (screen === 'company-start') return '/company/start/';
  if (screen === 'paid-content-guide') return '/company/access/';
  if (screen === 'fund') return FUND_PATHS[fundTab] || FUND_PATHS.ledger;
  if (screen === 'assets') return ASSET_PATHS[assetTab] || ASSET_PATHS.assets;
  if (screen === 'settings') return SETTINGS_PATHS[settingsTab] || SETTINGS_PATHS.basic;
  if (screen === 'platform') {
    if (platformView === 'pass-requests') return PASS_REQUEST_PATHS[adminPassView] || PASS_REQUEST_PATHS.pending;
    if (platformView === 'support' || platformView === 'suggestions') return INBOX_PATHS[platformInboxFilter] || INBOX_PATHS.all;
    return PLATFORM_PATHS[platformView] || '/admin/';
  }
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
  // Legacy callers without a URL should keep the old duplicate-entry guard.
  // Path-aware callers already compare both screen and pathname before calling.
  if (url == null && readPrimaryScreen(browserHistory.state) === nextScreen) return;
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
