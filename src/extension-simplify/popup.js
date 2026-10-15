(() => {
  "use strict";
  const { defaults, normalize, storageKey } = globalThis.PKGmailStyle;
  const status = document.getElementById("status");
  const enabled = document.getElementById("enabled");
  const appearance = document.getElementById("appearance");
  const reset = document.getElementById("reset");
  let current = { ...defaults };
  let pending = Promise.resolve();

  function render() {
    for (const [key, value] of Object.entries(current)) {
      const input = document.getElementById(key);
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
    }
    appearance.disabled = !current.enabled;
    status.removeAttribute("data-error");
    status.textContent = current.enabled ? "Appliqué aux onglets Gmail ouverts." : "Surcouche en pause. Gmail retrouve son apparence.";
  }

  function save(next) {
    const value = normalize(next);
    current = value;
    render();
    status.textContent = "Enregistrement…";
    // Serialize rapid changes so an older write cannot overwrite a newer selection.
    pending = pending.then(() => chrome.storage.local.set({ [storageKey]: value }))
      .then(() => { if (current === value) render(); })
      .catch(() => {
        status.dataset.error = "true";
        status.textContent = "Enregistrement impossible. Fermez puis rouvrez ce panneau.";
      });
  }

  enabled.disabled = true;
  chrome.storage.local.get(storageKey).then(data => {
    current = normalize(data[storageKey]);
    render();
    enabled.disabled = false;
    reset.disabled = false;
    document.addEventListener("change", event => {
      const input = event.target;
      if (!Object.hasOwn(defaults, input.id)) return;
      save({ ...current, [input.id]: input.type === "checkbox" ? input.checked : input.value });
    });
    reset.addEventListener("click", () => save({ ...defaults }));
  }).catch(() => {
    status.dataset.error = "true";
    status.textContent = "Impossible de lire les réglages. Rechargez l’extension.";
  });
})();
