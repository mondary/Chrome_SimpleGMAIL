// Studio · Focus lecture (thread view only).
// When a conversation is open, the list chrome withdraws — #gb (logo +
// search), the Studio category strip, the thread toolbar and pager, and the
// floating reply bar — leaving only the compact sticky subject and message
// remain. The top edge summons the whole top chrome in one band: the global
// bar (logo + search) slides in at its official spot — measured while the
// list is in natural flow and pinned as the band anchor, so clicking Mail
// never makes it jump — with the thread toolbar and pager stacked beneath.
// The reply bar and the compose FAB come back when
// the pointer approaches the bottom edge, and #gb also slides in on its own
// when keyboard focus enters it (Gmail's "/" search). Only a deliberate Tab
// reveals the bands from the keyboard: Gmail focuses the pager after J/K and
// the label button for "l", and that focus must never paint them over the
// subject. Escape returns to
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
  const NATIVE_CLOSE = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"], .M9, .aoI';
  // The Focus band hosts: their own mounted layers ride with them.
  const BAND_HOSTS = '#gb, [data-pk-focus-tools], [data-pk-focus-pager], [data-pk-focus-floatbar], #pk-new-message-fab';
  const BACK_LABELS = /^(retour|back|zurück|atras|atrás|indietro|voltar|назад)\b/i;
  // J / K walk the conversations while reading, like the pager arrows the
  // hover reveals: j = older (deeper in the list), k = newer — the same
  // mapping the Focus theme already uses. Translated labels first, then the
  // fixture's wording; a missing arrow never steals the key from Gmail.
  const PAGER_OLDER = /^(plus ancien|older|message suivant|suiv|next)/i;
  const PAGER_NEWER = /^(plus récent|plus recent|newer|message précédent|message precedent|préc|previous)/i;

  let active = false;
  let reading = false;
  let scheduled = false;
  let floatEl = null;
  let scanRetry = 0;
  let topLayoutDirty = true;
  let layoutScheduled = false;
  let topZone = TOP_ZONE;
  // Deliberate keyboard navigation into the chrome is Tab only. Gmail moves
  // focus by itself after its actions — the pager arrow after J/K, the label
  // button when "l" opens the menu — and that must never paint the bands
  // over the subject. Any other key or pointer gesture cancels the intent.
  let tabIntent = false;

  const root = document.documentElement;
  const held = { top: false, bottom: false };
  const byFocus = { top: false, bottom: false };
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

  // Gmail's actual thread toolbar hook, shared with the similar-messages
  // filter. Only the conversation view carries it (gh="mtb").
  function nativeThreadBars() {
    return [...document.querySelectorAll('.aeH .iH.bzn[gh="mtb"]')].filter(visible);
  }

  // The full thread view is the only place where the subject header exists.
  // If Gmail renames that sticky header, a real thread toolbar over a real
  // message body still means reading: the list toolbar never has a message
  // body under it.
  function readingView() {
    if (!canHover()) return false;
    if (subjectHeader()) return true;
    const bar = nativeThreadBars()[0];
    return !!bar && !![...document.querySelectorAll('.a3s, .ii')].find(visible);
  }

  // Gmail's actual thread toolbar has a stable semantic hook used elsewhere
  // in this extension: .aeH .iH.bzn[gh="mtb"]. Prefer it to translated button
  // labels; keep a subject-relative fallback for Gmail variants.
  function findTools() {
    const native = nativeThreadBars();
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
        // Message/list content is never the toolbar — findPager's safe() has
        // this guard; a message block with three links must not become the
        // action row while Gmail remounts the real toolbar after J/K.
        if (node.querySelector('.zA, .a3s, .ii')) continue;
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
    // The global bar joins the hover band above the actions row; its real
    // height shifts the revealed rows down (measured, never assumed — it
    // stays valid while withdrawn because translateY only moves it). #gb is
    // one ~64 px bar: anything taller is a mid-render/animated frame, never
    // a real band anchor, so clamp it.
    const gbHeight = Math.min(200, Math.ceil(document.getElementById('gb')?.getBoundingClientRect().height || 0));
    const railEnd = rail ? Math.ceil(rail.getBoundingClientRect().right + 12) : 12;
    const pagerRect = pager?.getBoundingClientRect();
    // Band height = the row's tallest CHILD plus our 12 px vertical padding,
    // never the fixed box itself: the box wears min-height from this very
    // variable, so measuring it feeds the value back and ratchets. One frame
    // caught mid-swap after J/K (toolbar remounting or re-rendering taller
    // than its controls) locked a half-screen band — white strip over the
    // reading area, action buttons centered mid-screen, top hover zone
    // swallowing half the pane — until the mode was left entirely. Children
    // of the flex row (align-items: center) keep their natural height, so the
    // value also heals by itself at the next re-measure. The pager subtree is
    // skipped when it nests in the shared action row: it wears the same
    // enforced min-height and would re-feed it. The cap bounds any transient
    // Gmail state; a real band row is a single unwrapped flex line.
    const rowHeight = (node, skip) => {
      let tallest = 0;
      if (node) for (const child of node.children) {
        if (skip && (child === skip || child.contains(skip))) continue;
        tallest = Math.max(tallest, child.getBoundingClientRect().height);
      }
      return tallest;
    };
    // 12 px of the row's own vertical padding + the 1 px hairline border.
    const height = Math.ceil(Math.min(120, Math.max(46, rowHeight(pager) + 13, rowHeight(tools, pager) + 13)));
    const fabWidth = Math.ceil(fab?.getBoundingClientRect().width || 48);
    const replyButtons = floatEl ? [...floatEl.querySelectorAll('button,a,[role="button"],[role="link"]')]
      .filter(node => /^(répondre|repondre|reply|transf[ée]rer|forward)\b/i.test(labelOf(node))) : [];
    const replyHeight = replyButtons[0]?.getBoundingClientRect().height || 36;
    const replyBottom = replyButtons.at(-1)?.getBoundingClientRect().bottom;
    const composeInset = replyBottom === undefined ? 6 : Math.max(0, floatEl.getBoundingClientRect().bottom - replyBottom);
    topZone = Math.max(TOP_ZONE, height + 8);
    setVar('--pk-focus-rail-end', `${railEnd}px`);
    setVar('--pk-focus-gb-height', `${gbHeight}px`);
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

  // ---- Undo toast clearance ----------------------------------------------

  // The reply bar, the compose FAB and Gmail's undo toasts all live at the
  // bottom edge: the toast sits inside the 64 px hover zone, so revealing the
  // bands used to paint them OVER « Annuler » (z-index 995/996 vs 990) and
  // steal its clicks. While a toast tile is painted, both bands glide above
  // the whole stack instead. Native tiles, preserved pills and the "+N" chip
  // all count; heights and slots are measured, never assumed.
  const TOAST_TILES = '.bAp .vh, .pk-toast-more';

  function syncToastLift() {
    // The bands' lane starts at their left edge (translateY only moves them
    // vertically, so left/width stay valid while they are withdrawn). Without
    // any band yet, assume they reach the viewport's middle: lift by default.
    const bands = [floatEl, document.getElementById('pk-new-message-fab')]
      .filter(Boolean).map(el => el.getBoundingClientRect().left);
    const laneLeft = bands.length ? Math.min(...bands) : window.innerWidth / 2;
    let top = Infinity;
    for (const el of document.querySelectorAll(TOAST_TILES)) {
      if (el.hasAttribute('data-pk-toast-collapsed')) continue; // folded: paint is off
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.right < laneLeft) continue; // left of the lane
      top = Math.min(top, rect.top);
    }
    // Rest position is 12 px above the viewport bottom; sit 8 px above the
    // stack's top edge instead. 0 when no tile reaches the bands' lane.
    const lift = top === Infinity ? 0 : Math.max(0, Math.ceil(window.innerHeight - top - 4));
    setVar('--pk-focus-toast-lift', lift ? `${lift}px` : '0px');
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

  // Compose, a dialog/menu/dropdown, or any text field keeps Escape — and
  // every letter key — for itself: closing the composer must never drop the
  // reader back to the list, and typing "j" in a draft must type a "j".
  function gmailHasPriority(target) {
    if (target?.closest?.(EDITABLE)) return true;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.closest?.(EDITABLE)) return true;
    return anyLayerOpen();
  }

  // Any Gmail layer up at all — in-band or not — keeps Escape and the letter
  // keys for Gmail: a menu riding the toolbar is still something Gmail must
  // close before the reader may leave.
  function anyLayerOpen() {
    return [...document.querySelectorAll(NATIVE_CLOSE)].some(visible);
  }

  // Gmail's own overlay layer is up OUTSIDE every band (attachment
  // preview/lightbox, dialog, body-level menu): the Focus bands freeze behind
  // it — suppressed and without transitions — so nothing can blink or paint
  // over the modal. A layer mounted INSIDE a band (the label menu rides the
  // toolbar row next to its anchor button) is that band's own UI, not an
  // overlay above it: freezing the host would hide Gmail's menu, drop the
  // layer signal, bring the band back, return the signal — a 50 ms
  // self-sustained flash of the whole interface (band, markers, shells and
  // the reading column bouncing). Only out-of-band layers freeze.
  function gmailLayerOpen() {
    return [...document.querySelectorAll(NATIVE_CLOSE)].some(node =>
      visible(node) && !node.closest?.(BAND_HOSTS));
  }

  // The conversation pager arrows, found in the withdrawn chrome: Focus only
  // fades them with opacity, so the controls stay measurable and clickable.
  // The marked pager wins, then the toolbar row, then the whole .aeH block.
  function pagerButton(pattern) {
    const scopes = [
      document.querySelector('[data-pk-focus-pager]'),
      document.querySelector('[data-pk-focus-tools]'),
      document.querySelector('.aeH'),
    ];
    for (const scope of scopes) {
      if (!scope) continue;
      const found = [...scope.querySelectorAll('button, [role="button"], a')].find(node =>
        !node.disabled && node.getAttribute('aria-disabled') !== 'true' && visible(node) && pattern.test(labelOf(node)));
      if (found) return found;
    }
    return null;
  }

  // Gmail controls use both Closure mouseup and delegated click handlers,
  // exactly like the Focus theme's pager activation.
  function clickControl(node) {
    for (const type of ['mousedown', 'mouseup', 'click']) {
      node.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    }
  }

  // Registered on the window in capture phase: it runs before Gmail's own
  // document-level handlers, so the reading shortcuts cannot be swallowed.
  function onKeyDown(event) {
    // Track keyboard intent here: our handled keys stop propagation, so a
    // separate document listener would miss them.
    tabIntent = event.key === 'Tab';
    if (!active || !reading) return;
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === 'Escape') {
      if (event.repeat) return;
      if (gmailHasPriority(target)) return;
      const back = backControl();
      event.preventDefault();
      event.stopPropagation();
      if (back) back.click();
      // No toolbar rendered (Gmail variant): the requested exit still works.
      else if (location.hash !== '#inbox') location.hash = '#inbox';
      return;
    }
    // J / K browse conversations from the keyboard, driving the same native
    // pager arrows the hover reveals. An unfound arrow leaves the key alone,
    // so Gmail's own shortcuts keep working untouched; the other reading
    // keys (arrows scroll, o opens, e archives) stay Gmail's altogether.
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
    if (key !== 'j' && key !== 'k') return;
    if (gmailHasPriority(target)) return;
    const arrow = pagerButton(key === 'j' ? PAGER_OLDER : PAGER_NEWER);
    if (!arrow) return;
    event.preventDefault();
    event.stopPropagation();
    clickControl(arrow);
  }

  function queueHide(zone) {
    if (held[zone]) return;
    clearTimeout(timers[zone]);
    timers[zone] = setTimeout(() => {
      timers[zone] = 0;
      if (!held[zone] && !byFocus[zone]) toggleClass(`pk-focus-${zone}`, false);
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
    tabIntent = false;
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
    if (!reading || !tabIntent) return;
    const target = event.target instanceof Element ? event.target : null;
    const zone = inTopChrome(target) ? 'top' : inBottomBar(target) ? 'bottom' : null;
    if (zone) {
      byFocus[zone] = true;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      toggleClass(`pk-focus-${zone}`, true);
    }
  }

  function onFocusOut(event) {
    if (!reading) return;
    const target = event.target instanceof Element ? event.target : null;
    // A Gmail focus change must not clear the independent pointer hold.
    if (inTopChrome(target)) { byFocus.top = false; queueHide('top'); }
    if (inBottomBar(target)) { byFocus.bottom = false; queueHide('bottom'); }
  }

  function releaseAll() {
    reading = false;
    tabIntent = false;
    for (const zone of ['top', 'bottom']) {
      held[zone] = false;
      byFocus[zone] = false;
      clearTimeout(timers[zone]);
      timers[zone] = 0;
      root.classList.remove(`pk-focus-${zone}`);
    }
    root.classList.remove('pk-focus');
    root.classList.remove('pk-focus-pager');
    root.classList.remove('pk-focus-modal');
    root.style.removeProperty('--pk-focus-rail-end');
    root.style.removeProperty('--pk-focus-gb-height');
    root.style.removeProperty('--pk-focus-pager-reserve');
    root.style.removeProperty('--pk-focus-top-height');
    root.style.removeProperty('--pk-focus-fab-width');
    root.style.removeProperty('--pk-focus-compose-height');
    root.style.removeProperty('--pk-focus-compose-inset');
    root.style.removeProperty('--pk-focus-toast-lift');
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
    if (!reading) {
      // Anchor for the next hover band: the bar's real spot while the list
      // chrome is in natural flow (never measurable once withdrawn).
      const gb = document.getElementById('gb');
      if (gb && !root.classList.contains('pk-focus')) {
        setVar('--pk-focus-gb-top', `${Math.round(gb.getBoundingClientRect().top + window.scrollY)}px`);
      }
      return;
    }
    // A Gmail overlay (attachment preview, dialog, out-of-band menu) freezes
    // every band: no paint, no transitions, nothing that could blink behind
    // the modal.
    toggleClass('pk-focus-modal', gmailLayerOpen());
    if (floatEl && !floatEl.isConnected) {
      floatEl = null;
    }
    // While the freeze is up, the band nodes are CSS-hidden: they would fail
    // every visibility scan and churn the marks/shells behind the overlay.
    // Freeze that bookkeeping too; the closing mutations re-run it.
    if (!root.classList.contains('pk-focus-modal')) {
      syncTopChrome();
      collapseChromeShells();
    }
    markFloatBars();
    syncToastLift();
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
  document.addEventListener('pointerdown', () => { tabIntent = false; }, true);
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  window.addEventListener('keydown', onKeyDown, true);
  // The toast stack and the lifted bands glide on animated bottoms: re-measure
  // once the movement lands, so the clearance follows the final slot and not a
  // mid-flight frame. The equality guards in setVar/mark stop any loop.
  document.addEventListener('transitionend', event => {
    if (!reading || !(event.target instanceof Element)) return;
    if (event.target.matches('.bAp .vh, .pk-toast-more, [data-pk-focus-floatbar], #pk-new-message-fab')) schedule();
  });

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
    const tools = document.querySelector('[data-pk-focus-tools]');
    const pager = document.querySelector('[data-pk-focus-pager]');
    const fab = document.getElementById('pk-new-message-fab');
    // Gmail settling its own toolbar after a J/K swap (counter text, button
    // states) re-arms the measurement so a transient tall frame heals.
    if (records.some(record => tools?.contains(record.target) || pager?.contains(record.target) || fab?.contains(record.target) || floatEl?.contains(record.target))) topLayoutDirty = true;
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
