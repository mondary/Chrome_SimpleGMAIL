// Studio: extra inbox tabs that open a Gmail label (Achats, Newsletters…).
// Gmail only declares five inbox categories; other system labels (Purchases)
// never get a tab, so we mirror them next to the native category tabs.
(() => {
  if (window.__pkStudioLabelTabs) return;
  window.__pkStudioLabelTabs = true;

  let active = false;
  let labels = [];
  let scheduled = false;

  function tablist() {
    return [...document.querySelectorAll('[role="tablist"]')]
      .find((list) => list.querySelector('[role="tab"] .aKz')) || null;
  }

  function slug(label) {
    return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function decorate(tab, label) {
    const key = slug(label);
    const text = tab.querySelector('.aKz');
    if (text) text.textContent = label;
    tab.setAttribute('data-pk-label-tab', key);
    tab.setAttribute('aria-label', label);
    tab.setAttribute('aria-selected', String(decodeURIComponent(location.hash) === `#label/${label}`));
    if (!tab.dataset.pkLabelWired) {
      tab.dataset.pkLabelWired = '1';
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        location.hash = `#label/${encodeURIComponent(label)}`;
      }, true);
    }
  }

  function cellOf(tab) {
    return tab.closest('td') || tab;
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      document.querySelectorAll('[data-pk-label-tab]').forEach((tab) => cellOf(tab).remove());
      return;
    }
    const list = tablist();
    if (!list) return;
    const nativeTabs = [...list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])')];
    if (!nativeTabs.length) return;
    // Gmail lays the category bar out as a table: clone the whole cell so the
    // injected tab keeps the native padding, separator and hit area.
    const sourceCell = cellOf(nativeTabs[nativeTabs.length - 1]);
    for (const label of labels) {
      const key = slug(label);
      if (!key) continue;
      let tab = list.querySelector(`[data-pk-label-tab="${key}"]`);
      if (!tab) {
        const clone = sourceCell.cloneNode(true);
        const inner = clone.querySelector('[role="tab"]') || clone;
        for (const node of [clone, ...clone.querySelectorAll('[id], [jsaction], [jscontroller], [jsname], [role="tab"]')]) {
          node.removeAttribute('id');
          node.removeAttribute('jsaction');
          node.removeAttribute('jscontroller');
          node.removeAttribute('jsname');
          node.removeAttribute('data-tooltip');
          node.removeAttribute('aria-controls');
        }
        // Drop the copied category pictogram, unread badge and stale renaming data.
        clone.querySelectorAll('.aKp, .bsU, .aio').forEach((node) => node.remove());
        clone.removeAttribute('data-pk-original');
        clone.removeAttribute('data-pk-aria-name');
        clone.querySelectorAll('[data-pk-original], [data-pk-aria-name]').forEach((node) => {
          node.removeAttribute('data-pk-original');
          node.removeAttribute('data-pk-aria-name');
        });
        inner.setAttribute('aria-selected', 'false');
        decorate(inner, label);
        sourceCell.parentElement.insertBefore(clone, sourceCell);
      } else {
        decorate(tab, label);
      }
    }
    for (const tab of list.querySelectorAll('[data-pk-label-tab]')) {
      if (!labels.some((label) => slug(label) === tab.dataset.pkLabelTab)) cellOf(tab).remove();
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  const KEYS = ['theme', 'enabled', 'pkLabelTabs'];
  const load = () => chrome.storage.local.get(KEYS).then((state) => {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-label-tabs'] !== false;
    const stored = state.pkLabelTabs;
    const fallback = /^fr/i.test(document.documentElement.lang || navigator.language) ? ['Achats'] : ['Purchases'];
    labels = (Array.isArray(stored) ? stored : fallback)
      .filter((label) => typeof label === 'string' && label.trim())
      .map((label) => label.trim()).slice(0, 6);
    schedule();
  });
  load();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled && !changes.pkLabelTabs)) return;
    load();
  });
  new MutationObserver(schedule).observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });
  window.addEventListener('hashchange', schedule);
  schedule();
})();
