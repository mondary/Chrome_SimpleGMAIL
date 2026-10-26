// Studio only: when Gmail replaces an undo toast ("Annuler") before its window
// closes, keep a working mirror pill so the action can still be undone.
// Mechanism (validated on real Gmail): the undo handler is delegated above the
// toast node, so a clone of the whole alert wrapper — kept in the page DOM with
// its .bAp ancestry — still triggers the native undo when clicked. The close
// button has no delegated handler, so the pill wires its own.
(() => {
  if (window.__pkStudioToastUndo) return;
  window.__pkStudioToastUndo = true;

  const UNDO_WINDOW = 10500; // native window measured at ~11.5 s
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MAX_VISIBLE = 2; // pills + live native toast, never more
  const DEFAULT_HOLD = 8000; // pill lifetime, seconds setting lives in storage
  const MIN_HOLD = 3000;
  const MAX_HOLD = 12000;
  const UNDO_SELECTOR = '#link_undo, .bAo [role=link], .a8k, .ag';
  const CLOSE_SELECTOR = '.bBe';
  const CSS = [
    '#pk-toast-stack{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;z-index:992;pointer-events:none}',
    '#pk-toast-stack > *{pointer-events:auto;position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;margin:0!important;width:max-content;max-width:calc(100vw - 32px)}',
    '#pk-toast-stack .vh{display:flex!important;align-items:center!important;position:static!important;left:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:max-content!important;max-width:calc(100vw - 32px)!important;padding:10px 52px 10px 20px!important;background:#09090b!important;color:#fff!important;border:0!important;border-radius:9999px!important;box-shadow:0 12px 32px rgba(9,9,11,.28)!important;font:13px/1.4 Arial,sans-serif!important;transition:opacity .25s ease,transform .25s ease}',
    '#pk-toast-stack .vh .aT{display:flex!important;align-items:center!important}',
    '#pk-toast-stack .vh .bAq{display:flex!important;align-items:center!important;margin:0 12px 0 0!important;color:#fff!important}',
    '#pk-toast-stack .vh .bAo{display:flex!important;align-items:center!important;margin:0!important}',
    '#pk-toast-stack .vh #link_undo,#pk-toast-stack .vh .a8k,#pk-toast-stack .vh .ag,#pk-toast-stack .vh .bAo [role=link]{color:#ffd35c!important;font-weight:600!important;cursor:pointer}',
    '#pk-toast-stack .vh .bBe{position:absolute!important;top:50%!important;right:16px!important;transform:translateY(-50%)!important;margin:0!important;padding:0!important;cursor:pointer}',
    '#pk-toast-stack .pk-pill-timer,.bAp .vh .pk-pill-timer{position:absolute!important;top:50%!important;transform:translateY(-50%) rotate(-90deg)!important;transform-origin:center!important;pointer-events:none!important;overflow:visible!important}',
    '#pk-toast-stack .pk-pill-timer circle,.bAp .vh .pk-pill-timer circle{fill:none!important;stroke:#ffd35c!important;stroke-width:2!important;stroke-linecap:round!important}',
    '@media (prefers-reduced-motion: reduce){#pk-toast-stack .vh{transition:none}}',
  ].join('\n');

  let active = false;
  let scheduled = false;
  let stack = null;
  let styleEl = null;
  let holdMs = DEFAULT_HOLD;
  let current = null; // { vh, message, bornAt, consumed, pill, timer }

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

  function ensureStack() {
    if (stack?.isConnected) return stack;
    if (!styleEl?.isConnected) {
      styleEl = document.createElement('style');
      styleEl.textContent = CSS;
      document.head.append(styleEl);
    }
    stack = document.createElement('div');
    stack.id = 'pk-toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.append(stack);
    return stack;
  }

  // Fade a pill out, then drop it. Safe to call twice (timer + close + trim).
  function dismiss(pill) {
    if (!pill?.isConnected || pill.dataset.leaving) return;
    pill.dataset.leaving = '1';
    pill.style.opacity = '0';
    pill.style.transform = 'translateY(6px)';
    setTimeout(() => pill.remove(), 260);
  }

  function retire(entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = 0;
    }
    dismiss(entry.pill);
  }

  function scheduleRetire(entry) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => retire(entry), holdMs);
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
    ensureStack();
    const pill = entry.pill;
    pill.style.opacity = '0';
    stack.append(pill);
    attachCountdown(pill, pill, holdMs);
    requestAnimationFrame(() => { pill.style.opacity = '1'; });
    pill.addEventListener('click', (e) => {
      if (e.target?.closest?.(UNDO_SELECTOR)) {
        // The clone fires Gmail's delegated undo; the toast that follows is a
        // result, not a stolen action — do not mirror it.
        if (current) current.consumed = true;
        setTimeout(() => retire(entry), 200);
        return;
      }
      // The clone carries no listener of its own: the native close handler is
      // bound to the original node, so wire the mirrored cross here.
      if (e.target?.closest?.(CLOSE_SELECTOR)) {
        e.preventDefault();
        e.stopPropagation();
        retire(entry);
      }
    });
    scheduleRetire(entry);
  }

  function refresh() {
    scheduled = false;
    if (!active) {
      stack?.remove();
      stack = null;
      current = null;
      return;
    }
    const now = Date.now();
    // Native toasts only — our own mirror pills carry the same .bAp/.vh classes.
    const liveToasts = [...document.querySelectorAll('.bAp .vh')]
      .filter((vh) => !vh.closest('#pk-toast-stack') && !vh.closest('[data-pk-toast-mirror]'))
      .filter(visible);

    if (current) {
      const gone = !current.vh.isConnected || !visible(current.vh);
      const changed = current.vh.isConnected && visible(current.vh) && messageOf(current.vh) !== current.message;
      if (gone || changed) {
        const stolen = !current.consumed && now - current.bornAt < UNDO_WINDOW;
        if (stolen) showPill(current);
        else current.pill.remove();
        current.ring?.remove();
        current = null;
      }
    }

    const withUndo = liveToasts.find((vh) => undoLink(vh));
    if (withUndo && !current) {
      const wrapper = withUndo.closest('[role=alert]') || withUndo.parentElement;
      const pill = wrapper.cloneNode(true);
      pill.setAttribute('data-pk-toast-mirror', '');
      // Stay detached until a steal actually happens: a hidden alert clone in
      // the DOM makes Gmail skip subsequent toasts (dedupe on live alerts).
      const ring = attachCountdown(withUndo, withUndo, UNDO_WINDOW);
      current = { vh: withUndo, message: messageOf(withUndo), bornAt: now, consumed: false, pill, timer: 0, ring };
    }

    if (current && !current.ring) current.ring = attachCountdown(current.vh, current.vh, UNDO_WINDOW);
    if (stack) {
      // A pill cloned before its close button existed gets its ring here.
      for (const pill of stack.children) {
        if (!pill.querySelector('.pk-pill-timer')) attachCountdown(pill, pill, holdMs);
      }
      // One live native toast already occupies a slot: keep the stack ≤ 2 tiles.
      const nativeVisible = liveToasts.length > 0;
      const room = Math.max(MAX_VISIBLE - (nativeVisible ? 1 : 0), 1);
      const pills = [...stack.children].filter((pill) => !pill.dataset.leaving);
      for (let i = 0; i < pills.length - room; i += 1) dismiss(pills[i]);
      stack.style.bottom = nativeVisible ? '92px' : '24px';
    }
  }

  // A trusted click on the live native "Annuler" consumes the undo: the next
  // message change is the result toast, not a stolen undo.
  document.addEventListener('click', (e) => {
    if (!current || current.consumed) return;
    const link = e.target?.closest?.(UNDO_SELECTOR);
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
