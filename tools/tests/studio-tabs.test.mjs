// Browser regression suite on a fictional Gmail DOM. No personal browser profile.
// Run: node tools/tests/studio-tabs.test.mjs (Chrome, or CHROME_BIN, required).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const profile = await mkdtemp(join(tmpdir(), 'pk-studio-tabs-'));
const chrome = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
    chrome.once('error', reject);
    chrome.stderr.on('data', data => {
      output += data;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  const base = new URL(endpoint);
  const target = await fetch(`http://${base.host}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const call = pending.get(message.id);
    if (call) { pending.delete(message.id); message.error ? call.reject(message.error) : call.resolve(message.result); }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{if(${expression})return resolve(true);if(Date.now()-start>4000)return reject(new Error('Condition timed out: '+${JSON.stringify(expression)}));setTimeout(check,20)};check()})`);
  const navigate = async route => {
    await evaluate(`location.hash=${JSON.stringify(route)}`);
    await wait(`document.body.dataset.view===${JSON.stringify(route)}`);
  };
  const fixture = new URL('../previews/studio-tabs-preview/index.html', import.meta.url).href;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelectorAll('#pk-studio-tabs button').length===7`);
  await wait(`Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
  const columnFit = () => evaluate(`(()=>{const v=document.querySelector('#view').getBoundingClientRect(),s=document.querySelector('#pk-studio-tabs').getBoundingClientRect();return [Math.round(s.width),Math.round(v.width),Math.round(s.left),Math.round(v.left)]})()`);
  const fit = await columnFit();
  assert.deepEqual(fit, [fit[1], fit[1], fit[3], fit[3]], 'strip must match the mail column');
  await evaluate(`document.documentElement.style.setProperty('--pk-margin-side','16%')`);
  await wait(`Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
  const narrower = await columnFit();
  assert.ok(narrower[0] < fit[0], 'strip must follow a narrower mail column');
  assert.deepEqual(narrower, [narrower[1], narrower[1], narrower[3], narrower[3]]);
  await evaluate(`document.documentElement.style.setProperty('--pk-margin-side','8%')`);
  await wait(`Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
  const geometry = () => evaluate(`Array.from(document.querySelectorAll('#pk-studio-tabs button'),b=>{const r=b.getBoundingClientRect();return [b.title,r.x,r.y,r.width,r.height]})`);
  const selected = () => evaluate(`Array.from(document.querySelectorAll('#pk-studio-tabs [aria-selected=true]'),b=>b.title)`);
  await evaluate(`window.originalStrip=document.querySelector('#pk-studio-tabs');window.originalPurchase=document.querySelector('[data-key="purchases"]')`);
  const initial = await geometry();
  await evaluate(`originalPurchase.click()`);
  await wait(`document.body.dataset.view==='#search/in:inbox category:purchases'`);
  assert.deepEqual(await selected(), ['Achats']);
  assert.equal(await evaluate(`!document.querySelector('[data-key="label:Achats"]')`), true);
  assert.deepEqual(await geometry(), initial, 'navigation must not move, resize or rename tabs');
  assert.equal(await evaluate(`originalStrip===document.querySelector('#pk-studio-tabs') && originalPurchase===document.querySelector('[data-key="purchases"]')`), true);
  await evaluate(`document.querySelector('[data-key=promotions]').click()`);
  await wait(`document.body.dataset.view==='#search/in:inbox category:promotions'`);
  assert.deepEqual(await selected(), ['Recherche d’emploi']);
  assert.deepEqual(await geometry(), initial);
  await evaluate(`history.back()`);
  await wait(`document.body.dataset.view==='#search/in:inbox category:purchases'`);
  assert.deepEqual(await selected(), ['Achats']);
  await evaluate(`history.forward()`);
  await wait(`document.body.dataset.view==='#search/in:inbox category:promotions'`);
  assert.deepEqual(await selected(), ['Recherche d’emploi']);

  // Gmail may keep a hidden inbox tree while a label is shown.
  await navigate('#search/in:inbox category:purchases');
  await evaluate(`const cached=document.createElement('div');cached.style.display='none';cached.append(nativeStrip());document.querySelector('#view').append(cached)`);
  assert.deepEqual(await selected(), ['Achats']);
  assert.equal(await evaluate(`document.querySelector('#pk-studio-tabs').getClientRects().length`), 1);
  // Even replacement of the padded canvas must reattach the SAME strip.
  await evaluate(`document.querySelector('.bkK').innerHTML='<div class="nH"><div role="main" id="view"></div></div>';renderView()`);
  await wait(`originalStrip.isConnected`);
  assert.deepEqual(await geometry(), initial);

  for (const width of [900, 600, 390, 320, 240]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 720, deviceScaleFactor: 1, mobile: false });
    await wait(`document.querySelector('#pk-studio-tabs').hasAttribute('data-compact') && Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
    const compact = await geometry();
    assert.ok(compact.every(tab => tab[3] === 28), `28px icon cells at viewport ${width}`);
    const style = await evaluate(`(()=>{const b=document.querySelector('#pk-studio-tabs button');return [getComputedStyle(b).paddingLeft,getComputedStyle(b.lastElementChild).display,b.getAttribute('aria-label')]})()`);
    assert.deepEqual(style, ['4px', 'none', 'Principale']);
    await navigate('#inbox');
    assert.deepEqual(await geometry(), compact);
    await navigate('#search/in:inbox category:purchases');
    assert.deepEqual(await geometry(), compact);
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await wait(`!document.querySelector('#pk-studio-tabs').hasAttribute('data-compact') && Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
  assert.deepEqual(await geometry(), initial);
  // Keyboard navigation and accessible names survive icon-only presentation.
  await evaluate(`originalPurchase.focus();originalPurchase.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.title`), 'Forums');
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait(`document.body.dataset.view==='#search/in:inbox category:forums'`);
  assert.deepEqual(await selected(), ['Forums']);
  // Direct reload on the purchases search keeps the cached category order.
  await navigate('#search/in:inbox category:purchases');
  await cdp('Page.reload');
  await wait(`document.querySelectorAll('#pk-studio-tabs button').length===7`);
  assert.deepEqual(await selected(), ['Achats']);
  assert.deepEqual(await geometry(), initial);
  await evaluate(`updateSettings({pkLabelTabs:['Achats','Équipe / été','Achats']})`);
  await wait(`document.querySelector('[data-key="label:Équipe / été"]')`);
  await evaluate(`document.querySelector('[data-key="label:Équipe / été"]').click()`);
  await wait(`document.body.dataset.view==='#label/Équipe / été'`);
  assert.deepEqual(await selected(), ['Équipe / été']);
  await evaluate(`updateSettings({pkCategoryLabels:{promotions:'Offres'},pkLabelTabs:['Achats','Newsletters']})`);
  await wait(`document.querySelector('[data-key=promotions]').title==='Offres'`);
  assert.equal(await evaluate(`!document.querySelector('[data-key="label:Achats"]') && document.querySelectorAll('#pk-studio-tabs button').length===7`), true);
  assert.equal(await evaluate(`document.querySelectorAll('#pk-studio-tabs').length`), 1);
  const idle = await evaluate(`new Promise(resolve=>{let count=0;const o=new MutationObserver(r=>count+=r.length);o.observe(document.body,{subtree:true,childList:true,attributes:true});setTimeout(()=>{o.disconnect();resolve(count)},150)})`);
  assert.equal(idle, 0, 'observers must settle, not continuously rewrite the DOM');
  await evaluate(`updateSettings({theme:'native'})`);
  await wait(`!document.querySelector('#pk-studio-tabs')`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-studio-tabs-native],[data-pk-studio-tabs-host]').length`), 0);
  await navigate('#inbox');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.aKh')).display`), 'block');
  await evaluate(`updateSettings({theme:'theme-pk',pkCategoryLabels:{promotions:'Recherche d’emploi'}})`);
  await wait(`document.querySelectorAll('#pk-studio-tabs button').length===7`);
  await navigate('#search/in:inbox category:purchases');
  if (process.env.CAPTURE_TABS) {
    for (const [name, width] of [['desktop',1280],['compact',390]]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 720, deviceScaleFactor: 2, mobile: false });
      await wait((width===390 ? `document.querySelector('#pk-studio-tabs').hasAttribute('data-compact')` : `!document.querySelector('#pk-studio-tabs').hasAttribute('data-compact')`) + ` && Math.abs(document.querySelector('#pk-studio-tabs').getBoundingClientRect().width - document.querySelector('#view').getBoundingClientRect().width) < 1`);
      const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
      await writeFile(fileURLToPath(new URL(`../../store/screenshots/studio-tabs-${name}.png`, import.meta.url)), Buffer.from(data,'base64'));
    }
  }
  console.log('PASS: stable DOM/geometry, in:inbox category routes, category round trips, history, cached hidden inbox, replaced canvas, direct reload, 5 compact widths, keyboard, live settings, observer idle and theme cleanup.');
} finally {
  socket?.close();
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true });
}
