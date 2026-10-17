/* Run with an ego-browser Page already pointing at the local fixture.
   await (await import('file:///.../verify.mjs')).verify(page); */
import assert from 'node:assert/strict';

export async function verify(page) {
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('http://127.0.0.1:8769/tools/previews/focus-os-preview/#inbox');
  await page.reload();
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.waitForSelector('#fos-list-head');
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const geometry = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    return { head: rect('#fos-list-head'), row: rect('.zA'), last: rect('#demo-7'), footer: rect('#fos-cmd'), dates: document.querySelectorAll('.fos-day').length };
  });
  // Chromium/font rasterization can round normal line-height by half a pixel
  // across display scales. Keep the archived geometry within one CSS pixel.
  const closeRect = (actual, expected) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= 1, `${actual} differs from ${expected}`));
  closeRect(geometry.head, [270, 108, 900, 25]);
  closeRect(geometry.row, [270, 170, 900, 35]);
  closeRect(geometry.last, [270, 489, 900, 35]);
  closeRect(geometry.footer, [0, 861, 1440, 39]);
  assert.equal(geometry.dates, 3);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('tbody > tr')].every(row => row.classList.contains('zA'))), true);

  // An idle theme must not continuously mutate Gmail's DOM.
  const mutations = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(document.querySelector('main'), { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 250);
  }));
  assert.equal(mutations, 0);
  // Opening a native menu triggers a render pass. Rewriting unchanged date
  // attributes during that pass makes Gmail dismiss the menu immediately.
  const dateMutations = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    document.querySelectorAll('.zA').forEach(row => observer.observe(row, { attributes: true, attributeFilter: ['data-fos-day', 'style'] }));
    document.querySelector('main').title = 'Native filter menu opened';
    requestAnimationFrame(() => requestAnimationFrame(() => { observer.disconnect(); resolve(count); }));
  }));
  assert.equal(dateMutations, 0);
  await page.keyboard.press('j');
  assert.equal(await page.evaluate(() => document.querySelector('.fos-active')?.id), 'demo-1');
  await page.keyboard.press('k');
  assert.equal(await page.evaluate(() => document.querySelector('.fos-active')?.id), 'demo-0');
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement?.name), 'q');
  await page.fill('#fos-dialog input', 'j k e newsletter');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.zA').length), 8);
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#search/j%20k%20e%20newsletter');
  assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false);
  await page.evaluate(() => { location.hash = '#inbox'; });
  await page.waitForFunction(() => document.querySelector('.fos-folder')?.textContent === 'Principale');
  await page.click('#fos-cmd button[aria-label="ouvrir"]');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fos-reading'));
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-fos-main]').length), 1);
  await page.keyboard.press('e');
  // No native reader archive in the fixture: show feedback, never call our footer recursively.
  assert.equal(await page.evaluate(() => document.querySelector('#fos-status')?.textContent), 'Sélectionnez un message à archiver.');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-fos-reading'));

  // Archive only a synthetic row: no live-mailbox mutation in this verification.
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#fos-total')?.textContent === '7');
  assert.equal(await page.evaluate(() => document.querySelector('#fos-archive-total')?.textContent), '1');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-active').length), 1);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-day').length), 3);

  await page.evaluate(() => {
    const copy = document.querySelector('.zA').cloneNode(true);
    copy.id = 'demo-new'; copy.querySelector('.xW span').textContent = 'hier 10:00';
    document.querySelector('tbody').prepend(copy);
  });
  await page.waitForFunction(() => document.querySelector('#fos-total')?.textContent === '8' && document.querySelector('#demo-new')?.dataset.fosDay === 'Hier');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-day').length), 4);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-active').length), 1);
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await page.evaluate(() => {
    const r = document.querySelector('[data-fos-main]').getBoundingClientRect();
    return r.x >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
  }), true);
  await page.keyboard.press(',');
  assert.equal(await page.evaluate(() => document.querySelector('dialog')?.open), true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelectorAll('.zA').forEach(row => row.remove()));
  await page.waitForFunction(() => document.querySelector('#fos-total')?.textContent === '0');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-active').length), 0);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.fos-day').length), 0);
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(() => document.querySelector('#fos-archive-total')?.textContent), '1');
  console.log('Focus: geometry, idle observer, navigation, search, reader, synthetic archive, date updates and mobile layout passed.');
}
