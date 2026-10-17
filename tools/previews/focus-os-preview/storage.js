/* Browser-only chrome.storage stand-in for synthetic previews and panel tests. */
(() => {
  const key = 'focus-preview-storage';
  const listeners = new Set();
  const read = () => JSON.parse(localStorage.getItem(key) || '{"theme":"theme-focus-os"}');
  const notify = (before, after) => {
    const changes = {};
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[name]) !== JSON.stringify(after[name])) changes[name] = { oldValue: before[name], newValue: after[name] };
    }
    for (const listener of listeners) listener(changes, 'local');
  };
  window.chrome = {
    runtime: {
      getURL: path => new URL('/src/extension-pk/' + path, location.origin).href,
      sendMessage: async () => ({ ok: true }),
    },
    storage: {
      local: {
        get: async names => {
          const state = read();
          return Object.fromEntries((typeof names === 'string' ? [names] : names || Object.keys(state)).map(name => [name, state[name]]));
        },
        set: async values => {
          const before = read(), after = { ...before, ...values };
          localStorage.setItem(key, JSON.stringify(after)); notify(before, after);
        },
      },
      onChanged: { addListener: listener => listeners.add(listener) },
    },
  };
  window.addEventListener('storage', event => {
    if (event.key === key) notify(JSON.parse(event.oldValue || '{}'), JSON.parse(event.newValue || '{}'));
  });
})();
