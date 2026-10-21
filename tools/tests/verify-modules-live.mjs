// Run through ego-browser, on an agent-owned Gmail page. No mail/event edits.
// The DOM/navigation code and service-worker routing are real; Chrome storage
// and messaging are stubbed in a named isolated world for this one test tab.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function verifyModules(page, task) {
  const root = new URL('../../src/extension-pk/', import.meta.url);
  const [code, css, routing] = await Promise.all([
    readFile(new URL('themes/studio/modules.js', root), 'utf8'),
    readFile(new URL('themes/studio/modules.css', root), 'utf8'),
    readFile(new URL('themes/studio/module-routing.js', root), 'utf8'),
  ]);
  await page.waitForSelector('#gb');
  const original = await page.url();
  assert.equal(new URL(original).hostname, 'mail.google.com');
  const account = await page.evaluate(() => [...document.querySelectorAll('#gb [aria-label]')]
    .filter(el => el.getClientRects().length)
    .map(el => el.getAttribute('aria-label').match(/[^\s()<>@]+@[^\s()<>@]+\.[^\s()<>@]+/)?.[0]).find(Boolean) || '');
  const seed = { 'pk-module-return:10': { mail: original, email: account.toLowerCase(), slot: new URL(original).pathname.match(/\/u\/(\d+)/)?.[1] || '0' } };
  const world = 'pk-simple-gmail-modules-verification';
  const source = `(() => {
    if (!['mail.google.com', 'calendar.google.com'].includes(location.hostname)) return;
    const start = () => {
      const state = { theme: 'theme-pk', enabled: {} }, session = ${JSON.stringify(seed)}, listeners = [];
      const store = data => ({
        async get(keys) { return Object.fromEntries([keys].flat().filter(k => k in data).map(k => [k, data[k]])); },
        async set(values) { Object.assign(data, values); }, async remove(key) { delete data[key]; }
      });
      globalThis.chrome = { storage: { local: store(state), session: store(session), onChanged: { addListener(fn) { listeners.push(fn); } } }, runtime: {
        sendMessage: message => self.PK_MODULES.target(message, { url: location.href, tab: { id: 10 }, frameId: 0 })
      } };
      globalThis.__pkModuleTest = { set(values) { Object.assign(state, values); for (const fn of listeners) fn(Object.fromEntries(Object.keys(values).map(k => [k, {}])), 'local'); } };
      ${routing}
      const style = document.createElement('style'); style.id = 'pk-modules-test-style'; style.textContent = ${JSON.stringify(css)}; document.head.append(style);
      ${code}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  })();`;
  const preload = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { worldName: world, source });
  const inWorld = async (expression) => {
    const tree = await page.cdp('Page.getFrameTree');
    const { executionContextId } = await page.cdp('Page.createIsolatedWorld', { frameId: tree.frameTree.frame.id, worldName: world });
    const result = await page.cdp('Runtime.evaluate', { expression, contextId: executionContextId, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await inWorld(source);
  await page.waitForSelector('#pk-studio-modules button[data-module=calendar]');
  const tabCount = (await task.tabs()).length;

  // Keyboard access and exact module targets, on the actual sites.
  await page.focus('#pk-studio-modules button[data-module=calendar]');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.module), 'calendar');
  await page.press('#pk-studio-modules button[data-module=calendar]', 'Enter');
  await page.waitForFunction(() => location.hostname === 'calendar.google.com' && document.querySelector('#pk-studio-modules button[data-module=mail]'));
  assert.ok(!(await page.url()).includes('/embed'));
  assert.equal(await page.evaluate(() => !!document.querySelector('#pk-module-overlay, #pk-studio-modules iframe')), false);
  assert.equal((await task.tabs()).length, tabCount);
  assert.equal(await page.evaluate(() => document.querySelector('#pk-studio-modules [aria-current=page]').dataset.module), 'calendar');
  console.log('Live: full Calendar is the top-level document, same tab, Mail return control present.');

  // Preference changes remove the rail on Calendar too, and can restore it.
  await inWorld("__pkModuleTest.set({ enabled: { 'js-studio-modules': false } })");
  await page.waitForFunction(() => !document.getElementById('pk-studio-modules'));
  await inWorld("__pkModuleTest.set({ enabled: {}, theme: 'theme-pk' })");
  await page.waitForSelector('#pk-studio-modules');
  await page.click('#pk-studio-modules button[data-module=mail]', { label: 'revenir à Gmail' });
  await page.waitForFunction(expected => location.href === expected && !!document.querySelector('#pk-studio-modules'), original);
  assert.equal((await task.tabs()).length, tabCount);
  console.log('Live: module toggle and exact Mail return passed; no mail or event modified.');
  await page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: preload.identifier });
}
