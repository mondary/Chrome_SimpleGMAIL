// Service worker only. Remember the Mail view per tab for this browser session.
// The two full Google apps remain top-level pages; only navigation is shared.
(() => {
  const hosts = { mail: 'mail.google.com', calendar: 'calendar.google.com' };
  const keyFor = (tabId) => `pk-module-return:${tabId}`;

  function appOf(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password) return null;
      const app = Object.keys(hosts).find((name) => hosts[name] === parsed.hostname);
      const prefix = app === 'mail' ? '/mail/' : '/calendar/';
      return app && parsed.pathname.startsWith(prefix) ? { app, url: parsed } : null;
    } catch { return null; }
  }

  function accountEmail(value) {
    return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? value.toLowerCase() : '';
  }

  function accountSlot(url) {
    const query = url.searchParams.get('authuser');
    return url.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] || (/^\d+$/.test(query || '') ? query : '0');
  }

  function appUrl(app, email, slot) {
    const prefix = app === 'mail' ? 'mail' : 'calendar';
    const path = email ? `/${prefix}/` : `/${prefix}/u/${slot}/`;
    const url = new URL(`https://${hosts[app]}${path}`);
    if (email) url.searchParams.set('authuser', email);
    if (app === 'mail') url.hash = 'inbox';
    else if (!email) url.pathname += 'r';
    return url.href;
  }

  self.PK_MODULES = {
    async target(message, sender) {
      const source = appOf(sender.url);
      const tabId = sender.tab?.id;
      if (!source || !Number.isInteger(tabId) || tabId < 0 || sender.frameId !== 0 ||
          !Object.hasOwn(hosts, message.destination) || message.destination === source.app) return { ok: false };
      const { theme, enabled = {} } = await chrome.storage.local.get(['theme', 'enabled']);
      if (theme !== 'theme-pk' || enabled['js-studio-modules'] === false) return { ok: false };

      const email = accountEmail(message.account) || accountEmail(source.url.searchParams.get('authuser'));
      const slot = accountSlot(source.url);
      const key = keyFor(tabId);
      if (source.app === 'mail') {
        await chrome.storage.session.set({ [key]: { mail: source.url.href, email, slot } });
      } else {
        const previous = (await chrome.storage.session.get(key))[key];
        // An account can be changed within Calendar. Never return to a different
        // account's remembered conversation, even when their numeric slots differ.
        const sameAccount = previous && (email ? previous.email === email : !previous.email && previous.slot === slot);
        if (sameAccount && appOf(previous.mail)?.app === 'mail') return { ok: true, url: previous.mail };
      }
      return { ok: true, url: appUrl(message.destination, email, slot) };
    },
    forgetTab(tabId) {
      return chrome.storage.session.remove(keyFor(tabId));
    },
  };
})();
