// PK Gmail Scripts Lab — service worker
// Synchronise les enregistrements chrome.scripting avec l'état stocké,
// puis recharge les onglets Gmail pour appliquer proprement.

importScripts('data/manifest.js', 'data/themes.js', 'themes/studio/module-routing.js');

// Le bouton de barre d'outils ouvre le panneau latéral (drawer).
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const MATCH = ['https://mail.google.com/*'];
const APP_TABS = ['https://mail.google.com/*', 'https://calendar.google.com/*', 'https://drive.google.com/*'];
const LAB_IDS = self.LAB_ITEMS.map((i) => i.id);
const THEME_IDS = self.LAB_THEMES.map((t) => t.id);
const ALL_IDS = [...LAB_IDS, ...THEME_IDS];

function registrationFor(item) {
  const base = {
    id: item.id,
    matches: item.matches || MATCH,
    persistAcrossSessions: false,
  };
  if (item.type === 'css') {
    return { ...base, css: [item.file] };
  }
  return {
    ...base,
    js: [item.file],
    ...(item.css ? { css: item.css } : {}),
    world: item.world || 'MAIN',
    runAt: item.runAt || 'document_end',
  };
}

// Thème actif (radio du popup) : un seul enregistré à la fois.
function themeRegistration(themeId) {
  const theme = self.LAB_THEMES.find((t) => t.id === themeId);
  if (!theme || !theme.css) return null;
  const script = {
    id: theme.id,
    matches: MATCH,
    persistAcrossSessions: false,
    css: [theme.css],
    runAt: 'document_start',
  };
  if (theme.js) script.js = theme.js;
  return script;
}

async function syncRegistrations() {
  const { enabled = {}, theme = '' } = await chrome.storage.local.get(['enabled', 'theme']);
  const wanted = self.LAB_ITEMS
    .filter((i) => enabled[i.id] !== false)
    .map(registrationFor);
  const themeScript = themeRegistration(theme);
  if (themeScript) wanted.push(themeScript);

  const current = await chrome.scripting.getRegisteredContentScripts();
  const currentLab = current.filter((c) => ALL_IDS.includes(c.id));
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
    currentAfter.filter((c) => ALL_IDS.includes(c.id)).map((c) => c.id)
  );
  const toAdd = wanted.filter((w) => !stillThere.has(w.id));
  if (toAdd.length) {
    try {
      await chrome.scripting.registerContentScripts(toAdd);
    } catch (e) {
      console.error('[lab] register échoué', e);
    }
  }
  // A module can gain a second host while already enabled (Mail → Calendar).
  // Keep existing registrations in sync, not just their enabled/disabled IDs.
  const toUpdate = wanted.filter((w) => {
    const previous = currentAfter.find((c) => c.id === w.id);
    return previous && Object.keys(w).some((key) => JSON.stringify(previous[key]) !== JSON.stringify(w[key]));
  });
  if (toUpdate.length) await chrome.scripting.updateContentScripts(toUpdate);
  return { wanted: wanted.length, total: self.LAB_ITEMS.length, theme: theme || 'pk' };
}

async function reloadAppTabs() {
  // Content scripts only reach pages loaded after a registration change:
  // reload the Gmail / Calendar / Drive pages (including installed-app
  // windows) so a freshly updated extension is actually running there.
  const tabs = await chrome.tabs.query({ url: APP_TABS });
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
  const { enabled = {} } = await chrome.storage.local.get(['enabled', 'theme']);
  if (Object.keys(enabled).length === 0) {
    // Premier install : thème PK avec ses presets (les tweaks validés, hors bonus)
    const all = {};
    for (const item of self.LAB_ITEMS) {
      all[item.id] = (item.status || 'ok') !== 'ko' && !(self.PRESET_OFF || []).includes(item.id);
    }
    await chrome.storage.local.set({ enabled: all, theme: 'theme-pk' });
  }
  await syncRegistrations();
});

chrome.runtime.onStartup.addListener(() => {
  syncRegistrations();
});

// Content scripts only reach pages loaded after an update. The service worker
// starts on every extension reload/update: compare the applied version with
// the manifest and reload the app pages once when it changed.
async function ensureVersionApplied() {
  const current = chrome.runtime.getManifest().version;
  const { appliedVersion } = await chrome.storage.local.get('appliedVersion');
  if (appliedVersion === current) return;
  await chrome.storage.local.set({ appliedVersion: current });
  await reloadAppTabs();
}
ensureVersionApplied().catch(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg && msg.type === 'pk-module-target') {
      sendResponse(await self.PK_MODULES.target(msg, sender));
    } else if (msg && msg.type === 'sync') {
      const res = await syncRegistrations();
      const reloaded = await reloadAppTabs();
      const tabs = await chrome.tabs.query({ url: MATCH });
      await Promise.allSettled(tabs.map((t) => applyMarginVar(t.id)));
      sendResponse({ ok: true, ...res, reloaded });
    } else {
      sendResponse({ ok: false });
    }
  })().catch(() => sendResponse({ ok: false }));
  return true; // réponse async
});
