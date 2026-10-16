/* Focus OS — native Gmail adapter. Local fonts; sender favicons as in Lab 01. */
(() => {
  'use strict';
  if (globalThis.__focusOSLoaded) return;
  globalThis.__focusOSLoaded = true;
  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const all = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const categories = [
    ['primary', 'Principale', 'Primary', '\uf0e0'],
    ['promotions', 'Promotions', 'Promotions', '\uf02b'],
    ['social', 'Réseaux', 'Social', '\uf0c0'],
    ['updates', 'Notifications', 'Updates', '\uf0f3'],
    ['forums', 'Forums', 'Forums', '\uf086'],
    ['newsletter', 'Newsletters', 'Newsletters', '\uf1ea'],
  ];
  let main, activeRow, rows = [], frame = 0, archived = 0, pendingArchive, listCount = 0;
  let returnHash = '#inbox', lastHash = location.hash, reading = false, noticeTimer, replyAfterOpen = false;
  const groups = new WeakMap();
  const observer = new MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('[data-fos-ui]'))) schedule();
  });
  const observe = () => observer.observe(root, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'aria-selected', 'aria-checked', 'style', 'email', 'title'],
  });
  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(); });
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function ui(tag, id) {
    const node = el(tag);
    node.id = id; node.dataset.fosUi = '';
    return node;
  }
  function button(label, text, action) {
    const node = el('button', '', text);
    node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
    return node;
  }
  function text(node, value) { if (node && node.textContent !== value) node.textContent = value; }
  function notice(message) {
    text($('#fos-status'), message);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => text($('#fos-status'), ''), 3000);
  }
  function activate(target) {
    if (!target) return false;
    // Gmail controls use both Closure mouseup and delegated click handlers.
    for (const type of ['mousedown', 'mouseup', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    }
    return true;
  }
  function nativeButton(pattern, parent = document) {
    return all('[role="button"], button, [data-tooltip]', parent || document)
      .find(node => !node.closest('[data-fos-ui]') && visible(node) && pattern.test(node.getAttribute('aria-label') || node.getAttribute('data-tooltip') || node.getAttribute('title') || ''));
  }
  function route(hash) {
    closeDialog(); root.removeAttribute('data-fos-native-header');
    location.hash = hash; schedule();
  }
  function showNativeHeader(search = false) {
    if (search) return searchDialog();
    closeDialog(); root.setAttribute('data-fos-native-header', '');
    window.dispatchEvent(new Event('resize'));
  }
  function switchCategory(category) {
    const [id, fr, en] = category;
    closeDialog();
    if (reading) return route(id === 'primary' ? '#inbox' : '#search/' + encodeURIComponent(id === 'newsletter' ? 'in:inbox {category:updates list:unsubscribe}' : `in:inbox category:${id}`));
    const tab = all('.aKh [role="tab"]').find(node => [fr, en].includes(node.getAttribute('aria-label')));
    if (tab) { activate(tab); schedule(); }
    else if (id === 'primary') route('#inbox');
    else route('#search/' + encodeURIComponent(id === 'newsletter' ? 'in:inbox {category:updates list:unsubscribe}' : `in:inbox category:${id}`));
  }
  function currentCategory() {
    let hash;
    try { hash = decodeURIComponent(location.hash || '#inbox'); } catch { hash = location.hash; }
    if (hash.includes('list:unsubscribe')) return categories[5];
    const query = hash.match(/category:(\w+)/)?.[1] || hash.match(/#category\/(\w+)/)?.[1];
    if (query) return categories.find(c => c[0] === query);
    if (!/^#(?:inbox|$)/.test(hash)) return null;
    const label = $('.aKh [role="tab"][aria-selected="true"]')?.getAttribute('aria-label');
    return categories.find(c => c[1] === label || c[2] === label) || categories[0];
  }
  function folderTitle() {
    const category = currentCategory();
    if (category) return category[1];
    const folder = location.hash.slice(1).split('/')[0];
    return ({ sent: 'Envoyés', drafts: 'Brouillons', starred: 'Suivis', all: 'Tous les messages', trash: 'Corbeille', spam: 'Spam', search: 'Recherche', settings: 'Paramètres', label: 'Libellé' })[folder] || 'Messages';
  }
  function makeShell() {
    if ($('#fos-hud')) return;
    const hud = ui('header', 'fos-hud');
    hud.append(el('span', 'fos-mark', 'SIMPLEMAIL·LAB'));
    const title = el('span', 'fos-title', 'THEME ');
    title.append(el('b', '', '01 / FOCUS OS'));
    hud.append(title, el('span', 'fos-live', 'GMAIL'));
    const right = el('div', 'fos-right');
    const total = el('span', 'fos-total');
    const count = el('span', 'fos-n', '0'); count.id = 'fos-total';
    total.append(count, document.createTextNode(' messages'));
    total.title = 'Messages chargés dans cette vue';
    const archive = button('Tous les messages · archives de cette session', '\uf187 ', () => route('#all'));
    archive.className = 'fos-archive-total';
    const archiveCount = el('span', 'fos-n', '0'); archiveCount.id = 'fos-archive-total'; archive.append(archiveCount);
    const search = button('Rechercher', '\uf002 ', () => showNativeHeader(true));
    search.className = 'fos-key'; search.append(el('kbd', '', '/'));
    const settings = button('Réglages et dossiers', 'réglages ', () => menu());
    settings.className = 'fos-key'; settings.append(el('kbd', '', ','));
    right.append(total, archive, search, settings); hud.append(right);
    const nav = ui('nav', 'fos-categories'); nav.setAttribute('aria-label', 'Catégories Gmail');
    categories.forEach(c => {
      const b = button(c[1], c[3], () => switchCategory(c));
      b.dataset.category = c[0]; nav.append(b);
    });
    const cmd = ui('footer', 'fos-cmd'); cmd.setAttribute('aria-label', 'Commandes Focus OS');
    const status = ui('div', 'fos-status'); status.setAttribute('role', 'status');
    document.body.append(hud, nav, cmd, status);
    commands();
  }
  function commands() {
    const footer = $('#fos-cmd'); footer.replaceChildren();
    const items = reading
      ? [[['J', 'K'], 'suivant / précédent', 'next'], [['E'], 'archiver', 'archive'], [['Échap'], 'retour liste', 'back'], [['L'], 'libellés', 'labels'], [['R'], 'répondre', 'reply'], [['?'], 'aide', 'help']]
      : [[['J', 'K'], 'naviguer', 'next'], [['Entrée'], 'ouvrir', 'open'], [['E'], 'archiver', 'archive'], [['L'], 'libellés', 'labels'], [['/'], 'rechercher', 'search'], [['R'], 'répondre', 'reply'], [['?'], 'aide', 'help']];
    for (const [keys, label, action] of items) {
      const b = button(label, '', () => run(action));
      keys.forEach(key => b.append(el('kbd', '', key)));
      b.append(document.createTextNode(label)); footer.append(b);
    }
  }
  function closeDialog() { $('#fos-dialog')?.close(); $('#fos-dialog')?.remove(); }
  function searchDialog() {
    closeDialog();
    const dialog = ui('dialog', 'fos-dialog'); dialog.className = 'fos-search';
    dialog.setAttribute('aria-label', 'Rechercher dans Gmail');
    const form = el('form'), input = el('input');
    input.type = 'search'; input.name = 'q'; input.placeholder = 'Rechercher dans Gmail…';
    input.setAttribute('aria-label', 'Rechercher dans les messages');
    input.autocomplete = 'off';
    const submit = button('Rechercher', '\uf002', () => {}); submit.type = 'submit';
    form.append(submit, input, button('Fermer', 'Échap', closeDialog));
    form.addEventListener('submit', event => { event.preventDefault(); const query = input.value.trim(); if (query) route('#search/' + encodeURIComponent(query)); });
    dialog.append(form, el('p', '', 'Recherchez un expéditeur, un objet ou utilisez les opérateurs Gmail. Entrée pour afficher les résultats.'));
    document.body.append(dialog); dialog.showModal(); input.focus();
  }
  function menu(help = false) {
    closeDialog();
    const dialog = ui('dialog', 'fos-dialog');
    dialog.setAttribute('aria-labelledby', 'fos-dialog-title');
    const header = el('header'), title = el('h2', '', help ? 'Raccourcis Focus OS' : 'Focus OS · Gmail');
    title.id = 'fos-dialog-title';
    header.append(title, button('Fermer', '×', closeDialog)); dialog.append(header);
    if (help) dialog.append(el('p', '', 'J / K ou ↓ / ↑ : naviguer · Entrée : ouvrir · E : archiver · L : libellés · R : répondre · C : nouveau message · / : rechercher · Échap : retour · , : réglages.'));
    const grid = el('div', 'fos-menu');
    const actions = [
      ['Nouveau message', () => run('compose')], ['Outils Gmail / pagination', () => { closeDialog(); root.toggleAttribute('data-fos-tools'); }],
      ['Boîte de réception', () => route('#inbox')], ['Messages suivis', () => route('#starred')],
      ['Envoyés', () => route('#sent')], ['Brouillons', () => route('#drafts')],
      ['Tous les messages', () => route('#all')], ['Corbeille', () => route('#trash')],
      ['Spam', () => route('#spam')], ['Paramètres Gmail', () => route('#settings/general')],
      ['Compte Google / recherche', () => showNativeHeader()], ['Actualiser', () => run('refresh')],
    ];
    actions.forEach(([label, action]) => grid.append(button(label, label, action)));
    dialog.append(grid, el('p', '', 'Le compteur d’archives correspond aux messages archivés avec Focus OS pendant cette session. Les actions et la recherche sont celles de Gmail.'));
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(); } });
    document.body.append(dialog); dialog.showModal();
  }
  function select(row, scroll = false) {
    all('.fos-active').forEach(node => { if (node !== row) node.classList.remove('fos-active'); });
    if (!row) { activeRow = null; return; }
    row.classList.add('fos-active'); activeRow = row;
    if (scroll) row.scrollIntoView({ block: 'nearest' });
  }
  function run(action) {
    if (action === 'help') return menu(true);
    if (action === 'search') return showNativeHeader(true);
    if (action === 'compose') { closeDialog(); if (!activate($('.z0 [role="button"]'))) location.hash = '#inbox?compose=new'; return; }
    if (action === 'back') return route(returnHash);
    if (action === 'refresh') {
      closeDialog(); root.setAttribute('data-fos-tools', '');
      if (!activate(nativeButton(/^(Actualiser|Refresh)$/i))) notice('Utilisez la commande Actualiser dans la barre Gmail.');
      return;
    }
    if (action === 'next' || action === 'previous') {
      if (reading) {
        activate(nativeButton(action === 'next' ? /^(Plus ancien|Older|Suiv\.)/i : /^(Plus récent|Newer|Préc\.)/i));
      } else select(rows[Math.max(0, Math.min(rows.length - 1, rows.indexOf(activeRow) + (action === 'next' ? 1 : -1)))], true);
      return;
    }
    if (action === 'open' || (action === 'reply' && !reading)) {
      if (activeRow) { returnHash = location.hash; replyAfterOpen = action === 'reply'; activeRow.click(); }
      return;
    }
    if (action === 'archive') {
      const target = reading ? nativeButton(/^(Archiver|Archive)$/i) : activeRow && $('.brq', activeRow);
      if (!target) return notice('Sélectionnez un message à archiver.');
      pendingArchive = { row: activeRow, hash: location.hash, reading, time: Date.now() };
      activate(target); schedule(); return;
    }
    if (action === 'labels') {
      root.setAttribute('data-fos-tools', '');
      if (!reading && activeRow) {
        const checkbox = $('[role="checkbox"]', activeRow);
        if (checkbox?.getAttribute('aria-checked') !== 'true') activate(checkbox);
      }
      requestAnimationFrame(() => {
        if (!activate(nativeButton(/^(Libellés|Labels|Label as)/i))) notice('Libellés accessibles dans la barre d’outils Gmail.');
      });
    }
    if (action === 'reply') {
      if (!activate(nativeButton(/^(Répondre|Reply)(?:$|\s)/i))) notice('Ouvrez la réponse depuis le message.');
    }
  }
  const months = { jan: 0, janv: 0, feb: 1, fev: 1, fevr: 1, mar: 2, mars: 2, apr: 3, avr: 3, may: 4, mai: 4, jun: 5, juin: 5, jul: 6, juil: 6, aug: 7, aout: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  function day(row) {
    const cell = $('.xW', row), value = cell?.textContent.trim() || '';
    if (/^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(value)) return "Aujourd'hui";
    if (/^(hier|yesterday)/i.test(value)) return 'Hier';
    const hint = $('[title]', cell || row)?.getAttribute('title') || value;
    const clean = hint.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const m = clean.match(/(\d{1,2})\s+([a-z]+)\.?\s*(\d{4})?/);
    let date;
    if (m && months[m[2]] !== undefined) {
      const now = new Date(); date = new Date(m[3] ? +m[3] : now.getFullYear(), months[m[2]], +m[1]);
      if (!m[3] && date > now) date.setFullYear(date.getFullYear() - 1);
    } else date = new Date(hint);
    if (!isNaN(date)) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      date.setHours(0, 0, 0, 0);
      if (+date === +today) return "Aujourd'hui";
      if (+date === +yesterday) return 'Hier';
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
    }
    return value;
  }
  function decorate() {
    if (!rows.length) all('.fos-day', main).forEach(node => node.remove());
    for (const row of rows) {
      const cell = $('.yX', row);
      if (cell && !$('.fos-fav', cell)) {
        const fav = el('span', 'fos-fav', '\uf0ac');
        fav.setAttribute('aria-hidden', 'true'); cell.prepend(fav);
      }
      const fav = cell && $('.fos-fav', cell);
      const domain = $('[email]', cell || row)?.getAttribute('email')?.split('@')[1]?.toLowerCase();
      if (fav && domain && /^[a-z0-9.-]+$/.test(domain) && fav.dataset.domain !== domain) {
        fav.dataset.domain = domain;
        const image = el('img'); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        image.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
        image.addEventListener('error', () => image.remove(), { once: true });
        fav.replaceChildren(document.createTextNode('\uf0ac'), image);
      }
    }
    for (const table of new Set(rows.map(r => r.closest('table')))) {
      if (!table) continue;
      const list = rows.filter(r => r.closest('table') === table);
      const labels = list.map(day);
      const old = groups.get(table);
      if (old && old.rows.length === list.length && old.rows.every((row, i) => row === list[i] && old.labels[i] === labels[i]) && old.headers.every(h => h.isConnected)) continue;
      all('.fos-day', table).forEach(node => node.remove());
      const headers = []; let previous;
      list.forEach((row, i) => {
        if (labels[i] && labels[i] !== previous) {
          const tr = ui('tr', ''); tr.removeAttribute('id'); tr.className = 'fos-day'; tr.setAttribute('role', 'presentation');
          const td = el('td', '', labels[i]); td.colSpan = row.children.length; tr.append(td); row.before(tr); headers.push(tr);
        }
        previous = labels[i];
      });
      groups.set(table, { rows: list, labels, headers });
    }
  }
  function apply() {
    if (!document.body) return;
    const candidate = all('.bkK [role="main"], [role="main"]').find(visible);
    if (!candidate) return;
    // Disconnect during our own changes so date headings cannot trigger a render loop.
    observer.disconnect();
    try {
      all('[data-fos-main]').forEach(node => {
        if (node !== candidate) { delete node.dataset.fosMain; $('#fos-list-head', node)?.remove(); }
      });
      main = candidate; main.dataset.fosMain = '';
      root.setAttribute('data-focus-os', ''); makeShell();
      rows = all('.zA', main).filter(visible);
      const nextReading = rows.length === 0 && !!all('.hP, .a3s', main).find(visible);
      if (reading !== nextReading) { reading = nextReading; commands(); }
      if (!reading && $('.Cp', main)) listCount = rows.length;
      root.toggleAttribute('data-fos-reading', reading);
      root.toggleAttribute('data-fos-settings', location.hash.startsWith('#settings'));
      if (reading && replyAfterOpen) { replyAfterOpen = false; requestAnimationFrame(() => run('reply')); }
      root.toggleAttribute('data-fos-selected', rows.some(row => $('[role="checkbox"]', row)?.getAttribute('aria-checked') === 'true'));
      if (pendingArchive) {
        const p = pendingArchive;
        if ((!p.reading && location.hash === p.hash && !p.row?.isConnected) || (p.reading && !reading && location.hash !== p.hash)) { archived++; pendingArchive = null; }
        else if (Date.now() - p.time > 5000 || (!p.reading && p.hash !== location.hash)) pendingArchive = null;
      }
      select(rows.includes(activeRow) && lastHash === location.hash ? activeRow : rows[0]);
      lastHash = location.hash;
      decorate();
      let head = $('#fos-list-head', main);
      if (!head) {
        head = ui('div', 'fos-list-head');
        head.append(el('span', '', '\uf01c'), el('span', 'fos-folder'), el('span', 'fos-n'));
        const archive = button('Archives de cette session · tous les messages', '', () => route('#all')); archive.className = 'fos-archived'; head.append(archive);
        main.prepend(head);
      }
      text($('.fos-folder', head), folderTitle()); text($('.fos-n', head), String(rows.length));
      text($('.fos-archived', head), `${archived} archivés`);
      text($('#fos-total'), String(reading ? listCount : rows.length)); text($('#fos-archive-total'), String(archived));
      const category = currentCategory();
      all('#fos-categories button').forEach(b => b.setAttribute('aria-current', String(b.dataset.category === category?.[0])));
    } finally { observe(); }
  }
  function keydown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const target = event.target;
    if ($('#fos-dialog')?.open) {
      // Keep Gmail's Escape/search shortcuts out of our modal, including its input.
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
      return;
    }
    if (target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]')) {
      if (event.key === 'Escape' && target.matches('input[name="q"]')) { root.removeAttribute('data-fos-native-header'); target.blur(); }
      return;
    }
    if (all('dialog[open], [role="dialog"], [role="menu"]').some(visible)) return;
    const key = event.key.toLowerCase();
    if (target.closest?.('button, a, [role="button"], [role="checkbox"]') && ['enter', ' '].includes(key)) return;
    let action = ({ j: 'next', k: 'previous', arrowdown: 'next', arrowup: 'previous', enter: 'open', e: 'archive', l: 'labels', r: 'reply', c: 'compose', '/': 'search', '?': 'help' })[key];
    if (key === ',') { menu(); action = 'handled'; }
    if (key === 'escape') {
      if (root.hasAttribute('data-fos-native-header')) root.removeAttribute('data-fos-native-header');
      else if (reading) run('back');
      else root.removeAttribute('data-fos-tools');
      action = 'handled';
    }
    if (!action) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (action !== 'handled') run(action);
  }
  async function fonts() {
    // runtime.getURL resolves resources correctly in an isolated MV3 content script.
    const base = chrome.runtime.getURL('themes/focus-os/fonts/');
    await Promise.all([['Regular', '400'], ['SemiBold', '600']].map(async ([name, weight]) => {
      const font = new FontFace('Focus OS Mono', `url("${base}JetBrainsMonoNerdFont-${name}.ttf")`, { weight, display: 'swap' });
      document.fonts.add(await font.load());
    }));
  }
  fonts().catch(() => { /* Local monospace fallback keeps Gmail usable. */ });
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('click', event => {
    const row = event.target.closest?.('.zA');
    if (row && main?.contains(row)) { select(row); returnHash = location.hash; }
  }, true);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('resize', schedule);
  observe(); apply();
})();
