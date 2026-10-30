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
  let session = null, wanted = [], timer = 0, running = false, lastRun = 0, revision = 0;
  const emit = counts => document.dispatchEvent(new CustomEvent('pk-studio-unread-result', {
    detail: JSON.stringify({ account, counts, at: Date.now() }),
  }));

  function schedule(delay = 0) {
    if (timer || !wanted.length || !session || document.visibilityState === 'hidden') return;
    timer = setTimeout(refresh, Math.max(delay, 4000 - (Date.now() - lastRun)));
  }
  async function refresh() {
    timer = 0;
    if (running || !wanted.length || !session || document.visibilityState === 'hidden') return;
    running = true;
    lastRun = Date.now();
    const generation = revision, current = session, results = {};
    try {
      for (const id of wanted) {
        if (generation !== revision) break;
        const query = `in:inbox category:${id} is:unread`;
        try {
          const response = await fetch(current.url, {
            method: 'POST', credentials: 'same-origin', headers: current.headers,
            body: JSON.stringify([[79, 101, null, query, null, null, 1, 2000]]), signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error('Gmail search unavailable');
          const data = await response.json();
          const metadata = data?.[11];
          const count = metadata?.[1];
          // Gmail also returns [1, estimate]. That is NOT an exact unread count.
          results[id] = Array.isArray(metadata) && metadata[0] === 2 && Number.isSafeInteger(count) && count >= 0
            ? count : null;
        } catch { results[id] = null; }
      }
      if (generation === revision) emit(results);
    } finally {
      running = false;
      if (generation !== revision) schedule();
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
    if (request && Object.keys(request.headers).some(name => name.toLowerCase() === 'x-framework-xsrf-token')) {
      const url = new URL(request.url);
      url.pathname = `/sync/u/${account}/i/bv`;
      // Gmail's JSON response mode; without pt=ji the total is an estimate.
      url.search = '';
      url.searchParams.set('hl', document.documentElement.lang || 'en');
      url.searchParams.set('c', '20');
      url.searchParams.set('rt', 'r');
      url.searchParams.set('pt', 'ji');
      session = { url: url.href, headers: { ...request.headers } };
      if (request.url.pathname.endsWith('/i/s')) {
        this.addEventListener('loadend', () => { revision++; schedule(1200); }, { once: true });
      } else if (!lastRun) schedule(500);
    }
    return send.apply(this, args);
  };
  document.addEventListener('pk-studio-unread-request', event => {
    try {
      const request = JSON.parse(event.detail);
      const next = request.active && Array.isArray(request.ids) ? [...new Set(request.ids.filter(id => ids.has(id)))].sort() : [];
      if (JSON.stringify(next) !== JSON.stringify(wanted)) { wanted = next; revision++; }
      schedule();
    } catch {}
  });
  document.addEventListener('visibilitychange', () => schedule());
  setInterval(() => schedule(), 45000);
  document.dispatchEvent(new Event('pk-studio-unread-ready'));
})();
