import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../src/extension-pk/', import.meta.url);
const json = (value) => JSON.parse(JSON.stringify(value));

function worker() {
  const local = { theme: 'theme-pk', enabled: {} }, registrations = [];
  const hooks = {};
  const event = (name) => ({ addListener(fn) { hooks[name] = fn; } });
  const store = (data) => ({
    async get(keys) { return Object.fromEntries([keys].flat().filter(k => k in data).map(k => [k, json(data[k])])); },
    async set(values) { Object.assign(data, json(values)); },
    async remove(key) { delete data[key]; },
  });
  const chrome = {
    storage: { local: store(local) },
    sidePanel: { async setPanelBehavior() {} },
    scripting: {
      async getRegisteredContentScripts() { return json(registrations); },
      async registerContentScripts(scripts) { registrations.push(...json(scripts)); },
      async unregisterContentScripts({ ids }) {
        for (let i = registrations.length - 1; i >= 0; i--) if (ids.includes(registrations[i].id)) registrations.splice(i, 1);
      },
      async updateContentScripts(scripts) {
        for (const script of scripts) Object.assign(registrations.find(s => s.id === script.id), json(script));
      },
    },
    tabs: {
      onUpdated: event('updated'), onRemoved: event('removed'),
      async query() { return []; },
    },
    runtime: { onInstalled: event('installed'), onStartup: event('startup'), onMessage: event('message') },
  };
  const context = vm.createContext({ chrome, console, URL });
  context.self = context;
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(readFileSync(new URL(file, root), 'utf8'), context));
  context.importScripts('background.js');
  return {
    local, registrations,
    send: (message, sender = {}) => new Promise(resolve => hooks.message(message, sender, result => resolve(json(result)))),
  };
}

const sender = (url, id = 10) => ({ url, tab: { id }, frameId: 0 });
const go = (destination, account = '') => ({ type: 'pk-module-target', destination, account });

test('Calendar is a full page; Mail returns to the inbox of the active account', async () => {
  const w = worker();
  const mail = 'https://mail.google.com/mail/u/3/#category/forums';
  const target = await w.send(go('calendar', 'Work@Example.com'), sender(mail));
  assert.equal(target.ok, true);
  const url = new URL(target.url);
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('authuser'), 'work@example.com');
  assert.equal(url.pathname, '/calendar/');
  assert.equal(url.href.includes('embed'), false);
  // Google can assign a different numeric slot to the same account in Calendar.
  const back = new URL((await w.send(go('mail', 'work@example.com'), sender('https://calendar.google.com/calendar/u/1/r/week'))).url);
  assert.equal(back.origin, 'https://mail.google.com');
  assert.equal(back.searchParams.get('authuser'), 'work@example.com');
  assert.equal(back.hash, '#inbox');
});

test('Mail always lands on the inbox, never on the previous Gmail view', async () => {
  const w = worker();
  const calendar = 'https://calendar.google.com/calendar/u/1/r';
  const first = new URL((await w.send(go('mail', 'work@example.com'), sender(calendar, 10))).url);
  assert.equal(first.hash, '#inbox');
  assert.equal(first.pathname, '/mail/');
  // Switching accounts in Calendar follows the newly active account.
  const changed = new URL((await w.send(go('mail', 'personal@example.net'), sender(calendar, 10))).url);
  assert.equal(changed.searchParams.get('authuser'), 'personal@example.net');
  assert.equal(changed.hash, '#inbox');
});

test('missing account label respects the current numeric slot', async () => {
  const w = worker();
  const mail = 'https://mail.google.com/mail/u/2/#search/project';
  assert.equal((await w.send(go('calendar'), sender(mail))).url, 'https://calendar.google.com/calendar/u/2/r');
  assert.equal((await w.send(go('mail'), sender('https://calendar.google.com/calendar/u/2/r'))).url, 'https://mail.google.com/mail/u/2/#inbox');
});

test('disabled module, non-Studio themes, iframes and foreign senders cannot navigate', async () => {
  const w = worker();
  const source = sender('https://mail.google.com/mail/u/0/#inbox');
  for (const theme of ['', 'theme-focus-os', 'theme-simplify']) {
    w.local.theme = theme;
    assert.equal((await w.send(go('calendar'), source)).ok, false);
  }
  w.local.theme = 'theme-pk';
  w.local.enabled['js-studio-modules'] = false;
  assert.equal((await w.send(go('calendar'), source)).ok, false);
  w.local.enabled['js-studio-modules'] = true;
  for (const bad of [sender('https://example.com/mail/'), sender('http://mail.google.com/mail/'), sender('https://mail.google.com.evil.test/mail/'), { ...source, frameId: 1 }, { url: source.url }]) {
    assert.equal((await w.send(go('calendar'), bad)).ok, false);
  }
  assert.equal((await w.send(go('https://example.com'), source)).ok, false);
  assert.equal((await w.send(go('mail'), source)).ok, false);
});

test('only Modules runs on Calendar, and sync upgrades an already enabled Gmail-only registration', async () => {
  const w = worker();
  assert.equal((await w.send({ type: 'sync' })).ok, true);
  const module = w.registrations.find(s => s.id === 'js-studio-modules');
  assert.deepEqual(module.matches, ['https://mail.google.com/*', 'https://calendar.google.com/*', 'https://drive.google.com/*']);
  assert.deepEqual(module.css, ['themes/studio/modules.css']);
  assert.equal(module.world, 'ISOLATED');
  const calendarRegs = w.registrations.filter(s => s.matches.includes('https://calendar.google.com/*'));
  assert.deepEqual(calendarRegs.map(s => s.id).sort(), ['css-studio-calendar', 'js-studio-modules']);
  assert.ok(calendarRegs.every(s => s.id === 'js-studio-modules' || s.id === 'css-studio-calendar'));
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  for (const match of module.matches) assert.ok(manifest.host_permissions.includes(match));
  module.matches = ['https://mail.google.com/*'];
  delete module.css;
  await w.send({ type: 'sync' });
  assert.equal(module.matches.includes('https://calendar.google.com/*'), true);
  assert.equal(module.matches.includes('https://drive.google.com/*'), true);
  assert.deepEqual(module.css, ['themes/studio/modules.css']);
  w.local.enabled['js-studio-modules'] = false;
  await w.send({ type: 'sync' });
  assert.equal(w.registrations.some(s => s.id === 'js-studio-modules'), false);
});


test('Drive opens My Drive for the active account, and Drive file pages can switch back', async () => {
  const w = worker();
  const mail = 'https://mail.google.com/mail/u/2/#inbox';
  const target = new URL((await w.send(go('drive', 'Work@Example.com'), sender(mail))).url);
  assert.equal(target.origin, 'https://drive.google.com');
  assert.equal(target.pathname, '/drive/my-drive');
  assert.equal(target.searchParams.get('authuser'), 'work@example.com');

  const slot = new URL((await w.send(go('drive'), sender(mail))).url);
  assert.equal(slot.pathname, '/drive/u/2/my-drive');
  assert.equal(slot.searchParams.get('authuser'), null);

  const back = new URL((await w.send(go('mail', 'work@example.com'), sender('https://drive.google.com/file/d/abc/view'))).url);
  assert.equal(back.origin, 'https://mail.google.com');
  assert.equal(back.hash, '#inbox');
});
