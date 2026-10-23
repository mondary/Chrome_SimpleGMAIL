# PK Simple Gmail

## Français

**Nom** : PK Simple Gmail
**Accroche** : Gmail, Agenda et Drive dans une seule application, en noir et blanc.
**Résumé (≤150 caractères)** : Six thèmes pour Gmail, Agenda et Drive : liste aérée, toasts annulables, catégories renommables et bascule Mail / Agenda / Drive dans l'en-tête.

**Description longue** : PK Simple Gmail habille Gmail, Google Agenda et Google Drive d'une interface plus calme, sans toucher à vos courriels ni à vos fichiers. Le thème Studio applique un langage noir et blanc : fonds blancs, boutons pleins noirs, toasts « Annuler » qui expirent proprement et restent cliquables, catégories renommées à votre goût (« Réseaux sociaux » devient « Créations », « Promotions » devient « Recherche d'emploi »). Une bascule à trois logos, à la place du logo dans l'en-tête, ouvre le vrai Gmail, le vrai Google Agenda et le vrai Drive dans le même onglet ; le logo Gmail ramène toujours à la boîte de réception. Cinq autres thèmes sont fournis : Natif, Simplify, Classique, Focus et Original. Chaque réglage se coupe individuellement depuis le panneau latéral, appliqué en direct. L'extension n'utilise pas l'API Gmail, n'envoie aucun courriel et ne fait aucune requête réseau : vos messages, événements et fichiers restent dans Google. Vos préférences restent dans le navigateur.

**Mots-clés** : Gmail, Google Agenda, Google Drive, Chrome, thème, interface, productivité, vie privée

**Justification des permissions** :

- `mail.google.com`, `calendar.google.com`, `drive.google.com` : injecter les thèmes et la bascule dans les trois applications Google, et nulle part ailleurs.
- `storage` : conserver les thèmes, les tweaks actifs et les noms de catégories dans le navigateur.
- `scripting` : enregistrer ou retirer les tweaks au moment où vous les cochez, sans recharger l'extension.
- `sidePanel` : ouvrir le panneau de réglages depuis l'icône de l'extension.

**Politique de confidentialité** : https://github.com/mondary/Chrome_SimpleGMAIL/blob/main/src/extension-pk/PRIVACY.md

**FAQ** :

- *Mes courriels passent-ils par un autre service ?* Non. L'extension ne fait aucune requête réseau ; Gmail continue de gérer les messages.
- *Comment essayer ?* Installez l'extension depuis le Chrome Web Store, ou chargez le ZIP en mode développeur (`chrome://extensions`), puis rechargez Gmail, Agenda et Drive.
- *Quels thèmes sont inclus ?* Natif, Studio, Simplify, Classique, Focus et Original ; Studio est le thème maison.
- *La bascule ouvre-t-elle de nouveaux onglets ?* Non, sauf si Gmail tourne comme application installée : dans ce cas Chrome impose sa propre barre d'URL hors périmètre.

## English

**Name**: PK Simple Gmail
**Tagline**: Gmail, Calendar and Drive in one app, in black and white.
**Summary (≤150 characters)**: Six themes for Gmail, Calendar and Drive: airy lists, undoable toasts, renameable categories and a Mail / Calendar / Drive switch in the header.

**Long description**: PK Simple Gmail dresses Gmail, Google Calendar and Google Drive in a calmer interface, without touching your mail or files. The Studio theme applies a black-and-white language: white surfaces, solid black buttons, undo toasts that expire cleanly and stay clickable, category tabs renamed to your taste ("Social" becomes "Creations", "Promotions" becomes "Job search"). A three-logo switch, replacing the logo in the header, opens the real Gmail, the real Google Calendar and the real Drive in the same tab; the Gmail mark always returns to the inbox. Five other themes ship with it: Native, Simplify, Classic, Focus and Original. Every tweak can be turned off individually from the side panel, applied live. The extension does not use the Gmail API, sends no mail and makes no network requests: your messages, events and files stay in Google. Your preferences stay in the browser.

**Keywords**: Gmail, Google Calendar, Google Drive, Chrome, theme, interface, productivity, privacy

**Permission justification**:

- `mail.google.com`, `calendar.google.com`, `drive.google.com`: inject the themes and the switch into the three Google apps, nowhere else.
- `storage`: keep themes, enabled tweaks and category names in the browser.
- `scripting`: register or remove tweaks when you toggle them, without reloading the extension.
- `sidePanel`: open the settings panel from the extension icon.

**Privacy policy**: https://github.com/mondary/Chrome_SimpleGMAIL/blob/main/src/extension-pk/PRIVACY.md

**FAQ**:

- *Does my email go through another service?* No. The extension makes no network requests; Gmail still handles your messages.
- *How can I try it?* Install it from the Chrome Web Store, or load the ZIP in developer mode (`chrome://extensions`), then reload Gmail, Calendar and Drive.
- *Which themes are included?* Native, Studio, Simplify, Classic, Focus and Original; Studio is the house theme.
- *Does the switch open new tabs?* No, unless Gmail runs as an installed app: Chrome then adds its own out-of-scope URL bar.
