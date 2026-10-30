# Confidentialité — PK Simple Gmail

PK Simple Gmail modifie l'apparence de Gmail dans le navigateur.

- Les retouches Gmail s'exécutent uniquement sur `https://mail.google.com/*`.
  Le module Studio Mail / Agenda s'exécute aussi sur `https://calendar.google.com/*`
  pour afficher le sélecteur de retour. Il ne lit ni les événements ni leur contenu
  et ne modifie pas l'interface de l'agenda.
- Ils recherchent les éléments d'interface nécessaires à la mise en page : menu, liste,
  vue de lecture et bouton de rédaction. Les dates visibles, les libellés et le compteur
  de messages sont lus localement pour les séparateurs, les catégories et le statut.
  Le module de décompte Studio utilise aussi les résultats de recherche décrits
  ci-dessous ; il n'en exploite que le total de conversations.
- Aucun serveur tiers, suivi, outil d'analyse, police distante ou SDK n'est utilisé.
  Studio peut effectuer des requêtes de décompte vers Gmail uniquement (voir ci-dessous).
  Les polices et les fonds fournis
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
- Aucune permission de lecture des cookies, de l'historique ou des mots de passe,
  ni accès OAuth à l'API Gmail publique. Le décompte utilise la session de la page Gmail.
- Le bouton de rédaction déclenche uniquement le bouton natif de Gmail sur un clic
  de l'utilisateur. L'envoi reste une action dans Gmail.

## Compteurs Studio / Studio unread counts

**FR.** Lorsque les onglets Studio sont actifs, un script dans la page réutilise en
mémoire les en-têtes de session des requêtes Gmail pour envoyer uniquement des
recherches `in:inbox category:<id> is:unread` à l'endpoint de lecture Gmail du même
compte (`/sync/u/<compte>/i/bv`). Il ne marque aucun message comme lu, n'archive rien
et ne reclassifie rien. Les réponses peuvent contenir des résumés de conversations
(objet, participants) ; le module ne conserve ni n'exploite ces résumés. Seul le total
exact est transmis à l'interface Studio. Les en-têtes et jetons ne quittent pas le
script de page, ne sont ni journalisés ni enregistrés. Les totaux restent en mémoire,
sans stockage durable. Les requêtes s'arrêtent lorsque les onglets Studio sont
désactivés ou la page masquée ; elles reprennent quand la page est visible.
Le protocole est interne à Gmail et peut changer : si aucun total exact n'a encore
été obtenu, `…` remplace un faux zéro.
Les gros totaux sont résolus par des sondes bornées de pages de recherche ; seule la
page utile est mémorisée, pas les conversations. Si la session n'est pas encore prête,
le bouton Gmail Actualiser est déclenché sur la liste visible, sans navigation,
ouverture de mail ou interruption d'une saisie. Un échec temporaire conserve le
dernier total vérifié, signalé comme en attente d'actualisation dans l'infobulle.

**EN.** With Studio tabs enabled, a page script reuses Gmail request-session headers
in memory to send only `in:inbox category:<id> is:unread` searches to the same account's
read endpoint (`/sync/u/<account>/i/bv`). It never marks mail read, archives it or
changes categories. Responses may contain thread summaries (subject, participants);
the module neither retains nor uses those summaries. Only the exact total reaches
the Studio UI. Headers and tokens never leave the page script and are neither logged
nor stored. Totals remain in memory without persistent storage. Searches pause when
Studio tabs are disabled or the page is hidden and resume when it becomes visible.
This is an internal Gmail protocol and may change: if no exact total has been
obtained yet, the badge shows `…`, not a false zero.
Large totals use bounded search-page probes; only the useful page number is retained,
not conversations. If the session is not ready, Gmail's Refresh control is triggered
on the visible list without navigation, opening mail or interrupting text entry.
Temporary errors keep the last verified count and label its tooltip “refresh pending”.

Comme tout script de contenu, l'extension a techniquement accès au DOM de la page
autorisée. Chrome peut donc afficher un avertissement d'accès aux données de
`mail.google.com` et `calendar.google.com`. Le code n'exporte pas leur contenu.

Les messages, leur synchronisation, les signatures et les connexions réseau de Gmail
restent gérés par Google, selon les paramètres du compte.

La suppression de l'extension efface ses réglages locaux. Les courriels et les
paramètres du compte Gmail ne sont pas supprimés.
