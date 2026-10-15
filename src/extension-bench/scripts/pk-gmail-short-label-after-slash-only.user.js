// ==UserScript==
// @name         PK-GMAIL Short Label (After Slash Only)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Afficher uniquement la partie après le "/" dans les labels Gmail
// @author       Clément
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Fonction pour nettoyer un label en gardant uniquement la partie après "/"
  function cleanLabel(labelElement) {
    const labelText = labelElement.innerText.trim(); // Récupérer le texte du label
    const slashIndex = labelText.indexOf('/'); // Trouver la position du "/"

    if (slashIndex !== -1) {
      labelElement.innerText = labelText.substring(slashIndex + 1); // Garder la partie après "/"
    }
  }

  // Fonction pour nettoyer tous les labels trouvés
  function cleanLabels() {
    const labels = document.querySelectorAll('.av'); // Sélectionner tous les éléments avec la classe ".av"

    labels.forEach(function (labelElement) {
      cleanLabel(labelElement); // Nettoyer chaque label
    });
  }

  // Observer les modifications du DOM (pour attraper l'ajout de nouveaux labels)
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Vérifier si le nœud est un élément HTML
            cleanLabels(); // Appliquer la fonction de nettoyage
          }
        });
      }
    });
  });

  // Commencer à observer les changements dans le body
  observer.observe(document.body, { childList: true, subtree: true });

  // Nettoyer immédiatement les labels présents au chargement
  cleanLabels();
})();
