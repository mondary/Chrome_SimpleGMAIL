/* SimpleMail Original — presentation of Gmail's existing DOM, archive 01. */
(() => {
  'use strict';
  if (globalThis.__simplemailOriginalLoaded) return;
  globalThis.__simplemailOriginalLoaded = true;
  const root = document.documentElement;
  const $ = (s, p = document) => p.querySelector(s);
  const all = (s, p = document) => [...p.querySelectorAll(s)];
  const visible = e => !!e && e.style.display !== 'none' && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const cats = [
    ['primary', 'Principale', 'Primary', 'inbox', '#4b91ef'],
    ['newsletter', 'Newsletters', 'Newsletters', 'auto_graph', '#0891b2'],
    ['promotions', 'Promotions', 'Promotions', 'local_offer', '#e34c96'],
    ['social', 'Réseaux sociaux', 'Social', 'group', '#f9ab00'],
    ['updates', 'Notifications', 'Updates', 'info', '#188038'],
    ['forums', 'Forums', 'Forums', 'forum', '#7b4bb7'],
  ];
  let main, rows = [], activeRow, frame = 0, reading = false, previousHash = location.hash, returnHash = '#inbox';
  const observer = new MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('[data-smo-ui]'))) schedule();
  });
  // Gmail fills its (hidden) category tabs asynchronously; follow them without touching them.
  const tabsObserver = new MutationObserver(() => schedule());
  const observe = () => observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'aria-selected', 'aria-checked', 'aria-label', 'title'] });
  const observeTabs = () => { const list = $('.aKh'); if (list) tabsObserver.observe(list, { childList: true, subtree: true, characterData: true }); };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(); }); };
  function node(tag, className, value) {
    const e = document.createElement(tag); if (className) e.className = className;
    if (value !== undefined) e.textContent = value; return e;
  }
  function ui(tag, id) { const e = node(tag); e.id = id; e.dataset.smoUi = ''; return e; }
  function text(e, value) { if (e && e.textContent !== value) e.textContent = value; }
  function icon(name) { const e = node('span', 'smo-icon', name); e.setAttribute('aria-hidden', 'true'); return e; }
  function button(label, glyph, action, className = 'smo-icon-button') {
    const e = node('button', className); e.type = 'button'; e.title = label; e.setAttribute('aria-label', label);
    if (glyph) e.append(icon(glyph)); e.addEventListener('click', action); return e;
  }
  function activate(e) {
    if (!e) return false;
    for (const type of ['mousedown', 'mouseup', 'click']) e.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    return true;
  }
  function native(pattern, parent = document) {
    return all('[role="button"],button,[data-tooltip]', parent).find(e => !e.closest('[data-smo-ui]') && visible(e) && pattern.test(e.getAttribute('aria-label') || e.getAttribute('data-tooltip') || e.title || ''));
  }
  function closeMenu() { $('#smo-menu')?.close(); $('#smo-menu')?.remove(); }
  function route(hash) {
    closeMenu(); root.removeAttribute('data-smo-native-header');
    if (innerWidth <= 760) root.removeAttribute('data-smo-drawer');
    location.hash = hash; schedule();
  }
  function search(query) { route('#search/' + encodeURIComponent(query)); }
  function categoryTab(c) {
    return all('.aKh [role="tab"]').find(e => {
      const label = e.getAttribute('aria-label') || '';
      return [c[1], c[2], c[0] === 'social' ? 'Réseaux' : ''].filter(Boolean).some(name => label === name || label.startsWith(name + ','));
    });
  }
  function category(c) {
    root.removeAttribute('data-smo-native-header');
    if (!reading && categoryTab(c)) { activate(categoryTab(c)); schedule(); }
    else if (c[0] === 'primary') route('#inbox');
    else search(c[0] === 'newsletter' ? 'in:inbox {category:updates list:unsubscribe}' : `in:inbox category:${c[0]}`);
  }
  function currentCategory() {
    let hash; try { hash = decodeURIComponent(location.hash); } catch { hash = location.hash; }
    if (hash.includes('list:unsubscribe')) return cats[1];
    const id = hash.match(/category[:/](\w+)/)?.[1];
    if (id) return cats.find(c => c[0] === id);
    if (hash && !hash.startsWith('#inbox')) return null;
    return cats.find(c => categoryTab(c)?.getAttribute('aria-selected') === 'true') || cats[0];
  }
  function nativeHeader() { closeMenu(); root.toggleAttribute('data-smo-native-header'); window.dispatchEvent(new Event('resize')); }
  function compose() {
    closeMenu();
    if (!activate($('.z0 [role="button"]'))) location.hash = '#inbox?compose=new';
  }
  function toolbarAction(pattern) {
    root.setAttribute('data-smo-tools', '');
    const target = native(pattern);
    if (target) activate(target);
    else menu();
  }
  function menu(kind = 'actions') {
    closeMenu(); const dialog = ui('dialog', 'smo-menu'); dialog.setAttribute('aria-label', kind === 'labels' ? 'Libellés Gmail' : 'Commandes Gmail');
    const header = node('header', '', kind === 'labels' ? 'Libellés' : 'Original');
    header.append(button('Fermer', 'close', closeMenu)); dialog.append(header);
    const choices = kind === 'labels'
      ? all('.TO a[href*="#label/"]').map(a => [a.textContent.trim(), 'label', () => route(a.hash)])
      : [
        ['Afficher les outils / pagination Gmail', 'tune', () => { closeMenu(); root.toggleAttribute('data-smo-tools'); }],
        ['Messages suivis', 'star', () => route('#starred')],
        ['Messages en attente', 'schedule', () => route('#snoozed')],
        ['Libellés Gmail', 'label', () => menu('labels')],
        ['Revenir à la liste', 'arrow_back', () => route(returnHash)],
        ['Paramètres Gmail', 'settings', () => route('#settings/general')],
        ['Compte Google et applications', 'account_circle', nativeHeader],
      ];
    if (!choices.length) choices.push(['Gérer les libellés dans Gmail', 'label', () => route('#settings/labels')]);
    choices.forEach(([label, glyph, action]) => { const b = button(label, glyph, action, 'smo-menu-item'); b.append(node('span', '', label)); dialog.append(b); });
    document.body.append(dialog); dialog.showModal();
  }
  function shell() {
    if ($('#smo-header')) return;
    const rail = ui('aside', 'smo-rail'); rail.setAttribute('aria-label', 'Dossiers et catégories');
    const brand = node('div', 'smo-brand'); const logo = button('Boîte de réception', '', () => route('#inbox'), '');
    const img = node('img'); img.src = chrome.runtime.getURL('icon.png'); img.alt = 'SimpleMail'; logo.append(img); brand.append(logo); rail.append(brand);
    function group(items) {
      const section = node('nav', 'smo-rail-group');
      for (const [label, glyph, action, hash] of items) {
        const b = button(label, glyph, action, 'smo-nav'); b.append(node('span', 'smo-nav-label', label));
        if (hash) b.dataset.route = hash; if (glyph === 'rss_feed') b.classList.add('smo-rss'); section.append(b);
      }
      rail.append(section);
    }
    group([
      ['Boîte de réception', 'inbox', () => route('#inbox'), '#inbox'], ['Messages envoyés', 'send', () => route('#sent'), '#sent'],
      ['Brouillons', 'drafts', () => route('#drafts'), '#drafts'], ['Spam', 'report', () => route('#spam'), '#spam'],
      ['Tous les messages', 'archive', () => route('#all'), '#all'], ['Corbeille', 'delete', () => route('#trash'), '#trash'],
    ]);
    group([
      ['Principale', 'inbox', () => category(cats[0])], ['Newsletters', 'auto_graph', () => category(cats[1])],
      ['Messages RSS', 'rss_feed', () => search('in:anywhere {subject:RSS label:RSS}')],
      ['Promotions', 'local_offer', () => category(cats[2])], ['Réseaux sociaux', 'group', () => category(cats[3])],
      ['Notifications', 'notifications', () => category(cats[4])], ['Autres dossiers et libellés', 'expand_more', () => menu()],
    ]);
    group([['Paramètres Gmail', 'settings', () => route('#settings/general')], ['Compte Google', 'add', nativeHeader]]);

    const header = ui('header', 'smo-header');
    const burger = button('Déplier les dossiers', 'menu', () => {
      const open = root.toggleAttribute('data-smo-drawer');
      burger.setAttribute('aria-expanded', String(open));
      // Keyboard users go straight back to the list; Enter must not re-toggle the drawer.
      burger.blur();
    });
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-controls', 'smo-rail'); header.append(burger);
    const form = ui('form', 'smo-search'); form.setAttribute('role', 'search');
    const input = node('input'); input.type = 'search'; input.name = 'q'; input.placeholder = 'Rechercher des mails'; input.setAttribute('aria-label', 'Rechercher des mails'); input.autocomplete = 'off';
    const count = node('span'); count.id = 'smo-count'; const context = node('span'); context.id = 'smo-context';
    form.append(icon('search'), input, count, context);
    form.addEventListener('submit', e => { e.preventDefault(); const query = input.value.trim(); if (query) search(query); else route('#inbox'); input.blur(); });
    header.append(form);
    const right = node('div', 'smo-header-right');
    const layout = button('Affichage et outils Gmail', 'view_quilt', () => menu()); layout.id = 'smo-layout';
    const write = button('Composer', 'edit', compose, ''); write.id = 'smo-compose'; write.append(node('span', 'smo-compose-label', 'Composer'));
    const settings = button('Paramètres Gmail', 'settings', () => route('#settings/general')); settings.id = 'smo-settings';
    const account = button('Compte Google', '', nativeHeader, ''); account.id = 'smo-account'; account.append(node('span', '', '?'));
    right.append(layout, write, settings, account); header.append(right);

    const toolbar = ui('div', 'smo-toolbar'); toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Actions et catégories');
    const actions = node('div', 'smo-toolbar-actions');
    actions.append(button('Actualiser', 'refresh', () => toolbarAction(/^(Actualiser|Refresh)$/i)), button('Outils Gmail', 'open_in_new', () => { root.toggleAttribute('data-smo-tools'); }), button('Plus', 'more_vert', () => menu()));
    const nav = ui('nav', 'smo-categories'); nav.setAttribute('aria-label', 'Catégories');
    cats.forEach(c => {
      const b = button(c[1], c[3], () => category(c)); b.dataset.category = c[0]; b.style.setProperty('--smo-category-color', c[4]);
      const badge = node('span', 'smo-category-count'); badge.hidden = true; b.append(badge); nav.append(b);
    });
    toolbar.append(actions, nav); document.body.append(rail, header, toolbar);
  }
  function decorate(row) {
    const sender = $('.yX', row), name = $('.yW', row), subject = $('.xT', row);
    if (!sender || !name || !subject) return;
    let avatar = $('.smo-avatar', sender);
    if (!avatar) { avatar = node('span', 'smo-avatar'); avatar.setAttribute('aria-hidden', 'true'); sender.prepend(avatar); }
    text(avatar, (name.textContent.trim()[0] || '?').toUpperCase());
    const count = $('.bx0', name)?.textContent.trim() || '';
    let badge = $('.smo-thread', subject);
    if (+count > 1) {
      if (!badge) { badge = node('span', 'smo-thread'); subject.append(badge); }
      text(badge, count); badge.title = `${count} messages dans la conversation`;
    } else badge?.remove();
    const labels = all('.yi .at', row).map(e => ({ label: e.title || e.textContent.trim(), color: e.style.backgroundColor }));
    let labelBox = $('.smo-labels', subject);
    const signature = JSON.stringify(labels);
    if (labels.length) {
      if (!labelBox) { labelBox = node('span', 'smo-labels'); subject.append(labelBox); }
      if (labelBox.dataset.signature !== signature) {
        labelBox.replaceChildren(); labelBox.dataset.signature = signature;
        labels.forEach(({ label, color }) => { const l = node('span', 'smo-label', label.split('/').pop()); l.title = label; if (color) l.style.setProperty('--smo-label-color', color); labelBox.append(l); });
      }
    } else labelBox?.remove();
  }
  function select(row) {
    all('.smo-active').forEach(e => { if (e !== row) e.classList.remove('smo-active'); });
    activeRow = row || null; row?.classList.add('smo-active');
  }
  function apply() {
    if (!document.body) return;
    const candidate = all('.bkK [role="main"], [role="main"]').find(visible);
    if (!candidate) return;
    observer.disconnect();
    try {
      all('[data-smo-main]').forEach(e => { if (e !== candidate) delete e.dataset.smoMain; });
      main = candidate; main.dataset.smoMain = ''; root.setAttribute('data-smo', ''); shell(); observeTabs();
      rows = all('.zA', main).filter(visible);
      reading = rows.length === 0 && !!all('.hP,.a3s', main).find(visible);
      root.toggleAttribute('data-smo-reading', reading); root.toggleAttribute('data-smo-settings', location.hash.startsWith('#settings'));
      root.toggleAttribute('data-smo-selected', rows.some(r => $('[role="checkbox"]', r)?.getAttribute('aria-checked') === 'true'));
      if (!rows.includes(activeRow) || previousHash !== location.hash) select(null);
      previousHash = location.hash; rows.forEach(decorate);
      const cat = currentCategory();
      if (!reading) {
        const parts = all('.G-atb .Dj .ts', main).map(e => e.textContent.trim());
        text($('#smo-count'), parts.length >= 3 ? `${parts[0]}–${parts[1]} sur ${parts[2]} mails` : `${rows.length} mails chargés`);
      }
      text($('#smo-context'), cat?.[2] || ({ '#sent': 'Envoyés', '#drafts': 'Brouillons', '#all': 'Tous les messages', '#trash': 'Corbeille', '#spam': 'Spam' })[location.hash] || 'Recherche');
      all('#smo-categories button').forEach(b => {
        b.setAttribute('aria-current', String(b.dataset.category === cat?.[0]));
        const c = cats.find(c => c[0] === b.dataset.category), tab = categoryTab(c);
        // These are actual Gmail tab badges, never guessed totals for hidden categories.
        const n = tab?.textContent.match(/(\d+)\s*(?:nouveau|new)/i)?.[1];
        const badge = $('.smo-category-count', b); badge.hidden = !n; text(badge, n || '');
      });
      all('#smo-rail [data-route]').forEach(b => b.setAttribute('aria-current', b.dataset.route === location.hash.split('/')[0] ? 'page' : 'false'));
      const account = $('#gb [aria-label*="Compte Google"], #gb [aria-label*="Google Account"]');
      const initial = account?.getAttribute('aria-label')?.match(/(?:Compte Google|Google Account)[\s:]+([^\s(]+)/)?.[1]?.[0]?.toUpperCase() || '?';
      text($('#smo-account span'), initial);
    } finally { observe(); }
  }
  function keydown(e) {
    if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
    if ($('#smo-menu')?.open) { e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } return; }
    if (e.target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]')) return;
    const key = e.key.toLowerCase();
    if (key === '/') { e.preventDefault(); e.stopImmediatePropagation(); $('#smo-search input')?.focus(); }
    else if (key === 'c') { e.preventDefault(); e.stopImmediatePropagation(); compose(); }
    else if (key === 'escape') { root.removeAttribute('data-smo-native-header'); root.removeAttribute('data-smo-drawer'); if (reading) { e.preventDefault(); e.stopImmediatePropagation(); route(returnHash); } }
    else if (!reading && ['j', 'k', 'arrowdown', 'arrowup'].includes(key)) {
      e.preventDefault(); e.stopImmediatePropagation();
      const step = ['j', 'arrowdown'].includes(key) ? 1 : -1;
      select(rows[Math.max(0, Math.min(rows.length - 1, activeRow ? rows.indexOf(activeRow) + step : 0))]); activeRow?.scrollIntoView({ block: 'nearest' });
    } else if (!reading && key === 'enter' && activeRow && !e.target.closest?.('button,a,[role="button"],[role="checkbox"]')) {
      e.preventDefault(); e.stopImmediatePropagation(); returnHash = location.hash; activeRow.click();
    }
  }
  async function fonts() {
    const base = chrome.runtime.getURL('themes/simplemail-original/fonts/');
    await Promise.all([['SimpleMail Outfit', 'Outfit.ttf', '100 900'], ['SimpleMail Symbols', 'MaterialSymbolsOutlined.ttf', '400']].map(async ([family, file, weight]) => {
      const font = new FontFace(family, `url("${base}${file}")`, { weight, display: 'swap' }); document.fonts.add(await font.load());
    }));
  }
  // Silently losing the icon font turns every ligature name into visible text
  // ("inbox", "view_quilt"…) instead of an icon: never swallow this failure.
  fonts().catch(error => console.warn('[Original] polices du thème indisponibles', error));
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('click', e => { if (e.target.closest?.('.zA') && main?.contains(e.target)) returnHash = location.hash; }, true);
  window.addEventListener('hashchange', schedule); window.addEventListener('resize', schedule);
  observe(); apply();
})();
