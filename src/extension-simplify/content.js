/* Presentation only. No mail parsing, API calls, remote assets or Gmail node replacement. */
(() => {
  "use strict";
  if (globalThis.__pkGmailStyleLoaded) return;
  globalThis.__pkGmailStyleLoaded = true;

  const { defaults, normalize, storageKey } = globalThis.PKGmailStyle;
  const root = document.documentElement;
  const attributes = ["data-pks", "data-pks-density", "data-pks-width", "data-pks-quiet",
    "data-pks-addons", "data-pks-compose", "data-pks-nav", "data-pks-view"];
  let settings = { ...defaults };
  let composeButton = null;
  let frame = 0;
  let nativeMenu = null;
  let stopped = false;
  let ready = false;
  const observer = new MutationObserver(schedule);
  const menuObserver = new MutationObserver(schedule);

  function setAttribute(name, value) {
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }

  function apply() {
    if (stopped || !ready) return;
    if (!settings.enabled) {
      observer.disconnect();
      menuObserver.disconnect();
      nativeMenu = null;
      for (const name of attributes) root.removeAttribute(name);
      composeButton?.remove();
      composeButton = null;
      return;
    }
    setAttribute("data-pks-density", settings.density);
    setAttribute("data-pks-width", settings.width);
    setAttribute("data-pks-quiet", String(settings.quietHeader));
    setAttribute("data-pks-addons", String(settings.hideAddons));
    // Enabled only after finding the native compose control, to keep a safe fallback.
    setAttribute("data-pks-compose", "false");
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      refresh();
    }
  }

  function schedule() {
    if (!frame && settings.enabled && !stopped) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        refresh();
      });
    }
  }

  function refresh() {
    if (!settings.enabled || stopped || !document.body) return;
    const header = document.querySelector("#gb");
    const mains = [...document.querySelectorAll('.bkK [role="main"], .bkK .aia')]
      .filter(el => el.getClientRects().length);
    // Print views, standalone compose windows and non-mail apps keep Gmail's own layout.
    if (!header || !mains.length || /^(#settings|#chat|#meet)/.test(location.hash)) {
      root.removeAttribute("data-pks");
      composeButton?.remove();
      composeButton = null;
      return;
    }
    setAttribute("data-pks", "on");
    const menu = header.querySelector('[data-ogmb], [aria-label="Main menu"], [aria-label="Menu principal"]');
    if (menu !== nativeMenu) {
      menuObserver.disconnect();
      nativeMenu = menu;
      if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ["aria-expanded"] });
    }
    setAttribute("data-pks-nav", menu?.getAttribute("aria-expanded") === "false" ? "closed" : "open");
    const reading = mains.some(main => [...main.querySelectorAll(".hP")].some(el => el.getClientRects().length));
    const list = mains.some(main => [...main.querySelectorAll(".zA")].some(el => el.getClientRects().length));
    setAttribute("data-pks-view", reading ? (list ? "split" : "reading") : "list");

    const nativeCompose = document.querySelector('.z0 [role="button"], .z0 .T-I-KE');
    const floating = settings.floatingCompose && Boolean(nativeCompose);
    setAttribute("data-pks-compose", String(floating));
    if (!floating) {
      composeButton?.remove();
      composeButton = null;
      return;
    }
    if (!composeButton?.isConnected) {
      const label = document.documentElement.lang.startsWith("fr") ? "Nouveau message" : "Compose";
      composeButton = document.createElement("button");
      composeButton.id = "pks-compose";
      composeButton.type = "button";
      composeButton.title = label;
      composeButton.setAttribute("aria-label", label);
      const mark = document.createElement("span");
      mark.className = "pks-plus";
      mark.setAttribute("aria-hidden", "true");
      composeButton.append(mark);
      composeButton.addEventListener("click", () => {
        // Delegate to Gmail, without making a draft or intercepting sending ourselves.
        const native = document.querySelector('.z0 [role="button"], .z0 .T-I-KE');
        if (native) native.click();
      });
      document.body.append(composeButton);
    }
  }

  function stop() {
    stopped = true;
    observer.disconnect();
    menuObserver.disconnect();
    cancelAnimationFrame(frame);
    for (const name of attributes) root.removeAttribute(name);
    composeButton?.remove();
    window.removeEventListener("hashchange", schedule);
  }

  // Register before the initial read so changes cannot be lost during startup.
  let storageRevision = 0;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[storageKey]) return;
    storageRevision++;
    settings = normalize(changes[storageKey].newValue);
    ready = true;
    apply();
  });
  chrome.storage.local.get(storageKey).then(value => {
    if (storageRevision === 0) settings = normalize(value[storageKey]);
    ready = true;
    apply();
  }).catch(() => { stop(); });

  window.addEventListener("hashchange", schedule);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
})();
