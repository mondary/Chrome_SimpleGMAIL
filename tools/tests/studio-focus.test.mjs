// Browser regression suite for Studio Focus lecture: the chrome withdraws in
// thread view, the toolbar/pager/reply bar/FAB come back from the edges, keyboard
// focus reveals the search bar, list view is untouched, the toggle disables it.
// Run: node tools/tests/studio-focus.test.mjs (Chrome, or CHROME_BIN, required).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // Real key events, not a synthetic DOM event: Gmail's own handlers see them.
  const pressKey = async (key, modifiers = 0) => {
    const single = key.length === 1;
    const named = { Escape: 27, Tab: 9, Enter: 13 };
    const keyCode = single ? key.toUpperCase().charCodeAt(0) : (named[key] ?? 0);
    const event = {
      key,
      code: single ? `Key${key.toUpperCase()}` : key,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers,
    };
    // Tab moves the browser focus: the page itself must be focused first in
    // headless, or the default traversal has no target.
    await cdp('Page.bringToFront').catch(() => {});
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...event });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
    // Headless only: the browser's own Escape handling suspends the page
    // lifecycle, and a hidden page stops requestAnimationFrame. A real window
    // never does this, so restore the active state before asserting anything.
    await cdp('Page.bringToFront').catch(() => {});
    await cdp('Page.setWebLifecycleState', { state: 'active' });
  };
  const pressEscape = (modifiers = 0) => pressKey('Escape', modifiers);
  const style = (selector, prop) => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).${prop}`);
  const rect = selector => evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
  const captureDir = new URL('../previews/studio-focus-preview/captures/', import.meta.url);
  const capture = async name => {
    if (process.env.CAPTURE_FOCUS !== '1') return;
    await mkdir(fileURLToPath(captureDir), { recursive: true });
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(fileURLToPath(new URL(`${name}.png`, captureDir)), Buffer.from(data, 'base64'));
  };

  const fixture = new URL('../previews/studio-focus-preview/index.html', import.meta.url).href;
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelector('#open-thread') && document.querySelector('#pk-studio-tabs')`);
  // Run the REAL Modules widget too. Only its host guard is extended to this
  // local fixture; account/navigation messaging is stubbed, never authenticated.
  const moduleSource = await readFile(new URL('../../src/extension-pk/themes/studio/modules.js', import.meta.url), 'utf8');
  const moduleFixtureSource = moduleSource.replace("location.hostname === 'mail.google.com' ? 'mail' :",
    "(location.hostname === 'mail.google.com' || location.protocol === 'file:') ? 'mail' :");
  assert.notEqual(moduleSource, moduleFixtureSource, 'fixture explicitly adapts only the module host guard');
  const moduleCss = await readFile(new URL('../../src/extension-pk/themes/studio/modules.css', import.meta.url), 'utf8');
  await evaluate(`(()=>{
    const style=document.createElement('style');style.textContent=${JSON.stringify(moduleCss)};document.head.append(style);
    window.__moduleRequests=[];
    chrome.runtime={sendMessage:async message=>{__moduleRequests.push(message);return {ok:false}}};
  })()`);
  await evaluate(moduleFixtureSource);
  await wait(`document.querySelector('#gb #pk-studio-modules') && getComputedStyle(document.querySelector('#pk-studio-modules')).opacity === '1'`);
  await evaluate(`window.__initialModulesNav=document.querySelector('#pk-studio-modules')`);

  // List view: untouched.
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), false);
  // Escape is a reading exit only: the list keeps it for Gmail.
  await pressEscape();
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), false, 'list view: Escape changes nothing');
  assert.equal(await evaluate(`window.__backClicks || 0`), 0, 'list view: no back click');
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none');
  const listFabBackground = await style('#pk-new-message-fab', 'backgroundColor');
  const listFabShadow = await style('#pk-new-message-fab', 'boxShadow');

  // Thread view: the chrome withdraws, the containers are marked in place.
  await click('#open-thread');
  await wait(`document.documentElement.classList.contains('pk-focus')`);
  await wait(`document.querySelector('#toolbar').hasAttribute('data-pk-focus-tools')`);
  await wait(`document.querySelector('#pager-controls').hasAttribute('data-pk-focus-pager')`);
  await wait(`document.querySelector('#floatbar').hasAttribute('data-pk-focus-floatbar')`);
  await wait(`document.querySelector('#gb #pk-studio-modules')`);
  assert.equal(await evaluate(`document.querySelector('#pk-studio-modules') === __initialModulesNav`), true,
    'Focus leaves the original app switch in its usual header position');
  assert.equal(await evaluate(`document.querySelectorAll('body > #pk-studio-modules, [data-pk-focus-docked], [data-pk-focus-module-clearance]').length`), 0,
    'no permanent corner triptych, extra return control or subject clearance');
  assert.equal(await style('#pk-studio-modules', 'position'), 'relative', 'triptych is not a fixed reading overlay');
  assert.equal(await style('#subject', 'paddingLeft'), '0px', 'subject keeps its original horizontal alignment');
  assert.equal(await evaluate(`document.querySelector('#canvas').contains(document.querySelector('#pager'))`), false,
    'pager detection must not depend on Gmail placing the conversation row inside the list workspace');
  assert.equal(await style('#pager-controls', 'position'), 'fixed', 'pagination controls form a viewport overlay');
  for (const selector of ['#global-shell', '#pager-shell', '#pager', '#tools-shell']) {
    assert.equal(await style(selector, 'display'), 'contents', `${selector}: the reserved wrapper box is removed`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).getClientRects().length`), 0,
      `${selector}: no layout box remains even with an explicit native height`);
  }
  await evaluate(`document.querySelector('#pager').classList.remove('G-atb')`);
  await wait(`getComputedStyle(document.querySelector('#toolbar')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).visibility === 'hidden'`);
  assert.equal(await style('#pk-studio-tabs', 'display'), 'none', 'category strip hidden while reading');
  assert.equal(await style('#gb', 'position'), 'fixed', 'global bar out of flow');
  assert.equal(await style('#gb', 'opacity'), '0', 'global bar withdrawn');
  assert.equal(await style('#toolbar', 'position'), 'fixed', 'thread toolbar out of flow');
  assert.equal(await style('#toolbar', 'opacity'), '0', 'thread toolbar withdrawn');
  assert.equal(await style('#pager-controls', 'position'), 'fixed', 'message pager leaves its own row');
  assert.ok((await rect('#thread .pane')).top <= 1, 'pager row no longer reserves space above the sticky subject');
  assert.ok((await rect('.iY.a98.nH')).top <= 1, 'actions wrapper no longer reserves space above the sticky subject');
  assert.equal(await style('#pager-controls', 'opacity'), '0', 'message pager withdrawn with the toolbar');
  assert.equal(await style('#floatbar', 'position'), 'fixed', 'sticky reply bar leaves the flow');
  assert.equal(await style('#floatbar', 'bottom'), '12px', 'reply bar is anchored to the screen edge');
  assert.equal(await style('#floatbar', 'visibility'), 'hidden', 'reply bar withdrawn');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-tools]').length`), 1, 'toolbar marked once');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-pager]').length`), 1, 'message pager marked once');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-floatbar]').length`), 1, 'float bar marked once despite inline reply button');
  assert.equal(await evaluate(`document.querySelector('#toolbar').getAttribute('gh')`), 'mtb', 'real Gmail thread-toolbar hook is used');
  assert.equal(await evaluate(`document.querySelector('#pager .Dj').textContent.trim()`), '3 sur 49', 'Gmail message counter stays intact');
  await move(640, 420);
  const subjectHiddenRect = await rect('.iY.a98.nH');
  const messageHiddenRect = await rect('.message');
  const scrollerHiddenHeight = (await rect('.scroller')).height;
  await capture('01-focus');

  // Pointer at the top edge summons the whole top chrome: the search bar at
  // its official anchored spot, actions and pagination stacked beneath.
  await move(640, 8);
  await wait(`document.documentElement.classList.contains('pk-focus-top')`);
  await wait(`getComputedStyle(document.querySelector('#toolbar')).opacity === '1'`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1'`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '1'`);
  assert.equal(await style('#gb', 'transform'), 'none', 'search bar slides in with the hover band');
  assert.equal(await style('#gb', 'pointerEvents'), 'auto', 'search bar is interactive in the hover band');
  assert.equal(await evaluate(`document.documentElement.style.getPropertyValue('--pk-focus-gb-top').trim()`), '0px',
    'the band anchor was measured while the list was in natural flow');
  const gbRect = await rect('#gb');
  const toolbarRect = await rect('#toolbar');
  const pagerRect = await rect('#pager-controls');
  const backRect = await rect('#toolbar button');
  const railRect = await rect('#pk-no-left-menu-rail');
  const nextRect = await rect('#toolbar button:last-child');
  const paneRect = await rect('#thread .pane');
  const searchRect = await rect('#search');
  assert.equal(gbRect.top, 0, 'search bar sits at its measured official spot');
  assert.equal(toolbarRect.top, pagerRect.top, 'toolbar and pagination share the revealed second row');
  assert.equal(pagerRect.top, Math.round(gbRect.bottom), 'actions row stacks below the search bar');
  const bx = Math.round((backRect.left + backRect.right) / 2), by = Math.round((backRect.top + backRect.bottom) / 2);
  assert.equal(await evaluate(`(() => { const hit = document.elementFromPoint(${bx},${by}); return !!hit && (hit === document.querySelector('#thread-back') || document.querySelector('#thread-back').contains(hit)); })()`), true,
    'the back control is hit-testable in its revealed row');
  assert.ok(paneRect.top <= 1, 'the message pane starts at the top after the pager leaves the flow');
  assert.ok(backRect.left >= railRect.right + 8, 'back button starts to the right of the folder rail');
  assert.ok(nextRect.right < pagerRect.left, 'toolbar actions do not collide with the page counter');
  assert.ok(toolbarRect.bottom + 8 <= railRect.top, 'the left rail starts below the revealed top strip');
  assert.ok(pagerRect.right >= 1270, 'pager stays aligned to the right edge');
  assert.equal((await rect('.iY.a98.nH')).top, subjectHiddenRect.top, 'hover must not push the subject down');
  assert.equal((await rect('.message')).top, messageHiddenRect.top, 'hover must not push the message down');
  assert.equal((await rect('.scroller')).height, scrollerHiddenHeight, 'hover must not shorten the reading viewport');
  const sx = Math.round((searchRect.left + searchRect.right) / 2), sy = Math.round((searchRect.top + searchRect.bottom) / 2);
  assert.equal(await evaluate(`(() => { const hit = document.elementFromPoint(${sx},${sy}); return !!hit && document.querySelector('#search') === hit; })()`), true,
    'revealed search field is hit-testable inside the hover band');
  await capture('02-bord-haut');

  // Leaving the edge withdraws the whole band again after the delay.
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-top')`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);
  await wait(`getComputedStyle(document.querySelector('#gb')).transform !== 'none'`);
  await move(24, 72);
  await wait(`getComputedStyle(document.querySelector('#pk-no-left-menu-rail')).opacity === '1'`);
  await wait(`!document.documentElement.classList.contains('pk-focus-top')`);
  assert.ok((await rect('#pk-no-left-menu-rail')).top >= 56, 'left rail hover remains below the hidden global header');
  await capture('05-rail-gauche');
  await move(640, 420);

  // Pointer at the bottom edge summons the reply bar and the FAB.
  await move(640, 796);
  await wait(`document.documentElement.classList.contains('pk-focus-bottom')`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).visibility === 'visible'`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).opacity === '1' && getComputedStyle(document.querySelector('#pk-new-message-fab')).opacity === '1'`);
  assert.equal(await style('#floatbar', 'position'), 'fixed', 'reply bar remains out of flow while revealed');
  assert.equal(await style('#floatbar', 'bottom'), '12px', 'reply bar overlays the bottom edge, not a footer gap');
  assert.equal(await style('#pk-new-message-fab', 'visibility'), 'visible', 'compose FAB back at the bottom');
  assert.notEqual(await style('#pk-new-message-fab', 'display'), 'none', 'Focus overrides the source userscript list-only hiding');
  const fabRect = await rect('#pk-new-message-fab');
  const replyRect = await rect('#floatbar');
  assert.ok(Math.abs(fabRect.height - (await rect('#reply')).height) <= 1,
    'compose is sized like the native reply controls, not an oversized standalone FAB');
  assert.ok(Math.abs(fabRect.bottom - (await rect('#forward')).bottom) <= 1,
    'compose aligns with the native button baseline inside the reply padding');
  assert.equal(await style('#pk-new-message-fab', 'boxShadow'), 'none', 'compose has no detached floating shadow in Focus');
  assert.equal(await style('#pk-new-message-fab', 'borderTopStyle'), 'solid', 'compose uses a quiet outlined treatment');
  assert.ok(replyRect.right + 8 <= fabRect.left, 'reply background and full-width compose button have separate horizontal lanes');
  assert.ok(Number(await style('#pk-new-message-fab', 'zIndex')) > Number(await style('#floatbar', 'zIndex')),
    'compose button is above, not underneath, the reply background');
  for (const selector of ['#pk-new-message-fab', '#reply', '#reply-all', '#forward']) {
    const box = await rect(selector), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).contains(document.elementFromPoint(${x},${y}))`), true,
      `${selector}: bottom control is actually visible and hit-testable`);
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 384, height: 800, deviceScaleFactor: 1, mobile: false });
  await wait(`innerWidth === 384`);
  assert.ok((await rect('#floatbar')).right + 8 <= (await rect('#pk-new-message-fab')).left,
    'narrow viewport: reply/reply-all/forward wrap without covering the compose button');
  for (const selector of ['#pk-new-message-fab', '#reply', '#reply-all', '#forward']) {
    const box = await rect(selector), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
    assert.ok(box.left >= 0 && box.right <= 384 && box.top >= 0 && box.bottom <= 800,
      `${selector}: narrow viewport keeps every bottom control on screen`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).contains(document.elementFromPoint(${x},${y}))`), true,
      `${selector}: narrow viewport keeps every bottom control clickable`);
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await wait(`innerWidth === 1280`);
  await move(640, 796);
  await evaluate(`document.querySelector('#reply').focus(); document.querySelector('#reply').blur()`);
  await evaluate(`new Promise(resolve=>{let frame=0;const tick=()=>++frame<60?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick)})`);
  assert.equal(await style('#floatbar', 'opacity'), '1', 'reply focus changes must not cancel the independent bottom hover');
  assert.equal(await style('#pk-new-message-fab', 'opacity'), '1', 'compose stays revealed with the reply controls');
  await capture('03-bord-bas');
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-bottom')`);

  // An undo toast must never be covered by the revealed bottom bands: going
  // for « Annuler » means entering the 64 px bottom zone, which used to summon
  // Répondre/Nouveau message right over the toast (z 995/996 vs 990). The
  // bands now glide above the live toast stack and the toast paints first.
  const toastCenterCss = await readFile(new URL('../../src/extension-pk/tweaks/toast-center.css', import.meta.url), 'utf8');
  await evaluate(`(()=>{const s=document.createElement('style');s.id='probe-toast-style';s.textContent=${JSON.stringify(toastCenterCss)};document.head.append(s)})()`);
  const injectToast = () => evaluate(`(()=>{
    window.__undoClicks=0;
    const wrapper=document.createElement('div');wrapper.id='probe-toast';wrapper.className='b8 UC bAp';wrapper.setAttribute('role','alert');
    const vh=document.createElement('div');vh.className='vh';
    const msg=document.createElement('div');msg.className='bAq';msg.textContent='La conversation a été déplacée dans la corbeille.';
    const row=document.createElement('div');row.className='aT';
    const action=document.createElement('div');action.className='bAo';
    const link=document.createElement('a');link.id='link_undo';link.href='#';link.textContent='Annuler';
    link.addEventListener('click',event=>{event.preventDefault();window.__undoClicks++});
    action.append(link);row.append(action);vh.append(msg,row);wrapper.append(vh);document.body.append(wrapper);
  })()`);
  const toastCleared = `(()=>{const t=document.querySelector('#probe-toast .vh').getBoundingClientRect();
    const f=document.querySelector('#floatbar').getBoundingClientRect();
    const c=document.querySelector('#pk-new-message-fab').getBoundingClientRect();
    return f.bottom+8<=t.top+1&&c.bottom+8<=t.top+1})()`;
  await injectToast();
  await move(640, 796); // heading for Annuler: the exact gesture that used to cover it
  await wait(`document.documentElement.classList.contains('pk-focus-bottom')`);
  await wait(toastCleared);
  await capture('06-toast-annuler');
  assert.ok(parseFloat(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--pk-focus-toast-lift')`)) > 0,
    'the live toast raises the bottom bands above the stack');
  const toastBox = await rect('#probe-toast .vh');
  assert.ok(toastBox.top >= 24, 'toast stays anchored at its native bottom slot');
  assert.ok(Number(await style('#probe-toast .vh', 'zIndex')) > Number(await style('#pk-new-message-fab', 'zIndex'))
    && Number(await style('#probe-toast .vh', 'zIndex')) > Number(await style('#floatbar', 'zIndex')),
    'the toast layer paints above every Focus band, even on residual overlap');
  const undoBox = await rect('#link_undo');
  const undoX = Math.round((undoBox.left + undoBox.right) / 2), undoY = Math.round((undoBox.top + undoBox.bottom) / 2);
  assert.equal(await evaluate(`document.elementFromPoint(${undoX},${undoY})?.closest('#link_undo') !== null`), true,
    '« Annuler » is hit-testable while the reply bar and compose are revealed');
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: undoX, y: undoY, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: undoX, y: undoY, button: 'left', clickCount: 1 });
  assert.equal(await evaluate(`window.__undoClicks`), 1,
    'a real pointer click on « Annuler » lands on the undo link, not on the reply bar');
  await evaluate(`document.querySelector('#probe-toast').remove()`);
  await wait(`parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pk-focus-toast-lift')) === 0`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).bottom === '12px'`);
  assert.equal(await style('#floatbar', 'bottom'), '12px', 'bands return to the screen edge once the toast is gone');

  // Narrow viewport: the centered toast and the bands overlap for sure — the
  // clearance must hold and everything stays on screen and clickable.
  await cdp('Emulation.setDeviceMetricsOverride', { width: 384, height: 800, deviceScaleFactor: 1, mobile: false });
  await wait(`innerWidth === 384`);
  await injectToast();
  await move(192, 796);
  await wait(`document.documentElement.classList.contains('pk-focus-bottom')`);
  await wait(toastCleared);
  for (const selector of ['#probe-toast .vh', '#pk-new-message-fab', '#reply']) {
    const box = await rect(selector);
    assert.ok(box.left >= 0 && box.right <= 384 && box.top >= 0 && box.bottom <= 800,
      `narrow viewport: ${selector} stays fully on screen above the toast`);
  }
  const narrowUndo = await rect('#link_undo');
  const nx = Math.round((narrowUndo.left + narrowUndo.right) / 2), ny = Math.round((narrowUndo.top + narrowUndo.bottom) / 2);
  assert.equal(await evaluate(`document.elementFromPoint(${nx},${ny})?.closest('#link_undo') !== null`), true,
    'narrow viewport: « Annuler » remains clickable over the summoned bands');
  await evaluate(`document.querySelector('#probe-toast').remove()`);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await wait(`innerWidth === 1280`);
  await evaluate(`document.querySelector('#probe-toast-style').remove()`);
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-bottom')`);

  // Gmail's attachment preview (a native dialog) freezes the Focus bands:
  // nothing paints, nothing transitions behind the modal — no blinking.
  await evaluate(`(()=>{const d=document.createElement('div');d.id='probe-preview';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:900';document.body.append(d)})()`);
  await wait(`document.documentElement.classList.contains('pk-focus-modal')`);
  for (const selector of ['#floatbar', '#pk-new-message-fab']) {
    assert.equal(await style(selector, 'visibility'), 'hidden', `${selector}: hidden behind the preview`);
    assert.equal(await style(selector, 'opacity'), '0', `${selector}: nothing paints behind the preview`);
    assert.equal(await style(selector, 'transitionDuration'), '0s', `${selector}: no transition churn behind the preview`);
  }
  await move(640, 796);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,250))`);
  assert.equal(await style('#floatbar', 'visibility'), 'hidden', 'edge hover cannot paint the reply bar over the preview');
  await evaluate(`document.querySelector('#probe-preview').remove()`);
  await wait(`!document.documentElement.classList.contains('pk-focus-modal')`);
  assert.match(await style('#floatbar', 'transitionDuration'), /0\.18s/, 'closing the preview restores the native transitions');
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-bottom')`);

  // Keyboard focus inside the search reveals the global bar ("/" on Gmail).
  await evaluate(`document.querySelector('#search').focus()`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '1'`);
  await wait(`document.querySelector('#gb #pk-studio-modules')`);
  await evaluate(`document.querySelector('#search').blur()`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);
  assert.equal(await evaluate(`!!document.querySelector('#gb #pk-studio-modules')`), true,
    'closing search keeps the app switch in its original header rather than moving it to a corner');

  // J / K walk the conversations through the native pager arrows while
  // reading, exactly like the hover reveal; reading stays engaged.
  await pressKey('j');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'J clicks the native next/older arrow');
  assert.equal(await evaluate(`window.__newerClicks || 0`), 0, 'J left the other arrow alone');
  await pressKey('k');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__newerClicks || 0`), 1, 'K clicks the native previous/newer arrow');
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'K left the other arrow alone');
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'J/K keep the reading mode engaged');

  // Gmail moves focus by itself after its actions (the pager after J/K, the
  // label button when "l" opens its menu): that focus must never paint the
  // band over the subject. Only a deliberate Tab reveals it.
  await evaluate(`document.querySelector('#pager-controls button:last-child').focus()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,120))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus-top')`), false,
    'programmatic pager focus does not summon the band');
  assert.equal(await style('#toolbar', 'opacity'), '0', 'the subject keeps its row after J/K');
  await evaluate(`document.querySelector('#toolbar button[aria-label="Étiqueter"]').focus()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,120))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus-top')`), false,
    'label-menu focus does not summon the band');
  await evaluate(`document.activeElement.blur()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,120))`);
  // Headless quirk: element.focus() only dispatches focus events while the
  // window has focus, and evaluations alone do not grant it — a real key does.
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
  // The headless browser swallows a real Tab before the renderer: announce
  // the same keydown the extension reads, then land the focus inside #gb.
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))`);
  await evaluate(`document.querySelector('#search').focus()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  assert.equal(await evaluate(`document.documentElement.contains(document.activeElement) && document.activeElement === document.querySelector('#search')`), true,
    'the Tab-announced focus landed in the global bar');
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus-top')`), true,
    'a Tab-announced focus still reveals the band');
  await evaluate(`document.activeElement.blur()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,900))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus-top')`), false,
    'the band withdraws after the focus leaves');

  // Reading detection survives a Gmail rename of the sticky subject: the
  // thread toolbar hook over a real message body keeps the mode engaged.
  await evaluate(`document.querySelector('.iY.a98.nH').classList.remove('iY', 'a98', 'nH')`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true,
    'reading detection survives a subject-header rename');
  await evaluate(`document.querySelector('#subject').parentElement.classList.add('iY', 'a98', 'nH')`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'subject header restored');

  // Escape returns to the list through the real toolbar control, but only when
  // Gmail has nothing of its own to close. The hash fallback must stay unused.
  await evaluate(`(()=>{const i=document.createElement('input');i.id='probe-input';document.body.append(i);i.focus()})()`);
  await pressEscape();
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'text field keeps Escape');
  await pressKey('j');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'text field keeps J for typing');
  await evaluate(`document.querySelector('#probe-input').remove()`);

  await evaluate(`(()=>{const d=document.createElement('div');d.id='probe-dialog';d.setAttribute('role','dialog');d.style.cssText='position:fixed;inset:0;background:#fff;z-index:100';document.body.append(d)})()`);
  await pressEscape();
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'dialog keeps Escape');
  await pressKey('j');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'open dialog keeps J');
  await evaluate(`document.querySelector('#probe-dialog').remove()`);

  await evaluate(`(()=>{const d=document.createElement('div');d.id='probe-compose';d.className='M9';d.style.cssText='position:fixed;right:0;bottom:0;width:240px;height:120px;background:#fff;z-index:100';document.body.append(d)})()`);
  await pressEscape();
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'compose keeps Escape');
  await pressKey('j');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'compose keeps J');
  await evaluate(`document.querySelector('#probe-compose').remove()`);

  await pressEscape(8); // Shift+Escape stays with the browser
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), true, 'modified Escape is ignored');
  await pressKey('j', 8); // Shift+J stays with Gmail too
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'modified J is ignored');

  await pressEscape();
  await wait(`!document.documentElement.classList.contains('pk-focus')`);
  assert.equal(await evaluate(`window.__backClicks || 0`), 1, 'Escape clicked the native back control, not a hash');
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none', 'category strip back');
  assert.equal(await evaluate(`document.querySelectorAll('[data-pk-focus-tools],[data-pk-focus-pager],[data-pk-focus-floatbar],[data-pk-focus-shell]').length`), 0, 'marks cleaned');
  assert.equal(await style('#global-shell', 'display'), 'block', 'list view restores the global header wrapper');
  await wait(`document.querySelector('#gb #pk-studio-modules')`);
  assert.equal(await evaluate(`document.querySelectorAll('#pk-studio-modules').length`), 1, 'list view restores exactly one app switch');
  assert.equal(await style('#pk-new-message-fab', 'backgroundColor'), listFabBackground, 'list view keeps its original compose colour');
  assert.equal(await style('#pk-new-message-fab', 'boxShadow'), listFabShadow, 'list view keeps its original compose shadow');
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus-pager')`), false, 'pager state cleaned');
  assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--pk-focus-rail-end').trim()`), '', 'rail offset cleaned');
  await pressKey('j');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
  assert.equal(await evaluate(`window.__olderClicks || 0`), 1, 'list view leaves J to Gmail');
  await capture('04-liste');

  // The setting switches the whole mode off.
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': false } })`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  await click('#open-thread');
  await evaluate(`new Promise(resolve=>setTimeout(resolve,300))`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('pk-focus')`), false, 'disabled: no focus mode');
  assert.notEqual(await style('#pk-studio-tabs', 'display'), 'none', 'disabled: strip stays');
  assert.equal(await style('#gb', 'position'), 'static', 'disabled: bar stays in flow');
  assert.equal((await rect('#pager-shell')).height, 58, 'disabled: Gmail pager reservation restored');
  assert.equal((await rect('#tools-shell')).height, 62, 'disabled: Gmail action reservation restored');
  const subjectWithChrome = await rect('.iY.a98.nH');
  const paneWithChrome = await rect('#thread .pane');
  const reservedBar = await evaluate(`document.querySelector('#floatbar').offsetHeight`);
  const scrollerWithFooter = await evaluate(`document.querySelector('.scroller').clientHeight`);
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': true } })`);
  await wait(`document.documentElement.classList.contains('pk-focus')`);
  await wait(`getComputedStyle(document.querySelector('#floatbar')).position === 'fixed'`);
  await wait(`getComputedStyle(document.querySelector('#tools-shell')).display === 'contents'`);
  const scrollerWithoutFooter = await evaluate(`document.querySelector('.scroller').clientHeight`);
  assert.ok(scrollerWithoutFooter >= scrollerWithFooter + reservedBar - 2,
    `removing the sticky bar's flow reservation recovers its height (${scrollerWithFooter} → ${scrollerWithoutFooter}, bar ${reservedBar})`);
  assert.ok(subjectWithChrome.top - (await rect('.iY.a98.nH')).top >= 180,
    'global header, pagination and action reservations are all recovered above the subject');
  assert.ok(paneWithChrome.top - (await rect('#thread .pane')).top >= 120,
    'global header and pagination wrappers no longer reserve any vertical lane');

  // Gmail may mount the actions and pagination inside the SAME toolbar row.
  // The two overlay groups must not become nested fixed/transformed bars.
  await evaluate(`(()=>{
    const row=document.querySelector('#pager'), toolbar=document.querySelector('#toolbar');
    row.classList.add('G-atb'); row.prepend(toolbar);
    document.querySelector('#tools-shell').remove();
  })()`);
  await wait(`getComputedStyle(document.querySelector('#pager')).display === 'contents'`);
  assert.equal(await style('#toolbar', 'position'), 'fixed', 'shared row: actions remain a viewport overlay');
  assert.equal(await style('#pager-controls', 'position'), 'fixed', 'shared row: pagination remains a sibling overlay');
  assert.ok((await rect('.iY.a98.nH')).top <= 1, 'shared row: no reserved space above the subject');
  await move(640, 8);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1' && getComputedStyle(document.querySelector('#toolbar')).opacity === '1'`);
  assert.equal((await rect('#toolbar')).top, Math.round((await rect('#gb')).bottom), 'shared row: actions return below the search bar');
  assert.equal((await rect('#pager-controls')).top, Math.round((await rect('#gb')).bottom), 'shared row: pagination returns at the same edge');
  assert.equal((await rect('.iY.a98.nH')).top, subjectHiddenRect.top, 'shared row: hover still never shifts reading');
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-top')`);

  // Collapsing chrome-only wrappers must never hide another piece of UI.
  await evaluate(`(()=>{
    const notice=document.createElement('p');notice.id='native-notice';notice.textContent='Information Gmail';
    document.querySelector('#pager-shell').append(notice);
  })()`);
  await wait(`!document.querySelector('#pager-shell').hasAttribute('data-pk-focus-shell')`);
  assert.ok((await rect('#native-notice')).height > 0, 'a wrapper containing other native content is not collapsed');
  await evaluate(`document.querySelector('#native-notice').remove()`);
  await wait(`getComputedStyle(document.querySelector('#pager-shell')).display === 'contents'`);
  assert.ok((await rect('.iY.a98.nH')).top <= 1, 'chrome-only wrapper collapses again after other content leaves');

  // Use the selectors reported from the user's Gmail inspector, WITHOUT the
  // old .iY subject hook or the guessed .Dj/.aqJ pager hooks.
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': false } })`);
  await wait(`!document.documentElement.classList.contains('pk-focus')`);
  await evaluate(`(()=>{
    const row=document.querySelector('#pager'), toolbar=document.querySelector('#toolbar');
    const tools=document.createElement('div');tools.id='tools-shell';tools.append(toolbar);
    document.querySelector('.scroller').prepend(tools);
    row.className='G-atb D E';
    document.querySelector('#pager .Dj').className='native-counter';
    document.querySelector('#pager .aqJ').className='native-navigation';
    document.querySelector('.iY.a98.nH').className='V8djrc byY';
  })()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#pager'),'::before').content`), '""',
    'native variant: fixture actually creates the reported pseudo-element');
  const nativeSubjectBefore = await rect('.V8djrc.byY');
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': true } })`);
  await wait(`document.documentElement.classList.contains('pk-focus')`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '0'`);
  assert.equal(await style('#pager-controls', 'position'), 'fixed', 'native variant: actual pagination group becomes an overlay');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#pager'),'::before').content`), 'none',
    'native variant: generated toolbar spacer is removed');
  assert.equal(await style('.V8djrc.byY', 'top'), '0px', 'native variant: sticky header no longer reserves the toolbar offset');
  assert.equal(await style('.V8djrc.byY', 'marginTop'), '0px', 'native variant: sticky header top margin removed');
  assert.ok((await rect('.V8djrc.byY')).top <= 1, 'native variant: subject reaches the top of the reading pane');
  assert.ok(nativeSubjectBefore.top - (await rect('.V8djrc.byY')).top >= 120,
    'native variant: the previously reserved band is actually recovered');
  const nativeMessageTop = (await rect('.message')).top;
  await move(640, 8);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1'`);
  assert.equal((await rect('#pager-controls')).top, Math.round((await rect('#gb')).bottom),
    'native variant: pagination returns below the search bar, like the actions');
  assert.equal((await rect('.message')).top, nativeMessageTop, 'native variant: hover never pushes the message');
  await move(640, 420);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '0'`);
  await evaluate(`document.querySelector('#pager').classList.replace('E','F')`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).position === 'fixed'`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#pager'),'::before').content`), 'none',
    'native variant: .G-atb.D.F receives the same spacer reset');
  await evaluate(`(()=>{
    document.querySelector('#pager').prepend(document.querySelector('#toolbar'));
    document.querySelector('#tools-shell').remove();
  })()`);
  await wait(`document.querySelector('#pager').hasAttribute('data-pk-focus-tools') && document.querySelector('#pager-controls').hasAttribute('data-pk-focus-pager') && !document.querySelector('#toolbar').hasAttribute('data-pk-focus-tools')`);
  await wait(`document.querySelector('#pager').getBoundingClientRect().height === document.querySelector('#pager-controls').getBoundingClientRect().height`);
  assert.equal(await style('#pager', 'backgroundColor'), await style('#pager-controls', 'backgroundColor'),
    'native shared row: actions and pagination use the same opaque strip background');
  await move(640, 8);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1' && document.querySelector('#pager-controls').getBoundingClientRect().top === document.querySelector('#gb').getBoundingClientRect().bottom`);
  assert.equal((await rect('#pager-controls')).top, Math.round((await rect('#gb')).bottom),
    'native shared row: all controls return below the revealed search bar');
  assert.equal((await rect('.message')).top, nativeMessageTop, 'native shared row: revealing all controls never moves the message');
  const nestedToolbar = await rect('#pager');
  assert.equal(nestedToolbar.bottom, (await rect('#pager-controls')).bottom,
    'native shared row: actions and pagination have the same strip height');

  // E and F can coexist. Cover both sibling rows and a pager row nested in the
  // actions wrapper; checking the outer bar's opacity alone is not sufficient.
  await evaluate(`(()=>{
    const actions=document.createElement('div');actions.id='native-actions';actions.className='G-atb D E';
    document.querySelector('#pager').before(actions);
    actions.append(document.querySelector('#toolbar'));
    window.__nativeNext=document.querySelector('#pager-controls button:last-child');
    window.__nativeNextClicks=0;
    __nativeNext.addEventListener('click',()=>{__nativeNextClicks++});
  })()`);
  await wait(`document.querySelector('#native-actions').hasAttribute('data-pk-focus-tools') && document.querySelector('#pager-controls').hasAttribute('data-pk-focus-pager')`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1' && getComputedStyle(document.querySelector('#native-actions')).opacity === '1' && document.querySelector('#pager-controls').getBoundingClientRect().top === document.querySelector('#gb').getBoundingClientRect().bottom`);
  assert.equal((await rect('#pager-controls')).top, Math.round((await rect('#gb')).bottom),
    'native E + F: pager is revealed alongside actions, not ignored');
  assert.equal((await rect('.message')).top, nativeMessageTop, 'native E + F: neither row reserves reading space');
  const stability = await evaluate(`new Promise(resolve=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const tools=document.querySelector('[data-pk-focus-tools]'), pager=document.querySelector('#pager-controls');
      let writes=0, blink=false, frame=0;
      const observer=new MutationObserver(records=>{writes+=records.length});
      observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:[
        'data-pk-focus-tools','data-pk-focus-pager','data-pk-focus-shell','data-pk-focus-floatbar'
      ]});
      const step=()=>{
        document.querySelector('#subject').classList.toggle('gmail-repaint');
        blink ||= !tools.hasAttribute('data-pk-focus-tools') || !pager.hasAttribute('data-pk-focus-pager')
          || getComputedStyle(tools).opacity !== '1' || getComputedStyle(pager).opacity !== '1';
        if(++frame<45)requestAnimationFrame(step);
        else requestAnimationFrame(()=>{observer.disconnect();resolve({writes,blink})});
      };
      step();
    }));
  })`);
  assert.equal(stability.writes, 0, 'unrelated Gmail mutations must not demote/re-promote or rewrite chrome markers');
  assert.equal(stability.blink, false, 'top controls stay revealed during repeated Gmail mutation scans');
  await evaluate(`__nativeNext.focus(); __nativeNext.blur()`);
  await evaluate(`new Promise(resolve=>{let frame=0;const tick=()=>++frame<60?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick)})`);
  assert.equal(await style('#pager-controls', 'opacity'), '1',
    'Gmail focus/blur must not cancel the pointer hover and hide the navigation after the delay');
  assert.equal(await style('[data-pk-focus-tools]', 'opacity'), '1',
    'Gmail focus/blur must not hide the actions while the pointer remains in the top zone');
  assert.equal((await rect('[data-pk-focus-tools]')).right, (await rect('#pager-controls')).left,
    'actions and navigation meet without a gap or two overlapping backgrounds');
  const idleMutations = await evaluate(`new Promise(resolve=>{
    let writes=0, frame=0;
    const observer=new MutationObserver(records=>{writes+=records.length});
    observer.observe(document.documentElement,{subtree:true,attributes:true,childList:true,characterData:true});
    const step=()=>{if(++frame<20)requestAnimationFrame(step);else{observer.disconnect();resolve(writes)}};
    requestAnimationFrame(step);
  })`);
  assert.equal(idleMutations, 0, 'revealed chrome must settle: no self-triggered DOM/style/class mutation loop');
  await evaluate(`document.querySelector('#pager .native-counter').firstChild.data='142 sur 9999'`);
  await wait(`parseFloat(document.documentElement.style.getPropertyValue('--pk-focus-pager-reserve')) === document.querySelector('#pager-controls').getBoundingClientRect().width`);
  assert.equal((await rect('[data-pk-focus-tools]')).right, (await rect('#pager-controls')).left,
    'counter text updates resize the navigation lane without overlap or marker changes');
  const clickNativeNext = async () => {
    const button = await rect('#pager-controls button:last-child');
    const x = (button.left + button.right) / 2, y = (button.top + button.bottom) / 2;
    assert.ok(x > 0 && x < 1280 && y > 0 && y < 800, 'revealed Next control is inside the viewport');
    assert.equal(await evaluate(`__nativeNext.contains(document.elementFromPoint(${x},${y}))`), true,
      'revealed Next is hit-testable, not clipped/covered by the action bar');
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  await clickNativeNext();
  assert.equal(await evaluate(`__nativeNextClicks`), 1, 'native E + F: real Next control receives pointer clicks');

  await evaluate(`document.querySelector('#native-actions').append(document.querySelector('#pager'))`);
  await wait(`document.querySelector('#native-actions').hasAttribute('data-pk-focus-tools') && document.querySelector('#pager-controls').hasAttribute('data-pk-focus-pager') && getComputedStyle(document.querySelector('#pager')).display === 'contents'`);
  assert.equal((await rect('#pager-controls')).top, Math.round((await rect('#gb')).bottom),
    'nested E + F: pager remains anchored to the viewport, not a transformed action bar');
  await clickNativeNext();
  assert.equal(await evaluate(`__nativeNextClicks`), 2, 'nested E + F: original Next control still works');
  assert.equal(await evaluate(`__nativeNext === document.querySelector('#pager-controls button:last-child')`), true,
    'the native pager was not replaced by a clone');
  await evaluate(`__nativeNext.blur()`);
  await move(640, 420);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '0'`);
  // Keyboard access is a deliberate Tab: announce it, then land the focus.
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))`);
  await evaluate(`__nativeNext.focus()`);
  await wait(`getComputedStyle(document.querySelector('#pager-controls')).opacity === '1'`);
  assert.equal(await evaluate(`document.activeElement === __nativeNext`), true,
    'a Tab-announced keyboard focus reveals the real pagination');
  await evaluate(`__nativeNext.blur()`);

  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': false } })`);
  await wait(`!document.documentElement.classList.contains('pk-focus')`);
  assert.equal(await style('.V8djrc.byY', 'top'), '64px', 'native variant: Gmail sticky offset restored when disabled');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#pager'),'::before').content`), '""',
    'native variant: Gmail pseudo-element restored when disabled');

  // Modules retain their normal header behaviour, but are no longer surfaced
  // as a fixed overlay during reading. Search can still reveal that header.
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': true } })`);
  await wait(`document.documentElement.classList.contains('pk-focus') && document.querySelector('#gb #pk-studio-modules')`);
  await move(640, 420);
  await wait(`!document.documentElement.classList.contains('pk-focus-top')`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '0'`);
  assert.equal(await style('#gb', 'opacity'), '0', 'reading does not reveal a permanent app switch or header');
  assert.equal(await evaluate(`document.querySelectorAll('body > #pk-studio-modules, [data-pk-focus-docked], [data-pk-focus-module-clearance]').length`), 0,
    'permanent triptych positioning remains removed after re-entering Focus');
  await evaluate(`document.querySelector('#search').focus()`);
  await wait(`getComputedStyle(document.querySelector('#gb')).opacity === '1'`);
  for (const app of ['mail', 'calendar', 'drive']) {
    const selector = `#pk-studio-modules [data-module="${app}"]`;
    const button = await rect(selector), x = (button.left + button.right) / 2, y = (button.top + button.bottom) / 2;
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).contains(document.elementFromPoint(${x},${y}))`), true,
      `${app}: ordinary header switch works when search reveals the header`);
    assert.notEqual(await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-label')`), null,
      `${app}: icon-only control keeps its accessible name`);
  }
  await click('#pk-studio-modules [data-module="calendar"]');
  // The module's own periodic refresh can interleave: match the destination,
  // not the last request in the log.
  await wait(`__moduleRequests.some(m=>m?.destination==='calendar') && !document.querySelector('#pk-studio-modules').hasAttribute('aria-busy')`);
  assert.equal(await evaluate(`__moduleRequests.filter(m=>m?.destination==='calendar').at(-1).account`), 'demo@example.com', 'ordinary header switch retains the active account');
  await evaluate(`document.querySelector('#pk-studio-modules [role=status]').textContent=''`);
  await click('#pk-studio-modules [data-module="drive"]');
  await wait(`__moduleRequests.some(m=>m?.destination==='drive') && !document.querySelector('#pk-studio-modules').hasAttribute('aria-busy')`);
  await evaluate(`document.querySelector('#pk-studio-modules [role=status]').textContent=''`);
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': true, 'js-studio-modules': false } })`);
  await wait(`!document.querySelector('#pk-studio-modules') && !document.querySelector('[data-pk-focus-module-clearance]')`);
  assert.ok((await rect('.V8djrc.byY')).top <= 1, 'disabling Modules does not restore a reserved top row');
  await evaluate(`chrome.storage.local.set({ enabled: { 'js-studio-focus-read': true, 'js-studio-modules': true } })`);
  await wait(`document.querySelector('#gb #pk-studio-modules')`);
  await evaluate(`(()=>{
    window.__restoredModulesNav=document.querySelector('#pk-studio-modules');
    addEventListener('hashchange',()=>{if(location.hash==='#inbox')document.querySelector('#back-list').click()});
  })()`);
  const inboxButton = await rect('#pk-studio-modules [data-module="mail"]');
  const inboxX = (inboxButton.left + inboxButton.right) / 2, inboxY = (inboxButton.top + inboxButton.bottom) / 2;
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: inboxX, y: inboxY, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: inboxX, y: inboxY, button: 'left', clickCount: 1 });
  await wait(`location.hash === '#inbox' && !document.documentElement.classList.contains('pk-focus') && document.querySelector('#gb #pk-studio-modules')`);
  assert.equal(await evaluate(`document.querySelector('#pk-studio-modules') === __restoredModulesNav`), true,
    'normal header envelope still returns to inbox without any fixed corner overlay');

  console.log('PASS: focus lecture — permanent triptych removed, original header/subject alignment preserved, stable hover navigation, zero idle mutations, no bottom overlap at 1280/384 px.');
} finally {
  socket?.close();
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await rm(profile, { recursive: true, force: true });
}
