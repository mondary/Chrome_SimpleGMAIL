// Studio only: rename Gmail's inbox category tabs without touching the mailbox.
// Labels live in chrome.storage.local.pkCategoryLabels ({ primary, promotions,
// social, updates, forums, newsletter }); an empty value keeps Gmail's name.
(() => {
  if (window.__pkStudioCategoryLabels) return;
  window.__pkStudioCategoryLabels = true;

  const MATCHERS = [
    ['primary', /^(principale|primary|boite de reception|inbox)$/],
    ['promotions', /^promotions?$/],
    ['social', /^(reseaux sociaux|social)$/],
    ['updates', /^(notifications?|updates?)$/],
    ['forums', /^forums?$/],
    ['purchases', /^(achats?|purchases?)$/],
    ['newsletter', /^newsletters?$/],
  ];
  // Gmail's own tab classes survive a label rewrite; used when text is ambiguous.
  const CLASS_HINTS = [
    ['primary', /aIf-aLe/],
    ['promotions', /aJi-aLe/],
    ['social', /aKe-aLe/],
    ['forums', /aHE-aLe/],
  ];

  let active = false;
  let labels = {};
  let scheduled = false;

  function normalize(text) {
    return (text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[,\s]*(?:\d+\s+)?(?:nouveaux?|new)\s+messages?.*$/i, '')
      .replace(/[,\s]+$/, '')
      .toLowerCase().trim();
  }

  function categoryOf(tab) {
    if (tab.dataset.pkCategory) return tab.dataset.pkCategory;
    const text = normalize(tab.getAttribute('aria-label')) || normalize(tab.querySelector('.aKz')?.textContent);
    for (const [id, pattern] of MATCHERS) if (pattern.test(text)) return id;
    const cls = String(tab.className);
    for (const [id, pattern] of CLASS_HINTS) if (pattern.test(cls)) return id;
    return '';
  }

  function rename(tab, label) {
    const native = label.dataset.pkOriginal ?? label.textContent;
    const category = active ? categoryOf(tab) : '';
    const wanted = category ? String(labels[category] || '').trim() : '';
    const next = wanted || native;
    if (label.dataset.pkOriginal === undefined) label.dataset.pkOriginal = native;
    if (label.textContent !== next) label.textContent = next;

    // Screen readers keep the native description after the renamed name.
    const aria = tab.getAttribute('aria-label');
    if (!aria) return;
    const applied = tab.dataset.pkAriaName || '';
    const base = native.trim();
    const offset = base && aria.startsWith(base) ? base.length : applied && aria.startsWith(applied) ? applied.length : 0;
    if (!offset) return;
    const renamed = next + aria.slice(offset);
    if (renamed !== aria) tab.setAttribute('aria-label', renamed);
    tab.dataset.pkAriaName = next;
  }

  function refresh() {
    scheduled = false;
    for (const tab of document.querySelectorAll('[role="tab"]')) {
      // Injected label tabs (Achats, …) are not Gmail categories.
      if (tab.hasAttribute('data-pk-label-tab')) continue;
      const label = tab.querySelector('.aKz');
      if (!label) continue;
      rename(tab, label);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    // setTimeout, not rAF: Gmail in a background tab must still apply the names.
    setTimeout(refresh, 0);
  }

  function applyState(state) {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-category-labels'] !== false;
    labels = active && state.pkCategoryLabels && typeof state.pkCategoryLabels === 'object' ? state.pkCategoryLabels : {};
    // Same isolated world: the Studio empty state reuses these names.
    window.__pkStudioCategoryNames = labels;
    schedule();
  }

  const KEYS = ['theme', 'enabled', 'pkCategoryLabels'];
  const load = () => chrome.storage.local.get(KEYS).then(applyState);
  load();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled && !changes.pkCategoryLabels)) return;
    load();
  });
  new MutationObserver(schedule).observe(document.body || document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'aria-selected'],
  });
  schedule();
})();
