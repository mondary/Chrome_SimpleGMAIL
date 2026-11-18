// Studio only: when Gmail replaces an undo toast ("Annuler") before its window
// closes, keep the REAL undo row available in a second pill.
// Validated on Gmail (2026-11-02): a cloned #link_undo no longer triggers the
// native undo. The handler follows the original row as long as it stays inside
// its original .bAp alert wrapper. So the pill is a new .vh child of that same
// wrapper and receives the original row — never a clone.
//
// Stack v4 (2026-11-18): one bubble by default. Every tile — native toasts
// AND preserved pills — shares one chronology and one measured layout: the
// newest sits at the edge (24 px) and, as soon as a second tile exists, the
// older ones fold behind a "+N" chip stacked above it. Folding keeps the node
// in the DOM (a real undo row keeps its native window), the chip unfolds the
// pile on demand and re-folds it after 4 s. Gmail's own inline `bottom`
// offsets are overridden, so two live alerts can never collapse onto the
// same pixel.
(() => {
  if (window.__pkStudioToastUndo) return;
  window.__pkStudioToastUndo = true;

  const UNDO_WINDOW = 10500; // native window measured at ~11.5 s
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEFAULT_HOLD = 8000; // pill lifetime, seconds setting lives in storage
  const MIN_HOLD = 3000;
  const MAX_HOLD = 12000;
  const UNDO_SELECTOR = '#link_undo, .bAo [role=link], .a8k, .ag';
  const CLOSE_SELECTOR = '.bBe';
  const STACK_BASE = 24; // bottom edge of the newest tile, px
  const STACK_GAP = 10;  // even gap between tiles, px
  const EXPAND_HOLD = 4000; // auto re-fold of the "+N" chip, ms
  const CSS = [
    // Measured slots: the manager assigns each tile its real bottom. The
    // attribute keeps specificity above the css-toast-center tweak.
    '.bAp .vh[data-pk-toast-preserve],.bAp .vh[data-pk-toast-slot]{bottom:var(--pk-toast-bottom,24px)!important}',
    // Reflow is animated only between two placed frames, never on arrival.
    '.bAp .vh[data-pk-toast-preserve],.bAp .vh[data-pk-toast-slot]{transition:bottom .18s cubic-bezier(.2,.7,.3,1),opacity .18s ease}',
    // Folded tiles keep their layout box: only paint and pointer are turned
    // off, so the stack can still measure them and tell "folded by us" from
    // "removed by Gmail" (a display:none node loses its rects).
    '.bAp .vh[data-pk-toast-collapsed]{visibility:hidden!important;pointer-events:none!important}',
    '.bAp [data-pk-toast-preserve].vh .pk-pill-timer{position:absolute!important;top:50%!important;transform:translateY(-50%) rotate(-90deg)!important;transform-origin:center!important;pointer-events:none!important;overflow:visible!important}',
    '.bAp [data-pk-toast-preserve].vh .pk-pill-timer circle{fill:none!important;stroke:#ffd35c!important;stroke-width:2!important;stroke-linecap:round!important}',
    '.bAp .vh .pk-pill-timer{position:absolute!important;top:50%!important;transform:translateY(-50%) rotate(-90deg)!important;transform-origin:center!important;pointer-events:none!important;overflow:visible!important}',
    '.bAp .vh .pk-pill-timer circle{fill:none!important;stroke:#ffd35c!important;stroke-width:2!important;stroke-linecap:round!important}',
    // "+N" chip: same language as the pills — one line, dark, hairline ring.
    '.pk-toast-more{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;bottom:var(--pk-toast-bottom,24px)!important;display:flex!important;align-items:center!important;height:26px!important;padding:0 13px!important;background:#09090b!important;color:rgba(255,255,255,.85)!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:9999px!important;box-shadow:0 8px 24px rgba(9,9,11,.22)!important;font:600 12px/1 Roboto,Arial,sans-serif!important;letter-spacing:.03em!important;cursor:pointer!important;z-index:991!important;transition:bottom .18s cubic-bezier(.2,.7,.3,1)!important;-webkit-user-select:none!important;user-select:none!important}',
    '.pk-toast-more:hover{color:#ffffff!important}',
    '.pk-toast-more:focus-visible{outline:2px solid #ffd35c!important;outline-offset:2px!important}',
    '@media (prefers-reduced-motion: reduce){.bAp .vh[data-pk-toast-preserve],.bAp .vh[data-pk-toast-slot],.pk-toast-more{transition:none!important}}',
  ].join('\n');

  let active = false;
  let scheduled = false;
  let styleEl = null;
  let holdMs = DEFAULT_HOLD;
  let current = null; // { wrapper, vh, row, link, message, bornAt, consumed, ring }
  const preserved = new Set(); // entries with a pill currently shown (insertion = oldest first)
  const nativeOrder = new Map(); // live native .vh -> arrival counter
  let arrival = 0;
  let moreEl = null; // the "+N" chip
  let expandedUntil = 0; // unfold deadline; 0 = folded
  let collapseTimer = 0;

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function visible(node) {
    // Folded by the stack: still alive, still measurable — only its paint is
    // off. Gmail removing or hiding it (rects gone) still reads as "gone".
    if (node.hasAttribute('data-pk-toast-collapsed')) {
      return node.isConnected && node.getClientRects().length > 0;
    }
    return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function messageOf(vh) {
    // textContent, not innerText: a folded tile is visibility:hidden and
    // innerText would read as empty, which would fake a message change.
    return ((vh.querySelector('.bAq')?.textContent || vh.textContent || '').replace(/\s+/g, ' ')).trim();
  }

  function undoLink(vh) {
    return vh.querySelector(UNDO_SELECTOR);
  }

  function holdFrom(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_HOLD;
    return Math.min(Math.max(Math.round(value * 1000), MIN_HOLD), MAX_HOLD);
  }

  function lifetime() {
    // Gmail itself closes the undo command at ~10.5 s: keeping the pill longer
    // would show a button that can no longer cancel anything.
    return Math.min(holdMs, UNDO_WINDOW);
  }

  function ensureStyle() {
    if (styleEl?.isConnected) return;
    styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.append(styleEl);
  }

  function enterAnimation(el) {
    if (reducedMotion() || typeof el.animate !== 'function') return;
    // composite:"add" stacks on the !important translateX(-50%): no fight.
    el.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, composite: 'add', easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
  }

  function dismiss(pill) {
    if (!pill?.isConnected || pill.dataset.leaving) return;
    pill.dataset.leaving = '1';
    const animated = !reducedMotion() && typeof pill.animate === 'function'
      && !pill.hasAttribute('data-pk-toast-collapsed');
    if (!animated) {
      pill.remove();
      return;
    }
    const fade = pill.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }],
      { duration: 200, composite: 'add', easing: 'ease-out', fill: 'forwards' },
    );
    fade.onfinish = () => pill.remove();
    setTimeout(() => pill.remove(), 600); // hidden tab: onfinish can stall
  }

  function retire(entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = 0;
    }
    dismiss(entry.pill);
    preserved.delete(entry);
  }

  function scheduleRetire(entry) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => retire(entry), lifetime());
  }

  function attachCountdown(host, closeHost, duration) {
    const close = closeHost.querySelector(CLOSE_SELECTOR);
    const frame = host.getBoundingClientRect();
    if (!frame.width) return null;
    const box = close?.getBoundingClientRect();
    const size = Math.round((box?.width ? Math.max(box.width, box.height) : 22) + 8);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'pk-pill-timer');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
    svg.style.right = `${box?.width ? Math.round(frame.right - (box.left + box.width / 2) - size / 2) : 12}px`;
    const radius = size / 2 - 1;
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', radius);
    svg.append(circle);
    host.append(svg);
    const length = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${length}`;
    // Full ring on the first frame, then the arc empties: the countdown is
    // readable from the very beginning of the pill's life.
    circle.style.strokeDashoffset = '0';
    if (typeof circle.animate === 'function') {
      // Reduced motion: stepped countdown instead of a continuous sweep.
      const easing = reducedMotion() ? 'steps(12, end)' : 'linear';
      circle.animate(
        [{ strokeDashoffset: 0 }, { strokeDashoffset: length }],
        { duration, easing, fill: 'forwards' },
      );
    }
    return svg;
  }

  function showPill(entry) {
    if (!entry.wrapper?.isConnected || !entry.row || !entry.link) return;
    ensureStyle();
    const pill = document.createElement('div');
    pill.className = 'vh';
    pill.setAttribute('data-pk-toast-preserve', '');
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    // The original row is moved, never cloned: its delegated Gmail handler
    // only works for the real nodes inside the original .bAp wrapper.
    pill.append(entry.row);
    const close = document.createElement('div');
    close.className = 'bBe';
    close.setAttribute('role', 'button');
    close.setAttribute('tabindex', '0');
    close.setAttribute('aria-label', 'Fermer');
    close.append(Object.assign(document.createElement('div'), { className: 'bBf' }));
    pill.append(close);
    entry.pill = pill;
    entry.wrapper.append(pill);
    attachCountdown(pill, pill, lifetime());
    enterAnimation(pill);
    pill.addEventListener('click', (event) => {
      if (event.target?.closest?.(UNDO_SELECTOR)) {
        entry.consumed = true;
        setTimeout(() => retire(entry), 200);
        return; // Let Gmail's own delegated undo handler run.
      }
      if (event.target?.closest?.(CLOSE_SELECTOR)) {
        event.preventDefault();
        event.stopPropagation();
        retire(entry);
      }
    });
    pill.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!event.target?.closest?.(CLOSE_SELECTOR)) return;
      event.preventDefault();
      event.stopPropagation();
      retire(entry);
    });
    scheduleRetire(entry);
    entry.seq = ++arrival; // one chronology shared with native toasts
    preserved.add(entry);
  }

  // ---- The "+N" chip ----------------------------------------------------

  function ensureMore() {
    if (moreEl?.isConnected) return moreEl;
    ensureStyle(); // native-only piles still need the chip's own CSS
    moreEl = document.createElement('button');
    moreEl.type = 'button';
    moreEl.className = 'pk-toast-more';
    moreEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() < expandedUntil) {
        expandedUntil = 0;
        clearTimeout(collapseTimer);
      } else {
        expandedUntil = Date.now() + EXPAND_HOLD;
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
          expandedUntil = 0;
          collapseTimer = 0;
          schedule();
        }, EXPAND_HOLD + 30);
      }
      schedule();
    });
    document.body.append(moreEl);
    enterAnimation(moreEl);
    return moreEl;
  }

  function updateMore(hiddenCount, expanded) {
    if (!moreEl) return;
    moreEl.textContent = expanded ? '−' : `+${hiddenCount}`;
    const noun = hiddenCount > 1 ? 's' : '';
    moreEl.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    moreEl.setAttribute('aria-label', expanded
      ? 'Réduire les notifications'
      : `Afficher ${hiddenCount} notification${noun} masquée${noun}`);
  }

  function removeMore() {
    clearTimeout(collapseTimer);
    collapseTimer = 0;
    expandedUntil = 0;
    const chip = moreEl;
    moreEl = null;
    if (!chip?.isConnected) return;
    if (reducedMotion() || typeof chip.animate !== 'function') {
      chip.remove();
      return;
    }
    const fade = chip.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(6px)' }],
      { duration: 160, composite: 'add', easing: 'ease-out', fill: 'forwards' },
    );
    fade.onfinish = () => chip.remove();
    setTimeout(() => chip.remove(), 400);
  }

  // ---- Measured stack ---------------------------------------------------

  function place(el, bottom) {
    const value = `${Math.round(bottom)}px`;
    if (el.style.getPropertyValue('--pk-toast-bottom') !== value) {
      el.style.setProperty('--pk-toast-bottom', value);
    }
  }

  function layoutStack(natives) {
    // Chronology: a tile seen for the first time takes the edge slot, older
    // ones glide up. Reused wrappers keep their arrival order.
    for (const vh of natives) {
      if (!nativeOrder.has(vh)) nativeOrder.set(vh, ++arrival);
    }
    for (const [vh] of nativeOrder) {
      if (!vh.isConnected) nativeOrder.delete(vh);
    }
    const orderedNatives = [...nativeOrder.keys()]
      .filter((vh) => natives.includes(vh))
      .sort((a, b) => nativeOrder.get(a) - nativeOrder.get(b)); // oldest → newest

    const pillEntries = [...preserved]
      .filter((entry) => entry.pill?.isConnected && !entry.pill.dataset.leaving); // oldest → newest

    // One chronology for both kinds: the pile reads as a single stack, so a
    // native arrives above a pill (and the reverse) exactly as it happened.
    const tiles = [
      ...orderedNatives.map((vh) => ({ el: vh, seq: nativeOrder.get(vh) || 0 })),
      ...pillEntries.map((entry) => ({ el: entry.pill, seq: entry.seq || 0 })),
    ].sort((a, b) => a.seq - b.seq);

    // One bubble by default: the newest tile. The rest fold behind the chip —
    // the DOM stays alive, so native rows and undo windows keep running.
    const expanded = Date.now() < expandedUntil || tiles.length <= 1;
    const visibleCount = expanded ? tiles.length : Math.min(1, tiles.length);
    const shown = tiles.slice(tiles.length - visibleCount);
    tiles.forEach((tile, index) => {
      const folded = index < tiles.length - visibleCount;
      if (folded) tile.el.setAttribute('data-pk-toast-collapsed', '');
      else tile.el.removeAttribute('data-pk-toast-collapsed');
    });
    const hiddenCount = tiles.length - shown.length;

    let bottom = STACK_BASE;
    // Bottom-up: newest tile at the edge, then older ones, then the chip on
    // top. Heights are measured, never assumed.
    for (const tile of [...shown].reverse()) {
      if (!tile.el.hasAttribute('data-pk-toast-preserve')) {
        tile.el.setAttribute('data-pk-toast-slot', '');
      }
      place(tile.el, bottom);
      bottom += tile.el.offsetHeight + STACK_GAP;
    }
    // The chip stays as long as a fold exists: "+N" when folded, "−" on top
    // of the unfolded stack. Its slot is re-measured in the same pass, so it
    // never lingers where an unfolded tile now sits.
    if (tiles.length > 1) {
      const chip = ensureMore();
      updateMore(hiddenCount, expanded);
      place(chip, bottom);
    } else if (moreEl) {
      removeMore();
    }
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      for (const entry of [...preserved]) retire(entry);
      current?.ring?.remove();
      current = null;
      removeMore();
      document.querySelectorAll('.bAp .vh[data-pk-toast-slot]').forEach((vh) => {
        vh.removeAttribute('data-pk-toast-slot');
        vh.style.removeProperty('--pk-toast-bottom');
      });
      // A folded native must come back if the tweak is switched off mid-life.
      document.querySelectorAll('.bAp .vh[data-pk-toast-collapsed]').forEach((vh) => {
        if (!vh.hasAttribute('data-pk-toast-preserve')) vh.removeAttribute('data-pk-toast-collapsed');
      });
      nativeOrder.clear();
      styleEl?.remove();
      styleEl = null;
      return;
    }
    const now = Date.now();
    // Native Gmail toasts only. Preserved pills carry the same .vh class and
    // must not be mistaken for a new native action. A shell whose real row was
    // moved into a pill has no message left: it is not a tile of its own.
    const liveToasts = [...document.querySelectorAll('.bAp .vh')]
      .filter(vh => !vh.hasAttribute('data-pk-toast-preserve') && !vh.closest('[data-pk-toast-preserve]'))
      .filter(visible)
      .filter(vh => (vh.querySelector('.bAq')?.textContent || '').trim());

    if (current) {
      const gone = !current.vh.isConnected || !visible(current.vh);
      const changed = current.vh.isConnected && visible(current.vh) && messageOf(current.vh) !== current.message;
      // Two actions can share one message ("Brouillon supprimé."). The row
      // or its real undo link being removed is the steal signal in that case.
      const rowGone = current.vh.isConnected && (!current.vh.contains(current.row) || !current.vh.contains(current.link));
      if (gone || changed || rowGone) {
        const stolen = !current.consumed && now - current.bornAt < UNDO_WINDOW;
        if (stolen) showPill(current);
        current.ring?.remove();
        current = null;
      }
    }

    const withUndo = liveToasts.find(vh => undoLink(vh));
    if (withUndo && !current) {
      const link = undoLink(withUndo);
      const wrapper = withUndo.closest('.bAp');
      const row = link?.closest('.aT');
      if (wrapper && row) {
        const ring = attachCountdown(withUndo, withUndo, UNDO_WINDOW);
        current = { wrapper, vh: withUndo, row, link, message: messageOf(withUndo), bornAt: now, consumed: false, pill: null, timer: 0, ring };
      }
    }

    if (current && !current.ring) current.ring = attachCountdown(current.vh, current.vh, UNDO_WINDOW);
    layoutStack(liveToasts);
  }

  // A trusted click on the live native "Annuler" consumes the undo: the next
  // message change is the result toast, not a stolen undo.
  document.addEventListener('click', (event) => {
    if (!current || current.consumed) return;
    const link = event.target?.closest?.(UNDO_SELECTOR);
    if (link && current.vh.contains(link)) current.consumed = true;
  }, true);

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  function applyState(state) {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-toast-undo'] !== false;
    holdMs = holdFrom(state.toastSeconds);
    schedule();
  }

  chrome.storage.local.get(['theme', 'enabled', 'toastSeconds'], applyState);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled && !changes.toastSeconds)) return;
    chrome.storage.local.get(['theme', 'enabled', 'toastSeconds'], applyState);
  });
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden', 'hidden'],
  });
  window.addEventListener('hashchange', schedule);
  schedule();
})();
