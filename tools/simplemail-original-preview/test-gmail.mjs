/* Inject the real theme files into Gmail inside an isolated Ego Page.
   Usage: ego-browser nodejs < tools/simplemail-original-preview/test-gmail.mjs */
import { readFile } from 'node:fs/promises';

const root = '/Users/clm/Documents/GitHub/PROJECTS/-pkMAIL/Chrome_SimpleGMAIL/src/extension-pk/';
const task = await taskSpace(4);
const page = task.page('p1');
await page.goto('https://mail.google.com/mail/u/0/#inbox');
await page.reload();
await page.waitForSelector('.zA');
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const tree = await page.cdp('Page.getFrameTree');
const world = await page.cdp('Page.createIsolatedWorld', { frameId: tree.frameTree.frame.id, worldName: 'simplemail-original-test' });
const css = await readFile(root + 'themes/simplemail-original/theme.css', 'utf8');
const iconData = 'data:image/png;base64,' + (await readFile(root + 'icon.png')).toString('base64');
let js = await readFile(root + 'themes/simplemail-original/theme.js', 'utf8');
const fontData = {};
for (const file of ['Outfit.ttf', 'MaterialSymbolsOutlined.ttf']) {
  fontData[file] = 'data:font/ttf;base64,' + (await readFile(root + 'themes/simplemail-original/fonts/' + file)).toString('base64');
}
js = js
  .replace("const base = chrome.runtime.getURL('themes/simplemail-original/fonts/');", 'const fontData = ' + JSON.stringify(fontData) + ';')
  .replace('`url("${base}${file}")`', '`url("${fontData[file]}")`')
  .replace("chrome.runtime.getURL('icon.png')", JSON.stringify(iconData));

await page.cdp('Runtime.evaluate', {
  contextId: world.executionContextId,
  expression: '(() => { const s = document.createElement("style"); s.id = "smo-test-css"; s.textContent = ' + JSON.stringify(css) + '; document.head.append(s); })()',
});
const result = await page.cdp('Runtime.evaluate', { contextId: world.executionContextId, expression: js });
console.log({ injectionError: result.exceptionDetails?.text });
await page.waitForSelector('#smo-header');
await page.evaluate(() => document.fonts.ready.then(() => true));

const geometry = await page.evaluate(() => {
  const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; };
  const row = document.querySelector('.zA');
  return {
    rail: rect('#smo-rail'), header: rect('#smo-header'), search: rect('#smo-search'), compose: rect('#smo-compose'),
    toolbar: rect('#smo-toolbar'), main: rect('[data-smo-main]'), row: rect('.zA'), sender: rect('.zA .yW'),
    subject: rect('.zA .bog'), date: rect('.zA .xW'), fonts: {
      outfit: document.fonts.check('14px "SimpleMail Outfit"'), symbols: document.fonts.check('20px "SimpleMail Symbols"'),
    },
    rows: document.querySelectorAll('.zA').length,
    count: document.querySelector('#smo-count')?.textContent,
    context: document.querySelector('#smo-context')?.textContent,
    icons: document.querySelector('.smo-icon')?.getBoundingClientRect().width,
    badges: [...document.querySelectorAll('.smo-category-count:not([hidden])')].map(b => b.textContent),
    logo: !!document.querySelector('.smo-brand img')?.src,
    rowsSample: row?.textContent.slice(0, 80),
  };
});
console.log(JSON.stringify(geometry, null, 1));
console.log(await page.screenshot({ path: '/tmp/simplemail-original-gmail.png' }));
