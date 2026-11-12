// Real MutationObserver/RAF behavior on fictional Gmail; no account, network or screenshot.
// PERF_REPORT_ONLY=1 prints baseline measurements without enforcing idle assertions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { headless } from './helpers/headless.mjs';

const browser = await headless();
const { cdp, evaluate, wait } = browser;
const root = process.env.PERF_ROOT ? pathToFileURL(`${process.env.PERF_ROOT}/`) : new URL('../../', import.meta.url);
const fixture = new URL('tools/previews/studio-tabs-preview/index.html', root).href;
const reports = [];
async function sample(name) {
  const before = Object.fromEntries((await cdp('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const mutations = await evaluate(`new Promise(resolve=>{
    let records=0;const observer=new MutationObserver(batch=>records+=batch.length);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    setTimeout(()=>{observer.disconnect();resolve(records)},1200);
  })`);
  const after = Object.fromEntries((await cdp('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const report = { name, mutations, layouts: after.LayoutCount - before.LayoutCount,
    taskMs: Math.round((after.TaskDuration - before.TaskDuration) * 1000),
    heapMiB: Math.round(after.JSHeapUsedSize / 1048576 * 10) / 10 };
  reports.push(report);
  console.log(JSON.stringify(report));
  return report;
}
try {
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelectorAll('#pk-studio-tabs button').length===7`);
  await evaluate(`emptyView=true;location.hash='#search/in:inbox category:purchases'`);
  await wait(`document.querySelector('.pk-studio-search-zero')`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,1600))`);
  await sample('empty-search-idle');

  // Native empty tabs include cached hidden notices; both must settle.
  await evaluate(`emptyView=false;location.hash='#inbox'`);
  await wait(`document.body.dataset.view==='#inbox'`);
  await evaluate(`document.querySelectorAll('#view > .zA').forEach(n=>n.remove());
    const pane=document.createElement('section');pane.setAttribute('role','tabpanel');pane.setAttribute('aria-label','Principale');
    pane.innerHTML='<div class="aRu"><div class="aRv">Votre onglet Principale est vide</div><button class="aRq" tabindex="0">Configurer</button></div>';
    document.querySelector('#view').append(pane);
    const hidden=pane.cloneNode(true);hidden.style.display='none';document.querySelector('#view').append(hidden);`);
  await wait(`document.querySelector('.pk-studio-zero')`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,1600))`);
  await sample('native-empty-and-hidden-idle');

  // Fresh page: highlighter isolated from the empty-state scenario.
  await cdp('Page.navigate', { url: fixture });
  await wait(`document.querySelectorAll('#pk-studio-tabs button').length===7`);
  await evaluate(`localStorage.setItem('pkh:enabled-domains',JSON.stringify([location.hostname]));
    localStorage.setItem('pkh:keyword-highlighter:'+location.hostname,JSON.stringify({highlight:['Atelier'],exclude:[],style:'offset'}));`);
  await evaluate(readFileSync(new URL('src/extension-pk/scripts/pk-gmail-keyword-highlighter.user.js', root), 'utf8'));
  await wait(`document.querySelector('.pkh-token')`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,350))`);
  await sample('highlighter-idle');
  if (!process.env.PERF_REPORT_ONLY) {
    for (const report of reports) {
      assert.equal(report.mutations, 0, `${report.name}: no DOM writes at rest`);
      assert.equal(report.layouts, 0, `${report.name}: no layout loop at rest`);
    }
    // New Gmail content must still get highlighted after the idle period.
    await evaluate(`const row=document.createElement('div');row.id='new-mail';row.textContent='Atelier nouveau message';document.querySelector('#view').append(row)`);
    await wait(`document.querySelector('#new-mail .pkh-token')`);
    await evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));
      const backgroundRow=document.createElement('div');backgroundRow.id='background-mail';backgroundRow.textContent='Atelier en arrière-plan';document.querySelector('#view').append(backgroundRow)`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
    assert.equal(await evaluate(`!!document.querySelector('#background-mail .pkh-token')`), false, 'hidden documents do not rescan text');
    await evaluate(`delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))`);
    await wait(`document.querySelector('#background-mail .pkh-token')`);
    await evaluate(`const bulk=document.createElement('section');bulk.id='bulk-mails';document.querySelector('#view').append(bulk);
      window.replaceBulk=()=>{const fragment=document.createDocumentFragment();for(let i=0;i<200;i++){
        const row=document.createElement('div');row.className='zA';row.textContent='Atelier message fictif '+i;fragment.append(row)}bulk.replaceChildren(fragment)};replaceBulk()`);
    await wait(`document.querySelectorAll('#bulk-mails .pkh-token').length===200`);
    await cdp('HeapProfiler.collectGarbage');
    const nodesBefore = (await cdp('Memory.getDOMCounters')).nodes;
    for (let cycle = 0; cycle < 8; cycle++) {
      await evaluate(`replaceBulk()`);
      await wait(`document.querySelectorAll('#bulk-mails .pkh-token').length===200`);
    }
    await cdp('HeapProfiler.collectGarbage');
    const nodesAfter = (await cdp('Memory.getDOMCounters')).nodes;
    assert.ok(nodesAfter <= nodesBefore + 50, `DOM must not accumulate old mail rows: ${nodesBefore} -> ${nodesAfter}`);
    console.log(JSON.stringify({ name: 'eight-200-row-replacements-after-gc', nodesBefore, nodesAfter }));
    await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
    const bulkIdle = await sample('200-highlighted-mails-idle');
    assert.equal(bulkIdle.mutations, 0);
    assert.equal(bulkIdle.layouts, 0);
    console.log('PASS: empty notices and highlighter settle, new content still updates.');
  }
} finally { await browser.close(); }
