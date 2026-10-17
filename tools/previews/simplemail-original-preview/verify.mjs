/* Run with an ego-browser Page: validates the fictional preview end to end. */
import assert from 'node:assert/strict';

export async function verify(page) {
  await page.goto('http://127.0.0.1:8769/tools/previews/simplemail-original-preview/#inbox');
  await page.reload();
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.waitForSelector('#smo-header');
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => document.querySelectorAll('.smo-avatar').length === 5);
  const geometry = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height] : null; };
    return {
      search: rect('#smo-search'), compose: rect('#smo-compose'), toolbar: rect('#smo-toolbar'), main: rect('[data-smo-main]'),
      row: rect('.zA'), sender: rect('.zA .yW'), subject: rect('.zA .bog'),
      fonts: { outfit: document.fonts.check('14px "SimpleMail Outfit"'), symbols: document.fonts.check('20px "SimpleMail Symbols"') },
      // A missing icon font renders the ligature name as wide text instead of a 20 px glyph.
      iconsRendered: [...document.querySelectorAll('.smo-icon')].every(i => i.getBoundingClientRect().width <= 26),
      logo: document.querySelector('.smo-brand img')?.naturalWidth > 0,
      count: document.querySelector('#smo-count')?.textContent,
      badges: [...document.querySelectorAll('.smo-category-count:not([hidden])')].map(b => b.textContent),
    };
  });
  assert.deepEqual(geometry.search, [134, 12.5, 1005, 42]);
  assert.deepEqual(geometry.compose, [1209, 13.5, 113, 40]);
  assert.deepEqual(geometry.toolbar, [64, 68, 1376, 50]);
  assert.deepEqual(geometry.main, [64, 118, 1376, 782]);
  assert.equal(geometry.row[3], 68);
  assert.equal(geometry.sender[0], 121);
  assert.equal(geometry.subject[0], 313);
  assert.deepEqual(geometry.fonts, { outfit: true, symbols: true });
  assert.equal(geometry.iconsRendered, true);
  assert.equal(geometry.logo, true);
  assert.equal(geometry.count, '1–20 sur 20 mails');
  assert.deepEqual(geometry.badges, ['2', '2']);

  const idle = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const obs = new MutationObserver(records => { count += records.length; });
    obs.observe(document.querySelector('[data-smo-main]'), { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(count); }, 300);
  }));
  assert.equal(idle, 0);

  await page.keyboard.press('j');
  assert.equal(await page.evaluate(() => document.querySelector('.smo-active')?.id), 'original-demo-0');
  await page.keyboard.press('j');
  assert.equal(await page.evaluate(() => document.querySelector('.smo-active')?.id), 'original-demo-1');
  await page.keyboard.press('k');
  assert.equal(await page.evaluate(() => document.querySelector('.smo-active')?.id), 'original-demo-0');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-smo-reading'));
  assert.equal(await page.evaluate(() => document.querySelector('.hP')?.textContent), "Re: Appel d'offres — Félicitations !");
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-smo-reading'));

  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement?.name), 'q');
  await page.fill('#smo-search input', 'dashboard');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#search/dashboard');
  assert.equal(await page.evaluate(() => document.querySelector('dialog[open]') === null), true);
  await page.evaluate(() => { location.hash = '#inbox'; });
  await page.waitForFunction(() => document.querySelectorAll('.zA').length === 5);

  await page.click('#original-demo-0 [role=checkbox]');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-smo-selected')), true);
  await page.click('#original-demo-0 [role=checkbox]');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-smo-selected')), false);

  await page.click('#smo-header button[aria-label="Déplier les dossiers"]');
  assert.equal(await page.evaluate(() => document.querySelector('#smo-rail').getBoundingClientRect().width), 260);
  await page.click('#smo-header button[aria-label="Déplier les dossiers"]');

  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await page.evaluate(() => {
    const r = document.querySelector('[data-smo-main]').getBoundingClientRect();
    return r.x >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
  }), true);
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  console.log('Original : géométrie 1440×900, polices, pictos, logo, observateur au repos, navigation, lecteur, recherche, sélection, tiroir et 390 px validés.');
}
