// ==UserScript==
// @name         PK Gmail Bouton Inbox - Vue Liste Strict
// @namespace    https://github.com/mondary
// @version      11.0
// @description  Affiche "Nouveau mail" uniquement sur la vue liste de l'inbox (#inbox) et le cache dans les messages/labels/autres vues. DÃ©tection amÃ©liorÃ©e URL+DOM+history API.
// @author       cMondary
// @match        https://mail.google.com/mail/u/*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'pk-nouveau-mail-btn-inbox-only';
    const COMPOSE_BUTTON_SELECTOR = 'div[role="button"][gh="cm"]';
    const LIST_VIEW_SELECTOR = 'div[role="main"] table[role="grid"] tr[role="row"]';
    const COMPOSE_URL = 'https://mail.google.com/mail/u/0/#inbox?compose=new';

    let debounceTimer = null;

    function triggerCompose() {
        window.location.href = COMPOSE_URL;
    }

    function createButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const styleId = 'pk-nouveau-mail-style';
        if (!document.getElementById(styleId)) {
            const s = document.createElement('style');
            s.id = styleId;
            s.textContent = `
                #${BUTTON_ID} {
                    position: fixed; bottom: 32px; right: 64px; z-index: 2147483647;
                    background: #1a73e8; color: #fff; border: none; border-radius: 50px;
                    padding: 12px 22px; font-size: 16px;
                    font-family: 'Google Sans', Arial, sans-serif;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                    cursor: pointer; transition: background 0.15s, opacity 0.15s;
                    opacity: 0.96;
                }
                #${BUTTON_ID}:hover { background: #1765c1; opacity: 1; }
            `;
            document.head.appendChild(s);
        }

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.type = 'button';
        btn.innerText = 'Nouveau mail';
        btn.addEventListener('click', triggerCompose);
        document.body.appendChild(btn);
    }

    function removeButton() {
        const el = document.getElementById(BUTTON_ID);
        if (el) el.remove();
    }

    function shouldShowButton() {
        const rawHash = window.location.hash || '';
        const hash = rawHash.split('?')[0];
        const isInboxRootHash = (hash === '#inbox' || hash === '#inbox/');
        const isOpenMessageHash = /\/FM[A-Za-z0-9_-]+/.test(hash);
        const listRows = document.querySelector(LIST_VIEW_SELECTOR);
        const isListViewPresent = !!listRows;
        if (isInboxRootHash && isListViewPresent && !isOpenMessageHash) return true;
        return false;
    }

    function updateButtonDebounced() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                if (shouldShowButton()) createButton();
                else removeButton();
            } catch (e) {
                console.error('PK Gmail bouton error:', e);
            }
        }, 120);
    }

    function startMainObserver() {
        const main = document.querySelector('div[role="main"]');
        if (!main) return;
        const mo = new MutationObserver(updateButtonDebounced);
        mo.observe(main, { childList: true, subtree: true });
        return mo;
    }

    function hookHistoryEvents() {
        const _push = history.pushState;
        const _replace = history.replaceState;
        history.pushState = function() {
            const res = _push.apply(this, arguments);
            window.dispatchEvent(new Event('locationchange'));
            return res;
        };
        history.replaceState = function() {
            const res = _replace.apply(this, arguments);
            window.dispatchEvent(new Event('locationchange'));
            return res;
        };
        window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
    }

    function safeInit() {
        updateButtonDebounced();
        hookHistoryEvents();
        window.addEventListener('locationchange', updateButtonDebounced);
        window.addEventListener('hashchange', updateButtonDebounced);

        const tryAttach = () => {
            const main = document.querySelector('div[role="main"]');
            if (main) {
                startMainObserver();
                updateButtonDebounced();
                clearInterval(attInterval);
            }
        };
        const attInterval = setInterval(tryAttach, 400);
        setTimeout(() => clearInterval(attInterval), 20000);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        safeInit();
    } else {
        window.addEventListener('DOMContentLoaded', safeInit);
    }

})(); 
