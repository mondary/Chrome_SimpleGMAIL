// --- GM shim (banc de test, monde isolé) ---
if (typeof GM_getValue === 'undefined') {
  window.GM_getValue = (k, d) => { try { const v = localStorage.getItem('gm:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  window.GM_setValue = (k, v) => { try { localStorage.setItem('gm:' + k, JSON.stringify(v)); } catch (e) {} };
}

// ==UserScript==
// @name         PK-GMAIL Custom Tabs
// @namespace    https://github.com/mondary
// @author       Cmondary
//
// @version      2.9
// @description  Ajoute trois onglets personnalisÃ©s Ã  Gmail pour filtrer les e-mails avec des labels choisis
// @match        https://mail.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    let customLabel1 = GM_getValue('customLabel1', 'WordPress');
    let customLabel2 = GM_getValue('customLabel2', 'label:ð-administratif-â¬-travaux');
    let customLabel3 = GM_getValue('customLabel3', 'label:WIP');
    let customColor1 = GM_getValue('customColor1', '#4986e7');
    let customColor2 = GM_getValue('customColor2', '#16a765');
    let customColor3 = GM_getValue('customColor3', '#ff9800');

    function getDisplayLabel(label) {
        const parts = label.split('-');
        return parts[parts.length - 1].trim();
    }

    function ajouterOngletPersonnalise(label, id) {
        const onglets = document.querySelectorAll('.aAy');
        if (onglets.length > 0 && !document.querySelector(`#custom-tab-${id}`)) {
            const dernierOnglet = onglets[onglets.length - 1];
            const nouvelOnglet = dernierOnglet.cloneNode(true);

            nouvelOnglet.id = `custom-tab-${id}`;
            const ongletTexte = nouvelOnglet.querySelector('.aKz');
            ongletTexte.textContent = getDisplayLabel(label);
            ongletTexte.setAttribute('data-tooltip', `Messages liÃ©s Ã  ${label}`);

            // Appliquer la couleur de fond Ã  l'onglet
            const color = id === 1 ? customColor1 : (id === 2 ? customColor2 : customColor3);
            nouvelOnglet.style.backgroundColor = color;
            nouvelOnglet.style.borderTopLeftRadius = '8px';
            nouvelOnglet.style.borderTopRightRadius = '8px';

            // Ajuster la couleur du texte pour le contraste
            ongletTexte.style.color = getContrastColor(color);

            // Modifier le picto de fond
            const pictoFond = nouvelOnglet.querySelector('.aKp');
            if (pictoFond) {
                pictoFond.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23FFFFFF\'%3E%3Cpath d=\'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16zM16 17H5V7h11l3.55 5L16 17z\'/%3E%3C/svg%3E")';
                pictoFond.style.backgroundSize = 'contain';
                pictoFond.style.backgroundRepeat = 'no-repeat';
                pictoFond.style.backgroundPosition = 'center';
            }

            // Ajouter le picto crayon Ã  droite du label
            const pictoCrayon = document.createElement('span');
            pictoCrayon.textContent = 'â';
            pictoCrayon.style.marginLeft = '5px';
            pictoCrayon.style.cursor = 'pointer';
            pictoCrayon.style.fontWeight = 'bold';
            pictoCrayon.setAttribute('title', 'Configurer le label');
            pictoCrayon.addEventListener('click', (e) => {
                e.stopPropagation();
                configurerLabel(id);
            });
            ongletTexte.appendChild(pictoCrayon);

            nouvelOnglet.addEventListener('click', (e) => filtrerLabel(e, label, id));

            // Ajuster le positionnement
            const conteneurOnglets = dernierOnglet.closest('.aKk');
            if (conteneurOnglets) {
                const nouvelleCellule = document.createElement('td');
                nouvelleCellule.className = 'aRz J-KU';
                nouvelleCellule.setAttribute('role', 'heading');
                nouvelleCellule.setAttribute('aria-level', '3');
                nouvelleCellule.style.width = 'auto';
                nouvelleCellule.style.position = 'relative';
                nouvelleCellule.appendChild(nouvelOnglet);

                // Ajouter la poignÃ©e de redimensionnement
                const resizeHandle = document.createElement('div');
                resizeHandle.style.width = '5px';
                resizeHandle.style.height = '100%';
                resizeHandle.style.position = 'absolute';
                resizeHandle.style.left = '0';
                resizeHandle.style.top = '0';
                resizeHandle.style.cursor = 'ew-resize';
                resizeHandle.style.zIndex = '1000';
                nouvelleCellule.appendChild(resizeHandle);

                // Ajouter la fonctionnalitÃ© de redimensionnement
                let isResizing = false;
                let startX, startWidth;

                resizeHandle.addEventListener('mousedown', (e) => {
                    isResizing = true;
                    startX = e.clientX;
                    startWidth = parseInt(document.defaultView.getComputedStyle(nouvelleCellule).width, 10);
                    e.preventDefault();
                    e.stopPropagation();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isResizing) return;
                    const width = startWidth + (startX - e.clientX);
                    nouvelleCellule.style.width = `${Math.max(width, 100)}px`;
                });

                document.addEventListener('mouseup', () => {
                    isResizing = false;
                });

                const ligneOnglets = conteneurOnglets.querySelector('tr');
                ligneOnglets.insertBefore(nouvelleCellule, ligneOnglets.lastElementChild);
            }
        }
    }

    function getContrastColor(hexcolor) {
        const r = parseInt(hexcolor.substr(1,2),16);
        const g = parseInt(hexcolor.substr(3,2),16);
        const b = parseInt(hexcolor.substr(5,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    function filtrerLabel(event, label, id) {
        if (event.target.tagName.toLowerCase() === 'span') return;
        event.preventDefault();
        event.stopPropagation();

        const lienFiltre = document.createElement('a');
        lienFiltre.href = `#label/${encodeURIComponent(label.replace('label:', ''))}`;
        lienFiltre.style.display = 'none';
        document.body.appendChild(lienFiltre);
        lienFiltre.click();
        document.body.removeChild(lienFiltre);

        setTimeout(() => {
            ajouterOngletPersonnalise(label, id);
            const customTab = document.querySelector(`#custom-tab-${id}`);
            if (customTab) {
                document.querySelectorAll('.aAy').forEach(onglet => onglet.setAttribute('aria-selected', 'false'));
                customTab.setAttribute('aria-selected', 'true');
            }
        }, 500);
    }

    function configurerLabel(id) {
        const labelActuel = id === 1 ? customLabel1 : (id === 2 ? customLabel2 : customLabel3);
        const couleurActuelle = id === 1 ? customColor1 : (id === 2 ? customColor2 : customColor3);

        const nouveauLabel = prompt('Entrez le nom complet du label Ã  afficher :', labelActuel);
        if (nouveauLabel !== null) {
            const nouvelleCouleur = prompt('Entrez une couleur au format hexadÃ©cimal (ex: #4986e7) :', couleurActuelle);
            if (nouvelleCouleur !== null) {
                if (id === 1) {
                    customLabel1 = nouveauLabel;
                    customColor1 = nouvelleCouleur;
                    GM_setValue('customLabel1', customLabel1);
                    GM_setValue('customColor1', customColor1);
                } else if (id === 2) {
                    customLabel2 = nouveauLabel;
                    customColor2 = nouvelleCouleur;
                    GM_setValue('customLabel2', customLabel2);
                    GM_setValue('customColor2', customColor2);
                } else {
                    customLabel3 = nouveauLabel;
                    customColor3 = nouvelleCouleur;
                    GM_setValue('customLabel3', customLabel3);
                    GM_setValue('customColor3', customColor3);
                }
                location.reload();
            }
        }
    }

    function verifierEtAjouter() {
        ajouterOngletPersonnalise(customLabel1, 1);
        ajouterOngletPersonnalise(customLabel2, 2);
        ajouterOngletPersonnalise(customLabel3, 3);
    }

    window.addEventListener('load', () => {
        setTimeout(verifierEtAjouter, 1000);
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                verifierEtAjouter();
            }
        });
    });

    const config = { childList: true, subtree: true };
    observer.observe(document.body, config);
})();