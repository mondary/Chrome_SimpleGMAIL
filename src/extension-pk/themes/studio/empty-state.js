// Studio only: enhance Gmail's own empty category notice without replacing its settings action.
(() => {
  if (window.__pkStudioEmptyState) return;
  window.__pkStudioEmptyState = true;

  const copy = {
    fr: { kicker: 'BOÎTE À ZÉRO', title: 'Tout est à jour.', detail: name => `Aucun message dans ${name}. Profitez de cette pause.` },
    en: { kicker: 'INBOX ZERO', title: 'All caught up.', detail: name => `No messages in ${name}. Enjoy the quiet.` },
  };
  const icons = {
    primary: '<g class="pk-zero-primary"><rect x="22" y="30" width="96" height="68" rx="9"/><path d="M24 37 66 69a10 10 0 0 0 12 0l38-32" stroke="#777"/></g><circle class="pk-zero-seal" cx="108" cy="93" r="19"/><path class="pk-zero-check" d="m100 93 5 5 11-12"/>',
    promotions: '<g class="pk-zero-tag"><path d="M25 54V32a9 9 0 0 1 9-9h32l54 54a9 9 0 0 1 0 13l-25 25a9 9 0 0 1-13 0L28 61a9 9 0 0 1-3-7Z"/><circle cx="48" cy="47" r="6"/><path d="m66 80 10 10 22-23"/></g>',
    social: '<g class="pk-zero-connections" stroke="#999"><path d="M69 42 38 83M75 42l32 41M45 88h54"/></g><g class="pk-zero-people"><circle class="pk-zero-person pk-zero-person-top" cx="72" cy="33" r="16"/><circle class="pk-zero-person pk-zero-person-left" cx="35" cy="92" r="15"/><circle class="pk-zero-person pk-zero-person-right" cx="109" cy="92" r="15"/></g>',
    updates: '<g class="pk-zero-bell"><path d="M44 85h56c-8-8-10-18-10-30a18 18 0 0 0-36 0c0 12-2 22-10 30Z"/><path d="M64 94a8 8 0 0 0 16 0"/><path d="M72 28v-7" stroke="#999"/></g><path class="pk-zero-bell-ring" d="M32 49c-3 8-3 17 0 25M112 49c3 8 3 17 0 25" stroke="#999"/>',
    forums: '<g class="pk-zero-bubble-back" stroke="#999"><path d="M48 70H35a12 12 0 0 1-12-12V37a12 12 0 0 1 12-12h61a12 12 0 0 1 12 12v9"/><path d="m36 70-1 12 15-12"/></g><g class="pk-zero-bubble-front"><path d="M62 53h47a13 13 0 0 1 13 13v19a13 13 0 0 1-13 13H95l-14 12 1-12H62a13 13 0 0 1-13-13V66a13 13 0 0 1 13-13Z"/><circle cx="70" cy="76" r="1.7" fill="#222" stroke="none"/><circle cx="85" cy="76" r="1.7" fill="#222" stroke="none"/><circle cx="100" cy="76" r="1.7" fill="#222" stroke="none"/></g>',
    newsletter: '<g class="pk-zero-paper"><path d="M42 17h47l18 18v69H42a7 7 0 0 1-7-7V24a7 7 0 0 1 7-7Z"/><path d="M89 17v18h18M52 55h38M52 69h38M52 83h23" stroke="#888"/></g>',
  };
  function category(name) {
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/promotion/.test(normalized)) return 'promotions';
    if (/reseau|social/.test(normalized)) return 'social';
    if (/forum/.test(normalized)) return 'forums';
    if (/notification|update/.test(normalized)) return 'updates';
    if (/newsletter/.test(normalized)) return 'newsletter';
    return 'primary';
  }
  let active = false;
  let scheduled = false;

  function visible(node) {
    return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function refresh() {
    scheduled = false;
    const inbox = location.hash === '#inbox' || location.hash.startsWith('#inbox/') || location.hash.startsWith('#category/');
    for (const notice of document.querySelectorAll('.bkK .aRu')) {
      const title = notice.querySelector('.aRv');
      const settings = notice.querySelector('.aRq[tabindex]');
      const pane = notice.closest('[role="tabpanel"]');
      const eligible = active && inbox && pane && visible(notice) && title && settings &&
        ![...pane.querySelectorAll('.zA')].some(visible) &&
        /^(Votre onglet .+ est vide|Your .+ tab is empty)/i.test(title.textContent.trim());

      if (!eligible) {
        notice.classList.remove('pk-studio-zero');
        notice.querySelector('.pk-studio-zero-art')?.remove();
        continue;
      }
      const lang = /^fr/i.test(document.documentElement.lang || navigator.language) ? 'fr' : 'en';
      const text = copy[lang];
      const name = pane.getAttribute('aria-label') || title.textContent.trim()
        .replace(/^(Votre onglet |Your )/i, '').replace(/( est vide| tab is empty)$/i, '').replace(/["“”]/g, '');
      const kind = category(name);
      let art = notice.querySelector('.pk-studio-zero-art');
      if (!art) {
        art = document.createElement('div');
        art.className = 'pk-studio-zero-art';
        // Trusted Types: Gmail forces a strict policy — build via DOM APIs only.
        for (const cls of ['pk-studio-zero-illustration', 'pk-studio-zero-kicker', 'pk-studio-zero-title', 'pk-studio-zero-detail']) {
          const node = document.createElement('div');
          node.className = cls;
          if (cls === 'pk-studio-zero-illustration') node.setAttribute('aria-hidden', 'true');
          art.append(node);
        }
        notice.prepend(art);
      }
      const illustration = art.querySelector('.pk-studio-zero-illustration');
      if (illustration.dataset.category !== kind) {
        illustration.dataset.category = kind;
        const svg = new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 120" fill="none" stroke="#222" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[kind]}</svg>`,
          'image/svg+xml'
        ).documentElement;
        illustration.replaceChildren(svg);
      }
      const display = window.__pkStudioCategoryNames?.[kind] || name;
      for (const [selector, value] of [['.pk-studio-zero-kicker', text.kicker], ['.pk-studio-zero-title', text.title], ['.pk-studio-zero-detail', text.detail(display)]]) {
        const node = art.querySelector(selector);
        if (node.textContent !== value) node.textContent = value;
      }
      notice.classList.add('pk-studio-zero');
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  chrome.storage.local.get(['theme', 'enabled'], state => {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-empty'] !== false;
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled)) return;
    chrome.storage.local.get(['theme', 'enabled'], state => {
      active = state.theme === 'theme-pk' && state.enabled?.['js-studio-empty'] !== false;
      schedule();
    });
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'] });
  window.addEventListener('hashchange', schedule);
  schedule();
})();
