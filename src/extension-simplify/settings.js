/* Shared by the isolated content script and the extension popup. */
(() => {
  "use strict";
  const defaults = Object.freeze({
    enabled: true,
    density: "comfortable",
    width: "balanced",
    quietHeader: true,
    hideAddons: true,
    floatingCompose: true,
    headerActions: true,
    inboxZero: true,
    groupDates: true,
    background: "native",
    backgroundScope: "always",
    imageData: "",
  });

  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = { ...defaults };
    for (const key of ["enabled", "quietHeader", "hideAddons", "floatingCompose", "headerActions", "inboxZero", "groupDates"]) {
      if (typeof source[key] === "boolean") result[key] = source[key];
    }
    if (["compact", "comfortable", "spacious"].includes(source.density)) result.density = source.density;
    if (["balanced", "wide", "full"].includes(source.width)) result.width = source.width;
    if (["native", "white", "ocean", "night", "custom"].includes(source.background)) result.background = source.background;
    if (["always", "empty"].includes(source.backgroundScope)) result.backgroundScope = source.backgroundScope;
    if (typeof source.imageData === "string" && source.imageData.length <= 4_500_000 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source.imageData)) result.imageData = source.imageData;
    return result;
  }

  async function readBackground(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15_000_000) throw new Error("Choisissez un JPEG, PNG ou WebP de moins de 15 Mo.");
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", .85);
      if (data.length > 4_500_000) throw new Error("Cette image reste trop volumineuse. Choisissez une image plus petite.");
      return data;
    } finally { bitmap.close(); }
  }

  globalThis.PKGmailStyle = Object.freeze({ defaults, normalize, readBackground, storageKey: "pkGmailStyle" });
})();
