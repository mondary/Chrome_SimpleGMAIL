// Browser regression suite for the Studio preserved undo toast.
// Run: node tools/tests/studio-toast.test.mjs (Chrome, or CHROME_BIN, required).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const profile = await mkdtemp(join(tmpdir(), 'pk-studio-toast-'));
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
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{if(${expression})return resolve(true);if(Date.now()-start>5000)return reject(new Error('Condition timed out: '+${JSON.stringify(expression)}));setTimeout(check,20)};check()})`);
  const click = selector => cdp('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})?.click()` });
  const fixture = new URL('../previews/studio-toast-preview/index.html', import.meta.url).href;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelector('#fire-undo') && document.querySelector('.bAp .vh')`);

  // A clone must never be used: the real row changes parent, not identity.
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo')`);
  await evaluate(`window.__pkOriginalUndo=document.querySelector('.bAp .vh #link_undo');window.__pkOriginalRow=window.__pkOriginalUndo.closest('.aT')`);
  await wait(`document.querySelector('.bAp .vh .pk-pill-timer')`);
  await click('#fire-info');
  await wait(`document.querySelector('.bAp [data-pk-toast-preserve] #link_undo')`);
  assert.equal(await evaluate(`document.querySelector('[data-pk-toast-preserve] #link_undo') === window.__pkOriginalUndo`), true);
  assert.equal(await evaluate(`document.querySelector('[data-pk-toast-preserve] .aT') === window.__pkOriginalRow`), true);
  assert.equal(await evaluate(`!!document.querySelector('#pk-toast-stack')`), false, 'no detached clone stack');
  assert.equal(await evaluate(`document.querySelector('[data-pk-toast-preserve]').closest('.bAp') === document.querySelector('.bAp')`), true);
  await click('[data-pk-toast-preserve] #link_undo');
  await wait(`document.querySelector('#undo-count').textContent==='Annulations réelles : 1'`);
  await wait(`!document.querySelector('[data-pk-toast-preserve]')`);
  assert.equal(await evaluate(`document.querySelector('.bAp .vh').textContent.includes('Action annulée.')`), true);

  // Same message twice: node replacement, not text change, is the steal signal.
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo') && document.querySelector('.bAp .vh .pk-pill-timer')`);
  await click('#fire-undo');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===1`);
  await click('#fire-info');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===2`);
  await click('.bAp [data-pk-toast-preserve] #link_undo');
  await wait(`document.querySelector('#undo-count').textContent==='Annulations réelles : 2'`);
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===1`);

  // The pill's own close control works with the keyboard and removes the action.
  await evaluate(`(()=>{const close=document.querySelector('.bAp [data-pk-toast-preserve] .bBe');close.focus();close.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))})()`);
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===0`);

  // A click on the live native undo is a real cancellation, not a steal.
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo')`);
  await click('.bAp .vh #link_undo');
  await wait(`document.querySelector('#undo-count').textContent==='Annulations réelles : 3'`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
  assert.equal(await evaluate(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length`), 0);

  // The setting caps the pill at the native undo window (3 s in this harness).
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo') && document.querySelector('.bAp .vh .pk-pill-timer')`);
  await click('#expire');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===1`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,3500))`);
  assert.equal(await evaluate(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length`), 0);

  console.log('PASS: preserved undo keeps Gmail’s real row, cancels after a steal, survives duplicate messages, closes and expires.');
} finally {
  socket?.close();
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true });
}
