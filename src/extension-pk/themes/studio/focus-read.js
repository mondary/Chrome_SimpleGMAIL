// Studio · Focus lecture (thread view only).
// When a conversation is open, the list chrome withdraws — #gb (logo +
// search), the Studio category strip, the thread toolbar and pager, and the
// floating reply bar — leaving only the compact sticky subject and message
// remain. The toolbar comes back when the pointer approaches the top edge,
// the reply bar and the compose FAB when it approaches the bottom edge, and
// #gb when keyboard focus enters it (Gmail's "/" search). Escape returns to
// the list through Gmail's real back control, unless Gmail has something of
// its own to close (compose, dialog, menu, text field). List view is
// untouched. Gmail nodes are never cloned or moved: containers are marked
// with data attributes and the state lives in classes on <html>.
// The visual side lives in focus-read.css (registered with this item).
(() => {
  if (window.__pkStudioFocusRead) return;
  window.__pkStudioFocusRead = true;

  const TOP_ZONE = 44;     // px from the top edge that summons the toolbar
  const BOTTOM_ZONE = 64;  // px from the bottom edge that summons the reply bar
  const HIDE_DELAY = 700;  // ms after the pointer leaves before withdrawing
  const RETRY_EVERY = 750;  // ms while Gmail is still mounting its reply bar
  // Escape returns to the list, like the back control that only comes back on
  // hover. Gmail keeps its own Escape whenever it has something to close.
  const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]';
  const NATIVE_CLOSE = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], .M9, .aoI';
  const BACK_LABELS = /^(retour|back|zurück|atras|atrás|indietro|voltar|назад)\b/i;

  let active = false;
  let reading = false;
  let scheduled = false;
  let floatEl = null;
  let scanRetry = 0;
  let topLayoutDirty = true;
  let layoutScheduled = false;
  let topZone = TOP_ZONE;

  const root = document.documentElement;
  const held = { top: false, bottom: false };
  const timers = { top: 0, bottom: 0 };

  function canHover() {
    return window.matchMedia('(hover: hover)').matches;
  }

  function visible(node) {
    return !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function toggleClass(name, on) {
    if (root.classList.contains(name) !== on) root.classList.toggle(name, on);
  }

  function mark(attribute, nodes) {
    const wanted = new Set(nodes.filter(Boolean));
    let changed = false;
    document.querySelectorAll(`[${attribute}]`).forEach(node => {
      if (!wanted.has(node)) { node.removeAttribute(attribute); changed = true; }
    });
    for (const node of wanted) {
      if (!node.hasAttribute(attribute)) { node.setAttribute(attribute, ''); changed = true; }
    }
    return changed;
  }

  function setVar(name, value) {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  }

  function labelOf(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('data-tooltip'),
      el.getAttribute('title'),
      el.innerText,
    ].filter(Boolean).join(' ').trim();
  }

  // The current sticky header was identified in Gmail's inspector. Keep the
  // older subject wrapper as a fallback, not as a prerequisite for Focus.
  function subjectHeader() {
    return [...document.querySelectorAll('div.V8djrc.byY')].find(visible)
      || [...document.querySelectorAll('.iY.a98.nH')].find(visible);
  }

  // The full thread view is the only place where the subject header exists.
  function readingView() {
    if (!canHover()) return false;
    return !!subjectHeader();
  }

  // Gmail's actual thread toolbar has a stable semantic hook used elsewhere
  // in this extension: .aeH .iH.bzn[gh="mtb"]. Prefer it to translated button
  // labels; keep a subject-relative fallback for Gmail variants.
  function findTools() {
    const native = [...document.querySelectorAll('.aeH .iH.bzn[gh="mtb"]')].filter(visible);
    if (native.length) {
      const row = native[0].closest('div.G-atb.D.E, div.G-atb.D.F');
      return row && !row.contains(subjectHeader()) ? row : native[0];
    }
    const subjectEl = subjectHeader();
    if (!subjectEl) return null;
    const previous = document.querySelector('[data-pk-focus-tools]');
    if (visible(previous) && !previous.contains(subjectEl)) return previous;
    let best = null;
    for (let wrap = subjectEl.parentElement; wrap && wrap !== document.body && !best; wrap = wrap.parentElement) {
      for (let node = wrap.firstElementChild; node; node = node.nextElementSibling) {
        if (node.contains(subjectEl) || node.querySelector('.iY, div.V8djrc.byY')) break;
        if (!visible(node)) continue;
        if (node.querySelectorAll('[role="button"],button,a').length >= 3) best = node;
      }
    }
    return best;
  }

  // Fix the counter/arrow group, then eliminate the enclosing row's own box
  // in collapseChromeShells(). Keeping these two jobs separate also supports a
  // Gmail row shared by the pagination and the thread actions.
  function findPager(tools) {
    const previous = document.querySelector('[data-pk-focus-pager]');
    const subject = subjectHeader();
    const controls = node => node.querySelectorAll('button, [role="button"]').length;
    const isPager = node => controls(node) >= 2 && /\d[\s\S]*\d/.test(node.textContent);
    const safe = node => !node.contains(subject) && node !== tools && !node.contains(tools)
      && !node.querySelector('.zA, .a3s');
    const groupFor = signal => {
      for (let node = signal; node && node !== document.body; node = node.parentElement) {
        if (!safe(node)) break;
        if (isPager(node)) return node;
      }
      return null;
    };
    // Stable identity first. Do not promote/demote the action marker between
    // the native toolbar and its G-atb parent on every Gmail mutation.
    if (previous?.isConnected && safe(previous) && visible(previous) && controls(previous) >= 2) return previous;

    const nativeRows = [...document.querySelectorAll('div.G-atb.D.E, div.G-atb.D.F')]
      .filter(node => (visible(node) || (node.hasAttribute('data-pk-focus-shell') && [...node.children].some(visible)))
        && !node.contains(subject));
    const signals = [...document.querySelectorAll('.Dj, .aqJ')].filter(visible);
    for (const row of nativeRows) {
      // Prefer a native group, not a width-constrained whole row. Native
      // counter text + two buttons also covers Gmail without .Dj/.aqJ.
      for (const node of row.querySelectorAll('div, span')) {
        if (safe(node) && visible(node) && isPager(node)) signals.push(node);
      }
      if (safe(row) && isPager(row)) signals.push(row);
    }
    return signals.map(groupFor).find(node => node && visible(node)) || null;
  }

  function syncTopChrome() {
    const tools = findTools();
    const pager = findPager(tools);
    const toolsChanged = mark('data-pk-focus-tools', [tools]);
    const pagerChanged = mark('data-pk-focus-pager', [pager]);
    if (toolsChanged || pagerChanged) topLayoutDirty = true;
    toggleClass('pk-focus-pager', !!pager);
  }

  // Taking a control out of flow does NOT reclaim the height of Gmail's
  // enclosing row if that row has its own height/min-height/padding. Collapse
  // only ancestors made entirely of the withdrawn chrome; stop as soon as an
  // ancestor also owns message content or any other visible UI.
  function collapseChromeShells() {
    const chromeSelector = '#gb, #pk-studio-tabs, [data-pk-focus-tools], [data-pk-focus-pager]';
    const chromeOnly = node => {
      if (node.nodeType === Node.TEXT_NODE) return !node.textContent.trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return true;
      if (node.matches(chromeSelector)) return true;
      if (node.matches('script, style, template, [hidden]')) return true;
      if (!node.hasChildNodes()) return node.matches('div, span');
      return [...node.childNodes].every(chromeOnly);
    };
    const shells = new Set();
    for (const control of document.querySelectorAll(chromeSelector)) {
      for (let shell = control.parentElement; shell && shell !== document.body; shell = shell.parentElement) {
        if (shell.matches(chromeSelector) || !chromeOnly(shell)) break;
        shells.add(shell);
      }
    }
    mark('data-pk-focus-shell', [...shells]);
  }

  // Reserve a clear lane for the left folder rail and the pager cluster. The
  // rail is aligned by no-left-menu.js to Gmail's burger; while #gb is hidden,
  // its position can jump, so measure the rail itself after its focus override.
  function syncTopChromeLayout() {
    layoutScheduled = false;
    if (!reading || !topLayoutDirty) return;
    topLayoutDirty = false;
    const rail = document.getElementById('pk-no-left-menu-rail');
    const pager = document.querySelector('[data-pk-focus-pager]');
    const tools = document.querySelector('[data-pk-focus-tools]');
    const fab = document.getElementById('pk-new-message-fab');
    const railEnd = rail ? Math.ceil(rail.getBoundingClientRect().right + 12) : 12;
    const pagerRect = pager?.getBoundingClientRect();
    const height = Math.ceil(Math.max(46, pagerRect?.height || 0, tools?.getBoundingClientRect().height || 0));
    const fabWidth = Math.ceil(fab?.getBoundingClientRect().width || 48);
    const replyButtons = floatEl ? [...floatEl.querySelectorAll('button,a,[role="button"],[role="link"]')]
      .filter(node => /^(répondre|repondre|reply|transf[ée]rer|forward)\b/i.test(labelOf(node))) : [];
    const replyHeight = replyButtons[0]?.getBoundingClientRect().height || 36;
    const replyBottom = replyButtons.at(-1)?.getBoundingClientRect().bottom;
    const composeInset = replyBottom === undefined ? 6 : Math.max(0, floatEl.getBoundingClientRect().bottom - replyBottom);
    topZone = Math.max(TOP_ZONE, height + 8);
    setVar('--pk-focus-rail-end', `${railEnd}px`);
    setVar('--pk-focus-pager-reserve', `${pagerRect?.width || 0}px`);
    setVar('--pk-focus-top-height', `${height}px`);
    setVar('--pk-focus-fab-width', `${fabWidth}px`);
    setVar('--pk-focus-compose-height', `${replyHeight}px`);
    setVar('--pk-focus-compose-inset', `${composeInset}px`);
  }

  // Resolve the floating native reply row once per DOM identity. Rescanning
  // an already hidden row would depend on our own visibility override.
  // Inline reply buttons must not hide the later fixed/sticky candidate.
  function markFloatBars() {
    if (floatEl?.isConnected && !floatEl.closest('[hidden], [aria-hidden="true"]')) return;
    floatEl = null;
    for (const el of document.querySelectorAll('button,a,[role="button"],[role="link"]')) {
      if (!visible(el) || !/^(répondre|repondre|reply|transf[ée]rer|forward)\b/i.test(labelOf(el))) continue;
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const position = getComputedStyle(node).position;
        if ((position === 'fixed' || position === 'sticky') && visible(node)) {
          floatEl = node;
          break;
        }
      }
      if (floatEl) break;
    }
    if (mark('data-pk-focus-floatbar', [floatEl])) topLayoutDirty = true;
    if (floatEl) {
      clearTimeout(scanRetry);
      scanRetry = 0;
    } else if (!scanRetry) {
      scanRetry = setTimeout(() => { scanRetry = 0; schedule(); }, RETRY_EVERY);
    }
  }

  function zoneSelector(zone) {
    return zone === 'top'
      ? '#gb, [data-pk-focus-tools], [data-pk-focus-pager], #pk-studio-tabs'
      : '[data-pk-focus-floatbar], #pk-new-message-fab';
  }

  function inTopChrome(target) {
    return !!target?.closest?.('#gb, [data-pk-focus-tools], [data-pk-focus-pager], #pk-studio-tabs');
  }

  function inBottomBar(target) {
    return !!target?.closest?.('[data-pk-focus-floatbar], #pk-new-message-fab');
  }

  // ---- Escape returns to the list ---------------------------------------

  // Gmail's real back control lives in the toolbar that Focus withdraws, so
  // keyboard users get the same exit as the hover reveal. Stable class/id
  // first, then the translated label. Never change the hash behind its back:
  // clicking the native control keeps the folder, label or search context.
  function backControl() {
    const scope = document.querySelector('[data-pk-focus-tools]') || document.querySelector('.aeH');
    const legacy = scope?.querySelector('#back, .ar0');
    if (legacy && visible(legacy)) return legacy;
    for (const root of scope ? [scope, document] : [document]) {
      const found = [...root.querySelectorAll('[role="button"], button, a')]
        .find(node => visible(node) && BACK_LABELS.test(labelOf(node)));
      if (found) return found;
    }
    return null;
  }

  // Compose, a dialog/menu/dropdown, or any text field keeps Escape for
  // itself: closing the composer must never drop the reader back to the list.
  function gmailOwnsEscape(target) {
    if (target?.closest?.(EDITABLE)) return true;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.closest?.(EDITABLE)) return true;
    return [...document.querySelectorAll(NATIVE_CLOSE)].some(visible);
  }

  function onKeyDown(event) {
    if (!active || !reading) return;
    if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (gmailOwnsEscape(target)) return;
    const back = backControl();
    event.preventDefault();
    event.stopPropagation();
    if (back) back.click();
    // No toolbar rendered (Gmail variant): the requested exit still works.
    else if (location.hash !== '#inbox') location.hash = '#inbox';
  }

  function queueHide(zone) {
    if (held[zone]) return;
    clearTimeout(timers[zone]);
    timers[zone] = setTimeout(() => {
      timers[zone] = 0;
      const focused = document.activeElement?.closest?.(zoneSelector(zone));
      if (!held[zone] && !focused) toggleClass(`pk-focus-${zone}`, false);
    }, HIDE_DELAY);
  }

  function hold(zone, on) {
    if (on) {
      held[zone] = true;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      toggleClass(`pk-focus-${zone}`, true);
      return;
    }
    if (!held[zone]) return;
    held[zone] = false;
    queueHide(zone);
  }

  function onPointerMove(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    hold('top', inTopChrome(target) || event.clientY <= topZone);
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
    const zone = inTopChrome(target) ? 'top' : inBottomBar(target) ? 'bottom' : null;
    if (zone) {
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      toggleClass(`pk-focus-${zone}`, true);
    }
  }

  function onFocusOut(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    // A Gmail focus change must not clear the independent pointer hold.
    if (inTopChrome(target)) queueHide('top');
    if (inBottomBar(target)) queueHide('bottom');
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
    root.classList.remove('pk-focus-pager');
    root.style.removeProperty('--pk-focus-rail-end');
    root.style.removeProperty('--pk-focus-pager-reserve');
    root.style.removeProperty('--pk-focus-top-height');
    root.style.removeProperty('--pk-focus-fab-width');
    root.style.removeProperty('--pk-focus-compose-height');
    root.style.removeProperty('--pk-focus-compose-inset');
    topLayoutDirty = true;
    topZone = TOP_ZONE;
    floatEl = null;
    clearTimeout(scanRetry);
    scanRetry = 0;
    document.querySelectorAll('[data-pk-focus-tools],[data-pk-focus-pager],[data-pk-focus-floatbar],[data-pk-focus-shell]')
      .forEach(el => {
        el.removeAttribute('data-pk-focus-tools');
        el.removeAttribute('data-pk-focus-pager');
        el.removeAttribute('data-pk-focus-floatbar');
        el.removeAttribute('data-pk-focus-shell');
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
        topLayoutDirty = true;
        root.classList.add('pk-focus');
      } else {
        releaseAll();
      }
    }
    if (!reading) return;
    if (floatEl && !floatEl.isConnected) {
      floatEl = null;
    }
    syncTopChrome();
    collapseChromeShells();
    markFloatBars();
    if (topLayoutDirty && !layoutScheduled) {
      layoutScheduled = true;
      requestAnimationFrame(syncTopChromeLayout);
    }
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
  document.addEventListener('keydown', onKeyDown, true);

  function applyState(state) {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-focus-read'] !== false;
    schedule();
  }

  chrome.storage.local.get(['theme', 'enabled'], applyState);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled)) return;
    chrome.storage.local.get(['theme', 'enabled'], applyState);
  });
  new MutationObserver(records => {
    const pager = document.querySelector('[data-pk-focus-pager]');
    const fab = document.getElementById('pk-new-message-fab');
    if (records.some(record => pager?.contains(record.target) || fab?.contains(record.target) || floatEl?.contains(record.target))) topLayoutDirty = true;
    schedule();
  }).observe(document.documentElement, {
    childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden', 'hidden'],
  });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('resize', () => {
    topLayoutDirty = true;
    schedule();
  });
  schedule();
})();
