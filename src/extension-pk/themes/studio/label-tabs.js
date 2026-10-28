// Studio: extra inbox tabs that open a Gmail label (Achats, Newsletters…).
// Gmail only declares five inbox categories; other system labels (Purchases)
// never get a tab, so we mirror them next to the native category tabs.
(() => {
  if (window.__pkStudioLabelTabs) return;
  window.__pkStudioLabelTabs = true;

  let active = false;
  let labels = [];
  let nativeLabels = [];
  let barTemplate = null;
  let scheduled = false;
  let tabObserver = null;

  function tablists() {
    return [...document.querySelectorAll('[role="tablist"]')].filter((list) =>
      list.classList.contains('aAA') || list.querySelector('[role="tab"] .aKz'));
  }

  function watchTabs(list) {
    if (!tabObserver) tabObserver = new MutationObserver(schedule);
    tabObserver.observe(list, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'aria-selected'],
    });
  }

  function slug(label) {
    return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function isSelected(label) {
    return decodeURIComponent(location.hash) === `#label/${label}`;
  }

  function select(tab, label, on) {
    tab.classList.toggle('J-KU-KO', on);
    tab.setAttribute('aria-selected', String(on));
    if (on) {
      const list = tab.closest('[role="tablist"]');
      for (const other of list ? list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])') : []) {
        other.classList.remove('J-KU-KO');
        other.setAttribute('aria-selected', 'false');
      }
    }
  }

  function decorate(tab, label, nativeSelected) {
    const key = slug(label);
    const text = tab.querySelector('.aKz');
    if (text) text.textContent = label;
    tab.setAttribute('data-pk-label-tab', key);
    tab.setAttribute('aria-label', label);
    select(tab, label, !nativeSelected && isSelected(label));
    if (!tab.dataset.pkLabelWired) {
      tab.dataset.pkLabelWired = '1';
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        location.hash = `#label/${encodeURIComponent(label)}`;
        select(tab, label, true);
        schedule();
      }, true);
    }
  }

  function cellOf(tab) {
    return tab.closest('td') || tab;
  }

  function categoryHash(text) {
    const key = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/principal|primary/.test(key)) return '#inbox';
    if (/promotion/.test(key)) return '#category/promotions';
    if (/reseaux|social/.test(key)) return '#category/social';
    if (/notification|update/.test(key)) return '#category/updates';
    if (/forum/.test(key)) return '#category/forums';
    return '#inbox';
  }

  function injectInto(list) {
    const nativeTabs = [...list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])')];
    if (!nativeTabs.length) return;
    if (!nativeLabels.length) {
      nativeLabels = nativeTabs.map((tab) => {
        const el = tab.querySelector('.aKz');
        return {
          text: (el?.textContent || '').trim(),
          key: (el?.dataset.pkOriginal || el?.textContent || '').trim(),
        };
      }).filter((item) => item.text);
    }
    if (!barTemplate) {
      const owner = list.closest('table') || list.parentElement;
      if (owner) barTemplate = owner.cloneNode(true);
    }
    const nativeSelected = nativeTabs.some((tab) =>
      tab.classList.contains('J-KU-KO') || tab.getAttribute('aria-selected') === 'true');
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
        inner.setAttribute('aria-selected', 'false');
        decorate(inner, label, nativeSelected);
        sourceCell.parentElement.insertBefore(clone, sourceCell.nextSibling);
      } else {
        decorate(tab, label, nativeSelected);
      }
    }
    for (const tab of list.querySelectorAll('[data-pk-label-tab]')) {
      if (!labels.some((label) => slug(label) === tab.dataset.pkLabelTab)) cellOf(tab).remove();
    }
  }

  function persistentBar() {
    return document.querySelector('[data-pk-label-bar-clone]');
  }

  function wireClonedBar(bar) {
    const list = bar.querySelector('[role="tablist"]');
    if (!list || list.dataset.pkCloneWired) return;
    list.dataset.pkCloneWired = '1';
    for (const tab of list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])')) {
      const text = tab.querySelector('.aKz');
      const key = text?.dataset.pkOriginal || text?.textContent || '';
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        location.hash = categoryHash(key.trim());
      }, true);
    }
  }

  function ensurePersistentBar() {
    const hash = decodeURIComponent(location.hash);
    const onOurLabel = labels.some((label) => hash === `#label/${label}`);
    if (!onOurLabel) {
      persistentBar()?.remove();
      return;
    }
    const template = barTemplate || tablists()[0]?.closest('table') || tablists()[0]?.parentElement;
    if (!template) return;
    if (persistentBar()) return;
    const host = document.querySelector('.bkK') || document.querySelector('[role="main"]');
    if (!host) return;
    const bar = template.cloneNode(true);
    bar.setAttribute('data-pk-label-bar-clone', '');
    bar.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    const cloneList = bar.querySelector('[role="tablist"]');
    if (!cloneList) return;
    for (const node of cloneList.querySelectorAll('[data-pk-label-tab]')) cellOf(node).remove();
    const sourceTab = cloneList.querySelector('[role="tab"]');
    if (!sourceTab) return;
    const sourceCell = cellOf(sourceTab);
    for (const label of labels) {
      const cell = sourceCell.cloneNode(true);
      const tab = cell.querySelector('[role="tab"]') || cell;
      tab.removeAttribute('id');
      tab.removeAttribute('jsaction');
      tab.removeAttribute('jscontroller');
      tab.removeAttribute('jsname');
      tab.removeAttribute('data-tooltip');
      tab.removeAttribute('aria-controls');
      decorate(tab, label, false);
      sourceCell.parentElement.append(cell);
    }
    wireClonedBar(bar);
    host.prepend(bar);
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      document.querySelectorAll('[data-pk-label-tab]').forEach((tab) => cellOf(tab).remove());
      persistentBar()?.remove();
      return;
    }
    const lists = tablists();
    for (const list of lists) {
      if (!list.closest('[data-pk-label-bar-clone]')) {
        watchTabs(list);
        injectInto(list);
      }
    }
    ensurePersistentBar();
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
