// Service worker only. The switch opens the other app for the active account,
// always on its home page: Mail returns to the inbox, Calendar to its home view.
(() => {
  const hosts = { mail: 'mail.google.com', calendar: 'calendar.google.com', drive: 'drive.google.com' };
  const prefixes = { mail: '/mail/', calendar: '/calendar/', drive: '/drive/' };

  function appOf(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password) return null;
      const app = Object.keys(hosts).find((name) => hosts[name] === parsed.hostname);
      if (!app) return null;
      // Drive also serves files from /file/… : any path is a valid source.
      if (app !== 'drive' && !parsed.pathname.startsWith(prefixes[app])) return null;
      return { app, url: parsed };
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
    if (app === 'drive') {
      const url = new URL(email ? 'https://drive.google.com/drive/my-drive' : `https://drive.google.com/drive/u/${slot}/my-drive`);
      if (email) url.searchParams.set('authuser', email);
      return url.href;
    }
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
      return { ok: true, url: appUrl(message.destination, email, slot) };
    },
  };
})();
