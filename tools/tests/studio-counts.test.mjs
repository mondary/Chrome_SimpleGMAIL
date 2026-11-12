import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/extension-pk/themes/studio/unread-counts.js', import.meta.url), 'utf8');
function harness(metadata = { primary: [2, 9], social: [2, 15], promotions: [2, 25] }) {
  const document = new EventTarget(), timers = new Map(), results = [], requests = [], delays = [];
  let nextTimer = 0;
  Object.assign(document, { visibilityState: 'visible', documentElement: { lang: 'fr' }, querySelectorAll: () => [] });
  class XHR extends EventTarget { open() {} setRequestHeader() {} send() {} }
  class Custom extends Event { constructor(type, { detail } = {}) { super(type); this.detail = detail; } }
  document.addEventListener('pk-studio-unread-result', event => results.push(JSON.parse(event.detail)));
  const context = vm.createContext({
    document, XMLHttpRequest: XHR, Event, CustomEvent: Custom, MouseEvent: Custom, URL, Headers, AbortSignal, AbortController, Date,
    getComputedStyle: () => ({ visibility: 'visible' }),
    location: { pathname: '/mail/u/3/', hostname: 'mail.google.com', href: 'https://mail.google.com/mail/u/3/#inbox', origin: 'https://mail.google.com' },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, fn); delays.push(delay); return id; },
    clearTimeout: id => timers.delete(id), setInterval() {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (!new URL(url).pathname.endsWith('/i/bv')) return { ok: true, json: async () => [] };
      const query = JSON.parse(options.body)[0][3];
      const id = query.match(/category:([a-z]+)/)?.[1];
      if (metadata[id] instanceof Error) throw metadata[id];
      const page = JSON.parse(options.body)[0][9];
      const value = Array(12).fill(null); value[11] = typeof metadata[id] === 'function' ? metadata[id](page) : metadata[id];
      return { ok: true, json: async () => value };
    },
  });
  context.window = context; context.top = context;
  vm.runInContext(source, context);
  return {
    requests, results, document, delays,
    counts: () => Object.assign({}, ...results.map(item => item.counts)),
    fetch: (...args) => context.fetch(...args),
    configure: (active, ids = ['primary', 'social', 'promotions']) => document.dispatchEvent(new Custom('pk-studio-unread-request', { detail: JSON.stringify({ active, ids }) })),
    session(account = 3, sync = false) {
      const xhr = new XHR(); xhr.open('POST', `https://mail.google.com/sync/u/${account}/i/${sync ? 's' : 'fd'}`);
      xhr.setRequestHeader('X-Framework-Xsrf-Token', 'private-test-token');
      xhr.setRequestHeader('Content-Type', 'application/json'); xhr.send('not retained');
      return xhr;
    },
    async flush() {
      while (timers.size) {
        const [id, fn] = timers.entries().next().value;
        timers.delete(id);
        await fn();
      }
    },
  };
}
test('read-only inbox/unread queries give exact Primary 9, Social 15, Promotions 25', async () => {
  const h = harness(); h.configure(true); h.session(); await h.flush();
  assert.deepEqual(h.counts(), { primary: 9, promotions: 25, social: 15 });
  assert.equal(h.results[0].account, '3');
  assert.equal(JSON.stringify(h.results).includes('private-test-token'), false);
  assert.equal(h.requests.length, 3);
  for (const { url, options } of h.requests) {
    assert.equal(new URL(url).pathname, '/sync/u/3/i/bv');
    assert.equal(new URL(url).searchParams.get('pt'), 'ji');
    assert.equal(options.credentials, 'same-origin');
    assert.match(JSON.parse(options.body)[0][3], /^in:inbox category:(primary|social|promotions) is:unread$/);
  }
});
test('an estimate, a missing total and a network error are never converted to zero', async () => {
  const h = harness({ primary: [1, 201], promotions: null, social: [2, 0] });
  h.configure(true); h.session(); await h.flush();
  assert.deepEqual(h.counts(), { primary: null, promotions: null, social: 0 });
  assert.equal(h.results.some(r => r.totals && r.totals.social === 0), true, 'an exact inbox total of 0 is published for the inbox-zero check');
  const failure = harness({ social: new Error('offline') }); failure.configure(true, ['social']); failure.session(); await failure.flush();
  assert.equal(failure.results[0].counts.social, null);
});
test('inactive module, hidden page, foreign account and invalid category cannot request data', async () => {
  const h = harness(); h.configure(false); h.session(); await h.flush();
  assert.equal(h.requests.length, 0);
  h.configure(true, ['social', 'from:someone', 'https://example.com']); await h.flush();
  assert.equal(h.requests.length, 1);
  const other = harness(); other.configure(true); other.session(2); await other.flush();
  assert.equal(other.requests.length, 0);
  const hidden = harness(); hidden.document.visibilityState = 'hidden'; hidden.configure(true); hidden.session(); await hidden.flush();
  assert.equal(hidden.requests.length, 0);
});

test('cached startup bootstraps through one native Refresh, without opening any mail', async () => {
  const h = harness(); let clicks = 0;
  const button = {
    getClientRects: () => [1], getAttribute: name => name === 'aria-label' ? 'Actualiser' : null,
    dispatchEvent(event) { if (event.type === 'mousedown') { clicks++; h.session(); } },
  };
  h.document.querySelectorAll = selector => selector.includes('.G-atb') ? [button] : [];
  h.configure(true); await h.flush();
  assert.equal(clicks, 1);
  assert.deepEqual(h.counts(), { primary: 9, social: 15, promotions: 25 });
});

test('large categories probe native pages until exact and reuse that page on refresh', async () => {
  const h = harness({ forums: page => page >= 64 ? [2, 3266] : [1, 201] });
  h.configure(true, ['forums']); h.session(); await h.flush();
  assert.equal(h.counts().forums, 3266);
  assert.deepEqual(h.requests.map(r => JSON.parse(r.options.body)[0][9]), [0, 1, 4, 16, 64]);
  h.configure(true, ['forums']); await h.flush();
  assert.equal(JSON.parse(h.requests.at(-1).options.body)[0][9], 64);
  assert.equal(h.requests.length, 6);
});

test('a Gmail sync during the batch no longer discards already computed totals', async () => {
  let synced = false;
  const h = harness({ primary: () => {
    if (!synced) { synced = true; h.session(3, true).dispatchEvent(new Event('loadend')); }
    return [2, 9];
  }, social: [2, 15], promotions: [2, 25] });
  h.configure(true); h.session();
  await h.flush();
  assert.deepEqual(h.counts(), { primary: 9, social: 15, promotions: 25 });
  assert.equal(h.results.length, 6, 'sync during the first batch does not discard it; the next batch also completes');
});

test('fetch-based Gmail sessions initialise the reader as well as XHR', async () => {
  const h = harness(); h.configure(true, ['social']);
  await h.fetch('https://mail.google.com/sync/u/3/i/s', { method: 'POST', headers: { 'X-Framework-Xsrf-Token': 'private-fetch-token' } });
  await h.flush();
  assert.equal(h.counts().social, 15);
  assert.equal(JSON.stringify(h.results).includes('private-fetch-token'), false);
});

test('bootstrap does not interrupt editing or refresh an open conversation', async () => {
  const h = harness(); let clicks = 0;
  const button = { getClientRects: () => [1], getAttribute: () => 'Actualiser', dispatchEvent() { clicks++; } };
  h.document.activeElement = { matches: () => true };
  h.document.querySelectorAll = selector => selector.includes('.G-atb') ? [button] : [];
  h.configure(true); await h.flush();
  assert.equal(clicks, 0);
  const reading = harness();
  reading.document.querySelectorAll = selector => selector.includes('.hP') ? [{ getClientRects: () => [1] }] : [button];
  reading.configure(true); await reading.flush();
  assert.equal(clicks, 0);
});

test('hiding the page aborts a running count batch without querying the remaining categories', async () => {
  const h = harness({ primary: () => {
    h.document.visibilityState = 'hidden';
    h.document.dispatchEvent(new Event('visibilitychange'));
    return [2, 9];
  }, social: [2, 15], promotions: [2, 25] });
  h.configure(true); h.session(); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.signal.aborted, true);
  assert.equal(h.results.length, 0);
});

test('disabling the module cancels queued work and an in-flight request', async () => {
  const queued = harness(); queued.configure(true); queued.session(); queued.configure(false); await queued.flush();
  assert.equal(queued.requests.length, 0);
  const h = harness({ primary: () => { h.configure(false); return [2, 9]; } });
  h.configure(true); h.session(); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.signal.aborted, true);
  assert.equal(h.results.length, 0);
});

test('routine Gmail syncs cannot start a fresh count batch every ten seconds', async () => {
  const h = harness(); h.configure(true); h.session(); await h.flush();
  h.session(3, true).dispatchEvent(new Event('loadend'));
  assert.ok(h.delays.at(-1) >= 44000 && h.delays.at(-1) <= 45000, 'at least 45s between batch starts');
});
