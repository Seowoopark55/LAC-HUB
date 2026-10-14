// COMPANY COOK bypasses all HUB login/entitlement flows by loading only its own app.
if (/^\/company-cook(?:\/|$)/.test(window.location.pathname)) {
  await import('./companyCookEntry.js');
} else {
  await import('./main.js');
  // Administrator control mounts only on authenticated /admin routes.
  await import('./platform/myAppsBootstrap.js');
}
