// Browser regression suite for Studio Focus lecture: the chrome withdraws in
// thread view, the toolbar/reply bar/FAB come back from the edges, keyboard
// focus reveals the search bar, list view is untouched, the toggle disables it.
// Run: node tools/tests/studio-focus.test.mjs (Chrome, or CHROME_BIN, required).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'pk-studio-focus-'));
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
  const target = await fetch(`http://${base.host}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
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
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{if(${expression})return resolve(true);if(Date.now()-start>6000)return reject(new Error('Condition timed out: '+${JSON.stringify(expression)}));setTimeout(check,20)};check()})`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  const move = (x, y) => cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  const style = (selector, prop) => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).${prop}`);

  const fixture = new URL('../previews/studio-focus-preview/index.html', import.meta.url).href;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelector('#open-thread') && document.querySelector('#pk-studio-tabs')`);

  // List view: untouched.
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), false);
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none');

  // Thread view: the chrome withdraws, the containers are marked in place.
  await click('#open-thread');
  await wait(`document.documentElement.classList.contains('pk-focus')`);
  await wait(`document.querySelector('#toolbar').hasAttribute('data-pk-focus-tools')`);
  await wait(`document.querySelector('#floatbar').hasAttribute('data-pk-focus-floatbar')`);
  await wait(`getComputedStyle(document.querySelector('#toolbar')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).visibility === 'hidden'`);
  assert.equal(await style('#pk-studio-tabs', 'display'), 'none', 'category strip hidden while reading');
  assert.equal(await style('#gb', 'position'), 'fixed', 'global bar out of flow');
  assert.equal(await style('#gb', 'opacity'), '0', 'global bar withdrawn');
  assert.equal(await style('#toolbar', 'position'), 'fixed', 'thread toolbar out of flow');
  assert.equal(await style('#toolbar', 'opacity'), '0', 'thread toolbar withdrawn');
  assert.equal(await style('#floatbar', 'visibility'), 'hidden', 'reply bar withdrawn');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-tools]').length`), 1, 'toolbar marked once');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-floatbar]').length`), 1, 'float bar marked once');

  // Pointer at the top edge summons the thread toolbar only.
  await move(640, 8);
  await wait(`document.documentElement.classList.contains('pk-focus-top')`);
  await wait(`getComputedStyle(document.querySelector('#toolbar')).opacity === '1'`);
  assert.equal(await style('#gb', 'opacity'), '0', 'search bar stays away on edge hover');

  // Leaving the edge withdraws it again after the delay.
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-top')`);

  // Pointer at the bottom edge summons the reply bar and the FAB.
  await move(640, 796);
  await wait(`document.documentElement.classList.contains('pk-focus-bottom')`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).visibility === 'visible'`);
  assert.equal(await style('#pk-new-message-fab', 'visibility'), 'visible', 'compose FAB back at the bottom');
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-bottom')`);

  // Keyboard focus inside the search reveals the global bar ("/" on Gmail).
  await evaluate(`document.querySelector('#search').focus()`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '1'`);
  await evaluate(`document.querySelector('#search').blur()`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);

  // Back to the list: everything returns instantly, no attribute left behind.
  await click('#back-list');
  await wait(`!document.documentElement.classList.contains('pk-focus')`);
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none', 'category strip back');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-tools],[data-pk-focus-floatbar]').length`), 0, 'marks cleaned');

  // The setting switches the whole mode off.
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': false } })`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  await click('#open-thread');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,300))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), false, 'disabled: no focus mode');
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none', 'disabled: strip stays');
  assert.equal(await style('#gb', 'position'), 'static', 'disabled: bar stays in flow');

  console.log('PASS: focus lecture — chrome withdrawn in thread view, edge summon, keyboard search, clean list fallback, toggle respected.');
} finally {
  socket?.close();
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true });
}
