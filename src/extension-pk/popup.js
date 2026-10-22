// PK Gmail Studio — panneau latéral. Section Scripts relative au thème actif.
const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const themesEl = document.getElementById('themes');
const toolsEl = document.querySelector('.list-tools');
let toastSeconds = 6;
let categoryLabels = {};
const CATEGORY_FIELDS = [
  ['primary', 'Principale'],
  ['promotions', 'Promotions'],
  ['social', 'Réseaux sociaux'],
  ['updates', 'Notifications'],
  ['forums', 'Forums'],
  ['newsletter', 'Newsletters'],
];

const THEME_ICONS = {
  '': ['M3 6h18v12H3z', 'm3 7 9 6 9-6'],
  'theme-pk': ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 3v18'],
  'theme-simplify': ['M4 7h16', 'M4 12h10', 'M4 17h16'],
  'theme-simplemail-classic': ['M3 5h18v14H3z', 'M8 5v14'],
  'theme-focus-os': ['M4 6h2', 'M4 12h2', 'M4 18h2', 'M10 6h10', 'M10 12h10', 'M10 18h10'],
  'theme-simplemail-original': ['M4 5h6v14H4z', 'M12 7h8', 'M12 12h8', 'M12 17h5'],
};

function themeIcon(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of THEME_ICONS[id] || THEME_ICONS['']) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function renderThemes(active) {
  if (!themesEl) return;
  themesEl.innerHTML = '';
  const strip = document.createElement('div');
  strip.className = 'theme-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Thème');
  for (const t of self.LAB_THEMES) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'theme-tile' + (active === t.id ? ' active' : '');
    tile.setAttribute('aria-pressed', String(active === t.id));
    tile.setAttribute('aria-label', t.label);
    tile.title = `${t.label} — ${t.description}`;
    tile.append(themeIcon(t.id));
    const name = document.createElement('span');
    name.textContent = t.label;
    tile.append(name);
    tile.addEventListener('click', () => setTheme(t.id));
    strip.appendChild(tile);
  }
  themesEl.appendChild(strip);
  const note = document.createElement('div');
  note.className = 'theme-note';
  note.textContent = (self.LAB_THEMES.find((t) => t.id === active) || {}).description || '';
  themesEl.appendChild(note);
}

async function setTheme(id) {
  const enabled = {};
  // PK applique ses presets ; les autres thèmes coupent les tweaks du Studio.
  if (id === 'theme-pk') {
    for (const item of self.LAB_ITEMS) {
      enabled[item.id] = (item.status || 'ok') !== 'ko' && !(self.PRESET_OFF || []).includes(item.id);
    }
  } else {
    for (const item of self.LAB_ITEMS) enabled[item.id] = false;
  }
  await chrome.storage.local.set({ theme: id, enabled });
  await chrome.runtime.sendMessage({ type: 'sync' });
  await loadState();
}

/* ---------- Section Scripts : relative au thème ---------- */

function switchEl(checked, onChange) {
  const sw = document.createElement('label');
  sw.className = 'sw';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const track = document.createElement('span');
  track.className = 'track';
  sw.appendChild(input);
  sw.appendChild(track);
  return sw;
}

function makeRow(nameText, metaText) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('div');
  label.className = 'label';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = nameText;
  label.appendChild(name);
  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText;
    label.appendChild(meta);
  }
  row.appendChild(label);
  return { row, label };
}

function rangeCtl(nameText, min, max, value, suffix, onInput, onCommit) {
  const ctl = document.createElement('div');
  ctl.className = 'pct-ctl';
  const lbl = document.createElement('span');
  lbl.textContent = nameText;
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(min);
  range.max = String(max);
  range.step = '1';
  range.value = String(value);
  const val = document.createElement('span');
  val.className = 'pct-val';
  val.textContent = value + suffix;
  range.addEventListener('input', () => {
    val.textContent = range.value + suffix;
    onInput(Number(range.value));
  });
  if (onCommit) range.addEventListener('change', onCommit);
  ctl.appendChild(lbl);
  ctl.appendChild(range);
  ctl.appendChild(val);
  return ctl;
}

function categoryEditor(labels) {
  const box = document.createElement('div');
  box.className = 'cat-edit';
  const note = document.createElement('div');
  note.className = 'cat-note';
  note.textContent = 'Renommer les onglets de la boîte de réception. Vide = nom Gmail.';
  box.appendChild(note);
  for (const [id, name] of CATEGORY_FIELDS) {
    const row = document.createElement('label');
    row.className = 'cat-row';
    const native = document.createElement('span');
    native.textContent = name;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 24;
    input.placeholder = name;
    input.value = labels[id] || '';
    input.setAttribute('aria-label', `Nom de la catégorie ${name}`);
    let timer = 0;
    const save = async () => {
      clearTimeout(timer);
      const { pkCategoryLabels = {} } = await chrome.storage.local.get('pkCategoryLabels');
      await chrome.storage.local.set({ pkCategoryLabels: { ...pkCategoryLabels, [id]: input.value.trim() } });
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(save, 350);
    });
    input.addEventListener('change', save);
    row.appendChild(native);
    row.appendChild(input);
    box.appendChild(row);
  }
  return box;
}

function renderTweaks(enabled, marginPct, toastSeconds) {
  listEl.innerHTML = '';
  const groups = [
    { key: 'new', title: '✦ Nouveau — à tester' },
    { key: 'ok', title: '✓ Presets validés' },
    { key: 'ko', title: '? À retester — KO présumé' },
  ];
  for (const g of groups) {
    const items = self.LAB_ITEMS.filter((i) => (i.status || 'ok') === g.key);
    if (!items.length) continue;
    const h = document.createElement('div');
    h.className = 'group';
    h.textContent = g.title;
    listEl.appendChild(h);
    for (const item of items) {
      const { row } = makeRow(item.label, `${item.type === 'css' ? 'CSS' : 'Script'} · v${item.version}`);
      if (item.status === 'ko') row.classList.add('ko');
      else if (item.status === 'new') row.classList.add('new');
      row.appendChild(switchEl(enabled[item.id] !== false, (on) => toggle(item.id, on)));
      listEl.appendChild(row);

      if (item.setting === 'margin-pct') {
        listEl.appendChild(rangeCtl('Marges', 2, 25, marginPct, '%', async (value) => {
          await chrome.storage.local.set({ marginPct: value });
        }, () => chrome.runtime.sendMessage({ type: 'sync' })));
      } else if (item.setting === 'toast-seconds') {
        listEl.appendChild(rangeCtl('Durée d’affichage', 3, 12, toastSeconds, ' s', (value) => {
          chrome.storage.local.set({ toastSeconds: value });
        }));
      } else if (item.setting === 'category-labels') {
        listEl.appendChild(categoryEditor(categoryLabels));
      }
    }
  }
  updateCount(enabled);
}

function renderThemeSettings(theme, stored) {
  const spec = (self.THEME_SETTINGS || {})[theme];
  const style = { ...(spec.defaults || {}), ...stored };
  listEl.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'group';
  h.textContent = 'Réglages du thème';
  listEl.appendChild(h);

  const save = async (key, value) => {
    const latest = await chrome.storage.local.get(spec.storage);
    await chrome.storage.local.set({ [spec.storage]: { ...spec.defaults, ...latest[spec.storage], [key]: value } });
  };

  for (const [key, label] of spec.toggles) {
    const { row } = makeRow(label);
    const control = switchEl(style[key] !== false, (on) => save(key, on));
    control.querySelector('input').setAttribute('aria-label', label);
    row.appendChild(control);
    listEl.appendChild(row);
  }
  for (const [key, label, options] of spec.choices) {
    const { row } = makeRow(label);
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    for (const [value, name] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      option.selected = style[key] === value;
      select.appendChild(option);
    }
    select.addEventListener('change', () => save(key, select.value));
    row.appendChild(select);
    listEl.appendChild(row);
  }
  const note = document.createElement('div');
  note.className = 'empty';
  note.textContent = 'Appliqué en direct sur Gmail, sans rechargement.';
  listEl.appendChild(note);
}

function renderEmpty(message) {
  listEl.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'empty';
  el.textContent = message;
  listEl.appendChild(el);
}

function updateCount(enabled) {
  const on = self.LAB_ITEMS.filter((i) => enabled[i.id] !== false).length;
  countEl.textContent = `${on}/${self.LAB_ITEMS.length}`;
}

function render(enabled, marginPct, theme, storedStyle) {
  if (theme === 'theme-pk') {
    toolsEl.style.display = '';
    renderTweaks(enabled, marginPct, toastSeconds);
  } else {
    toolsEl.style.display = 'none';
    if (!theme) renderEmpty('Gmail normal — aucun style appliqué.');
    else if ((self.THEME_SETTINGS || {})[theme]) renderThemeSettings(theme, storedStyle || {});
    else renderEmpty('Ce thème s’applique tel quel — aucun réglage.');
  }
}

async function loadState() {
  const styleKeys = Object.values(self.THEME_SETTINGS || {}).map(spec => spec.storage);
  const stored = await chrome.storage.local.get(['enabled', 'marginPct', 'toastSeconds', 'pkCategoryLabels', 'theme', ...styleKeys]);
  let { enabled = {}, marginPct = 5, toastSeconds: storedToast = 6, theme = '' } = stored;
  toastSeconds = Number(storedToast) || 6;
  categoryLabels = stored.pkCategoryLabels && typeof stored.pkCategoryLabels === 'object' ? stored.pkCategoryLabels : {};
  // Auto-réparation : des tweaks actifs sans thème sélectionné → contexte Studio.
  const known = self.LAB_THEMES.map((t) => t.id);
  if (!known.includes(theme) && self.LAB_ITEMS.some((i) => enabled[i.id] !== false)) {
    theme = 'theme-pk';
    await chrome.storage.local.set({ theme });
  }
  renderThemes(theme);
  render(enabled, marginPct, theme, stored[self.THEME_SETTINGS?.[theme]?.storage] || {});
}

// Reflect changes made from a theme's own settings dialog without stealing focus.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const theme = document.querySelector('input[name="theme"]:checked')?.value;
  const spec = self.THEME_SETTINGS?.[theme];
  if (!spec || !changes[spec.storage]) return;
  const style = { ...spec.defaults, ...changes[spec.storage].newValue };
  for (const [key, label] of spec.toggles) {
    const input = [...listEl.querySelectorAll('input[type=checkbox]')].find(el => el.getAttribute('aria-label') === label);
    if (input) input.checked = style[key] !== false;
  }
  for (const [key, label] of spec.choices) {
    const select = [...listEl.querySelectorAll('select')].find(el => el.getAttribute('aria-label') === label);
    if (select) select.value = style[key];
  }
});

async function persist(enabled) {
  await chrome.storage.local.set({ enabled });
}

async function toggle(id, on) {
  const { enabled = {} } = await chrome.storage.local.get('enabled');
  enabled[id] = on;
  await persist(enabled);
  updateCount(enabled);
  await chrome.runtime.sendMessage({ type: 'sync' });
}

async function setAll(on) {
  const enabled = {};
  for (const item of self.LAB_ITEMS) enabled[item.id] = on;
  await persist(enabled);
  render(enabled, 5, 'theme-pk', {});
  await chrome.runtime.sendMessage({ type: 'sync' });
}

document.getElementById('all-on').addEventListener('click', () => setAll(true));
document.getElementById('all-off').addEventListener('click', () => setAll(false));

loadState();
