// Regenerates the Studio toast captures from the real tweak, headless only.
// Run: node tools/previews/studio-toast-preview/capture.mjs
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'pk-toast-shot-'));
const chrome = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
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
  const sleep = ms => evaluate(`new Promise(r=>setTimeout(r,${ms}))`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const shot = async name => {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL(`captures/${name}`, import.meta.url), Buffer.from(data, 'base64'));
    console.log('  ✓', name);
  };

  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: new URL('index.html', import.meta.url).href });
  await sleep(600);

  // Burst: the newest tile stays, the two older ones fold behind "+2".
  await click('#fire-burst');
  await sleep(120);
  await shot('toast-burst.png');

  // Pills + native, folded: one bubble, everything else behind "+3".
  await click('#expire');
  await sleep(250);
  await evaluate(`chrome.storage.local.set({ toastSeconds: 8 })`);
  await sleep(120);
  for (const id of ['#fire-undo', '#fire-undo', '#fire-undo', '#fire-info']) {
    await click(id);
    await sleep(260);
  }
  await sleep(300);
  await shot('toast-folded.png');

  // Unfolded by the chip: the whole measured pile, chip becomes "−".
  await click('.pk-toast-more');
  await sleep(400);
  await shot('toast-unfolded.png');

  console.log('PASS: captures regenerated.');
} finally {
  socket?.close();
  chrome.kill();
  await new Promise(resolve => setTimeout(resolve, 400));
  await rm(profile, { recursive: true, force: true });
}
