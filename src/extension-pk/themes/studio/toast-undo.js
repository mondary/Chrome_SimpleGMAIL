// Studio only: when Gmail replaces an undo toast ("Annuler") before its window
// closes, keep the REAL undo row available in a second pill.
// Validated on Gmail (2026-11-02): a cloned #link_undo no longer triggers the
// native undo. The handler follows the original row as long as it stays inside
// its original .bAp alert wrapper. So the pill is a new .vh child of that same
// wrapper and receives the original row — never a clone.
(() => {
  if (window.__pkStudioToastUndo) return;
  window.__pkStudioToastUndo = true;

  const UNDO_WINDOW = 10500; // native window measured at ~11.5 s
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MAX_VISIBLE = 2; // preserved pills + live native toast
  const DEFAULT_HOLD = 8000; // pill lifetime, seconds setting lives in storage
  const MIN_HOLD = 3000;
  const MAX_HOLD = 12000;
  const UNDO_SELECTOR = '#link_undo, .bAo [role=link], .a8k, .ag';
  const CLOSE_SELECTOR = '.bBe';
  const CSS = [
    '.bAp [data-pk-toast-preserve].vh{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:var(--pk-toast-bottom,92px)!important;transform:translateX(-50%)!important;z-index:991!important}',
    '.bAp [data-pk-toast-preserve].vh .pk-pill-timer{position:absolute!important;top:50%!important;transform:translateY(-50%) rotate(-90deg)!important;transform-origin:center!important;pointer-events:none!important;overflow:visible!important}',
    '.bAp [data-pk-toast-preserve].vh .pk-pill-timer circle{fill:none!important;stroke:#ffd35c!important;stroke-width:2!important;stroke-linecap:round!important}',
    '.bAp .vh .pk-pill-timer{position:absolute!important;top:50%!important;transform:translateY(-50%) rotate(-90deg)!important;transform-origin:center!important;pointer-events:none!important;overflow:visible!important}',
    '.bAp .vh .pk-pill-timer circle{fill:none!important;stroke:#ffd35c!important;stroke-width:2!important;stroke-linecap:round!important}',
    '@media (prefers-reduced-motion: reduce){.bAp [data-pk-toast-preserve].vh{transition:none}}',
  ].join('\n');

  let active = false;
  let scheduled = false;
  let styleEl = null;
  let holdMs = DEFAULT_HOLD;
  let current = null; // { wrapper, vh, row, link, message, bornAt, consumed, ring }
  const preserved = new Set(); // entries with a pill currently shown

  function visible(node) {
    return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function messageOf(vh) {
    return ((vh.querySelector('.bAq')?.innerText || vh.innerText || '').replace(/\s+/g, ' ')).trim();
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

  function dismiss(pill) {
    if (!pill?.isConnected || pill.dataset.leaving) return;
    pill.dataset.leaving = '1';
    pill.style.opacity = '0';
    pill.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(() => pill.remove(), 260);
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
      const easing = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'steps(12, end)' : 'linear';
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
    preserved.add(entry);
  }

  function layoutPills(nativeVisible) {
    const pills = [...preserved].map(entry => entry.pill).filter(pill => pill?.isConnected && !pill.dataset.leaving);
    pills.forEach((pill, index) => {
      const offset = (nativeVisible ? 1 : 0) + index;
      const bottom = `${24 + offset * 68}px`;
      if (pill.style.getPropertyValue('--pk-toast-bottom') !== bottom) pill.style.setProperty('--pk-toast-bottom', bottom);
    });
    // One live native toast already occupies a slot: keep at most two tiles.
    const room = Math.max(MAX_VISIBLE - (nativeVisible ? 1 : 0), 1);
    for (let index = 0; index < pills.length - room; index += 1) {
      const entry = [...preserved].find(candidate => candidate.pill === pills[index]);
      if (entry) retire(entry);
    }
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      for (const entry of [...preserved]) retire(entry);
      current?.ring?.remove();
      current = null;
      styleEl?.remove();
      styleEl = null;
      return;
    }
    const now = Date.now();
    // Native Gmail toasts only. Preserved pills carry the same .vh class and
    // must not be mistaken for a new native action.
    const liveToasts = [...document.querySelectorAll('.bAp .vh')]
      .filter(vh => !vh.hasAttribute('data-pk-toast-preserve') && !vh.closest('[data-pk-toast-preserve]'))
      .filter(visible);

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
    layoutPills(liveToasts.length > 0);
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
