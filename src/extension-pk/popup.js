// PK Gmail Studio — panneau latéral. Section Scripts relative au thème actif.
const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const themesEl = document.getElementById('themes');
const toolsEl = document.querySelector('.list-tools');

function renderThemes(active) {
  if (!themesEl) return;
  themesEl.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'group';
  h.textContent = '✦ Thème';
  themesEl.appendChild(h);
  for (const t of self.LAB_THEMES) {
    const row = document.createElement('label');
    row.className = 'theme-row' + (active === t.id ? ' active' : '');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = t.id;
    input.checked = active === t.id;
    input.addEventListener('change', () => setTheme(t.id));
    const box = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = t.label;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = t.description;
    box.appendChild(name);
    box.appendChild(meta);
    row.appendChild(input);
    row.appendChild(box);
    themesEl.appendChild(row);
  }
  const upcoming = self.LAB_THEMES_UPCOMING || [];
  if (upcoming.length) {
    const h2 = document.createElement('div');
    h2.className = 'group';
    h2.textContent = '⋯ À transposer — thèmes du Lab';
    themesEl.appendChild(h2);
    for (const u of upcoming) {
      const row = document.createElement('div');
      row.className = 'theme-row upcoming';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = u.label;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = u.note + ' · en attente de transposition Gmail';
      row.appendChild(name);
      row.appendChild(meta);
      themesEl.appendChild(row);
    }
  }
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

function renderTweaks(enabled, marginPct) {
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
        const ctl = document.createElement('div');
        ctl.className = 'pct-ctl';
        const lbl = document.createElement('span');
        lbl.textContent = 'Marges';
        const range = document.createElement('input');
        range.type = 'range';
        range.min = '2';
        range.max = '25';
        range.step = '1';
        range.value = marginPct;
        const val = document.createElement('span');
        val.className = 'pct-val';
        val.textContent = marginPct + '%';
        range.addEventListener('input', async () => {
          val.textContent = range.value + '%';
          await chrome.storage.local.set({ marginPct: Number(range.value) });
        });
        range.addEventListener('change', () => chrome.runtime.sendMessage({ type: 'sync' }));
        ctl.appendChild(lbl);
        ctl.appendChild(range);
        ctl.appendChild(val);
        listEl.appendChild(ctl);
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
    style[key] = value;
    await chrome.storage.local.set({ [spec.storage]: { ...style } });
  };

  for (const [key, label] of spec.toggles) {
    const { row } = makeRow(label);
    row.appendChild(switchEl(style[key] !== false, (on) => save(key, on)));
    listEl.appendChild(row);
  }
  for (const [key, label, options] of spec.choices) {
    const { row } = makeRow(label);
    const select = document.createElement('select');
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
    renderTweaks(enabled, marginPct);
  } else {
    toolsEl.style.display = 'none';
    if (!theme) renderEmpty('Gmail normal — aucun style appliqué.');
    else if ((self.THEME_SETTINGS || {})[theme]) renderThemeSettings(theme, storedStyle || {});
    else renderEmpty('Ce thème s’applique tel quel — aucun réglage.');
  }
}

async function loadState() {
  let { enabled = {}, marginPct = 5, theme = '', pkGmailStyle = {} } =
    await chrome.storage.local.get(['enabled', 'marginPct', 'theme', 'pkGmailStyle']);
  // Auto-réparation : des tweaks actifs sans thème sélectionné → contexte Studio.
  const known = self.LAB_THEMES.map((t) => t.id);
  if (!known.includes(theme) && self.LAB_ITEMS.some((i) => enabled[i.id] !== false)) {
    theme = 'theme-pk';
    await chrome.storage.local.set({ theme });
  }
  renderThemes(theme);
  render(enabled, marginPct, theme, pkGmailStyle);
}

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
