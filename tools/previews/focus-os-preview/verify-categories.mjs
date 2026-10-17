import assert from 'node:assert/strict';

export async function verifyCategories(page) {
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('http://127.0.0.1:8769/tools/previews/focus-os-preview/#inbox');
  await page.reload();
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.waitForSelector('#fos-list-head');
  await page.evaluate(() => document.querySelectorAll('.aKh [role=tab]').forEach(tab => {
    tab.setAttribute('aria-label', `${tab.textContent}, 2 nouveaux messages,`);
  }));

  const choose = async id => {
    await page.click(`#fos-categories button[data-category="${id}"]`);
    await page.waitForFunction(id => document.querySelector('#fos-categories button[aria-current=true]')?.dataset.category === id, id);
  };
  const primary = async () => {
    await choose('primary');
    await page.waitForFunction(() => location.hash === '#inbox' && document.querySelector('[data-fos-main] .aKh [aria-selected=true]')?.getAttribute('aria-label').split(',')[0] === 'Principale');
    assert.equal(await page.evaluate(() => document.querySelector('#fos-list-head').getBoundingClientRect().top), 108);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-fos-search-bar]').length), 0);
  };
  const checkSearch = async () => {
    await page.waitForSelector('.fixture-results[data-fos-main]');
    await page.waitForFunction(() => {
      const bar = document.querySelector('[data-fos-search-bar]');
      const head = document.querySelector('#fos-list-head');
      return bar && head && head.getBoundingClientRect().top >= bar.getBoundingClientRect().bottom + 26;
    });
    return page.evaluate(() => {
      const bar = document.querySelector('[data-fos-search-bar]').getBoundingClientRect();
      const head = document.querySelector('#fos-list-head').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('[data-fos-search-bar] button')];
      return {
        bar: [bar.top, bar.bottom], head: head.top,
        reachable: buttons.every(button => {
          const r = button.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return button === hit || button.contains(hit);
        }),
        fits: bar.left >= 0 && bar.right <= innerWidth,
      };
    });
  };

  // Enabled native tabs, then hidden categories via search; always return to
  // Primary even when Gmail remembers Promotions in its cached inbox.
  for (const id of ['promotions', 'forums']) { await choose(id); await primary(); }
  for (const id of ['social', 'updates', 'newsletter']) {
    await choose('promotions');
    await choose(id);
    const layout = await checkSearch();
    assert.equal(layout.reachable, true);
    assert.equal(layout.bar[0], 82);
    await primary();
  }

  // Enabled categories remain accessible from an existing search too.
  await choose('social'); await checkSearch();
  await choose('promotions'); await checkSearch();
  assert.match(await page.evaluate(() => decodeURIComponent(location.hash)), /category:promotions/);
  await choose('forums'); await checkSearch(); await primary();

  await choose('newsletter');
  const desktop = await checkSearch();
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobile = await checkSearch();
  assert.ok(mobile.head > desktop.head, 'wrapped filters must reserve additional space');
  assert.equal(mobile.reachable, true);
  assert.equal(mobile.fits, true);
  await primary();

  // A layout observer must settle rather than schedule renders indefinitely.
  const mutations = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 250);
  }));
  assert.equal(mutations, 0);
  console.log('Focus: category round trips, cached inbox, search filters, responsive spacing and idle layout passed.');
}
