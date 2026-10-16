/* Presentation layer: native Gmail controls stay in place, with their own handlers. */
(() => {
  "use strict";
  if (globalThis.__pkGmailStyleLoaded) return;
  globalThis.__pkGmailStyleLoaded = true;
  const { defaults, normalize, readBackground, storageKey } = globalThis.PKGmailStyle;
  const root = document.documentElement;
  const fr = root.lang.startsWith("fr");
  const tr = (a, b) => fr ? a : b;
  const $ = (s, parent = document) => parent.querySelector(s);
  const all = (s, parent = document) => [...parent.querySelectorAll(s)];
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const set = (name, value) => { if (root.getAttribute(`data-pks-${name}`) !== String(value)) root.setAttribute(`data-pks-${name}`, value); };
  const cssVar = (name, value) => { if (root.style.getPropertyValue(`--pks-${name}`) !== value) root.style.setProperty(`--pks-${name}`, value); };
  let settings = { ...defaults }, ready = false, frame = 0, stopped = false, revision = 0;
  let compose, menuButton, menuPanel, status, preferences, searchButton, backgroundLayer;
  let dateSignature = "", dateRows = [];
  let pending = Promise.resolve();
  let nativeCloseTimer = 0;
  const nativeOverlayListeners = new Map();
  const observer = new MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('[data-pks-ui]') && (r.type === 'attributes' || ![...r.addedNodes, ...r.removedNodes].every(n => n.nodeType === 1 && n.hasAttribute('data-pks-ui'))))) schedule();
  });
  const selectors = {
    settings: '#gb .FH, #gb [aria-label="Settings"], #gb [aria-label="Paramètres"]',
    help: '#gb [aria-label="Support"], #gb [aria-label="Assistance"]',
    apps: '#gb [aria-label="Google apps"], #gb [aria-label="Applications Google"]',
    gemini: '#gb [aria-label*="Gemini"]',
    availability: '#gb .lJradf',
    pane: '.G-atb .apF',
    paneOptions: '.G-atb .apG',
    input: '.G-atb .d-Na-JG',
  };

  function element(tag, id, text) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    el.dataset.pksUi = "";
    if (text) el.textContent = text;
    return el;
  }
  function button(id, title, glyph) {
    const el = element("button", id, glyph);
    el.type = "button"; el.title = title; el.setAttribute("aria-label", title);
    return el;
  }
  function save(patch) {
    // Merge with persisted preferences, preserving an image uploaded in another tab.
    pending = pending.then(async () => {
      const value = await chrome.storage.local.get(storageKey);
      await chrome.storage.local.set({ [storageKey]: normalize({ ...value[storageKey], ...patch }) });
    }).catch(() => { if (preferences) $("[role=status]", preferences).textContent = tr("Enregistrement impossible.", "Could not save preferences."); });
    return pending;
  }
  function clearNativeOverlayTargets() {
    for (const [target, listener] of nativeOverlayListeners) {
      target.removeEventListener(listener.type, listener.handler);
      delete target.dataset.pksMenuNativeKey;
      for (const name of ["left", "top", "width", "height"]) target.style.removeProperty(`--pks-menu-${name}`);
      if (target.dataset.pksSavedTabindex === "unset") target.removeAttribute("tabindex");
      else if (target.dataset.pksSavedTabindex != null) target.tabIndex = Number(target.dataset.pksSavedTabindex);
      delete target.dataset.pksSavedTabindex;
      if (target.dataset.pksSavedAriaHidden === "unset") target.removeAttribute("aria-hidden");
      else if (target.dataset.pksSavedAriaHidden != null) target.setAttribute("aria-hidden", target.dataset.pksSavedAriaHidden);
      delete target.dataset.pksSavedAriaHidden;
    }
    nativeOverlayListeners.clear();
    root.style.removeProperty("--pks-menu-toolbar-z");
  }
  function releaseNativeControlWhenClosed(key, target) {
    setTimeout(() => {
      if (root.dataset.pksNativeControl === key && target?.getAttribute("aria-expanded") !== "true") {
        root.removeAttribute("data-pks-native-control");
        all(`[data-pks-native-popup="${key}"]`).forEach(popup => popup.removeAttribute("data-pks-native-popup"));
      }
    }, 200);
  }
  function positionNativePopup(key, target, trigger) {
    if (["settings", "apps", "gemini"].includes(key) || !trigger) return;
    const popupId = target.getAttribute("aria-controls");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const popup = (popupId && document.getElementById(popupId)) || all('[role="menu"],[role="listbox"],[role="dialog"]')
        .filter(el => el !== menuPanel && !el.hasAttribute("data-pks-ui") && el.getBoundingClientRect().width > 0)
        .at(-1);
      if (!popup || popup === menuPanel || !popup.getBoundingClientRect().width) return;
      if (popupId && target.getAttribute("aria-expanded") !== "true") return;
      const anchor = trigger.getBoundingClientRect();
      const panel = popup.getBoundingClientRect();
      const left = Math.max(8, Math.min(anchor.left, innerWidth - panel.width - 8));
      const top = Math.max(8, Math.min(anchor.top, innerHeight - panel.height - 8));
      popup.dataset.pksNativePopup = key;
      popup.style.setProperty("--pks-native-popup-left", `${left}px`);
      popup.style.setProperty("--pks-native-popup-top", `${top}px`);
    }));
  }
  function deferNativeMenuClose(key, target) {
    root.setAttribute("data-pks-native-control", key);
    clearTimeout(nativeCloseTimer);
    nativeCloseTimer = setTimeout(() => {
      nativeCloseTimer = 0;
      closeMenu();
      releaseNativeControlWhenClosed(key, target);
    }, 100);
  }
  function syncNativeMenuTargets() {
    if (!menuPanel) return;
    const desired = all("button[data-pks-menu-key]", menuPanel).flatMap(trigger => {
      const key = trigger.dataset.pksMenuKey;
      const target = all(selectors[key]).find(el => el.closest('[data-pks-toolbar]')) || $(selectors[key]);
      return target ? [{ key, trigger, target }] : [];
    });
    const unchanged = desired.length === nativeOverlayListeners.size && desired.every(({ key, trigger, target }) => {
      const prior = nativeOverlayListeners.get(target);
      if (!prior || prior.key !== key || prior.trigger !== trigger) return false;
      const rect = trigger.getBoundingClientRect();
      return Math.abs(parseFloat(target.style.getPropertyValue("--pks-menu-left")) - rect.left) < .25 &&
        Math.abs(parseFloat(target.style.getPropertyValue("--pks-menu-top")) - rect.top) < .25;
    });
    if (unchanged) return;
    clearNativeOverlayTargets();
    for (const { key, trigger, target } of desired) {
      const rect = trigger.getBoundingClientRect();
      target.dataset.pksMenuNativeKey = key;
      target.dataset.pksSavedTabindex = target.hasAttribute("tabindex") ? String(target.tabIndex) : "unset";
      target.dataset.pksSavedAriaHidden = target.hasAttribute("aria-hidden") ? target.getAttribute("aria-hidden") : "unset";
      target.tabIndex = -1;
      target.setAttribute("aria-hidden", "true");
      for (const [name, value] of Object.entries({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })) {
        target.style.setProperty(`--pks-menu-${name}`, `${value}px`);
      }
      const type = ["pane", "paneOptions", "input"].includes(key) ? "mouseup" : "click";
      const handler = () => {
        positionNativePopup(key, target, trigger);
        deferNativeMenuClose(key, target);
      };
      target.addEventListener(type, handler, { once: true });
      nativeOverlayListeners.set(target, { key, trigger, type, handler });
    }
    root.style.setProperty("--pks-menu-toolbar-z", "190");
    root.setAttribute("data-pks-menu-native", "true");
  }
  function closeMenu(focus = false) {
    if (nativeCloseTimer) { clearTimeout(nativeCloseTimer); nativeCloseTimer = 0; }
    menuPanel?.remove(); menuPanel = null;
    root.removeAttribute("data-pks-menu-native");
    clearNativeOverlayTargets();
    menuButton?.setAttribute("aria-expanded", "false");
    if (focus) menuButton?.focus();
  }
  function closePreferences() { preferences?.remove(); preferences = null; }
  function nativeAction(key) {
    // Keyboard activation keeps Gmail's real popup anchor in place until its handler runs.
    const candidates = all(selectors[key]);
    const target = candidates.find(el => el.closest('[data-pks-toolbar]')) || candidates[0];
    if (!target) { closeMenu(); return; }
    positionNativePopup(key, target, $(`[data-pks-menu-key="${key}"]`, menuPanel));
    root.setAttribute("data-pks-native-control", key);
    // Gmail's Closure toolbar controls activate on mouseup; header links use click.
    if (['pane', 'paneOptions', 'input'].includes(key)) {
      for (const type of ['mousedown', 'mouseup']) target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    } else target.click();
    deferNativeMenuClose(key, target);
  }
  function openPreferences() {
    closeMenu(); closePreferences();
    preferences = element("section", "pks-preferences");
    preferences.setAttribute("role", "dialog"); preferences.setAttribute("aria-label", tr("Apparence de Gmail", "Gmail appearance"));
    const heading = element("header"); heading.append(element("h2", null, tr("Apparence de Gmail", "Gmail appearance")));
    const close = button(null, tr("Fermer", "Close"), "×"); close.onclick = () => { closePreferences(); menuButton?.focus(); }; heading.append(close); preferences.append(heading);
    const choices = [
      ["background", tr("Arrière-plan", "Background"), [["native", tr("Thème Gmail", "Gmail theme")], ["white", tr("Blanc", "White")], ["ocean", tr("Océan", "Ocean")], ["night", tr("Lac de nuit", "Night lake")], ["custom", tr("Mon image", "My image")]]],
      ["backgroundScope", tr("Afficher le fond", "Show background"), [["always", tr("Toujours", "Always")], ["empty", tr("Boîte vide uniquement", "Only when empty")]]],
      ["density", tr("Densité", "Density"), [["compact", tr("Compacte", "Compact")], ["comfortable", tr("Confortable", "Comfortable")], ["spacious", tr("Aérée", "Spacious")]]],
      ["width", tr("Largeur", "Width"), [["balanced", tr("Centrée", "Centered")], ["wide", tr("Large", "Wide")], ["full", tr("Pleine largeur", "Full width")]]],
    ];
    for (const [key, title, options] of choices) {
      const label = element("label", null, title); const select = document.createElement("select"); select.name = key;
      for (const [value, text] of options) { const o = document.createElement("option"); o.value = value; o.textContent = text; select.append(o); }
      select.value = settings[key]; select.onchange = () => save({ [key]: select.value }); label.append(select); preferences.append(label);
    }
    const upload = element("label", "pks-image-label", tr("Choisir une image…", "Choose an image…"));
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => { try { const imageData = await readBackground(input.files[0]); await save({ imageData, background: "custom" }); $("select[name=background]", preferences).value = "custom"; } catch (e) { $("[role=status]", preferences).textContent = e.message; } }; upload.append(input); preferences.append(upload);
    for (const [key, title] of [["inboxZero", tr("État de boîte vide", "Inbox zero")], ["headerActions", tr("Actions dans l’en-tête", "Actions in the header")], ["groupDates", tr("Séparer par date", "Group by date")], ["hideAddons", tr("Masquer le panneau Google", "Hide Google side panel")]]) {
      const label = element("label", null, title), toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = settings[key]; toggle.onchange = () => save({ [key]: toggle.checked }); label.append(toggle); preferences.append(label);
    }
    const feedback = element("p", null, tr("Réglages enregistrés sur cet appareil.", "Preferences saved on this device.")); feedback.setAttribute("role", "status"); preferences.append(feedback);
    const support = element("a", null, tr("Soutenir sur Ko-fi ↗", "Support on Ko-fi ↗")); support.href = "https://ko-fi.com/pouark"; support.target = "_blank"; support.rel = "noopener noreferrer"; preferences.append(support);
    document.body.append(preferences); close.focus();
  }
  function openMenu() {
    if (menuPanel) { closeMenu(true); return; }
    menuPanel = element("div", "pks-menu"); menuPanel.setAttribute("role", "menu"); menuPanel.setAttribute("aria-label", tr("Options Gmail", "Gmail options"));
    const nativeItems = [];
    function item(title, action, key) {
      const b = button(null, title, title); b.setAttribute("role", "menuitem"); b.onclick = action; menuPanel.append(b);
      if (key) b.dataset.pksMenuKey = key;
    }
    item(tr("Apparence de Gmail", "Gmail appearance"), openPreferences);
    for (const [key, title] of [["settings", tr("Paramètres Gmail", "Gmail settings")], ["apps", tr("Applications Google", "Google apps")], ["help", tr("Aide", "Help")], ["gemini", "Gemini"], ["availability", tr("Disponibilité", "Availability")], ["pane", tr("Activer / désactiver le volet de lecture", "Toggle reading pane")], ["paneOptions", tr("Position du volet de lecture", "Reading pane position")], ["input", tr("Outils de saisie", "Input tools")]]) {
      const target = all(selectors[key]).find(el => el.closest('[data-pks-toolbar]')) || $(selectors[key]);
      if (target || ["settings", "apps", "help", "gemini", "availability"].includes(key)) item(title, () => nativeAction(key), key);
    }
    item(settings.hideAddons ? tr("Afficher le panneau Google", "Show Google side panel") : tr("Masquer le panneau Google", "Hide Google side panel"), () => { save({ hideAddons: !settings.hideAddons }); closeMenu(true); });
    menuPanel.addEventListener("keydown", e => {
      const items = all("button", menuPanel); const i = items.indexOf(document.activeElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); items[e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
    });
    document.body.append(menuPanel);
    syncNativeMenuTargets();
    menuButton.setAttribute("aria-expanded", "true"); $("button", menuPanel).focus();
  }
  function removeUI() {
    for (const el of [compose, menuButton, status, searchButton, backgroundLayer]) el?.remove();
    backgroundLayer = null;
    compose = menuButton = status = searchButton = null;
    closeMenu(); closePreferences();
    all('[data-pks-toolbar], [data-pks-pagination], [data-pks-utility]').forEach(el => { delete el.dataset.pksToolbar; delete el.dataset.pksPagination; delete el.dataset.pksUtility; });
    all('[data-pks-date]').forEach(el => el.remove()); dateSignature = ""; dateRows = [];
    for (const attr of [...root.attributes]) if (attr.name === "data-pks" || attr.name.startsWith("data-pks-")) root.removeAttribute(attr.name);
    for (const prop of [...root.style]) if (prop.startsWith("--pks-")) root.style.removeProperty(prop);
  }
  function schedule() {
    if (!frame && ready && settings.enabled && !stopped) frame = requestAnimationFrame(() => { frame = 0; refresh(); });
  }
  function dateLabel(row) {
    const cell = $(".xW", row); if (!cell) return "";
    const value = cell.textContent.trim().toLowerCase();
    if (/^(\d{1,2}:\d{2}(\s?[ap]m)?|today|aujourd’hui|aujourd'hui)$/.test(value)) return tr("Aujourd’hui", "Today");
    if (/^(hier|yesterday)$/.test(value)) return tr("Hier", "Yesterday");
    const hint = $("[title]", cell)?.title || cell.getAttribute("title") || value;
    const months = ['jan','feb|fév','mar','apr|avr','may|mai','jun|juin','jul|juil','aug|aoû','sep','oct','nov','dec|déc'];
    let timestamp = NaN;
    const numeric = hint.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (numeric) timestamp = new Date(+numeric[3], +(fr ? numeric[2] : numeric[1]) - 1, +(fr ? numeric[1] : numeric[2])).getTime();
    else {
      const m = months.findIndex(month => new RegExp(`\\b(?:${month})`, 'i').test(hint));
      const day = hint.match(/\b(\d{1,2})\b/); const year = hint.match(/\b(20\d{2})\b/);
      if (m >= 0 && day) timestamp = new Date(year ? +year[1] : new Date().getFullYear(), m, +day[1]).getTime();
    }
    if (!Number.isFinite(timestamp)) return "";
    const today = new Date(); today.setHours(0,0,0,0);
    const date = new Date(timestamp), delta = Math.round((today - date) / 86400000);
    if (delta < 0) return "";
    if (!delta) return tr("Aujourd’hui", "Today");
    if (delta === 1) return tr("Hier", "Yesterday");
    if (delta < 7) return tr("Cette semaine", "This week");
    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) return tr("Ce mois-ci", "This month");
    return new Intl.DateTimeFormat(fr ? 'fr' : 'en', { month:'long', year:'numeric' }).format(date);
  }
  function groupDates(rows) {
    if (!settings.groupDates) rows = [];
    const labels = rows.map(dateLabel), signature = labels.join('|');
    if (signature === dateSignature && rows.length === dateRows.length && rows.every((r,i)=>r === dateRows[i])) return;
    all('[data-pks-date]').forEach(el => el.remove()); dateRows = rows; dateSignature = signature;
    let last = "";
    rows.forEach((row, i) => {
      const label = labels[i];
      if (label && label !== last && (i > 0 || label !== tr("Aujourd’hui", "Today"))) {
        const divider = element(row.tagName === "TR" ? "tr" : "div"); divider.dataset.pksDate = "";
        const cell = document.createElement(row.tagName === "TR" ? "td" : "span"); if (cell.tagName === "TD") cell.colSpan = row.children.length;
        cell.textContent = label; divider.append(cell); row.before(divider);
      }
      last = label;
    });
  }
  function background(empty) {
    const mode = settings.backgroundScope === "empty" && !empty ? "native" : settings.background;
    let image = "";
    if (["ocean", "night"].includes(mode)) image = chrome.runtime.getURL(`backgrounds/${mode}.jpg`);
    else if (mode === "custom") image = settings.imageData;
    cssVar("background", image ? `url("${image}")` : "none");
    if (image) {
      if (!backgroundLayer?.isConnected) { backgroundLayer = element('img', 'pks-background-layer'); backgroundLayer.alt = ''; backgroundLayer.setAttribute('aria-hidden','true'); document.body.prepend(backgroundLayer); }
      if (backgroundLayer.getAttribute('src') !== image) backgroundLayer.src = image;
    } else { backgroundLayer?.remove(); backgroundLayer = null; }
    // Preserve Gmail's own theme image; make only its content containers transparent.
    set("background", image ? mode : mode === "white" ? "white" : "native");
    const nativeImage = mode === "native" && all('body,.aAU,.bjj,.wl').some(el => getComputedStyle(el).backgroundImage !== "none");
    set("photo", Boolean(image || nativeImage));
  }
  function refresh() {
    if (!ready || !settings.enabled || stopped || !document.body) return;
    const header = $("#gb"), mains = all('.bkK [role="main"], .bkK .aia').filter(visible);
    if (!header || !mains.length || /^(#settings|#chat|#meet|#contacts)/.test(location.hash)) { removeUI(); return; }
    root.setAttribute("data-pks", "on");
    for (const [key, value] of Object.entries({ density:settings.density, width:settings.width, quiet:settings.quietHeader, addons:settings.hideAddons, actions:settings.headerActions })) set(key,value);
    const nav = header.querySelector('[data-ogmb], [aria-label="Main menu"], [aria-label="Menu principal"]');
    set("nav", nav?.getAttribute("aria-expanded") === "false" ? "closed" : "open");
    const rows = all('.bkK .zA').filter(visible);
    const reading = all('.bkK .hP').some(visible);
    set("reading", reading);
    const split = (reading || all('.bkK .Nu.S3, .bkK .aia').some(visible)) && rows.length > 0;
    const view = split ? "split" : reading ? "reading" : "list"; set("view", view);
    const selected = rows.some(row => row.classList.contains('x7') || row.getAttribute('aria-selected') === 'true' || $('.T-Jo[aria-checked="true"]', row)); set("selected", selected);
    const inboxRoute = /^(#inbox(?:$|\/)|#category\/)/.test(location.hash);
    const emptyIndicator = mains.some(main => all('.TC, .aRv', main).some(visible));
    const empty = settings.inboxZero && inboxRoute && !rows.length && !reading && emptyIndicator && !$(".bkK [aria-busy=true]"); set("empty",empty);
    background(empty);
    const bk = $(".bkK").getBoundingClientRect(), h = header.getBoundingClientRect();
    cssVar("header-height", `${h.height}px`); cssVar("work-left",`${bk.left}px`); cssVar("work-right",`${Math.max(0,innerWidth - bk.right)}px`);
    const pane = all('.Nu.tf').find(visible); cssVar("pane-width",`${split && pane ? pane.getBoundingClientRect().width : 360}px`);
    set("stacked", Boolean(split && pane && pane.getBoundingClientRect().width < 700));
    const account = all('#gb [aria-label^="Compte Google"], #gb [aria-label^="Google Account"], #gb .gb_bb, #gb .account').find(visible);
    const accountRect = account?.getBoundingClientRect();
    cssVar("account-left",`${accountRect?.left || innerWidth - 56}px`);
    const toolbar = all('.bkK .G-atb').find(el => el.getClientRects().length > 0);
    all('[data-pks-toolbar]').forEach(el => { if (el !== toolbar) delete el.dataset.pksToolbar; });
    if (toolbar) {
      toolbar.dataset.pksToolbar = "";
      const pagination = $(".aeH", toolbar) || $(".aqJ", toolbar) || $(".Dj", toolbar)?.closest('.G-Ni');
      if (pagination) pagination.dataset.pksPagination = "";
    }
    if (settings.quietHeader) {
      for (const key of Object.keys(selectors)) all(selectors[key]).forEach(el => el.dataset.pksUtility = key);
      if (!menuButton?.isConnected) {
        menuButton = button("pks-menu-button", tr("Options Gmail", "Gmail options"), "⋮"); menuButton.setAttribute("aria-haspopup", "menu"); menuButton.setAttribute("aria-expanded", "false"); menuButton.onclick = openMenu; document.body.append(menuButton);
      }
    } else { menuButton?.remove(); menuButton = null; closeMenu(); }
    if (!searchButton?.isConnected) {
      searchButton = button("pks-search-button", tr("Rechercher dans les messages", "Search mail"), "");
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      const circle = document.createElementNS(svg.namespaceURI, 'circle'); circle.setAttribute('cx','10.5'); circle.setAttribute('cy','10.5'); circle.setAttribute('r','6.5');
      const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d','m16 16 5 5'); svg.append(circle,path); searchButton.append(svg);
      searchButton.onclick = () => { set("search-open", "true"); $('#aso_search_form_anchor input[name=q]')?.focus(); }; document.body.append(searchButton);
    }
    if (!status?.isConnected) { status = element("div", "pks-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); document.body.append(status); }
    const count = toolbar?.querySelector('.Dj')?.textContent.trim();
    const text = empty ? tr("Aucun nouveau message !", "No new mail!") : count || "";
    if (status.textContent !== text) status.textContent = text;
    status.hidden = !empty && (!count || view !== "list");
    const nativeCompose = $('.z0 [role="button"], .z0 .T-I-KE');
    const floating = settings.floatingCompose && Boolean(nativeCompose); set("compose",floating);
    if (floating && !compose?.isConnected) {
      compose = button("pks-compose", tr("Nouveau message", "Compose"), ""); const mark=element("span");mark.className="pks-plus";mark.setAttribute("aria-hidden","true");compose.append(mark);
      compose.onclick=()=>$('.z0 [role="button"], .z0 .T-I-KE')?.click();document.body.append(compose);
    } else if (!floating) { compose?.remove();compose=null; }
    groupDates(view === 'reading' || empty ? [] : rows);
    if (menuPanel) syncNativeMenuTargets();
  }
  function apply() {
    if (!ready || stopped) return;
    observer.disconnect();
    if (!settings.enabled) { removeUI(); return; }
    if (document.body) { refresh(); observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-expanded','aria-checked','aria-selected','class','style','hidden']}); }
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes[storageKey])return;
    revision++;settings=normalize(changes[storageKey].newValue);ready=true;apply();
  });
  chrome.storage.local.get(storageKey).then(value=>{if(!revision)settings=normalize(value[storageKey]);ready=true;apply();}).catch(()=>{stopped=true;observer.disconnect();removeUI();});
  window.addEventListener('hashchange',()=>{closeMenu();closePreferences();root.removeAttribute('data-pks-search-open');schedule();});
  window.addEventListener('resize',schedule);
  document.addEventListener('click',e=>{
    const nativeTarget = e.target.closest?.('[data-pks-menu-native-key]');
    if (nativeTarget) deferNativeMenuClose(nativeTarget.dataset.pksMenuNativeKey, nativeTarget);
    else if(menuPanel&&!menuPanel.contains(e.target)&&!menuButton?.contains(e.target))closeMenu();
    if(!e.target.closest('#aso_search_form_anchor,#pks-search-button'))root.removeAttribute('data-pks-search-open');
    const nativeKey = root.dataset.pksNativeControl;
    if(nativeKey && !e.target.closest('[data-pks-utility],#pks-menu')) {
      const target = all(selectors[nativeKey]).find(el => el.closest('[data-pks-toolbar]')) || $(selectors[nativeKey]);
      releaseNativeControlWhenClosed(nativeKey, target);
    }
    schedule();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') {
      const searchOpen = root.dataset.pksSearchOpen === 'true';
      if(menuPanel || preferences || searchOpen) { e.preventDefault(); e.stopImmediatePropagation(); }
      if(menuPanel) closeMenu(true);
      if(preferences) { closePreferences(); menuButton?.focus(); }
      root.removeAttribute('data-pks-search-open');root.removeAttribute('data-pks-native-control');
      if(searchOpen) searchButton?.focus();
    }
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
})();
