// Studio: extra inbox tabs that open a Gmail label (Achats, Newsletters…).
// Gmail only declares five inbox categories; other system labels (Purchases)
// never get a tab, so we mirror them next to the native category tabs.
(() => {
  if (window.__pkStudioLabelTabs) return;
  window.__pkStudioLabelTabs = true;

  let active = false;
  let labels = [];
  let scheduled = false;
  let tabObserver = null;

  function watchTabs(list) {
    if (!tabObserver) tabObserver = new MutationObserver(schedule);
    tabObserver.disconnect();
    tabObserver.observe(list, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'aria-selected'],
    });
  }

  function tablist() {
    return [...document.querySelectorAll('[role="tablist"]')]
      .find((list) => list.querySelector('[role="tab"] .aKz')) || null;
  }

  const PICTOS = {
    bag: ['M6 8h12l-1.2 12H7.2L6 8Z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
    news: ['M5 5h10v14H5z', 'M8 9.5h4M8 13h4M15 5v14'],
    tag: ['M4 4h7l9 9-7 7-9-9z', 'M8.2 8.2h.01'],
  };

  function pictoFor(label) {
    const key = label.toLowerCase();
    const paths = /achat|purchase|commande|shop|panier/.test(key) ? PICTOS.bag
      : /newsletter|news|actu/.test(key) ? PICTOS.news : PICTOS.tag;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#5f6368' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>${paths.map((d) => `<path d='${d}'/>`).join('')}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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
    // A selected native tab always wins: never show two selected tabs.
    select(tab, label, !nativeSelected && isSelected(label));
    if (!tab.dataset.pkLabelWired) {
      tab.dataset.pkLabelWired = '1';
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        location.hash = `#label/${encodeURIComponent(label)}`;
        select(tab, label, true);
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
    watchTabs(list);
    const nativeTabs = [...list.querySelectorAll('[role="tab"]:not([data-pk-label-tab])')];
    if (!nativeTabs.length) return;
    const nativeSelected = nativeTabs.some((tab) =>
      tab.classList.contains('J-KU-KO') || tab.getAttribute('aria-selected') === 'true');
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
        // Keep the pictogram slot, swap in our own mark; drop badges and stale data.
        clone.querySelectorAll('.bsU, .aio').forEach((node) => node.remove());
        clone.removeAttribute('data-pk-original');
        clone.removeAttribute('data-pk-aria-name');
        clone.querySelectorAll('[data-pk-original], [data-pk-aria-name]').forEach((node) => {
          node.removeAttribute('data-pk-original');
          node.removeAttribute('data-pk-aria-name');
        });
        inner.setAttribute('aria-selected', 'false');
        decorate(inner, label, nativeSelected);
        const picto = clone.querySelector('.aKp');
        if (picto) {
          picto.style.backgroundImage = pictoFor(label);
          picto.style.backgroundSize = 'contain';
          picto.style.backgroundPosition = 'center';
          picto.style.backgroundRepeat = 'no-repeat';
        }
        sourceCell.parentElement.insertBefore(clone, sourceCell.nextSibling);
      } else {
        decorate(tab, label, nativeSelected);
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
