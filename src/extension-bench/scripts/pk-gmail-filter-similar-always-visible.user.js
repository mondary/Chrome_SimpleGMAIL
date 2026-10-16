// ==UserScript==
// @name         PK Gmail - Filter Similar Always Visible
// @namespace    https://github.com/mondary
// @version      1.33
// @description  Bouton picto dans la toolbar message Gmail pour lancer "Filtrer les messages similaires".
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        shortcut: 'Alt+Shift+F',
        buttonTitle: 'Filtrer les messages similaires',
        refreshMs: 900,
        debugRed: false
    };

    const IDS = {
        button: 'pk-filter-similar-btn',
        style: 'pk-filter-similar-style'
    };

    function normalizeText(value) {
        return (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && st.display !== 'none' && st.visibility !== 'hidden';
    }

    function normalizeShortcut(raw) {
        const fallback = 'Alt+Shift+F';
        if (!raw || typeof raw !== 'string') return fallback;

        const parts = raw.split('+').map((p) => p.trim()).filter(Boolean);
        if (!parts.length) return fallback;

        let ctrl = false;
        let alt = false;
        let shift = false;
        let cmd = false;
        let key = '';

        parts.forEach((part) => {
            const t = part.toLowerCase();
            if (t === 'ctrl' || t === 'control') return void (ctrl = true);
            if (t === 'alt' || t === 'option') return void (alt = true);
            if (t === 'shift') return void (shift = true);
            if (t === 'cmd' || t === 'command' || t === 'meta') return void (cmd = true);
            key = part;
        });

        if (!key) key = 'F';
        key = key.length === 1 ? key.toUpperCase() : key;

        const out = [];
        if (ctrl) out.push('Ctrl');
        if (cmd) out.push('Cmd');
        if (alt) out.push('Alt');
        if (shift) out.push('Shift');
        out.push(key);
        return out.join('+');
    }

    function parseShortcut(raw) {
        const parts = normalizeShortcut(raw).split('+');
        return {
            ctrl: parts.includes('Ctrl'),
            cmd: parts.includes('Cmd'),
            alt: parts.includes('Alt'),
            shift: parts.includes('Shift'),
            key: parts[parts.length - 1]
        };
    }

    function eventKey(k) {
        if (!k) return '';
        if (k === ' ') return 'Space';
        return k.length === 1 ? k.toUpperCase() : k;
    }

    function inTypingField(target) {
        if (!target || !target.tagName) return false;
        const tag = target.tagName.toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target.isContentEditable;
    }

    function clickLikeUser(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 1,
            clientX: Math.max(1, Math.floor(rect.left + rect.width / 2)),
            clientY: Math.max(1, Math.floor(rect.top + rect.height / 2))
        };
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
            el.dispatchEvent(new MouseEvent(type, eventInit));
        });
        if (typeof el.click === 'function') el.click();
    }

    function labelOf(el) {
        if (!el) return '';
        return normalizeText([
            el.getAttribute('title') || '',
            el.getAttribute('aria-label') || '',
            el.getAttribute('data-tooltip') || ''
        ].join(' '));
    }

    function isLabelsButton(el) {
        const l = labelOf(el);
        return l === 'libelles' || l === 'labels' || /(^| )libelles( |$)/.test(l) || /(^| )labels( |$)/.test(l);
    }

    function isMoreButton(el) {
        const l = labelOf(el);
        return /(^| )plus( |$)/.test(l) ||
            /plus d['â]actions?/.test(l) ||
            /plus d['â]options?/.test(l) ||
            /more actions?/.test(l) ||
            /more options?/.test(l);
    }

    function getActiveToolbar() {
        const roots = Array.from(document.querySelectorAll('.aeH .iH.bzn[gh="mtb"]')).filter(isVisible);
        for (const root of roots) {
            const buttons = Array.from(root.querySelectorAll('[role="button"]')).filter(isVisible);
            const labels = buttons.find(isLabelsButton);
            const more = buttons.find(isMoreButton);
            if (labels && more) return { root, labels, more };
        }
        return null;
    }

    function findFilterMenuItem() {
        const nodes = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="menuitemcheckbox"], div[role="menuitemradio"]'));
        return nodes.find((n) => {
            if (!isVisible(n)) return false;
            const t = normalizeText(`${n.textContent || ''} ${n.getAttribute('aria-label') || ''}`);
            return /filtrer.*messages?.*similaires?/.test(t) ||
                /filtrer.*messages?.*ce type/.test(t) ||
                /filter.*messages?.*like.*this/.test(t) ||
                /filter.*messages?.*like.*these/.test(t) ||
                /similar.*messages?/.test(t);
        }) || null;
    }

    function isCreateFilterPopupOpen() {
        const hints = Array.from(document.querySelectorAll('button, div[role="button"], span, a, label'))
            .filter(isVisible);
        return hints.some((el) => {
            const txt = normalizeText(`${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`);
            return txt.includes('creer un filtre') ||
                txt.includes('create filter') ||
                txt === 'de' ||
                txt === 'a' ||
                txt === 'objet' ||
                txt.includes('contient les mots') ||
                txt.includes('ne contient pas');
        });
    }

    function closeCreateFilterPopupOnce() {
        const clickable = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], a[role="button"]'))
            .filter(isVisible);

        // IMPORTANT: on ne clique QUE les variantes "fermer/masquer" pour Ã©viter le blink.
        const closeSearchOptionsBtn = clickable.find((el) => {
            const txt = normalizeText(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.getAttribute('data-tooltip') || ''}`);
            return txt.includes('fermer les options de recherche') ||
                txt.includes('masquer les options de recherche') ||
                txt.includes('close search options') ||
                txt.includes('hide search options');
        });

        if (closeSearchOptionsBtn) {
            clickLikeUser(closeSearchOptionsBtn);
            return;
        }

        const genericCloseBtn = clickable.find((el) => {
            const txt = normalizeText(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`);
            return txt === 'fermer' || txt === 'close' || txt.includes('fermer les options') || txt.includes('close search');
        });

        if (genericCloseBtn) {
            clickLikeUser(genericCloseBtn);
            return;
        }

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
    }

    function closeCreateFilterPopup() {
        let tries = 0;
        const max = 5;
        const timer = window.setInterval(() => {
            tries += 1;
            closeCreateFilterPopupOnce();

            if (!isCreateFilterPopupOpen() || tries >= max) {
                window.clearInterval(timer);
            }
        }, 120);
    }

    function activateFilterItem(item) {
        if (!item) return;
        const target = item;
        if (typeof target.focus === 'function') target.focus();
        clickLikeUser(target);

        window.setTimeout(() => {
            const stillOpen = document.contains(target) && isVisible(target);
            if (!stillOpen) return;

            target.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));
            target.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            // Reproduit le reclic manuel quand Gmail ne valide pas au premier passage.
            clickLikeUser(target);
        }, 80);

        // Ferme automatiquement la popup "CrÃ©er un filtre" (options de recherche).
        window.setTimeout(closeCreateFilterPopup, 200);
    }

    function runFilterAction() {
        const ctx = getActiveToolbar();
        if (!ctx) {
            console.warn('[PK] Toolbar message gh="mtb" introuvable.');
            return;
        }

        const openMenu = () => clickLikeUser(ctx.more);
        openMenu();

        let tries = 0;
        const max = 18;
        const timer = window.setInterval(() => {
            tries += 1;
            const item = findFilterMenuItem();
            if (item) {
                window.clearInterval(timer);
                activateFilterItem(item);
                return;
            }

            if (tries === 5 || tries === 10 || tries === 14) {
                openMenu();
            }

            if (tries >= max) {
                window.clearInterval(timer);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                console.warn('[PK] Action introuvable. Ouvre/sÃ©lectionne un mail puis rÃ©essaie.');
            }
        }, 90);
    }

    function ensureStyle() {
        if (document.getElementById(IDS.style)) return;
        const style = document.createElement('style');
        style.id = IDS.style;
        style.textContent = `
            #${IDS.button} {
                min-width: 30px;
                min-height: 24px;
                display: flex;
                align-items: center;
                padding: 2px 2px 3px 6px;
            }
            #${IDS.button} .asa {
                display: flex;
                align-items: center;
                justify-content: center;
                padding-bottom: 1px;
            }
            #${IDS.button} .pk-icon-real {
                width: 20px;
                height: 20px;
                transform: translateY(-1px);
            }
            #${IDS.button}.pk-debug {
                border: 1px solid #d93025;
                border-radius: 12px;
                background: rgba(217,48,37,0.08);
            }
        `;
        document.head.appendChild(style);
    }

    function buildButton() {
        const btn = document.createElement('div');
        btn.id = IDS.button;
        btn.className = `T-I J-J5-Ji T-I-ax7 L3${CONFIG.debugRed ? ' pk-debug' : ''}`;
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('title', CONFIG.buttonTitle);
        btn.setAttribute('aria-label', CONFIG.buttonTitle);
        btn.style.userSelect = 'none';

        const asa = document.createElement('div');
        asa.className = 'asa';
        const icon = document.createElement('div');
        // Picto Gmail natif (sans libellÃ©)
        icon.className = 'pk-icon-real CpJapb sVHnob J-N-JX';
        icon.style.userSelect = 'none';
        asa.appendChild(icon);

        btn.appendChild(asa);

        btn.addEventListener('click', runFilterAction);
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                runFilterAction();
            }
        });

        return btn;
    }

    function placeButton() {
        const ctx = getActiveToolbar();
        let btn = document.getElementById(IDS.button);

        if (!ctx) {
            if (btn) btn.remove();
            return;
        }

        const parent = ctx.labels.parentElement;
        if (!parent) return;

        if (btn && btn.parentElement !== parent) {
            btn.remove();
            btn = null;
        }

        if (!btn) {
            btn = buildButton();
        }

        if (ctx.labels.nextSibling !== btn) {
            if (ctx.labels.nextSibling) parent.insertBefore(btn, ctx.labels.nextSibling);
            else parent.appendChild(btn);
        }
    }

    function bindShortcut() {
        const s = parseShortcut(CONFIG.shortcut);
        document.addEventListener('keydown', (e) => {
            if (e.repeat || inTypingField(e.target)) return;
            if (!!e.ctrlKey !== s.ctrl) return;
            if (!!e.metaKey !== s.cmd) return;
            if (!!e.altKey !== s.alt) return;
            if (!!e.shiftKey !== s.shift) return;
            if (eventKey(e.key) !== s.key) return;
            e.preventDefault();
            e.stopPropagation();
            runFilterAction();
        }, true);
    }

    function init() {
        ensureStyle();
        placeButton();
        bindShortcut();

        const mo = new MutationObserver(() => placeButton());
        mo.observe(document.body, { childList: true, subtree: true });
        window.setInterval(placeButton, CONFIG.refreshMs);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
