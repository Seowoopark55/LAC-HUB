// Keep COMPANY COOK outside the HUB authentication and company-pass boot flow.
if (/^\/company-cook(?:\/|$)/.test(window.location.pathname)) {
  await import('./companyCookEntry.js');
} else {
  await import('./main.js');
}
