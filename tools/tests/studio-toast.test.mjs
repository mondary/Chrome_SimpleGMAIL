// Browser regression suite for the Studio toast stack: preserved undo pill,
// measured stacking, one visible bubble and the "+N" folding chip.
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
  // A condition that throws must reject, never leave the promise pending.
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{let ok=false;try{ok=${expression}}catch(error){return reject(error)}if(ok)return resolve(true);if(Date.now()-start>8000)return reject(new Error('Condition timed out: '+${JSON.stringify(expression)}));setTimeout(check,20)};check()})`);
  const click = selector => cdp('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})?.click()` });
  const fixture = new URL('../previews/studio-toast-preview/index.html', import.meta.url).href;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelector('#fire-undo') && document.querySelector('.bAp .vh')`);

  // The whole pile with measured bottoms; folded tiles keep their box but must
  // not be counted as shown, and the chip is read in the same pass.
  const pile = () => evaluate(`(() => {
    const tiles = [...document.querySelectorAll('.bAp .vh')]
      .filter(vh => !vh.dataset.leaving)
      .filter(vh => !vh.hidden && vh.getClientRects().length)
      .map(vh => {
        const raw = vh.style.getPropertyValue('--pk-toast-bottom');
        return {
          kind: vh.hasAttribute('data-pk-toast-preserve') ? 'pill' : 'native',
          folded: vh.hasAttribute('data-pk-toast-collapsed'),
          bottom: parseInt(raw, 10) || null,
          height: vh.offsetHeight,
          text: (vh.querySelector('.bAq')?.textContent || '').trim().slice(0, 40),
        };
      });
    const chip = document.querySelector('.pk-toast-more');
    return {
      tiles,
      shown: tiles.filter(tile => !tile.folded),
      chip: chip && chip.getClientRects().length
        ? { text: chip.textContent, bottom: parseInt(chip.style.getPropertyValue('--pk-toast-bottom'), 10) || null, height: chip.offsetHeight }
        : null,
    };
  })()`);
  const gapsRespected = tiles => {
    const ordered = [...tiles].sort((a, b) => a.bottom - b.bottom);
    ordered.slice(1).forEach((tile, index) => {
      const below = ordered[index];
      assert.ok(tile.bottom >= below.bottom + below.height + 9,
        `gap respected: ${tile.kind}@${tile.bottom} vs ${below.kind}@${below.bottom}+${below.height}`);
    });
  };

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
  assert.equal(await evaluate(`[...document.querySelectorAll('.bAp .vh')].some(v => !v.hidden && v.textContent.includes('Action annulée.'))`), true);

  // Same message twice: node replacement, not text change, is the steal signal.
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo') && document.querySelector('.bAp .vh .pk-pill-timer')`);
  await click('#fire-undo');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===1`);
  await click('#fire-info');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===2`);

  // One bubble by default: two pills + the live "translation" toast make three
  // tiles, so the pile shows the newest one and folds the two others behind
  // "+2" — natives and pills share the same chronology.
  let state = await pile();
  assert.equal(state.tiles.length, 3, `three tiles: ${JSON.stringify(state.tiles)}`);
  assert.equal(state.shown.length, 1, 'one visible bubble');
  assert.equal(state.chip?.text, '+2', 'two tiles folded');

  // The chip unfolds every folded tile; folded undo rows stay the real nodes.
  await click('.pk-toast-more');
  await wait(`document.querySelector('.pk-toast-more') && document.querySelector('.pk-toast-more').textContent==='−'`);
  state = await pile();
  assert.equal(state.shown.length, 3, 'unfolded pile');
  gapsRespected([...state.shown, state.chip]);
  await evaluate(`window.__foldedUndo=document.querySelectorAll('[data-pk-toast-preserve] #link_undo')[0]`);
  await click(`[data-pk-toast-preserve] #link_undo`);
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

  // Simultaneous native toasts: one bubble stays, the two others fold behind
  // "+2". Unfolded, each gets a measured slot with an even 10 px gap, whatever
  // its real height (long messages wrap to 2 lines).
  await click('#fire-burst');
  await wait(`[...document.querySelectorAll('.bAp .vh')].filter(v => !v.hidden).length===3`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  state = await pile();
  assert.equal(state.tiles.filter(tile => tile.kind === 'native').length, 3, 'three native tiles');
  assert.equal(state.shown.length, 1, 'one visible bubble');
  assert.equal(state.chip?.text, '+2', 'folded natives counted by the chip');
  await click('.pk-toast-more');
  await wait(`[...document.querySelectorAll('.bAp .vh')].every(v => v.hidden || !v.hasAttribute('data-pk-toast-collapsed'))`);
  state = await pile();
  assert.equal(state.shown.filter(tile => tile.kind === 'native').length, 3, 'three native tiles unfolded');
  const heights = state.shown.map(tile => tile.height);
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 8, `measured heights differ (2-line message): ${heights.join('/')}`);
  gapsRespected([...state.shown, state.chip]);
  await click('#expire');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,300))`);

  // Pill stack: three rapid steals fold behind "+3" (three pills + the live
  // translation toast), the chip unfolds them, auto re-folds after 4 s, and
  // every tile keeps its measured slot.
  // Each toast must become visible before the next replaces it (as on Gmail:
  // a toast never rendered is never preserved).
  await evaluate(`chrome.storage.local.set({ toastSeconds: 8 })`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
  await click('#fire-undo');
  await wait(`document.querySelector('.bAp .vh #link_undo') && document.querySelector('.bAp .vh .pk-pill-timer')`);
  await click('#fire-undo');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===1`);
  await click('#fire-undo');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===2`);
  await click('#fire-info');
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===3`);
  await wait(`document.querySelector('.pk-toast-more')?.textContent==='+3'`);
  state = await pile();
  assert.equal(state.shown.length, 1, 'one visible bubble with three pills');
  assert.equal(state.tiles.filter(tile => tile.kind === 'pill').length, 3, 'three pills in the pile');
  await click('.pk-toast-more');
  await wait(`document.querySelector('.pk-toast-more')?.textContent==='−'`);
  state = await pile();
  assert.equal(state.shown.filter(tile => tile.kind === 'pill').length, 3, 'unfolded pills in the stack');
  gapsRespected([...state.shown, state.chip]);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,4300))`);
  await wait(`document.querySelector('.pk-toast-more')?.textContent==='+3'`);
  state = await pile();
  assert.equal(state.shown.length, 1, 'auto re-fold leaves one bubble');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,4500))`);
  await wait(`document.querySelectorAll('.bAp [data-pk-toast-preserve]').length===0 && !document.querySelector('.pk-toast-more')`);

  console.log('PASS: one bubble by default — real undo rows preserved, folded natives and pills counted by "+N", measured unfold, auto re-fold.');
} finally {
  socket?.close();
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true });
}
