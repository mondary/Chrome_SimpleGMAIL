// ==UserScript==
// @name         PK Gmail Sender Icons
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Display sender favicons in Gmail
// @author       You
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const FAVICON_SERVICE = 'https://www.google.com/s2/favicons?domain=';

    function extractDomain(email) {
        const match = email.match(/@([^>]+)/);
        return match ? match[1] : null;
    }

    function createFaviconElement(domain) {
        const img = document.createElement('img');
        img.src = FAVICON_SERVICE + domain;
        img.className = 'inboxsdk__button_iconImg';
        img.style.marginRight = '5px';
        img.style.verticalAlign = 'middle';
        return img;
    }

    function addIconsToEmails() {
        // Target both the inbox list and the email thread view
        const emailRows = document.querySelectorAll('tr.zA:not([data-has-icon="true"])');

        emailRows.forEach(row => {
            const nameElements = row.querySelectorAll('.yP, .zF');
            nameElements.forEach(nameElement => {
                const email = nameElement.getAttribute('email');
                if (!email) return;

                const domain = extractDomain(email);
                if (!domain) return;

                const favicon = createFaviconElement(domain);
                nameElement.insertBefore(favicon, nameElement.firstChild);
            });

            row.setAttribute('data-has-icon', 'true');
        });
    }

    // Create and add styles
    const style = document.createElement('style');
    style.textContent = `
        .inboxsdk__button_iconImg {
            width: 16px;
            height: 16px;
            margin-top: -3px;
        }
    `;
    document.head.appendChild(style);

    // Initial run and setup observer
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                addIconsToEmails();
                break;
            }
        }
    });

    // Start observing with a more specific target
    const mainContent = document.querySelector('.AO');
    if (mainContent) {
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    } else {
        // If main content is not found, observe body as fallback
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Run initial check
    addIconsToEmails();

    // Add periodic check for dynamically loaded content
    setInterval(addIconsToEmails, 2000);
})();