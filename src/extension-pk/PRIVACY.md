# Confidentialité — PK Simple Gmail

PK Simple Gmail modifie l'apparence de Gmail dans le navigateur.

- Les retouches Gmail s'exécutent uniquement sur `https://mail.google.com/*`.
  Le module Studio Mail / Agenda s'exécute aussi sur `https://calendar.google.com/*`
  pour afficher le sélecteur de retour. Il ne lit ni les événements ni leur contenu
  et ne modifie pas l'interface de l'agenda.
- Ils recherchent les éléments d'interface nécessaires à la mise en page : menu, liste,
  vue de lecture et bouton de rédaction. Les dates visibles, les libellés et le compteur
  de messages sont lus localement pour les séparateurs, les catégories et le statut.
  Le texte des messages, les destinataires, les sujets et les pièces jointes ne sont
  ni lus ni copiés.
- Aucune requête réseau n'est émise par l'extension. Aucun serveur, suivi, outil
  d'analyse, police distante ou SDK n'est utilisé. Les polices et les fonds fournis
  sont inclus dans l'extension, sans téléchargement à l'utilisation.
- La bascule Mail / Agenda navigue vers les pages complètes de Google sur clic.
  L'adresse du compte actif (bouton de compte Google) est utilisée dans `authuser`
  pour ouvrir le bon compte. L'URL Gmail de retour et cet identifiant sont mémorisés
  par onglet dans `chrome.storage.session`, en mémoire pour la session du navigateur,
  puis supprimés à la fermeture de l'onglet. Aucun serveur tiers ne les reçoit.
- Les permissions d'API sont `storage`, `scripting` et `sidePanel` :
  - `storage` conserve les préférences d'apparence et de thème dans `chrome.storage.local`,
    sans synchronisation cloud ;
  - `scripting` applique ou retire les surcouches déclarées dans le panneau latéral,
    sur les onglets Gmail autorisés et, pour le seul sélecteur Mail / Agenda,
    sur Google Calendar ;
  - `sidePanel` affiche le panneau de réglages de l'extension.
- Aucun accès à l'API Gmail, aux cookies, à l'historique ou aux mots de passe.
- Le bouton de rédaction déclenche uniquement le bouton natif de Gmail sur un clic
  de l'utilisateur. L'envoi reste une action dans Gmail.

Comme tout script de contenu, l'extension a techniquement accès au DOM de la page
autorisée. Chrome peut donc afficher un avertissement d'accès aux données de
`mail.google.com` et `calendar.google.com`. Le code n'exporte pas leur contenu.

Les messages, leur synchronisation, les signatures et les connexions réseau de Gmail
restent gérés par Google, selon les paramètres du compte.

La suppression de l'extension efface ses réglages locaux. Les courriels et les
paramètres du compte Gmail ne sont pas supprimés.
