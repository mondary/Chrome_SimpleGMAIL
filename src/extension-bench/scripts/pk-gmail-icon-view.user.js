// ==UserScript==
// @name         PK-GMAIL Icon View
// @namespace    https://github.com/mondary
// @author       cMondary
// @version      0.1
// @description  Ajoute une vue en icÃ´nes similaire au Finder d'Apple pour Gmail
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Styles pour la vue en icÃ´nes
    const style = document.createElement('style');
    style.textContent = `
        .icon-view-toggle {
            background-color: #f1f3f4;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-left: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 14px;
        }

        .icon-view-toggle:hover {
            background-color: #e8eaed;
        }

        .icon-view .zA {
            display: inline-block !important;
            width: 200px !important;
            height: 200px !important;
            margin: 10px !important;
            padding: 15px !important;
            border-radius: 10px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
            vertical-align: top !important;
            position: relative !important;
            background: white !important;
            transition: transform 0.2s, box-shadow 0.2s !important;
        }

        .icon-view .zA:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
        }

        .icon-view .zA .yO {
            background: transparent !important;
        }

        .icon-view .zA .y6 {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
        }

        .icon-view .zA .aDM {
            display: none !important;
        }

        .icon-view .zA .y6 .yX {
            order: 2;
            margin-top: 10px !important;
        }

        .icon-view .zA .y6 .y2 {
            order: 3;
            margin-top: 5px !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
        }

        .icon-view .zA .y6 .yW {
            order: 1;
            font-size: 1.1em !important;
            font-weight: bold !important;
            margin-bottom: 10px !important;
        }

        .icon-view .zA .av {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
        }

        .icon-view .zA .yf {
            position: absolute !important;
            bottom: 10px !important;
            right: 10px !important;
        }
    `;
    document.head.appendChild(style);

    // Fonction pour crÃ©er le bouton de basculement
    function createViewToggleButton() {
        const toolbarRight = document.querySelector('.G-tF');
        if (!toolbarRight || document.querySelector('.icon-view-toggle')) return;

        const toggleButton = document.createElement('button');
        toggleButton.className = 'icon-view-toggle';
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" d="M3 5v14h18V5H3zm16 12H5V7h14v10zm-12-1h2V8H7v8zm4 0h2V8h-2v8zm4 0h2V8h-2v8z"/>
            </svg>
            Vue icÃ´nes
        `;

        toggleButton.addEventListener('click', () => {
            const mailList = document.querySelector('.AO');
            if (mailList) {
                mailList.classList.toggle('icon-view');
                toggleButton.style.backgroundColor = mailList.classList.contains('icon-view') ? '#e8f0fe' : '#f1f3f4';
                toggleButton.style.color = mailList.classList.contains('icon-view') ? '#1a73e8' : 'inherit';
            }
        });

        toolbarRight.insertBefore(toggleButton, toolbarRight.firstChild);
    }

    // Observer pour dÃ©tecter les changements dans le DOM
    const observer = new MutationObserver(() => {
        createViewToggleButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // CrÃ©ation initiale du bouton
    createViewToggleButton();
})();