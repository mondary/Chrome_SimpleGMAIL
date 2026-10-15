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
  });

  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = { ...defaults };
    for (const key of ["enabled", "quietHeader", "hideAddons", "floatingCompose"]) {
      if (typeof source[key] === "boolean") result[key] = source[key];
    }
    if (["compact", "comfortable", "spacious"].includes(source.density)) result.density = source.density;
    if (["balanced", "wide", "full"].includes(source.width)) result.width = source.width;
    return result;
  }

  globalThis.PKGmailStyle = Object.freeze({ defaults, normalize, storageKey: "pkGmailStyle" });
})();
