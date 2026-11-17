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
  const SCAN_EVERY = 2000; // ms between structural scans when nothing is found

  let active = false;
  let reading = false;
  let scheduled = false;
  let toolsEl = null;
  let floatEl = null;
  let lastScan = 0;
  let pointerY = -1;

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
    return (el.getAttribute('aria-label') || el.innerText || '').trim();
  }

  // The full thread view is the only place where the subject header exists.
  function readingView() {
    if (!canHover()) return false;
    return [...document.querySelectorAll('.iY.a98.nH')].some(visible);
  }

  // The thread toolbar carries the back arrow. Take the largest ancestor of
  // that row which still does not swallow the subject header.
  function markTools() {
    if (toolsEl?.isConnected) return;
    toolsEl = null;
    const back = [...document.querySelectorAll('[role="button"],[role="link"]')]
      .find(el => visible(el) && /^(retour|back)\b/i.test(labelOf(el)));
    if (!back) return;
    let row = back.parentElement;
    for (let node = back.parentElement; node && node !== document.body; node = node.parentElement) {
      if (node.querySelector('.iY')) break;
      if (node.querySelectorAll('[role="button"],[role="link"]').length >= 3) row = node;
    }
    if (!row || row === document.body) return;
    toolsEl = row;
    row.setAttribute('data-pk-focus-tools', '');
  }

  // The floating reply bar (2025 Gmail) is a fixed/sticky ancestor of a real
  // "Répondre" button. An in-flow reply row at the end of the thread is left
  // alone: it only shows up when the conversation ends.
  function markFloatBar() {
    if (floatEl?.isConnected) return;
    floatEl = null;
    if (Date.now() - lastScan < SCAN_EVERY) return;
    lastScan = Date.now();
    const reply = [...document.querySelectorAll('[role="button"],[role="link"]')]
      .find(el => visible(el) && /^(répondre|repondre|reply)\b/i.test(labelOf(el)));
    if (!reply) return;
    for (let node = reply.parentElement; node && node !== document.body; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if ((position === 'fixed' || position === 'sticky') && visible(node)) {
        floatEl = node;
        node.setAttribute('data-pk-focus-floatbar', '');
        return;
      }
    }
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
      if (!held[zone]) root.classList.remove(`pk-focus-${zone}`);
    }, HIDE_DELAY);
  }

  function onPointerMove(event) {
    if (!reading) return;
    pointerY = event.clientY;
    const target = event.target instanceof Element ? event.target : null;
    hold('top', inTopChrome(target) || pointerY <= TOP_ZONE);
    hold('bottom', inBottomBar(target) || pointerY >= window.innerHeight - BOTTOM_ZONE);
  }

  function onPointerLeave() {
    if (!reading) return;
    pointerY = -1;
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
    pointerY = -1;
    for (const zone of ['top', 'bottom']) {
      held[zone] = false;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      root.classList.remove(`pk-focus-${zone}`);
    }
    root.classList.remove('pk-focus');
    toolsEl = null;
    floatEl = null;
    document.querySelectorAll('[data-pk-focus-tools],[data-pk-focus-floatbar]')
      .forEach(el => {
        el.removeAttribute('data-pk-focus-tools');
        el.removeAttribute('data-pk-focus-floatbar');
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
        root.classList.add('pk-focus');
      } else {
        releaseAll();
      }
    }
    if (!reading) return;
    markTools();
    markFloatBar();
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
