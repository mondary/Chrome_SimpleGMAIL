// Studio only: Outlook-style module switch — view Google Calendar inside the
// Gmail tab (overlay with the signed-in Calendar embed), no new tab.
(() => {
  if (window.__pkStudioModules) return;
  window.__pkStudioModules = true;

  const CSS = [
    '#pk-module-btn{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:602;display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 9px;border:1px solid #dadce0;border-left:0;border-radius:0 9999px 9999px 0;background:#fff;color:#1f1f1f;font:600 10px/1 Arial,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.10)}',
    '#pk-module-btn:hover,#pk-module-btn:focus-visible{background:#f6f8f9;outline:2px solid #1f1f1f;outline-offset:-2px}',
    '#pk-module-btn svg{width:20px;height:20px;stroke:#1f1f1f;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '#pk-module-overlay{position:fixed;inset:0;z-index:900;display:flex;flex-direction:column;background:#fff}',
    '#pk-module-bar{display:flex;align-items:center;gap:14px;height:54px;padding:0 18px;border-bottom:1px solid #e8eaed;font:13px Arial,sans-serif;color:#202124}',
    '#pk-module-bar strong{font-size:15px;letter-spacing:-.02em}',
    '#pk-module-bar .pk-module-hint{color:#5f6368}',
    '#pk-module-bar a{color:#1a73e8;text-decoration:none;margin-left:auto}',
    '#pk-module-close{padding:8px 14px;border:1px solid #dadce0;border-radius:8px;background:#fff;color:#1a73e8;font:600 13px Arial,sans-serif;cursor:pointer}',
    '#pk-module-close:hover,#pk-module-close:focus-visible{background:#f6f8f9;outline:2px solid #1a73e8;outline-offset:-2px}',
    '#pk-module-overlay iframe{flex:1;width:100%;border:0}',
    '@media (prefers-reduced-motion: reduce){#pk-module-overlay{transition:none}}',
  ].join('\n');

  let active = false;
  let button = null;
  let overlay = null;
  let styleEl = null;
  let lastFocus = null;

  function accountEmail() {
    const label = [...document.querySelectorAll('#gb [aria-label]')]
      .map((el) => el.getAttribute('aria-label'))
      .find((text) => /@/.test(text || ''));
    return (label || '').match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || '';
  }

  function ensureStyle() {
    if (styleEl?.isConnected) return;
    styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.append(styleEl);
  }

  function calendarUrl() {
    const params = new URLSearchParams({
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
      hl: /^fr/i.test(document.documentElement.lang || navigator.language) ? 'fr' : 'en',
    });
    const email = accountEmail();
    if (email) params.set('src', email);
    return `https://calendar.google.com/calendar/u/0/embed?${params.toString()}`;
  }

  function buildButton() {
    ensureStyle();
    const btn = document.createElement('button');
    btn.id = 'pk-module-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Afficher l’agenda dans cette page');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', '3.5'); rect.setAttribute('y', '5'); rect.setAttribute('width', '17'); rect.setAttribute('height', '15.5'); rect.setAttribute('rx', '2.5');
    const l1 = document.createElementNS(svg.namespaceURI, 'path'); l1.setAttribute('d', 'M3.5 10h17');
    const l2 = document.createElementNS(svg.namespaceURI, 'path'); l2.setAttribute('d', 'M8 3v4M16 3v4');
    svg.append(rect, l1, l2);
    const label = document.createElement('span');
    label.textContent = 'Agenda';
    btn.append(svg, label);
    btn.addEventListener('click', () => (overlay ? closeOverlay() : openOverlay()));
    document.body.append(btn);
    return btn;
  }

  function openOverlay() {
    ensureStyle();
    lastFocus = document.activeElement;
    overlay = document.createElement('div');
    overlay.id = 'pk-module-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Agenda Google Calendar intégré');

    const bar = document.createElement('div');
    bar.id = 'pk-module-bar';
    const title = document.createElement('strong');
    title.textContent = 'Agenda · Google Calendar';
    const hint = document.createElement('span');
    hint.className = 'pk-module-hint';
    hint.textContent = 'Échap pour revenir au mail';
    const openTab = document.createElement('a');
    openTab.href = 'https://calendar.google.com/';
    openTab.target = '_blank';
    openTab.rel = 'noopener noreferrer';
    openTab.textContent = 'Ouvrir dans un onglet';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'pk-module-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '✕ Revenir au mail';
    closeBtn.addEventListener('click', closeOverlay);
    bar.append(title, hint, openTab, closeBtn);

    const frame = document.createElement('iframe');
    frame.title = 'Agenda Google Calendar';
    frame.src = calendarUrl();
    frame.allow = 'fullscreen';
    overlay.append(bar, frame);
    document.body.append(overlay);
    button?.setAttribute('aria-pressed', 'true');
    closeBtn.focus();
    document.addEventListener('keydown', onKeydown, true);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && overlay) {
      e.stopPropagation();
      closeOverlay();
    }
  }

  function closeOverlay() {
    overlay?.remove();
    overlay = null;
    document.removeEventListener('keydown', onKeydown, true);
    button?.setAttribute('aria-pressed', 'false');
    lastFocus?.focus?.();
    lastFocus = null;
  }

  function ensureUI() {
    if (!active) {
      button?.remove();
      button = null;
      closeOverlay();
      return;
    }
    if (!button?.isConnected) button = buildButton();
  }

  chrome.storage.local.get(['theme', 'enabled'], (state) => {
    active = state.theme === 'theme-pk' && state.enabled?.['js-studio-modules'] !== false;
    ensureUI();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.theme && !changes.enabled)) return;
    chrome.storage.local.get(['theme', 'enabled'], (state) => {
      active = state.theme === 'theme-pk' && state.enabled?.['js-studio-modules'] !== false;
      ensureUI();
    });
  });
  // Gmail rerenders chunks of the DOM: re-anchor the switch if it disappears.
  setInterval(() => { if (active && !button?.isConnected) ensureUI(); }, 4000);
})();
