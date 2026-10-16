# Confidentialité — PK Gmail Studio

PK Gmail Studio modifie l'apparence de Gmail dans le navigateur.

- Les scripts et feuilles de style s'exécutent uniquement sur `https://mail.google.com/*`
  (champ `host_permissions` du manifeste, `matches` des enregistrements `chrome.scripting`).
- Ils recherchent les éléments d'interface nécessaires à la mise en page : menu, liste,
  vue de lecture et bouton de rédaction. Les dates visibles, les libellés et le compteur
  de messages sont lus localement pour les séparateurs, les catégories et le statut.
  Le texte des messages, les destinataires, les sujets et les pièces jointes ne sont
  ni lus ni copiés.
- Aucune requête réseau n'est émise par l'extension. Aucun serveur, suivi, outil
  d'analyse, police distante ou SDK n'est utilisé. Les polices et les fonds fournis
  sont inclus dans l'extension, sans téléchargement à l'utilisation.
- Les permissions d'API sont `storage`, `scripting` et `sidePanel` :
  - `storage` conserve les préférences d'apparence et de thème dans `chrome.storage.local`,
    sans synchronisation cloud ;
  - `scripting` applique ou retire les surcouches déclarées dans le panneau latéral,
    sur les onglets Gmail autorisés uniquement ;
  - `sidePanel` affiche le panneau de réglages de l'extension.
- Aucun accès à l'API Gmail, aux cookies, à l'historique ou aux mots de passe.
- Le bouton de rédaction déclenche uniquement le bouton natif de Gmail sur un clic
  de l'utilisateur. L'envoi reste une action dans Gmail.

Comme tout script de contenu, l'extension a techniquement accès au DOM de la page
autorisée. Chrome peut donc afficher un avertissement d'accès aux données de
`mail.google.com`. Le code ne collecte ni ne transmet ces données.

Les messages, leur synchronisation, les signatures et les connexions réseau de Gmail
restent gérés par Google, selon les paramètres du compte.

La suppression de l'extension efface ses réglages locaux. Les courriels et les
paramètres du compte Gmail ne sont pas supprimés.
