// Studio · Focus lecture (thread view only).
// When a conversation is open, the list chrome withdraws — #gb (logo +
// search), the Studio category strip, the thread action toolbar and the
// floating reply bar — and only the compact sticky subject plus the message
// remain. The toolbar comes back when the pointer approaches the top edge,
// the reply bar and the compose FAB when it approaches the bottom edge, and
// #gb when keyboard focus enters it (Gmail's "/" search). List view is
// untouched. Gmail nodes are never cloned or moved: containers are marked
// with data attributes and the state lives in classes on <html>.
// The visual side lives in focus-read.css (registered with this item).
(() => {
  if (window.__pkStudioFocusRead) return;
  window.__pkStudioFocusRead = true;

  const TOP_ZONE = 44;     // px from the top edge that summons the toolbar
  const BOTTOM_ZONE = 64;  // px from the bottom edge that summons the reply bar
  const HIDE_DELAY = 700;  // ms after the pointer leaves before withdrawing
  const SCAN_EVERY = 2000; // ms between full scans once a floating bar is found
  const RETRY_EVERY = 750;  // ms while Gmail is still mounting its reply bar

  let active = false;
  let reading = false;
  let scheduled = false;
  let floatEl = null;
  let lastScan = 0;
  let scanRetry = 0;

  const root = document.documentElement;
  const held = { top: false, bottom: false };
  const timers = { top: 0, bottom: 0 };

  function canHover() {
    return window.matchMedia('(hover: hover)').matches;
  }

  function visible(node) {
    return !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function labelOf(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('data-tooltip'),
      el.getAttribute('title'),
      el.innerText,
    ].filter(Boolean).join(' ').trim();
  }

  // The full thread view is the only place where the subject header exists.
  function readingView() {
    if (!canHover()) return false;
    return [...document.querySelectorAll('.iY.a98.nH')].some(visible);
  }

  // Gmail's actual thread toolbar has a stable semantic hook used elsewhere
  // in this extension: .aeH .iH.bzn[gh="mtb"]. Prefer it to translated button
  // labels; keep a subject-relative fallback for Gmail variants.
  function markTools() {
    const native = [...document.querySelectorAll('.aeH .iH.bzn[gh="mtb"]')].filter(visible);
    if (native.length) {
      native.forEach(el => el.setAttribute('data-pk-focus-tools', ''));
      return;
    }
    const subjectEl = [...document.querySelectorAll('.iY.a98.nH')].find(visible);
    if (!subjectEl) return;
    let best = null;
    for (let wrap = subjectEl.parentElement; wrap && wrap !== document.body && !best; wrap = wrap.parentElement) {
      for (let node = wrap.firstElementChild; node; node = node.nextElementSibling) {
        if (node.contains(subjectEl) || node.querySelector('.iY')) break;
        if (!visible(node)) continue;
        if (node.querySelectorAll('[role="button"],button,a').length >= 3) best = node;
      }
    }
    if (!best) return;
    best.setAttribute('data-pk-focus-tools', '');
  }

  // Floating action bars (reply / forward, 2025 Gmail) are fixed or sticky
  // ancestors of REAL reply buttons. Every visible candidate is scanned —
  // never just the first match: an inline "Répondre" button inside the
  // message must not hide the floating bar from the scan.
  function markFloatBars() {
    const now = Date.now();
    const interval = floatEl?.isConnected ? SCAN_EVERY : RETRY_EVERY;
    if (now - lastScan < interval) {
      if (!floatEl?.isConnected && !scanRetry) {
        scanRetry = setTimeout(() => {
          scanRetry = 0;
          schedule();
        }, interval - (now - lastScan) + 8);
      }
      return;
    }
    lastScan = now;
    let found = false;
    for (const el of document.querySelectorAll('button,a,[role="button"],[role="link"]')) {
      if (!visible(el) || !/^(répondre|repondre|reply|transf[ée]rer|forward)\b/i.test(labelOf(el))) continue;
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const position = getComputedStyle(node).position;
        if ((position === 'fixed' || position === 'sticky') && visible(node)) {
          if (!node.hasAttribute('data-pk-focus-floatbar')) {
            const rect = node.getBoundingClientRect();
            node.style.setProperty('--pk-focus-float-left', `${Math.round(rect.left)}px`);
            node.style.setProperty('--pk-focus-float-width', `${Math.round(rect.width)}px`);
            if (!floatEl) floatEl = node;
            node.setAttribute('data-pk-focus-floatbar', '');
          }
          found = true;
          break; // innermost floating ancestor of this button
        }
      }
    }
    if (found) {
      clearTimeout(scanRetry);
      scanRetry = 0;
      floatEl = floatEl?.isConnected ? floatEl : [...document.querySelectorAll('[data-pk-focus-floatbar]')].find(el => el.isConnected) || null;
    }
  }

  function zoneSelector(zone) {
    return zone === 'top'
      ? '#gb, [data-pk-focus-tools], #pk-studio-tabs'
      : '[data-pk-focus-floatbar], #pk-new-message-fab';
  }

  function inTopChrome(target) {
    return !!target?.closest?.('#gb, [data-pk-focus-tools], #pk-studio-tabs');
  }

  function inBottomBar(target) {
    return !!target?.closest?.('[data-pk-focus-floatbar], #pk-new-message-fab');
  }

  function hold(zone, on) {
    if (on) {
      held[zone] = true;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      root.classList.add(`pk-focus-${zone}`);
      return;
    }
    if (!held[zone]) return;
    held[zone] = false;
    clearTimeout(timers[zone]);
    timers[zone] = setTimeout(() => {
      timers[zone] = 0;
      // Keyboard focus inside the zone keeps it open (typing a reply or
      // tabbing through toolbar controls): only the pointer closes it.
      const focused = document.activeElement?.closest?.(zoneSelector(zone));
      if (!held[zone] && !focused) root.classList.remove(`pk-focus-${zone}`);
    }, HIDE_DELAY);
  }

  function onPointerMove(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    hold('top', inTopChrome(target) || event.clientY <= TOP_ZONE);
    hold('bottom', inBottomBar(target) || event.clientY >= window.innerHeight - BOTTOM_ZONE);
  }

  function onPointerLeave() {
    if (!reading) return;
    hold('top', false);
    hold('bottom', false);
  }

  function onFocusIn(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    if (inTopChrome(target)) hold('top', true);
    else if (inBottomBar(target)) hold('bottom', true);
  }

  function onFocusOut(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    if (inTopChrome(target)) hold('top', false);
    if (inBottomBar(target)) hold('bottom', false);
  }

  function releaseAll() {
    reading = false;
    for (const zone of ['top', 'bottom']) {
      held[zone] = false;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      root.classList.remove(`pk-focus-${zone}`);
    }
    root.classList.remove('pk-focus');
    floatEl = null;
    clearTimeout(scanRetry);
    scanRetry = 0;
    document.querySelectorAll('[data-pk-focus-tools],[data-pk-focus-floatbar]')
      .forEach(el => {
        el.removeAttribute('data-pk-focus-tools');
        el.removeAttribute('data-pk-focus-floatbar');
        el.style.removeProperty('--pk-focus-float-left');
        el.style.removeProperty('--pk-focus-float-width');
      });
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      if (reading || root.classList.contains('pk-focus')) releaseAll();
      return;
    }
    const next = readingView();
    if (next !== reading) {
      if (next) {
        reading = true;
        lastScan = 0; // scan the floating bars right away on entry
        root.classList.add('pk-focus');
      } else {
        releaseAll();
      }
    }
    if (!reading) return;
    if (floatEl && !floatEl.isConnected) {
      floatEl = null;
      lastScan = 0;
    }
    markTools();
    markFloatBars();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

  function applyState(state) {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-focus-read'] !== false;
    schedule();
  }

  chrome.storage.local.get(['theme', 'enabled'], applyState);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled)) return;
    chrome.storage.local.get(['theme', 'enabled'], applyState);
  });
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden', 'hidden'],
  });
  window.addEventListener('hashchange', schedule);
  schedule();
})();
