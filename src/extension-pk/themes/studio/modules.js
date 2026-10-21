// Studio: navigate between the full Gmail and Google Calendar pages in one tab.
// This same small switch is the only UI added to Calendar.
(() => {
  if (window.__pkStudioModules || window.top !== window.self) return;
  const current = location.hostname === 'mail.google.com' ? 'mail' :
    location.hostname === 'calendar.google.com' ? 'calendar' : null;
  if (!current) return;
  window.__pkStudioModules = true;

  const fr = /^fr/i.test(document.documentElement.lang || navigator.language);
  const labels = { mail: 'Mail', calendar: fr ? 'Agenda' : 'Calendar' };
  const icons = { mail: ['M3 6h18v13H3Z', 'm3 6 9 7 9-7'], calendar: ['M4 5h16v16H4Z', 'M4 10h16M8 3v4M16 3v4'] };
  let active = false;
  let nav = null;
  let busy = false;

  function accountEmail() {
    // Google's active account button, not the other accounts in its popover.
    for (const el of document.querySelectorAll('#gb [aria-label]')) {
      if (!el.getClientRects().length) continue;
      const email = el.getAttribute('aria-label').match(/[^\s()<>@]+@[^\s()<>@]+\.[^\s()<>@]+/)?.[0];
      if (email) return email;
    }
    return '';
  }

  async function navigate(destination) {
    if (busy || destination === current) return;
    busy = true;
    nav.setAttribute('aria-busy', 'true');
    const status = nav.querySelector('[role=status]');
    status.textContent = '';
    try {
      const result = await chrome.runtime.sendMessage({ type: 'pk-module-target', destination, account: accountEmail() });
      if (!result?.ok) throw new Error('Navigation unavailable');
      const url = new URL(result.url);
      const host = destination === 'mail' ? 'mail.google.com' : 'calendar.google.com';
      if (url.protocol !== 'https:' || url.hostname !== host) throw new Error('Invalid destination');
      // Normal navigation preserves Google's native draft/unload handling and
      // browser Back. No iframe, synthetic Google UI, or extra browser tab.
      location.assign(url.href);
    } catch {
      status.textContent = fr ? 'Rechargez la page pour réactiver la bascule.' : 'Reload the page to restore the switch.';
    } finally {
      busy = false;
      nav?.removeAttribute('aria-busy');
    }
  }

  function buildNav() {
    const element = document.createElement('nav');
    element.id = 'pk-studio-modules';
    element.setAttribute('aria-label', fr ? 'Mail et Agenda' : 'Mail and Calendar');
    for (const app of ['mail', 'calendar']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.module = app;
      button.title = current === app ? labels[app] : fr ? `Ouvrir ${labels[app]} dans cet onglet` : `Open ${labels[app]} in this tab`;
      if (current === app) {
        button.setAttribute('aria-current', 'page');
        button.disabled = true;
      }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      for (const d of icons[app]) {
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', d);
        svg.append(path);
      }
      const label = document.createElement('span');
      label.textContent = labels[app];
      button.append(svg, label);
      button.addEventListener('click', () => navigate(app));
      element.append(button);
    }
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    element.append(status);
    return element;
  }

  function ensureUI() {
    if (!active) {
      nav?.remove();
      nav = null;
      return;
    }
    if (!document.body || nav?.isConnected) return;
    nav = buildNav();
    document.body.append(nav);
  }

  async function loadState() {
    const { theme, enabled = {} } = await chrome.storage.local.get(['theme', 'enabled']);
    active = theme === 'theme-pk' && enabled['js-studio-modules'] !== false;
    ensureUI();
  }

  const observer = new MutationObserver(() => {
    if (document.body) observer.observe(document.body, { childList: true });
    ensureUI();
  });
  observer.observe(document.documentElement, { childList: true });
  if (document.body) observer.observe(document.body, { childList: true });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.theme || changes.enabled)) loadState().catch(() => {});
  });
  window.addEventListener('pageshow', () => loadState().catch(() => {}));
  loadState().catch(() => {});
})();
