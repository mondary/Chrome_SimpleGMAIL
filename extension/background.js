// PK Gmail Scripts Lab — service worker
// Synchronise les enregistrements chrome.scripting avec l'état stocké,
// puis recharge les onglets Gmail pour appliquer proprement.

importScripts('data/manifest.js');

const MATCH = ['https://mail.google.com/*'];
const LAB_IDS = self.LAB_ITEMS.map((i) => i.id);

function registrationFor(item) {
  const base = {
    id: item.id,
    matches: MATCH,
    persistAcrossSessions: false,
  };
  if (item.type === 'css') {
    return { ...base, css: [item.file] };
  }
  return {
    ...base,
    js: [item.file],
    world: item.world || 'MAIN',
    runAt: item.runAt || 'document_end',
  };
}

async function syncRegistrations() {
  const { enabled = {} } = await chrome.storage.local.get('enabled');
  const wanted = self.LAB_ITEMS
    .filter((i) => enabled[i.id] !== false)
    .map(registrationFor);

  const current = await chrome.scripting.getRegisteredContentScripts();
  const currentLab = current.filter((c) => LAB_IDS.includes(c.id));
  const currentIds = new Set(currentLab.map((c) => c.id));
  const wantedIds = new Set(wanted.map((w) => w.id));

  // Désenregistre : les lab actifs devenus indésirables + tous ceux qui changent
  // (simple et sûr : on ré-enregistre les wanted à l'identique sinon)
  const stale = currentLab
    .filter((c) => !wantedIds.has(c.id))
    .map((c) => c.id);
  if (stale.length) {
    await chrome.scripting.unregisterContentScripts({ ids: stale });
  }

  const currentAfter = await chrome.scripting.getRegisteredContentScripts();
  const stillThere = new Set(
    currentAfter.filter((c) => LAB_IDS.includes(c.id)).map((c) => c.id)
  );
  const toAdd = wanted.filter((w) => !stillThere.has(w.id));
  if (toAdd.length) {
    try {
      await chrome.scripting.registerContentScripts(toAdd);
    } catch (e) {
      console.error('[lab] register échoué', e);
    }
  }
  return { wanted: wanted.length, total: self.LAB_ITEMS.length };
}

async function reloadGmailTabs() {
  const tabs = await chrome.tabs.query({ url: MATCH });
  for (const tab of tabs) {
    chrome.tabs.reload(tab.id).catch(() => {});
  }
  return tabs.length;
}

// Variable CSS dynamique : marges du tweak Margin en % (réglées depuis le popup)
async function applyMarginVar(tabId) {
  const { enabled = {}, marginPct = 5 } = await chrome.storage.local.get(['enabled', 'marginPct']);
  if (enabled['css-margin'] === false) return;
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: `:root { --pk-margin-side: ${marginPct}% !important; }`,
    });
  } catch (e) { /* onglet parti entre-temps */ }
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab && tab.url && tab.url.startsWith('https://mail.google.com/')) {
    applyMarginVar(tabId);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled = {} } = await chrome.storage.local.get('enabled');
  if (Object.keys(enabled).length === 0) {
    // Premier install : tout actif
    const all = {};
    for (const item of self.LAB_ITEMS) all[item.id] = true;
    await chrome.storage.local.set({ enabled: all });
  }
  await syncRegistrations();
});

chrome.runtime.onStartup.addListener(() => {
  syncRegistrations();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg && msg.type === 'sync') {
      const res = await syncRegistrations();
      const reloaded = await reloadGmailTabs();
      const tabs = await chrome.tabs.query({ url: MATCH });
      await Promise.allSettled(tabs.map((t) => applyMarginVar(t.id)));
      sendResponse({ ok: true, ...res, reloaded });
    } else {
      sendResponse({ ok: false });
    }
  })();
  return true; // réponse async
});
