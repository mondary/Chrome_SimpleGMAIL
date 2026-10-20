// Studio only: when Gmail replaces an undo toast ("Annuler") before its window
// closes, keep a working mirror pill so the action can still be undone.
// Mechanism (validated on real Gmail): the undo handler is delegated above the
// toast node, so a clone of the whole alert wrapper — kept in the page DOM with
// its .bAp ancestry — still triggers the native undo when clicked.
(() => {
  if (window.__pkStudioToastUndo) return;
  window.__pkStudioToastUndo = true;

  const UNDO_WINDOW = 10500; // native window measured at ~11.5 s
  const MAX_PILLS = 3;
  const UNDO_SELECTOR = '#link_undo, .bAo [role=link], .a8k, .ag';
  const CSS = [
    '#pk-toast-stack{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;z-index:992;pointer-events:none}',
    '#pk-toast-stack > *{pointer-events:auto;position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;margin:0!important;width:max-content;max-width:calc(100vw - 32px)}',
    '#pk-toast-stack .vh{display:flex!important;align-items:center!important;position:static!important;left:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:max-content!important;max-width:calc(100vw - 32px)!important;padding:10px 52px 10px 20px!important;background:#09090b!important;color:#fff!important;border:0!important;border-radius:9999px!important;box-shadow:0 12px 32px rgba(9,9,11,.28)!important;font:13px/1.4 Arial,sans-serif!important;transition:opacity .25s ease,transform .25s ease}',
    '#pk-toast-stack .vh .aT{display:flex!important;align-items:center!important}',
    '#pk-toast-stack .vh .bAq{display:flex!important;align-items:center!important;margin:0 12px 0 0!important;color:#fff!important}',
    '#pk-toast-stack .vh .bAo{display:flex!important;align-items:center!important;margin:0!important}',
    '#pk-toast-stack .vh #link_undo,#pk-toast-stack .vh .a8k,#pk-toast-stack .vh .ag,#pk-toast-stack .vh .bAo [role=link]{color:#ffd35c!important;font-weight:600!important;cursor:pointer}',
    '#pk-toast-stack .vh .bBe{position:absolute!important;top:50%!important;right:16px!important;transform:translateY(-50%)!important;margin:0!important;padding:0!important}',
    '@media (prefers-reduced-motion: reduce){#pk-toast-stack .vh{transition:none}}',
  ].join('\n');

  let active = false;
  let scheduled = false;
  let stack = null;
  let styleEl = null;
  let current = null; // { vh, message, bornAt, consumed, pill }

  function visible(node) {
    return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  }

  function messageOf(vh) {
    return ((vh.querySelector('.bAq')?.innerText || vh.innerText || '').replace(/\s+/g, ' ')).trim();
  }

  function undoLink(vh) {
    return vh.querySelector(UNDO_SELECTOR);
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

  function retire(pill) {
    pill.style.opacity = '0';
    pill.style.transform = 'translateY(6px)';
    setTimeout(() => pill.remove(), 260);
  }

  function scheduleRetire(entry) {
    const remaining = UNDO_WINDOW - (Date.now() - entry.bornAt);
    setTimeout(() => { if (entry.pill.isConnected) retire(entry.pill); }, Math.max(remaining, 0) + 300);
  }

  function showPill(entry) {
    ensureStack();
    const pill = entry.pill;
    pill.style.opacity = '0';
    stack.append(pill);
    requestAnimationFrame(() => { pill.style.opacity = '1'; });
    pill.addEventListener('click', (e) => {
      if (e.target?.closest?.(UNDO_SELECTOR)) setTimeout(() => retire(pill), 200);
    }, { once: false });
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
      current = { vh: withUndo, message: messageOf(withUndo), bornAt: now, consumed: false, pill };
    }

    if (stack) {
      const pills = [...stack.children];
      while (pills.length > MAX_PILLS) pills.shift().remove();
      const nativeVisible = liveToasts.some((vh) => !stack.contains(vh));
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

  chrome.storage.local.get(['theme', 'enabled'], (state) => {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-toast-undo'] !== false;
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled)) return;
    chrome.storage.local.get(['theme', 'enabled'], (state) => {
      active = state.theme === 'theme-pk' && state.enabled?.['js-studio-toast-undo'] !== false;
      schedule();
    });
  });
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'],
  });
  window.addEventListener('hashchange', schedule);
  schedule();
})();
