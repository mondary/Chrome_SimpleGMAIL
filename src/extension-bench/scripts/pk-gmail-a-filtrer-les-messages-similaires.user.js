// ==UserScript==
// @name         Gmail â Filtrer les messages similaires
// @namespace    https://scriptcat.org
// @version      3.0
// @description  Ajoute le bouton "Filtrer les messages similaires" directement dans la barre d'outils Gmail
// @author       Vous
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_LABEL = 'Filtrer les messages similaires';

  function createFilterButton(onClickFn) {
    const wrapper = document.createElement('div');
    wrapper.className = 'G-Ni J-J5-Ji';
    wrapper.setAttribute('data-custom-filter-btn', '1');

    const btn = document.createElement('div');
    btn.className = 'T-I J-J5-Ji nf T-I-ax7 L3';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('title', BUTTON_LABEL);
    btn.setAttribute('aria-label', BUTTON_LABEL);
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:0 8px;';

    // Conteneur interne (comme les autres boutons Gmail)
    const asa = document.createElement('div');
    asa.className = 'asa';
    asa.style.cssText = 'display:flex;align-items:center;gap:5px;';

    // IcÃ´ne SVG construite sans innerHTML
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flexShrink = '0';

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3');
    svg.appendChild(polygon);

    // Texte du bouton
    const label = document.createElement('span');
    label.style.cssText = "font-size:13px;font-family:'Google Sans',Roboto,sans-serif;white-space:nowrap;";
    label.textContent = BUTTON_LABEL;

    asa.appendChild(svg);
    asa.appendChild(label);
    btn.appendChild(asa);
    wrapper.appendChild(btn);

    btn.addEventListener('click', onClickFn);
    return wrapper;
  }

  function triggerNativeFilter() {
    const moreBtn = document.querySelector('[aria-label="Plus d\'options"]');
    if (!moreBtn) return;

    moreBtn.click();

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 30) { clearInterval(interval); return; }

      const items = document.querySelectorAll('[role="menuitem"]');
      for (const item of items) {
        const text = item.textContent || '';
        if (
          text.includes('Filtrer les messages similaires') ||
          text.includes('Filter messages like these')
        ) {
          item.click();
          clearInterval(interval);
          return;
        }
      }
    }, 100);
  }

  function injectButton() {
    if (document.querySelector('[data-custom-filter-btn="1"]')) return;

    const toolbar = document.querySelector('div[gh="tm"] .iH');
    if (!toolbar) return;

    const moreContainer = toolbar.querySelector('[aria-label="Plus d\'options"]')?.closest('.G-Ni');
    if (!moreContainer) return;

    const filterBtn = createFilterButton(triggerNativeFilter);
    toolbar.insertBefore(filterBtn, moreContainer);
  }

  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(injectButton, 1000);

})();