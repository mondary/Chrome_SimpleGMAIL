// PK Gmail Studio — popup
const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const themesEl = document.getElementById('themes');

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
  // PK applique ses presets ; Gmail normal et Simplify coupent les tweaks.
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

function render(enabled, marginPct = 5) {
  listEl.innerHTML = '';
  const groups = [
    { key: 'new', title: '✦ Nouveau — à tester' },
    { key: 'ok', title: '✓ Indispensables — validés au test' },
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
      const row = document.createElement('div');
      row.className = 'row' + (item.status === 'ko' ? ' ko' : '') + (item.status === 'new' ? ' new' : '');

      const label = document.createElement('div');
      label.className = 'label';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.label;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const kind = item.type === 'css' ? 'CSS' : 'Script';
      meta.textContent = `${kind} · v${item.version}`;
      label.appendChild(name);
      label.appendChild(meta);

      const sw = document.createElement('label');
      sw.className = 'sw';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = enabled[item.id] !== false;
      input.addEventListener('change', () => toggle(item.id, input.checked));
      const track = document.createElement('span');
      track.className = 'track';
      sw.appendChild(input);
      sw.appendChild(track);

      row.appendChild(label);
      row.appendChild(sw);
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

function updateCount(enabled) {
  const on = self.LAB_ITEMS.filter((i) => enabled[i.id] !== false).length;
  countEl.textContent = `${on}/${self.LAB_ITEMS.length} scripts actifs`;
}

async function loadState() {
  const { enabled = {}, marginPct = 5, theme = '' } = await chrome.storage.local.get(['enabled', 'marginPct', 'theme']);
  renderThemes(theme);
  render(enabled, marginPct);
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
  render(enabled);
  await chrome.runtime.sendMessage({ type: 'sync' });
}

document.getElementById('all-on').addEventListener('click', () => setAll(true));
document.getElementById('all-off').addEventListener('click', () => setAll(false));

loadState();
