/* Interaction pass on Gmail, isolated Ego Page. Read-only: no archive, no compose. */
import { readFile } from 'node:fs/promises';

const root = '/Users/clm/Documents/GitHub/PROJECTS/-pkMAIL/Chrome_SimpleGMAIL/src/extension-pk/';
const task = await taskSpace('Original — validation finale');
const page = task.page('p1');
await page.goto('https://mail.google.com/mail/u/0/#inbox');
await page.reload();
await page.waitForSelector('.zA');
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const tree = await page.cdp('Page.getFrameTree');
const world = await page.cdp('Page.createIsolatedWorld', { frameId: tree.frameTree.frame.id, worldName: 'simplemail-original-actions' });
const css = await readFile(root + 'themes/simplemail-original/theme.css', 'utf8');
const iconData = 'data:image/png;base64,' + (await readFile(root + 'icon.png')).toString('base64');
let js = await readFile(root + 'themes/simplemail-original/theme.js', 'utf8');
const fontData = {};
for (const file of ['Outfit.ttf', 'MaterialSymbolsOutlined.ttf']) fontData[file] = 'data:font/ttf;base64,' + (await readFile(root + 'themes/simplemail-original/fonts/' + file)).toString('base64');
js = js.replace("const base = chrome.runtime.getURL('themes/simplemail-original/fonts/');", 'const fontData = ' + JSON.stringify(fontData) + ';')
  .replace('`url("${base}${file}")`', '`url("${fontData[file]}")`')
  .replace("chrome.runtime.getURL('icon.png')", JSON.stringify(iconData));
await page.cdp('Runtime.evaluate', { contextId: world.executionContextId, expression: '(() => { const s = document.createElement("style"); s.textContent = ' + JSON.stringify(css) + '; document.head.append(s); })()' });
const injected = await page.cdp('Runtime.evaluate', { contextId: world.executionContextId, expression: js });
console.log({ injectionError: injected.exceptionDetails?.text, detail: injected.exceptionDetails?.exception?.description?.slice(0, 300) });
await page.waitForSelector('#smo-header');
const badgeSeen = await page.waitForFunction(() => document.querySelectorAll('.smo-category-count:not([hidden])').length > 0, undefined, { timeout: 8000 }).then(() => true).catch(() => false);
console.log('badges', await page.evaluate(() => [...document.querySelectorAll('.smo-category-count:not([hidden])')].map(b => b.textContent + '@' + b.closest('button').dataset.category)), { badgeSeen });

await page.click('#smo-header button[aria-label="Déplier les dossiers"]', { label: 'Déplier le tiroir des dossiers' });
console.log('drawer', await page.evaluate(() => ({ open: document.documentElement.hasAttribute('data-smo-drawer'), rail: document.querySelector('#smo-rail').getBoundingClientRect().width, mainX: document.querySelector('[data-smo-main]').getBoundingClientRect().x })));
await page.click('#smo-header button[aria-label="Déplier les dossiers"]', { label: 'Replier le tiroir' });

await page.keyboard.press('j');
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.documentElement.hasAttribute('data-smo-reading'), undefined, { timeout: 8000 });
console.log('reading', await page.evaluate(() => ({
  thread: location.hash.startsWith('#inbox/'),
  title: document.querySelector('.hP')?.textContent.slice(0, 40),
  titleFont: getComputedStyle(document.querySelector('.hP')).fontFamily.slice(0, 18),
  toolbarTop: document.querySelector('.aeH')?.getBoundingClientRect().y,
})), await page.screenshot({ path: '/tmp/smo-gmail-reading.png' }));
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.documentElement.hasAttribute('data-smo-reading'), undefined, { timeout: 8000 });

await page.keyboard.press('/');
await page.fill('#smo-search input', 'label:inbox is:read');
await page.keyboard.press('Enter');
await page.waitForFunction(() => decodeURIComponent(location.hash).includes('label:inbox'), undefined, { timeout: 8000 });
console.log('search', await page.evaluate(() => ({ hash: decodeURIComponent(location.hash).slice(0, 40), context: document.querySelector('#smo-context')?.textContent })));

await page.evaluate(() => { location.hash = '#inbox'; });
await page.waitForFunction(() => document.querySelectorAll('.zA').length > 0, undefined, { timeout: 10000 });
const idle = await page.evaluate(() => new Promise(resolve => {
  let count = 0;
  const obs = new MutationObserver(records => { count += records.length; });
  obs.observe(document.querySelector('[data-smo-main]'), { childList: true, subtree: true });
  setTimeout(() => { obs.disconnect(); resolve(count); }, 350);
}));
console.log({ idleMutations: idle });

await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
console.log('mobile', await page.evaluate(() => {
  const r = document.querySelector('[data-smo-main]').getBoundingClientRect();
  return { x: r.x, right: r.right, noHScroll: document.documentElement.scrollWidth <= innerWidth, header: document.querySelector('#smo-header').getBoundingClientRect().height, composeWidth: document.querySelector('#smo-compose').getBoundingClientRect().width };
}));
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
