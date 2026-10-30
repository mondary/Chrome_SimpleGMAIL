// One Studio-owned strip for categories AND labels. Gmail only owns the mail view.
// Keep the same buttons across navigation; never swap a native strip for a clone.
(() => {
  if (window.__pkStudioLabelTabs) return;
  window.__pkStudioLabelTabs = true;

  const fr = /^fr/i.test(document.documentElement.lang || navigator.language);
  const NAMES = fr
    ? { primary: 'Principale', promotions: 'Promotions', social: 'Réseaux sociaux', updates: 'Notifications', forums: 'Forums', purchases: 'Achats', newsletter: 'Newsletters' }
    : { primary: 'Primary', promotions: 'Promotions', social: 'Social', updates: 'Updates', forums: 'Forums', purchases: 'Purchases', newsletter: 'Newsletters' };
  const PATHS = {
    primary: 'M4 4h16v16H4z M4 13h5l2 3h2l2-3h5',
    promotions: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
    social: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    updates: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01',
    forums: 'M3 3h18v14H8l-5 4z M7 7h10 M7 11h7',
    purchases: 'M6 8h12l-1.2 12H7.2z M9 8V6.5a3 3 0 0 1 6 0V8',
    label: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
    newsletter: 'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',
  };
  // Gmail's category accents, kept on the icon, unread count and active underline.
  const COLORS = {
    primary: '#1a73e8', promotions: '#d93075', social: '#f9ab00',
    updates: '#188038', forums: '#7b4bb7', purchases: '#e08a00',
    newsletter: '#0891b2', label: '#52525b',
  };
  function inkOf(hex) {
    const value = parseInt(hex.slice(1), 16);
    const lum = [value >> 16 & 255, value >> 8 & 255, value & 255]
      .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    return lum > 0.3 ? '#18181b' : '#fff';
  }
  // Native INBOX tabs (not #category/ label views) exclude archived mail and keep
  // Gmail's category-move controller alive in BOTH directions.
  const nativeCategories = new Set(['primary', 'promotions', 'social', 'updates', 'forums']);
  const categoryRoute = id => nativeCategories.has(id) ? '#inbox' : `#search/${encodeURIComponent(`in:inbox category:${id}`)}`;
  const ensurePurchases = list => list.some(c => c.id === 'purchases')
    ? list
    : [...list, { id: 'purchases', name: NAMES.purchases }];
  const KEYS = ['theme', 'enabled', 'pkLabelTabs', 'pkCategoryLabels'];
  let active = false;
  let labels = [];
  let renames = {};
  let categories = ensurePurchases([{ id: 'primary', name: NAMES.primary }]);
  let counts = new Map();
  const exactCounts = new Map();
  const pendingCounts = new Set();
  let countRequestSignature = '';
  let labelCounts = new Map();
  let routes = new Map();
  let host = null;
  let signature = '';
  let scheduled = false;
  let pendingCategory = '';
  const measure = document.createElement('canvas').getContext('2d');
  const buttons = new Map();
  // Per-account, per-language metadata only; no mail data. Allows direct label reloads.
  const cacheKey = `pk-studio-tabs:${location.pathname}:${fr ? 'fr' : 'en'}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (Array.isArray(cached) && cached.length && cached.every(c => NAMES[c.id] && typeof c.name === 'string')) categories = ensurePurchases(cached);
  } catch {}

  const strip = document.createElement('nav');
  strip.id = 'pk-studio-tabs';
  strip.setAttribute('role', 'tablist');
  strip.setAttribute('aria-label', fr ? 'Catégories de courriels' : 'Mail categories');
  const style = document.createElement('style');
  style.textContent = `
    [data-pk-studio-tabs-host] .aKh,
    [data-pk-studio-tabs-native]{display:none!important}
    [data-pk-studio-tabs-native][data-pk-studio-drop-active]{display:block!important;position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:visible!important;opacity:0!important;visibility:visible!important;z-index:2147483646!important;pointer-events:none!important}
    [data-pk-studio-drop-reveal]{display:block!important;position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;overflow:visible!important;opacity:0!important;pointer-events:none!important;z-index:2147483646!important}
    [data-pk-studio-drop-tab]{position:fixed!important;left:var(--pk-studio-drop-left)!important;top:var(--pk-studio-drop-top)!important;width:var(--pk-studio-drop-width)!important;height:var(--pk-studio-drop-height)!important;display:block!important;margin:0!important;padding:0!important;transform:none!important;opacity:0!important;visibility:visible!important;z-index:2147483647!important;pointer-events:auto!important}
    #pk-studio-tabs{display:flex!important;align-items:stretch;gap:0;box-sizing:border-box;width:100%;min-width:0;max-width:100%;height:44px;flex:none;overflow-x:auto;overflow-y:hidden;margin:0 0 12px;padding:0;border:1px solid #e4e4e7;border-radius:10px;background:#fff;scrollbar-width:thin;color:#52525b}
    #pk-studio-tabs .pk-studio-tab{position:relative;appearance:none;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;flex:1 1 0;min-width:0;max-width:none;height:42px;margin:0;padding:0 12px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:inherit;font:500 13px -apple-system,"Segoe UI",Roboto,sans-serif;white-space:nowrap;cursor:pointer}
    #pk-studio-tabs .pk-studio-tab:hover{background:#f4f4f5;color:#18181b}
    #pk-studio-tabs .pk-studio-tab[aria-selected="true"]{background:transparent;color:#18181b;border-bottom-color:var(--pk-tab-color,#18181b);font-weight:600}
    #pk-studio-tabs .pk-studio-tab[aria-selected="true"]:hover{background:#f4f4f5;color:#18181b}
    #pk-studio-tabs .pk-studio-tab:focus-visible{outline:2px solid #18181b;outline-offset:-4px}
    #pk-studio-tabs .pk-studio-tab-icon{position:relative;display:grid;place-items:center;flex:none;width:24px;height:24px}
    #pk-studio-tabs svg{display:block;width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;color:var(--pk-tab-color,#52525b)}
    #pk-studio-tabs .pk-studio-tab-text{display:block;flex:none}
    #pk-studio-tabs .pk-studio-tab-count{position:absolute;top:-8px;right:-3px;display:grid;place-items:center;min-width:15px;height:15px;padding:0 4px;border-radius:999px;background:var(--pk-tab-color,#52525b);color:var(--pk-tab-ink,#fff);font-size:10px;font-weight:700;line-height:1;box-shadow:0 0 0 1px #fff;font-variant-numeric:tabular-nums}
    #pk-studio-tabs .pk-studio-tab-count[hidden]{display:none}
    #pk-studio-tabs[data-compact] .pk-studio-tab{flex:0 0 28px;width:28px;min-width:28px;padding:0 4px;gap:0}
    #pk-studio-tabs[data-compact] .pk-studio-tab-text{display:none}
  `;

  const decode = value => { try { return decodeURIComponent(value); } catch { return value; } };
  const hash = () => decode(location.hash || '#inbox');
  const normal = text => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const canonical = value => value.replace(/\+/g, ' ');
  const attr = (node, key, value) => { if (node.getAttribute(key) !== value) node.setAttribute(key, value); };

  function categoryOf(tab) {
    if (NAMES[tab.dataset.pkCategory]) return tab.dataset.pkCategory;
    const name = normal(tab.querySelector('.aKz')?.dataset.pkOriginal || tab.querySelector('.aKz')?.textContent);
    const matchers = [
      ['primary', /^(principale?|primary|inbox|boite de reception)$/],
      ['promotions', /^promotions?$/], ['social', /^(reseaux sociaux|social)$/],
      ['updates', /^(notifications?|updates?)$/], ['forums', /^forums?$/],
      ['purchases', /^(achats?|purchases?)$/], ['newsletter', /^newsletters?$/],
    ];
    return matchers.find(([, pattern]) => pattern.test(name))?.[0] || '';
  }

  // Gmail rewrites search hashes with `+` for spaces (and may reorder terms),
  // so a strict route comparison loses the selected tab after navigation.
  function categoryFromSearch(value) {
    const match = value.match(/^#search\/(.+)$/);
    if (!match) return '';
    const id = match[1].replace(/\+/g, ' ').match(/(?:^|\s)category:([a-z]+)(?:\s|$)/i)?.[1];
    return id && NAMES[id] ? id : '';
  }

  // Native .aDG badges count NEW mail, not unread mail. Never use them here.
  function digitsOf(value) {
    const count = Number((value || '').replace(/\D/g, ''));
    return Number.isSafeInteger(count) && count > 0 ? count : 0;
  }
  function countIn(text) {
    const unread = text.match(/([\d][\d\s.,]*)\s*(?:(?:messages?|conversations?|e-?mails?)\s+)?(?:non\s+lu(?:s|e|es)?|unread)/i);
    if (unread) return digitsOf(unread[1]);
    return 0;
  }

  // Gmail's sidebar carries the true unread totals for categories and labels
  // (e.g. "Job 1"). Read them locally; no network request.
  function sidebarCounts() {
    const map = new Map();
    // Gmail's first role=navigation is often the Mail/Chat/Meet rail, NOT labels.
    for (const link of document.querySelectorAll('a[href*="#"]')) {
      if (link.closest('#pk-studio-tabs')) continue;
      const hash = canonical(decode(link.hash || ''));
      if (!/^#(?:category\/[a-z]+|label\/.+|purchases)$/.test(hash)) continue;
      // Real Gmail puts .bsU beside the anchor, inside its .aim row.
      const badge = link.querySelector('.bsU') || link.closest('.aim')?.querySelector('.bsU');
      let value = badge ? digitsOf(badge.textContent) : 0;
      if (!value) {
        value = countIn(`${link.getAttribute('aria-label') || ''} ${link.getAttribute('title') || ''} ${link.textContent || ''}`);
      }
      map.set(hash, value);
    }
    return map;
  }

  function nativeLists() {
    return [...document.querySelectorAll('[role="tablist"]')].filter(list => list !== strip && list.querySelector('[role="tab"] .aKz'));
  }

  function readCategories(lists) {
    const side = sidebarCounts();
    labelCounts = side;
    // Ignore a cached inbox inside an explicitly hidden Gmail view.
    const list = lists.find(el => !el.closest('[aria-hidden="true"]') && el.closest('[role="main"]')?.getClientRects().length) || lists[0];
    const found = [...(list?.querySelectorAll('[role="tab"]:not([data-pk-label-tab])') || [])].map(tab => ({
      id: categoryOf(tab), name: tab.querySelector('.aKz')?.dataset.pkOriginal || tab.querySelector('.aKz')?.textContent?.trim(),
    })).filter(c => c.id && c.name);
    const unique = found.length ? ensurePurchases(found
      .filter((c, i) => found.findIndex(other => other.id === c.id) === i)
      .map(({ id, name }) => ({ id, name }))) : categories;
    counts = new Map(exactCounts);
    // Before the session reader is ready, a COMPLETE visible list is exact too.
    // Never count only page 1 as a mailbox total.
    const main = [...document.querySelectorAll('[role="main"]')].find(node => node.getClientRects().length);
    const pages = main?.querySelector('.Dj');
    const numbers = [...(pages?.querySelectorAll('.ts') || [])].map(node => digitsOf(node.textContent));
    const rows = [...(main?.querySelectorAll('.zA') || [])].filter(node => node.getClientRects().length);
    const current = canonical(hash());
    const query = current.startsWith('#search/') ? current.slice(8).trim().split(/\s+/) : [];
    const pureCategory = query.length === 2 && query.includes('in:inbox') && query.some(term => /^category:[a-z]+$/.test(term));
    const selectedTab = lists.flatMap(l => [...l.querySelectorAll('[role="tab"][aria-selected="true"]')]).find(tab => categoryOf(tab));
    const id = pureCategory ? categoryFromSearch(current)
      : current === '#inbox' && selectedTab ? categoryOf(selectedTab) : '';
    const paneId = selectedTab?.getAttribute('aria-controls');
    const rightPane = current !== '#inbox' || !paneId || rows.every(row => row.closest('[role="tabpanel"]')?.id === paneId);
    if (id && rightPane && numbers.length === 3 && numbers[0] === 1 && numbers[1] === numbers[2] && rows.length === numbers[2]) {
      counts.set(id, rows.filter(row => row.classList.contains('zE')).length);
      pendingCounts.delete(id);
    }
    if (JSON.stringify(categories) !== JSON.stringify(unique)) {
      categories = unique;
      try { sessionStorage.setItem(cacheKey, JSON.stringify(categories)); } catch {}
    }
    requestCounts();
  }

  function requestCounts(force = false) {
    const request = { active, ids: categories.map(item => item.id) };
    const next = JSON.stringify(request);
    if (!force && next === countRequestSignature) return;
    countRequestSignature = next;
    document.dispatchEvent(new CustomEvent('pk-studio-unread-request', { detail: next }));
  }
  document.addEventListener('pk-studio-unread-ready', () => requestCounts(true));
  document.addEventListener('pk-studio-unread-result', event => {
    try {
      const result = JSON.parse(event.detail);
      const account = location.pathname.match(/\/mail\/u\/(\d+)\//)?.[1] || (location.protocol === 'file:' ? 'preview' : '');
      if (!account || result.account !== account) return;
      for (const [id, value] of Object.entries(result.counts || {})) {
        if (!NAMES[id]) continue;
        if (Number.isSafeInteger(value) && value >= 0) { exactCounts.set(id, value); pendingCounts.delete(id); }
        else pendingCounts.add(id); // Keep a previously verified total during a temporary failure.
      }
      schedule();
    } catch {}
  });

  function labelRoute(label) {
    // System labels (e.g. Purchases) may have a Gmail-specific route, not #label/….
    for (const link of document.querySelectorAll('a[href*="#"]')) {
      if (link.closest('#pk-studio-tabs')) continue;
      const name = link.getAttribute('title') || link.getAttribute('aria-label') || link.textContent;
      if (normal(name) !== normal(label)) continue;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
        routes.set(label, url.hash);
        return url.hash;
      }
    }
    return routes.get(label) || `#label/${encodeURIComponent(label)}`;
  }

  function model() {
    const items = categories.map(c => ({
      key: c.id, name: renames[c.id] || c.name, route: categoryRoute(c.id),
      icon: c.id, color: COLORS[c.id] || COLORS.label, count: counts.get(c.id) ?? null,
      kind: 'unread', pending: pendingCounts.has(c.id),
    }));
    // Purchases is now a category: a stored label with the same name would only
    // duplicate its tab (even when the category has been renamed).
    const shown = new Set(items.map(item => normal(item.name)));
    const native = new Set(categories.map(c => normal(NAMES[c.id])).filter(Boolean));
    for (const label of labels) {
      if (shown.has(normal(label)) || native.has(normal(label))) continue;
      const route = labelRoute(label);
      if (items.some(item => decode(item.route) === decode(route))) continue;
      const icon = /achat|purchase|commande|shop|panier/.test(normal(label)) ? 'purchases' : /newsletter/.test(normal(label)) ? 'newsletter' : 'label';
      const color = icon === 'purchases' ? COLORS.purchases : icon === 'newsletter' ? COLORS.newsletter : COLORS.label;
      const count = labelCounts.get(canonical(decode(route))) || 0;
      items.push({ key: `label:${label}`, name: label, route, icon, color, count, kind: 'unread' });
    }
    return items;
  }

  function resize() {
    if (!strip.isConnected || !strip.clientWidth) return;
    // Measure intrinsic text independently of display:none and selection; never toggle
    // the compact attribute just to measure (that caused resize/observer oscillations).
    const context = measure;
    if (!context) return;
    const widths = [...buttons.values()].map(button => {
      context.font = getComputedStyle(button).font;
      const text = button.querySelector('.pk-studio-tab-text');
      return context.measureText(text.textContent).width + 24 + 8 + 24;
    });
    const compact = widths.reduce((total, width) => total + width, 0) > strip.clientWidth;
    if (strip.hasAttribute('data-compact') !== compact) {
      strip.toggleAttribute('data-compact', compact);
      revealButton([...buttons.values()].find(button => button.getAttribute('aria-selected') === 'true'));
    }
  }

  // Keep the active tab visible when the strip scrolls horizontally.
  let lastSelected = '';
  function revealButton(button) {
    if (!button || !strip.isConnected || strip.scrollWidth <= strip.clientWidth) return;
    const view = strip.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    if (rect.left < view.left) strip.scrollLeft -= view.left - rect.left;
    else if (rect.right > view.right) strip.scrollLeft += rect.right - view.right;
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(strip);
  document.fonts?.ready.then(resize);
  window.addEventListener('resize', resize);

  // The strip must sit exactly on the mail column, whose width follows the
  // Margin tweak (--pk-margin-side). Measure the visible main region and refit
  // whenever it resizes (web font, panel toggle, margin slider).
  let column = null;
  let columnObserver = null;
  function mailColumn() {
    const visible = el => el.getClientRects().length && !el.closest('[aria-hidden="true"]');
    // .AO is the column constrained by the Margin tweak; role="main" covers
    // views where Gmail does not mark that column.
    return [...document.querySelectorAll('.AO')].find(visible)
      || [...document.querySelectorAll('[role="main"]')].find(visible) || null;
  }
  function fitColumn() {
    if (!strip.isConnected || !host) return;
    const target = mailColumn();
    if (!target) {
      strip.style.removeProperty('width');
      strip.style.removeProperty('margin-left');
      return;
    }
    if (target !== column) {
      if (typeof ResizeObserver === 'function') {
        columnObserver ||= new ResizeObserver(fitColumn);
        columnObserver.disconnect();
        columnObserver.observe(target);
      }
      column = target;
    }
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(host);
    const edge = host.getBoundingClientRect().left
      + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
    const available = host.clientWidth
      - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const left = Math.max(0, rect.left - edge);
    const width = Math.max(0, Math.min(rect.width, available - left));
    strip.style.width = `${width}px`;
    strip.style.marginLeft = `${left}px`;
    resize();
  }
  window.addEventListener('resize', fitColumn);

  function render(items, lists) {
    const nextSignature = JSON.stringify(items);
    if (signature !== nextSignature) {
      signature = nextSignature;
      const keep = new Set(items.map(item => item.key));
      for (const [key, button] of buttons) if (!keep.has(key)) { button.remove(); buttons.delete(key); }
      items.forEach((item, index) => {
        let button = buttons.get(item.key);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'pk-studio-tab';
          button.setAttribute('role', 'tab');
          button.dataset.key = item.key;
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS(svg.namespaceURI, 'path');
          path.setAttribute('d', PATHS[item.icon] || PATHS.label);
          svg.append(path);
          const text = document.createElement('span');
          text.className = 'pk-studio-tab-text';
          const count = document.createElement('span');
          count.className = 'pk-studio-tab-count';
          count.setAttribute('aria-hidden', 'true');
          count.hidden = true;
          const icon = document.createElement('span');
          icon.className = 'pk-studio-tab-icon';
          icon.append(svg, count);
          button.append(icon, text);
          buttons.set(item.key, button);
        }
        const label = item.count === null ? '…' : item.count ? (item.count > 999 ? '999+' : String(item.count)) : '';
        const text = button.querySelector('.pk-studio-tab-text');
        const count = button.querySelector('.pk-studio-tab-count');
        if (text.textContent !== item.name) text.textContent = item.name;
        if (count.textContent !== label) count.textContent = label;
        if (count.hidden !== !label) count.hidden = !label;
        if (button.style.getPropertyValue('--pk-tab-color') !== item.color) button.style.setProperty('--pk-tab-color', item.color);
        const ink = inkOf(item.color);
        if (button.style.getPropertyValue('--pk-tab-ink') !== ink) button.style.setProperty('--pk-tab-ink', ink);
        const kind = fr ? (item.count > 1 ? 'non lus' : 'non lu') : 'unread';
        const description = item.count === null ? (fr ? 'décompte en attente' : 'count pending')
          : `${item.count} ${kind}${item.pending ? (fr ? ' · actualisation en attente' : ' · refresh pending') : ''}`;
        const aria = `${item.name}, ${description}`;
        button.dataset.name = item.name;
        attr(button, 'aria-label', aria);
        attr(button, 'title', `${item.name} · ${description}`);
        button.dataset.route = item.route;
        if (strip.children[index] !== button) strip.insertBefore(button, strip.children[index] || null);
      });
    }
    const current = hash();
    // Gmail's native category views are the same buckets as the inbox searches.
    const currentKey = canonical(current);
    // Gmail's native category views are the same buckets as the inbox searches.
    const aliases = {
      purchases: ['#purchases', '#category/purchases'],
      promotions: ['#category/promotions'], social: ['#category/social'],
      updates: ['#category/updates'], forums: ['#category/forums'],
    };
    let selected = [...items].sort((a, b) => b.route.length - a.route.length)
      .find(item => {
        const route = canonical(decode(item.route));
        return currentKey === route || currentKey.startsWith(`${route}/`)
          || (aliases[item.key] || []).some(alias => canonical(alias) === currentKey);
      })?.key;
    if (!selected) {
      const fromSearch = categoryFromSearch(current);
      selected = items.some(item => item.key === fromSearch) ? fromSearch : '';
    }
    // Gmail can change the native category without changing #inbox.
    if (current === '#inbox' && !pendingCategory) {
      const native = lists.flatMap(list => [...list.querySelectorAll('[role="tab"][aria-selected="true"], [role="tab"].J-KU-KO')]);
      selected = native.map(categoryOf).find(Boolean) || selected;
    }
    if (current === '#inbox' && pendingCategory) selected = pendingCategory;
    for (const [key, button] of buttons) {
      attr(button, 'aria-selected', String(key === selected));
      attr(button, 'tabindex', key === (selected || items[0]?.key) ? '0' : '-1');
    }
    if (!selected) lastSelected = '';
    else if (selected !== lastSelected) {
      lastSelected = selected;
      revealButton(buttons.get(selected));
    }
    resize();
  }

  // Keep Gmail's real category tabs as transparent drop targets while a message
  // is dragged. The Studio strip stays visible; the native tab handlers still
  // receive dragenter/dragover/drop at the matching category's exact geometry.
  let dropCleanupTimer = 0;
  function clearDropTargets() {
    if (dropCleanupTimer) clearTimeout(dropCleanupTimer);
    dropCleanupTimer = 0;
    document.querySelectorAll('[data-pk-studio-drop-active]').forEach(node => node.removeAttribute('data-pk-studio-drop-active'));
    document.querySelectorAll('[data-pk-studio-drop-reveal]').forEach(node => node.removeAttribute('data-pk-studio-drop-reveal'));
    document.querySelectorAll('[data-pk-studio-drop-tab]').forEach(node => {
      node.removeAttribute('data-pk-studio-drop-tab');
      for (const property of ['--pk-studio-drop-left', '--pk-studio-drop-top', '--pk-studio-drop-width', '--pk-studio-drop-height']) {
        node.style.removeProperty(property);
      }
    });
  }
  function positionDropTargets() {
    if (!strip.isConnected) return;
    const clip = strip.getBoundingClientRect();
    for (const tab of document.querySelectorAll('[data-pk-studio-drop-tab]')) {
      const button = buttons.get(tab.dataset.pkStudioDropTab);
      if (!button) continue;
      const rect = button.getBoundingClientRect();
      const left = Math.max(rect.left, clip.left);
      const right = Math.min(rect.right, clip.right);
      const top = Math.max(rect.top, clip.top);
      const bottom = Math.min(rect.bottom, clip.bottom);
      if (right <= left || bottom <= top) {
        tab.style.setProperty('--pk-studio-drop-width', '0px');
        tab.style.setProperty('--pk-studio-drop-height', '0px');
        continue;
      }
      tab.style.setProperty('--pk-studio-drop-left', `${left}px`);
      tab.style.setProperty('--pk-studio-drop-top', `${top}px`);
      tab.style.setProperty('--pk-studio-drop-width', `${right - left}px`);
      tab.style.setProperty('--pk-studio-drop-height', `${bottom - top}px`);
    }
  }
  function beginDropTargets(event) {
    if (!active || !event.target?.closest?.('.zA')) return;
    clearDropTargets();
    // A search keeps the real inbox tabs in a hidden .bGI tree. Reuse those
    // category handlers, including Primary. Dropping on the #inbox sidebar link
    // would only add INBOX, NOT remove the Promotions category.
    const lists = nativeLists();
    const list = lists.find(candidate => candidate.getClientRects().length) || lists[0];
    if (list) {
      const owner = list.closest('.aKh') || list.closest('table') || list;
      for (let parent = owner.parentElement; parent && parent !== host && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).display === 'none') parent.setAttribute('data-pk-studio-drop-reveal', '');
      }
      owner.setAttribute('data-pk-studio-drop-active', '');
      for (const tab of list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])')) {
        const id = categoryOf(tab);
        if (id && buttons.has(id)) tab.dataset.pkStudioDropTab = id;
      }
    } else return;
    positionDropTargets();
  }
  document.addEventListener('dragstart', beginDropTargets, true);
  // Gmail uses a mouse-driven drag, not just HTML5 dragstart. Expose targets
  // before Gmail computes their hit boxes on mousedown.
  document.addEventListener('mousedown', event => { if (event.button === 0) beginDropTargets(event); }, true);
  document.addEventListener('mouseup', () => { dropCleanupTimer = setTimeout(clearDropTargets, 0); });
  document.addEventListener('dragend', clearDropTargets, true);
  document.addEventListener('drop', () => {
    if (dropCleanupTimer) clearTimeout(dropCleanupTimer);
    dropCleanupTimer = setTimeout(clearDropTargets, 250);
  });
  window.addEventListener('resize', positionDropTargets);
  strip.addEventListener('scroll', positionDropTargets);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') clearDropTargets(); }, true);
  window.addEventListener('blur', clearDropTargets);

  function navigate(button) {
    pendingCategory = nativeCategories.has(button.dataset.key) ? button.dataset.key : '';
    location.hash = button.dataset.route;
    refresh();
  }
  strip.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(button);
  });
  strip.addEventListener('keydown', event => {
    const all = [...strip.children];
    const index = all.indexOf(event.target);
    if (index < 0) return;
    const rtl = getComputedStyle(strip).direction === 'rtl';
    let next;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = all.length - 1;
    if (event.key === 'ArrowRight') next = (index + (rtl ? -1 : 1) + all.length) % all.length;
    if (event.key === 'ArrowLeft') next = (index + (rtl ? 1 : -1) + all.length) % all.length;
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    all.forEach((button, i) => attr(button, 'tabindex', i === next ? '0' : '-1'));
    all[next].focus(); // Manual activation: Enter/Space uses the native button click.
  });

  function refresh() {
    scheduled = false;
    const lists = nativeLists();
    if (!active) {
      clearDropTargets();
      requestCounts();
      strip.remove();
      style.remove();
      host?.removeAttribute('data-pk-studio-tabs-host');
      document.querySelectorAll('[data-pk-studio-tabs-native]').forEach(el => el.removeAttribute('data-pk-studio-tabs-native'));
      return;
    }
    readCategories(lists);
    // Migrate old Studio search links back to the real inbox tab, not the
    // all-mail #category view. Extra user search filters are left untouched.
    const current = canonical(hash());
    const terms = current.startsWith('#search/') ? current.slice(8).trim().split(/\s+/) : [];
    const oldCategory = categoryFromSearch(current);
    if (nativeCategories.has(oldCategory) && terms.length === 2 && terms.includes('in:inbox')) {
      pendingCategory = oldCategory;
      location.hash = '#inbox';
    }
    const canvas = [...document.querySelectorAll('.bkK')].find(el => el.getClientRects().length);
    // The outer padded canvas survives list/thread/label replacement. Never mount
    // inside Gmail's disposable .aKh strip or inside a cached inbox view.
    const nextHost = canvas?.firstElementChild || document.querySelector('[role="main"]')?.parentElement;
    if (!nextHost) return;
    if (host !== nextHost) {
      host?.removeAttribute('data-pk-studio-tabs-host');
      host = nextHost;
    }
    if (!style.isConnected) document.head.append(style);
    if (strip.parentElement !== host || host.firstElementChild !== strip) host.prepend(strip);
    attr(host, 'data-pk-studio-tabs-host', '');
    fitColumn();
    lists.forEach(list => attr(list.closest('.aKh') || list.closest('table') || list, 'data-pk-studio-tabs-native', ''));
    if (pendingCategory && hash() === '#inbox') {
      const tab = lists.flatMap(list => [...list.querySelectorAll('[role="tab"]')]).find(tab => categoryOf(tab) === pendingCategory);
      if (tab && tab.closest('[role="main"]')?.getClientRects().length) {
        pendingCategory = '';
        // Gmail's Closure tabs activate on mousedown/up, not HTMLElement.click().
        for (const type of ['mousedown', 'mouseup', 'click']) {
          tab.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, view: window }));
        }
      }
    }
    render(model(), lists);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(refresh);
  }
  const load = () => chrome.storage.local.get(KEYS).then(state => {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-label-tabs'] !== false;
    labels = [...new Set((Array.isArray(state.pkLabelTabs) ? state.pkLabelTabs : [])
      .filter(label => typeof label === 'string' && label.trim()).map(label => label.trim()))].slice(0, 6);
    renames = state.enabled?.['js-studio-category-labels'] !== false ? state.pkCategoryLabels || {} : {};
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && KEYS.some(key => key in changes)) load();
  });
  new MutationObserver(records => {
    // Ignore the strip's own label/count rewrites; follow Gmail's tabs.
    const outside = records.some(record => {
      const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return !node?.closest('#pk-studio-tabs');
    });
    if (outside) schedule();
  }).observe(document.body || document.documentElement, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['aria-selected', 'aria-hidden', 'class', 'aria-label'],
  });
  window.addEventListener('hashchange', schedule);
  load();
})();
