// MAIN world, document_start. Reuse Gmail's current session for READ-ONLY
// inbox/unread searches. Never expose request headers, message data or tokens.
// /i/bv and [11] = [2, exactTotal] were checked against Gmail on 2026-10-30.
// This is an internal protocol: if it changes, report unknown, never "0".
(() => {
  if (window.__pkStudioUnreadCounts || window.top !== window) return;
  window.__pkStudioUnreadCounts = true;
  const ids = new Set(['primary', 'promotions', 'social', 'updates', 'forums', 'purchases', 'newsletter']);
  const account = location.pathname.match(/\/mail\/u\/(\d+)\//)?.[1];
  if (!account || location.hostname !== 'mail.google.com') return;
  const headersAllowed = new Set(['content-type', 'x-framework-xsrf-token', 'x-gmail-btai', 'x-gmail-storage-request', 'x-google-btd']);
  const pending = new WeakMap();
  const exactPages = new Map();
  const nativeFetch = window.fetch.bind(window);
  let session = null, wanted = [], timer = 0, running = false, lastRun = 0, revision = 0, dirty = false;
  let bootstrapTimer = 0, bootstrapAttempts = 0, bootstrapClicks = 0;
  const emit = counts => document.dispatchEvent(new CustomEvent('pk-studio-unread-result', {
    detail: JSON.stringify({ account, counts, at: Date.now() }),
  }));

  function schedule(delay = 0) {
    if (!wanted.length || document.visibilityState === 'hidden') return;
    if (!session) { bootstrap(); return; }
    if (running) { dirty = true; return; }
    if (timer) return;
    timer = setTimeout(refresh, Math.max(delay, 10000 - (Date.now() - lastRun)));
  }
  // Gmail can serve the initial inbox entirely from cache, without an XHR.
  // Refresh the visible mail LIST once to initialise its own session transport;
  // never navigate, open a message, clear a selection or change mail state.
  function bootstrap() {
    if (session || bootstrapTimer || bootstrapAttempts >= 20 || bootstrapClicks >= 2) return;
    bootstrapTimer = setTimeout(() => {
      bootstrapTimer = 0;
      if (session || !wanted.length || document.visibilityState === 'hidden') return;
      bootstrapAttempts++;
      const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
      const reading = [...document.querySelectorAll('.bkK .hP')].some(visible);
      const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"], [role="textbox"]');
      const button = !reading && !editing && [...document.querySelectorAll('.G-atb [role="button"]')].find(node => visible(node)
        && /^(Actualiser|Refresh)$/i.test(node.getAttribute('aria-label') || node.getAttribute('data-tooltip') || ''));
      if (button) {
        bootstrapClicks++;
        for (const type of ['mousedown', 'mouseup', 'click']) button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, view: window }));
      }
      if (!session) bootstrap();
    }, bootstrapClicks ? 5000 : 1000);
  }
  function captureSession(target, headers) {
    if (target.origin !== location.origin || !target.pathname.startsWith(`/sync/u/${account}/i/`)) return false;
    const kept = {};
    for (const [name, value] of new Headers(headers)) if (headersAllowed.has(name.toLowerCase())) kept[name] = value;
    if (!Object.keys(kept).some(name => name.toLowerCase() === 'x-framework-xsrf-token')) return false;
    const url = new URL(target);
    url.pathname = `/sync/u/${account}/i/bv`;
    url.search = '';
    url.searchParams.set('hl', document.documentElement.lang || 'en');
    url.searchParams.set('c', '20');
    url.searchParams.set('rt', 'r');
    url.searchParams.set('pt', 'ji');
    session = { url: url.href, headers: kept };
    if (!lastRun) schedule(500);
    return true;
  }
  const invalidate = () => { dirty = true; schedule(1200); };
  async function exactCount(current, id, generation) {
    const query = `in:inbox category:${id} is:unread`;
    let page = exactPages.get(id) || 0;
    // On a large result Gmail initially reports [1, estimate]. Native page
    // numbers use request[0][9]. A page beyond the end reports [2, exactTotal].
    // Exponential probing avoids downloading every unread conversation.
    for (let attempt = 0; attempt < 9 && page <= 16384; attempt++) {
      if (generation !== revision) return null;
      const response = await nativeFetch(current.url, {
        method: 'POST', credentials: 'same-origin', headers: current.headers,
        body: JSON.stringify([[79, 100, null, query, null, null, 1, 2000, null, page]]), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Gmail search unavailable');
      const data = await response.json();
      const metadata = data?.[11], count = metadata?.[1];
      if (Array.isArray(metadata) && metadata[0] === 2 && Number.isSafeInteger(count) && count >= 0) {
        exactPages.set(id, page);
        return count;
      }
      if (!Array.isArray(metadata) || metadata[0] !== 1) return null;
      page = page ? page * 4 : 1;
    }
    return null;
  }
  async function refresh() {
    timer = 0;
    if (running || !wanted.length || !session || document.visibilityState === 'hidden') return;
    running = true;
    dirty = false;
    lastRun = Date.now();
    const generation = revision, current = session;
    try {
      for (const id of wanted) {
        if (generation !== revision) break;
        let count = null;
        try {
          count = await exactCount(current, id, generation);
        } catch {}
        // Publish immediately: a slower Forums query must not hold Primary or
        // Social pending. Routine Gmail syncs must not cancel the entire batch.
        if (generation === revision) emit({ [id]: count });
      }
    } finally {
      running = false;
      if (dirty || generation !== revision) schedule();
    }
  }

  const open = XMLHttpRequest.prototype.open;
  const setHeader = XMLHttpRequest.prototype.setRequestHeader;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    pending.delete(this);
    try {
      const target = new URL(url, location.href);
      if (target.origin === location.origin && target.pathname.startsWith(`/sync/u/${account}/i/`)) {
        pending.set(this, { url: target, headers: {} });
      }
    } catch {}
    return open.call(this, method, url, ...args);
  };
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    const request = pending.get(this);
    if (request && headersAllowed.has(name.toLowerCase())) request.headers[name] = value;
    return setHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    const request = pending.get(this);
    if (request && captureSession(request.url, request.headers)) {
      if (request.url.pathname.endsWith('/i/s')) {
        this.addEventListener('loadend', invalidate, { once: true });
      }
    }
    return send.apply(this, args);
  };
  // Gmail also uses fetch on some builds. Our own read requests use the saved
  // nativeFetch directly, so they cannot recursively invalidate their counts.
  window.fetch = function(input, options) {
    let sync = false;
    try {
      const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
      sync = captureSession(target, options?.headers || input?.headers) && target.pathname.endsWith('/i/s');
    } catch {}
    const result = nativeFetch(input, options);
    if (sync) result.then(invalidate, () => {});
    return result;
  };
  document.addEventListener('pk-studio-unread-request', event => {
    try {
      const request = JSON.parse(event.detail);
      const next = request.active && Array.isArray(request.ids) ? [...new Set(request.ids.filter(id => ids.has(id)))] : [];
      if (JSON.stringify(next) !== JSON.stringify(wanted)) { wanted = next; revision++; }
      schedule();
    } catch {}
  });
  document.addEventListener('visibilitychange', () => schedule());
  document.addEventListener('focusout', () => {
    if (!session) { bootstrapAttempts = 0; schedule(); }
  });
  setInterval(() => schedule(), 45000);
  document.dispatchEvent(new Event('pk-studio-unread-ready'));
})();
