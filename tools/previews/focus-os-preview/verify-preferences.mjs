import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function verifyPreferences(page, panel) {
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('http://127.0.0.1:8769/tools/previews/focus-os-preview/#inbox');
  await page.evaluate(() => localStorage.removeItem('focus-preview-storage'));
  await page.reload();
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.waitForSelector('#fos-categories');
  await page.click('#fos-hud button[aria-label="Réglages et dossiers"]');
  await page.click('#fos-dialog input[data-fos-setting=social]');
  await page.waitForFunction(() => document.querySelector('#fos-categories [data-category=social]').hidden);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#fos-categories button:not([hidden])').length), 5);
  await page.selectOption('#fos-dialog select', 'right');
  await page.keyboard.press('Escape');
  const positions = async () => page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#fos-categories button:not([hidden])')];
    return { left: buttons[0].getBoundingClientRect().left, right: buttons.at(-1).getBoundingClientRect().right, width: innerWidth };
  });
  const right = await positions(); assert.equal(right.right, 1422);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#fos-categories')?.dataset.align === 'right' && document.querySelector('#fos-categories [data-category=social]').hidden);

  // Load the real extension panel with the same synthetic storage backend.
  const shim = await readFile(new URL('./storage.js', import.meta.url), 'utf8');
  await panel.cdp('Page.addScriptToEvaluateOnNewDocument', { source: shim });
  await panel.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await panel.goto('http://127.0.0.1:8769/src/extension-pk/popup.html');
  await panel.waitForSelector('input[aria-label="Afficher Réseaux"]', { state: 'attached' });
  assert.equal(await panel.evaluate(() => document.querySelector('input[aria-label="Afficher Réseaux"]').checked), false);
  assert.equal(await panel.evaluate(() => document.querySelector('select[aria-label="Alignement des catégories"]').value), 'right');
  await panel.selectOption('select[aria-label="Alignement des catégories"]', 'center');
  await page.waitForFunction(() => document.querySelector('#fos-categories').dataset.align === 'center');
  const center = await positions(); assert.equal((center.left + center.right) / 2, 720);
  assert.equal(await page.evaluate(() => document.querySelector('#fos-categories [data-category=social]').hidden), true);

  await page.click('#fos-hud button[aria-label="Réglages et dossiers"]');
  await page.click('#fos-dialog input[data-fos-setting=updates]');
  await panel.waitForFunction(() => !document.querySelector('input[aria-label="Afficher Notifications"]').checked);
  await panel.selectOption('select[aria-label="Alignement des catégories"]', 'left');
  await page.waitForFunction(() => document.querySelector('#fos-dialog select').value === 'left');
  assert.equal(await page.evaluate(() => document.querySelector('#fos-categories [data-category=updates]').hidden), true);
  await page.keyboard.press('Escape');
  assert.equal((await positions()).left, 18);

  // All categories may be hidden; settings and the current mailbox stay reachable.
  await page.click('#fos-hud button[aria-label="Réglages et dossiers"]');
  for (const id of ['primary', 'promotions', 'forums', 'newsletter']) await page.click(`#fos-dialog input[data-fos-setting=${id}]`);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#fos-categories button:not([hidden])').length), 0);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-fos-main] .zA').length), 8);
  for (const id of ['primary', 'promotions', 'social', 'updates', 'forums', 'newsletter']) await page.click(`#fos-dialog input[data-fos-setting=${id}]`);
  await page.selectOption('#fos-dialog select', 'right');
  await page.keyboard.press('Escape');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.equal((await positions()).right, 382);
  await page.evaluate(() => chrome.storage.local.set({ fosStyle: {} }));
  await page.waitForFunction(() => document.querySelector('#fos-categories').dataset.align === 'left');
  console.log('Focus: visibility, all-hidden recovery, alignment, persistence, real panel and two-way live settings passed.');
}

export async function verifyTotals(page) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.goto('http://127.0.0.1:8769/tools/previews/focus-os-preview/#inbox');
  await page.reload(); await page.waitForSelector('#fos-total');
  await page.evaluate(() => {
    const pager = document.createElement('span'); pager.className = 'Dj';
    document.querySelector('[data-fos-main] .G-atb').append(pager);
    const cached = document.createElement('div'); cached.hidden = true;
    cached.innerHTML = '<div role="main"><div class="G-atb"><span class="Dj">1–100 sur 99999</span></div></div>';
    document.body.prepend(cached);
  });
  const cases = [
    ['1–100 sur 286', '286', 'messages'],
    ['101–200 of 1,234', '1\u202f234', 'messages'],
    ['1–50 sur environ 1\u202f234', '≈ 1\u202f234', 'messages'],
    ['1–50 of 1,234+', '1\u202f234+', 'messages'],
    ['1–50 of many', '8', 'messages chargés'],
    ['1–8 sur 8', '8', 'messages'],
  ];
  for (const [source, value, label] of cases) {
    await page.evaluate(source => { document.querySelector('[data-fos-main] .Dj').textContent = source; }, source);
    await page.waitForFunction(({ value, label }) => document.querySelector('#fos-total').textContent === value && document.querySelector('#fos-total-label').textContent === label, { value, label });
    assert.equal(await page.evaluate(() => document.querySelector('#fos-list-head .fos-n').textContent), value + (label === 'messages chargés' ? ' chargés' : ''));
  }
  await page.evaluate(() => { document.querySelector('[data-fos-main] .Dj').textContent = '1–100 sur 286'; });
  await page.waitForFunction(() => document.querySelector('#fos-total').textContent === '286');
  await page.click('#fos-cmd button[aria-label=ouvrir]');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fos-reading'));
  assert.equal(await page.evaluate(() => document.querySelector('#fos-total').textContent), '286');
  await page.keyboard.press('Escape');
  await page.click('#fos-categories [data-category=social]');
  await page.waitForSelector('.fixture-results[data-fos-main]');
  await page.waitForFunction(() => document.querySelector('#fos-total-label').textContent === 'messages chargés');
  assert.equal(await page.evaluate(() => document.querySelector('#fos-total').textContent), '8');
  console.log('Focus: full totals, second page, thousands, estimates, unknown totals, reader and cached-view isolation passed.');
}
