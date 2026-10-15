// ==UserScript==
// @name         PK Gmail New Message Button
// @namespace    https://github.com/mondary
// @version      2.1
// @description  Bouton flottant « Nouveau message » : visible sur la liste, masqué en lecture (v2.0 : ancrage mort remplacé par un FAB autonome)
// @author       cMondary
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('pk-new-message-fab')) return;

    const style = document.createElement('style');
    style.textContent = `
        #pk-new-message-fab {
            position: fixed;
            right: 24px;
            bottom: 72px;
            z-index: 2147483000;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 22px;
            border: none;
            border-radius: 9999px;
            background: #c2e7ff;
            color: #001d35;
            font: 500 14px/1 "Google Sans", Roboto, Arial, sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
            transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }
        #pk-new-message-fab:hover {
            background: #95d1ff;
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        }
        #pk-new-message-fab.pk-fab-hidden {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    const fab = document.createElement('button');
    fab.id = 'pk-new-message-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Nouveau message');
    fab.textContent = '＋ Nouveau message';

    fab.addEventListener('click', () => {
        // 1er choix : cliquer le vrai bouton Composer de Gmail (ouvre la fenêtre sans naviguer)
        const composeBtn = document.querySelector('.T-I-KE');
        if (composeBtn) {
            composeBtn.click();
            return;
        }
        // Repli : le hash ?compose=new, en conservant le dossier courant
        const base = (location.hash || '#inbox').split('?')[0];
        location.hash = base + '?compose=new';
    });

    // Visible uniquement quand la liste de mails est affichée (.bkK visible),
    // masqué en lecture d'une conversation.
    let lastVisible = null;
    function update() {
        const list = document.querySelector('.bkK');
        const isVisible = Boolean(list && list.offsetParent !== null);
        if (isVisible !== lastVisible) {
            lastVisible = isVisible;
            fab.classList.toggle('pk-fab-hidden', !isVisible);
        }
    }

    let timer = null;
    const observer = new MutationObserver(() => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            update();
        }, 250);
    });

    function start() {
        document.body.appendChild(fab);
        update();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
