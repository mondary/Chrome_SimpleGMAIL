// Studio: navigate between the full Gmail and Google Calendar pages in one tab.
// This same small switch is the only UI added to Calendar.
(() => {
  if (window.__pkStudioModules || window.top !== window.self) return;
  const current = location.hostname === 'mail.google.com' ? 'mail' :
    location.hostname === 'calendar.google.com' ? 'calendar' :
      location.hostname === 'drive.google.com' ? 'drive' : null;
  if (!current) return;
  window.__pkStudioModules = true;

  const fr = /^fr/i.test(document.documentElement.lang || navigator.language);
  const labels = { mail: 'Mail', calendar: fr ? 'Agenda' : 'Calendar', drive: 'Drive' };
  const hosts = { mail: 'mail.google.com', calendar: 'calendar.google.com', drive: 'drive.google.com' };
  // Official 2020 Gmail and Google Calendar marks (Wikimedia/Gstatic artwork).
  const logos = {
    mail: {
      viewBox: '52 42 88 66',
      paths: [
        ['#4285f4', 'M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6'],
        ['#34a853', 'M120 108h14c3.32 0 6-2.69 6-6V59l-20 15'],
        ['#fbbc04', 'M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2'],
        ['#ea4335', 'M72 74V48l24 18 24-18v26L96 92'],
        ['#c5221f', 'M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2'],
      ],
    },
    calendar: {
      viewBox: '0 0 200 200',
      transform: 'translate(3.75 3.75)',
      paths: [
        ['#ffffff', 'M148.882 43.618l-47.368-5.263-57.895 5.263L38.355 96.25l5.263 52.632 52.632 6.579 52.632-6.579 5.263-53.947z'],
        ['#1a73e8', 'M65.211 125.276c-3.934-2.658-6.658-6.539-8.145-11.671l9.132-3.763c.829 3.158 2.276 5.605 4.342 7.342 2.053 1.737 4.553 2.592 7.474 2.592 2.987 0 5.553-.908 7.697-2.724s3.224-4.132 3.224-6.934c0-2.868-1.132-5.211-3.395-7.026s-5.105-2.724-8.5-2.724h-5.276v-9.039H76.5c2.921 0 5.382-.789 7.382-2.368 2-1.579 3-3.737 3-6.487 0-2.447-.895-4.395-2.684-5.855s-4.053-2.197-6.803-2.197c-2.684 0-4.816.711-6.395 2.145s-2.724 3.197-3.447 5.276l-9.039-3.763c1.197-3.395 3.395-6.395 6.618-8.987 3.224-2.592 7.342-3.895 12.342-3.895 3.697 0 7.026.711 9.974 2.145 2.947 1.434 5.263 3.421 6.934 5.947 1.671 2.539 2.5 5.382 2.5 8.539 0 3.224-.776 5.947-2.329 8.184-1.553 2.237-3.461 3.947-5.724 5.145v.539c2.987 1.25 5.421 3.158 7.342 5.724 1.908 2.566 2.868 5.632 2.868 9.211s-.908 6.776-2.724 9.579c-1.816 2.803-4.329 5.013-7.513 6.618-3.197 1.605-6.789 2.421-10.776 2.421-3.697 0-7.96-1.329-11.894-3.987z'],
        ['#1a73e8', 'M121.25 79.961l-9.974 7.25-5.013-7.605 17.987-12.974h6.895v61.197h-9.895z'],
        ['#ea4335', 'M148.882 196.25l47.368-47.368-23.684-10.526-23.684 10.526-10.526 23.684z'],
        ['#34a853', 'M33.092 172.566l10.526 23.684h105.263v-47.368H43.618z'],
        ['#4285f4', 'M12.039-3.75C3.316-3.75-3.75 3.316-3.75 12.039v136.842l23.684 10.526 23.684-10.526V43.618h105.263l10.526-23.684L148.882-3.75z'],
        ['#188038', 'M-3.75 148.882v31.579c0 8.724 7.066 15.789 15.789 15.789h31.579v-47.368z'],
        ['#fbbc04', 'M148.882 43.618v105.263h47.368V43.618l-23.684-10.526z'],
        ['#1967d2', 'M196.25 43.618V12.039c0-8.724-7.066-15.789-15.789-15.789h-31.579v47.368z'],
      ],
    },
    drive: {
      viewBox: '0 0 87.3 78',
      paths: [
        ['#0066da', 'm6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z'],
        ['#00ac47', 'm43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z'],
        ['#ea4335', 'm73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z'],
        ['#00832d', 'm43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z'],
        ['#2684fc', 'm59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z'],
        ['#ffba00', 'm73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z'],
      ],
    },
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function logoNode(app) {
    const spec = logos[app];
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', spec.viewBox);
    svg.setAttribute('aria-hidden', 'true');
    const host = spec.transform ? document.createElementNS(SVG_NS, 'g') : svg;
    if (spec.transform) host.setAttribute('transform', spec.transform);
    for (const [fill, d] of spec.paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('fill', fill);
      path.setAttribute('d', d);
      host.append(path);
    }
    if (spec.transform) svg.append(host);
    return svg;
  }
  let active = false;
  let nav = null;
  let busy = false;
  let railCollapsed = false;
  let railToggle = null;

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
      const host = hosts[destination];
      if (!host || url.protocol !== 'https:' || url.hostname !== host) throw new Error('Invalid destination');
      // One window, one app: in-place navigation keeps the browser Back and
      // Google's native draft/unload handling. No popup, no extra window.
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
    element.setAttribute('aria-label', fr ? 'Mail, Agenda et Drive' : 'Mail, Calendar and Drive');
    for (const app of ['mail', 'calendar', 'drive']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.module = app;
      button.title = current === app ? labels[app] : fr ? `Ouvrir ${labels[app]} dans cet onglet` : `Open ${labels[app]} in this tab`;
      if (current === app) button.setAttribute('aria-current', 'page');
      if (current === app && app === 'mail') {
        // Like Gmail's own logo: clicking it always lands on the inbox.
        button.title = fr ? 'Boîte de réception' : 'Inbox';
        button.setAttribute('aria-label', fr ? 'Mail — boîte de réception' : 'Mail — inbox');
        button.addEventListener('click', () => { location.hash = '#inbox'; });
      } else if (current === app) {
        button.disabled = true;
        button.setAttribute('aria-label', `${labels[app]} — ${fr ? 'page actuelle' : 'current page'}`);
      } else {
        button.setAttribute('aria-label', labels[app]);
        button.addEventListener('click', () => navigate(app));
      }
      button.append(logoNode(app));
      element.append(button);
    }
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    element.append(status);
    return element;
  }

  // The native Gmail/Calendar logo link, in the #gb bar, sits left of search.
  // The switch takes its place so the apps are one segmented control.
  function logoAnchor() {
    const wanted = current === 'mail' ? /^gmail$/i : current === 'calendar' ? /^(agenda|calendar)$/i : /^drive$/i;
    for (const el of document.querySelectorAll('#gb [aria-label]')) {
      if (!wanted.test((el.getAttribute('aria-label') || '').trim())) continue;
      if (!el.getClientRects().length) continue;
      if (el.getBoundingClientRect().left < 0) continue;
      if (!el.querySelector('img')) continue;
      return el;
    }
    return null;
  }

  function hideAnchor(logo) {
    if (logo.dataset.pkLogoHidden === '1') return;
    logo.dataset.pkLogoHidden = '1';
    logo.style.display = 'none';
  }

  function restoreAnchors() {
    for (const el of document.querySelectorAll('[data-pk-logo-hidden="1"]')) {
      el.style.display = '';
      delete el.dataset.pkLogoHidden;
    }
  }

  function buildRailToggle() {
    const button = document.createElement('button');
    button.id = 'pk-drive-menu';
    button.type = 'button';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of ['M4 7h16', 'M4 12h16', 'M4 17h16']) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    button.append(svg);
    button.addEventListener('click', () => {
      railCollapsed = !railCollapsed;
      chrome.storage.local.set({ pkDriveRailCollapsed: railCollapsed });
      syncRailToggle();
      applyRail();
    });
    return button;
  }

  function syncRailToggle() {
    if (!railToggle) return;
    const label = railCollapsed
      ? fr ? 'Déplier le panneau latéral' : 'Expand sidebar'
      : fr ? 'Replier le panneau latéral' : 'Collapse sidebar';
    railToggle.setAttribute('aria-expanded', String(!railCollapsed));
    railToggle.setAttribute('aria-label', label);
    railToggle.title = label;
  }

  // Drive has no drawer of its own: collapse the rail by zeroing the first
  // grid track and letting the content column take the freed space.
  function railNodes() {
    const rail = document.querySelector('div.a-da-Mf-B');
    const wrapper = rail?.parentElement;
    const grid = wrapper?.parentElement;
    if (!rail || !wrapper || !grid || getComputedStyle(grid).display !== 'grid') return null;
    return { wrapper, grid };
  }

  function applyRail() {
    const nodes = railNodes();
    if (!nodes) return;
    const { wrapper, grid } = nodes;
    if (active && current === 'drive' && railCollapsed) {
      const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
      if (tracks.length < 2) return;
      const template = tracks.map((track, index) => (index === 0 ? '0px' : index === 1 ? '1fr' : track)).join(' ');
      if (wrapper.style.display !== 'none') wrapper.style.display = 'none';
      if (grid.style.gridTemplateColumns !== template) grid.style.gridTemplateColumns = template;
    } else {
      if (wrapper.style.display === 'none') wrapper.style.removeProperty('display');
      if (grid.style.gridTemplateColumns) grid.style.removeProperty('grid-template-columns');
    }
  }

  function ensureUI() {
    if (!active) {
      restoreAnchors();
      nav?.remove();
      nav = null;
      railToggle?.remove();
      railToggle = null;
      applyRail();
      return;
    }
    const logo = logoAnchor();
    if (!logo) return;
    hideAnchor(logo);
    if (!nav) nav = buildNav();
    if (nav.parentElement !== logo.parentElement || nav.nextElementSibling !== logo) {
      logo.parentElement.insertBefore(nav, logo);
    }
    if (current === 'drive') {
      if (!railToggle) railToggle = buildRailToggle();
      if (railToggle.parentElement !== logo.parentElement || railToggle.nextElementSibling !== nav) {
        logo.parentElement.insertBefore(railToggle, nav);
      }
      syncRailToggle();
      applyRail();
    } else {
      railToggle?.remove();
      railToggle = null;
      applyRail();
    }
  }

  async function loadState() {
    const { theme, enabled = {}, pkDriveRailCollapsed = false } =
      await chrome.storage.local.get(['theme', 'enabled', 'pkDriveRailCollapsed']);
    active = theme === 'theme-pk' && enabled['js-studio-modules'] !== false;
    railCollapsed = pkDriveRailCollapsed === true;
    ensureUI();
  }

  const observer = new MutationObserver(() => {
    if (document.body) observer.observe(document.body, { childList: true });
    ensureUI();
  });
  observer.observe(document.documentElement, { childList: true });
  if (document.body) observer.observe(document.body, { childList: true });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.theme || changes.enabled || changes.pkDriveRailCollapsed)) loadState().catch(() => {});
  });
  window.addEventListener('pageshow', () => loadState().catch(() => {}));
  loadState().catch(() => {});
})();
