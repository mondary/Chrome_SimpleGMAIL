// ==UserScript==
// @name         PK-GMAIL No Spam Icon
// @namespace    https://github.com/mondary
// @author       cMondary
// @version      0.2
// @description  Coche verte quand le dossier spam affiche « OK, aucun spam » (v0.2 : remplacement du sélecteur CSS :contains() invalide par un scan JS)
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .pk-no-spam-ok {
      display: flex;
      align-items: center;
      color: #34A853;
      font-weight: 500;
    }
    .pk-no-spam-ok::before {
      content: '';
      display: inline-block;
      width: 24px;
      height: 24px;
      margin-right: 8px;
      vertical-align: middle;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2334A853'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
  `;
  document.head.appendChild(style);

  const TARGETS = [
    'OK, aucun spam',
    'Super, aucun spam',
    'Aucun spam',
    "You don't have any spam. Nice job!",
    'No spam here!',
  ];

  function decorate() {
    for (const el of document.querySelectorAll('.TC, .TC div, .n4')) {
      if (el.classList.contains('pk-no-spam-ok')) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (TARGETS.includes(text)) el.classList.add('pk-no-spam-ok');
    }
  }

  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      decorate();
    }, 300);
  });

  function start() {
    decorate();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
