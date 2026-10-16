(() => {
  "use strict";
  const { defaults, normalize, readBackground, storageKey } = globalThis.PKGmailStyle;
  const status = document.getElementById("status");
  const enabled = document.getElementById("enabled");
  const appearance = document.getElementById("appearance");
  const reset = document.getElementById("reset");
  let current = { ...defaults };
  let pending = Promise.resolve();

  function render() {
    for (const [key, value] of Object.entries(current)) {
      const input = document.getElementById(key);
      if (!input) continue;
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
    }
    appearance.disabled = !current.enabled;
    status.removeAttribute("data-error");
    status.textContent = current.enabled ? "Appliqué aux onglets Gmail ouverts." : "Surcouche en pause. Gmail retrouve son apparence.";
  }

  function save(patch) {
    const value = normalize({ ...current, ...patch });
    current = value;
    render();
    status.textContent = "Enregistrement…";
    // Serialize rapid changes so an older write cannot overwrite a newer selection.
    pending = pending.then(async () => {
      const stored = await chrome.storage.local.get(storageKey);
      await chrome.storage.local.set({ [storageKey]: normalize({ ...stored[storageKey], ...patch }) });
    })
      .then(() => { if (current === value) render(); })
      .catch(() => {
        status.dataset.error = "true";
        status.textContent = "Enregistrement impossible. Fermez puis rouvrez ce panneau.";
      });
  }

  enabled.disabled = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[storageKey]) {
      current = normalize(changes[storageKey].newValue);
      render();
    }
  });
  chrome.storage.local.get(storageKey).then(data => {
    current = normalize(data[storageKey]);
    render();
    enabled.disabled = false;
    reset.disabled = false;
    document.addEventListener("change", event => {
      const input = event.target;
      if (!Object.hasOwn(defaults, input.id)) return;
      save({ [input.id]: input.type === "checkbox" ? input.checked : input.value });
    });
    reset.addEventListener("click", () => save({ ...defaults }));
    document.getElementById("backgroundFile").addEventListener("change", async event => {
      try { const imageData = await readBackground(event.target.files[0]); save({ imageData, background: "custom" }); }
      catch (error) { status.dataset.error = "true"; status.textContent = error.message; }
    });
  }).catch(() => {
    status.dataset.error = "true";
    status.textContent = "Impossible de lire les réglages. Rechargez l’extension.";
  });
})();
