# Confidentialité

PK Gmail — Simplify Style modifie l'apparence de Gmail dans le navigateur.

- Le script de contenu s'exécute uniquement sur `https://mail.google.com/mail/*`.
- Il recherche les éléments d'interface nécessaires à la mise en page : menu,
  liste, vue de lecture et bouton de rédaction. Il ne lit ni ne copie le texte
  des messages, les destinataires, les sujets ou les pièces jointes.
- Aucune requête réseau n'est émise par l'extension. Aucun serveur, suivi,
  outil d'analyse, police distante ou SDK n'est utilisé.
- La seule permission d'API est `storage`. Elle sert à conserver les préférences
  d'apparence dans `chrome.storage.local`, sans synchronisation cloud.
- Aucun accès à l'API Gmail, aux cookies, à l'historique ou aux mots de passe.
- Le bouton de rédaction déclenche uniquement le bouton natif de Gmail sur
  un clic de l'utilisateur. L'envoi reste une action dans Gmail.

Comme tout script de contenu, l'extension a techniquement accès au DOM de la
page autorisée. Chrome peut donc afficher un avertissement d'accès aux données
de `mail.google.com`. Le code ne collecte ni ne transmet ces données.

Les messages, leur synchronisation, les signatures et les connexions réseau de
Gmail restent gérés par Google, selon les paramètres du compte.

La suppression de l'extension efface ses réglages locaux. Les courriels et les
paramètres du compte Gmail ne sont pas supprimés.
