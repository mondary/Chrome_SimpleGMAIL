# Changelog

Historique des versions de SimpleMail.

## Releases

## [2026.10.85] - 2026-10-26

### Changed
- **Studio — boîte vide** : le grain se fond désormais vers le **blanc pur** avant les bords et sous l'état vide (masque radial en unités écran, 42 vw × 40 vh). Le voile gris général disparaît (grain à 28 %, points à 28 % × 0,6), les coins du panneau sont à `255,255,255` et il ne reste plus de séparation visible entre le contenu mail et les bords.

## [2026.10.84] - 2026-10-26

### Changed
- **Studio — boîte vide** : le grain n'est plus limité au bloc de 600 px, il couvre **tout le panneau vide** (pseudo-élément du `tabpanel`, au-dessus des conteneurs blancs de Gmail). Semis de points renforcé (30 %, pas de 6 px, opacité 0,7) et grain à 50 %, toujours modulés par la turbulence ; l'état vide reste au-dessus.

## [2026.10.83] - 2026-10-26

### Changed
- **Studio — boîte vide** : le fond reprend la recette du fichier de référence `getvolt.html` — grain `feTurbulence` flouté à 1 px + semis de points de 6 px dont la densité est modulée par un masque de turbulence basse fréquence, inversé pour fond blanc. Plus aucune croix ni motif répété ; la surface reste blanche entre les points.

## [2026.10.82] - 2026-10-26

### Changed
- **Studio — boîte vide** : les croix de repérage sont supprimées. Le fond devient un semis de micro-points et deux petits anneaux (7 à 12 % de noir) sur blanc pur, dessiné **derrière le contenu de la boîte à zéro** et fondu en bordure. Il reste visible même quand Gmail intercale un conteneur blanc, et ne passe jamais au-dessus du texte ni de l'illustration.

## [2026.10.81] - 2026-10-26

### Changed
- **Studio — boîte vide** : artefacts renforcés pour être réellement perceptibles sur blanc — croix à 16 % de noir, point à 13 %, tuile de 120 px (les marques restent à quelques dizaines de niveaux du blanc, sans teinte de fond).
- **Mise à jour de l'extension** : le service worker compare la version appliquée à celle du manifeste à chaque démarrage et recharge une fois Gmail, Agenda et Drive quand elle change. Les pages déjà ouvertes ne peuvent donc plus rester bloquées sur une ancienne version des styles ou des scripts.

## [2026.10.80] - 2026-10-26

### Changed
- **Studio — boîte vide** : le fond redevient **blanc pur**. Le grain et le dégradé radial sont supprimés ; il ne reste que de petits artefacts espacés (croix de repérage, point, tiret) à 5–8 % de noir, tuilés tous les 132 px. La surface entre les marques reste à `#fff`, sans teinte ni fondu.

## [2026.10.79] - 2026-10-26

### Added
- **Studio — boîte vide** : fond d'artefacts très légers derrière l'illustration — grain de papier et croix espacées, gris à quelques pour cent sur blanc, masqué en dégradé radial pour s'éteindre avant les bords. Le contenu (illustration, titres, lien de réglages) reste au-dessus et cliquable.

## [2026.10.78] - 2026-10-26

### Changed
- **Mise à jour de l'extension** : les pages Gmail, Agenda et Drive (y compris les fenêtres d'application installée) sont rechargées automatiquement après une installation ou une mise à jour. Sans ce rechargement, une fenêtre PWA ouverte depuis longtemps continuait d'exécuter l'ancienne version des content scripts — d'où l'anneau de décompte absent malgré la mise à jour.

## [2026.10.77] - 2026-10-26

### Fixed
- **Studio — décompte des toasts** : l'anneau est aussi dessiné sur le **toast natif** de Gmail, dès qu'une action est annulable, et plus seulement sur les pilules miroir. Il se vide sur la fenêtre native (~10,5 s) puis suit la pilule si le toast est volé. Une action unique affiche donc désormais le décompte.

## [2026.10.76] - 2026-10-26

### Changed
- **Studio — décompte des toasts** : l'anneau démarre **plein** dès l'apparition de la pilule puis se vide jusqu'à sa disparition, au lieu de se remplir depuis zéro (le début était illisible). Durée par défaut portée à 8 s (réglable 3–12 s) et départ de l'anneau à midi.

## [2026.10.75] - 2026-10-26

### Added
- **Studio — décompte des toasts** : un anneau jaune se remplit autour de la croix des pilules « Annuler », sur la durée d'affichage réglée (3 à 12 s), puis disparaît avec la pilule. Il est désactivé quand `prefers-reduced-motion` est demandé.

## [2026.10.74] - 2026-10-23

### Changed
- **Documentation** : le README FR/EN pointe vers la fiche Chrome Web Store (PK Simple Gmail, version publique 2026.10.56, mise à jour 2026.10.73 en attente d'examen) et ajoute un historique depuis janvier 2022. La landing et la fiche de boutique ne prétendent plus que l'extension n'est pas publiée.

## [2026.10.73] - 2026-10-23

### Fixed
- **Landing boutique** : le titre, le pied de page et les deux boutons de téléchargement pointaient encore vers l'archive Simplify `2026.10.17` supprimée. Ils ciblent désormais PK Simple Gmail et le paquet `pk-simple-gmail-2026.10.73.zip`.

## [2026.10.72] - 2026-10-23

### Changed
- **Boutique — fiche PK Simple Gmail** : description FR/EN réécrite pour le thème Studio, la bascule Mail / Agenda / Drive et les six thèmes ; justification des permissions et lien vers la politique de confidentialité. Nouveau paquet `store/assets/pk-simple-gmail-2026.10.72.zip` (78 fichiers, version `2026.10.72`) en remplacement de l'archive Simplify 2026.10.17.

## [2026.10.71] - 2026-10-22

### Changed
- **Panneau latéral — thèmes en bandeau** : les six thèmes (Natif, Studio, Simplify, Classique, Focus, Original) passent en pictogrammes horizontaux en haut du panneau, avec une ligne de description pour le thème actif. La section passe de ~75 % de la hauteur à 95 px ; les scripts et leurs réglages occupent tout le reste. Les rangées radio et le bloc « à transposer » vide sont supprimés.

## [2026.10.70] - 2026-10-22

### Added
- **Studio — burger sur Drive** : Drive n'a pas de tiroir natif. Un burger Studio, à gauche de la bascule, replie ou déplie le rail latéral (première piste de grille ramenée à 0, contenu élargi) ; l'état est mémorisé (`pkDriveRailCollapsed`) et réappliqué après les re-rendus de Drive. La bascule retrouve la même position que dans Gmail et Agenda (burger puis segmented view).

## [2026.10.69] - 2026-10-22

### Added
- **Studio — Drive** : Google Drive reçoit un skin monochrome (`themes/studio/drive.css`) — bouton « Nouveau » noir plein à la largeur du panneau, entrée de navigation active en gris Studio, barre de stockage noire, offres « Mettre à niveau » masquées, lien d'extension de stockage grisé. Les couleurs des fichiers et des dossiers restent intactes.

### Changed
- **Studio — bascule dans une seule fenêtre** : la bascule navigue de nouveau sur place (`location.assign`), sans fenêtre popup ni onglet externe. Gmail, Agenda et Drive se remplacent dans le même onglet et la même fenêtre. Dans une fenêtre d'application installée, Chrome affiche sa propre barre d'URL hors périmètre ; en onglet classique, aucune barre n'apparaît.

## [2026.10.68] - 2026-10-22

### Added
- **Studio — Drive dans la bascule** : un troisième logo (Drive 2020 officiel) rejoint Gmail et Agenda. Il ouvre « Mon Drive » du compte actif dans le même onglet (ou la fenêtre Chrome sans interface en mode application installée). La bascule est aussi présente sur `drive.google.com`, y compris depuis une page de fichier, et permet de revenir à Gmail ou Agenda. Hôte `drive.google.com` ajouté aux permissions et au module.

## [2026.10.67] - 2026-10-22

### Changed
- **Studio — Gmail, retour à la boîte de réception** : le logo Gmail du segmented view ramène toujours à la boîte de réception (`#inbox`), y compris quand Gmail est déjà l'application active. Depuis Agenda, le bouton Mail ouvre la boîte de réception du compte actif au lieu de la dernière vue visitée ; la mémoire de vue par onglet (`chrome.storage.session`) est retirée.

## [2026.10.66] - 2026-10-22

### Fixed
- **Studio — Gmail installé en application** : la bascule n'ouvre plus l'autre application dans un onglet d'une autre fenêtre. Elle crée une fenêtre Chrome sans onglets ni barre d'adresse (`chrome.windows.create`, type popup, taille de l'écran), donc Agenda reste dans Chrome et garde l'allure d'une application, sans la barre d'URL « retour à l'application ». Dans un onglet classique, la navigation reste dans le même onglet.

## [2026.10.65] - 2026-10-22

### Fixed
- **Studio — bascule Mail / Agenda** : le halo gris autour de la capsule disparaît (plus d'ombre, plus de liseré). Les logos couleur officiels sont conservés.
- **Studio — Gmail installé en application** : Chrome affiche sa propre barre d'URL quand une fenêtre d'application sort de son domaine. Dans ce cas seulement, la bascule ouvre l'autre application dans un onglet normal (`chrome.tabs.create`) au lieu de naviguer sur place : la barre « retour à l'application » n'apparaît plus. Dans un onglet classique, la navigation reste dans le même onglet.

## [2026.10.64] - 2026-10-22

### Changed
- **Studio — bascule à double logo** : les vrais logos Gmail (M multicolore) et Google Agenda (tuile « 31 ») remplacent les pictogrammes monochromes. Le liseré gris interne de la capsule est supprimé ; ombre seule.
- **Studio — Agenda / Gmail, boutons alignés** : « Créer » dans Agenda prend toute la largeur du panneau latéral (224 px, mêmes marges que la liste des calendriers), comme « Nouveau message » dans Gmail. En retour, « Nouveau message » passe en noir plein avec texte et icône blancs, identique au « Créer » d'Agenda.

## [2026.10.63] - 2026-10-22

### Fixed
- **Studio — Agenda** : les couleurs des calendriers et des événements sont de nouveau visibles. Le skin ne touche plus aux teintes (plus de niveaux de gris) ; seuls les accents d'interface restent noirs : jour courant, « Créer », action d'en-tête, offre « Mettre à niveau » masquée.

## [2026.10.62] - 2026-10-22

### Changed
- **Studio — bascule Mail / Agenda dans l'en-tête** : la capsule flottante en bas à gauche est supprimée. Le logo de la barre Google est remplacé par une capsule noire à deux pictogrammes (enveloppe Gmail, calendrier) ; le segment actif est blanc et un clic bascule d'une application à l'autre dans le même onglet. La position du logo natif est conservée, donc la recherche et les actions de l'en-tête ne bougent pas.
- **Studio — Agenda monochrome** : Google Agenda reçoit le thème Studio (`themes/studio/calendar.css`) — fond blanc plein, bouton « Créer » noir, jour courant en pastille noire en semaine comme en mois, libellé du jour courant en noir, action d'en-tête bleue passée en noir, offre « Mettre à niveau » masquée et événements en niveaux de gris.

## [2026.10.61] - 2026-10-22

### Added
- **Studio — renommer les catégories** : les onglets de la boîte de réception (Principale, Promotions, Réseaux sociaux, Notifications, Forums, Newsletters) prennent les noms que vous choisissez — « Réseaux sociaux » devient « Créations », « Promotions » devient « Recherche d'emploi », etc. Champs dédiés dans le panneau, sous le tweak **Catégories** ; vide = nom Gmail. Le nom visible et l'étiquette lue par les lecteurs d'écran sont mis à jour en direct, sans toucher au compteur de non-lus ni aux descriptions d'origine.

## [2026.10.60] - 2026-10-22

### Changed
- **Studio — bascule Mail / Agenda** : le rail blanc collé au bord gauche, illisible sur le fond clair de Gmail, devient une capsule noire flottante en bas à gauche. Deux segments icône + libellé, segment actif en blanc plein, anneau interne pour rester lisible sur fond sombre, entrée en fondu et focus jaune. Sur fenêtre étroite, libellés masqués (noms accessibles conservés). Le message d'erreur s'ouvre au-dessus de la capsule.

## [2026.10.59] - 2026-10-22

### Fixed
- **Studio — pilules « Annuler »** : elles ne disparaissaient jamais (le minuteur était défini mais jamais armé). Elles s'effacent maintenant au bout de 6 s, durée réglable de 3 à 12 s dans le panneau (curseur sous « Toast · Annuler préservé »).
- **Studio — empilement des toasts** : plafond de 2 tuiles visibles, toast natif compris, au lieu de 4. Les tuiles en trop s'effacent en fondu au lieu d'être retirées sèchement.
- **Studio — croix de fermeture des pilules** : elle ne faisait rien, le clone n'héritant pas du gestionnaire lié au nœud natif. Elle ferme désormais la pilule. Une annulation lancée depuis une pilule ne fabrique plus de pilule fantôme.

## [2026.10.58] - 2026-10-21

### Changed
- **Studio — Google Agenda complet** : la bascule Mail / Agenda charge les vraies pages Google dans le même onglet. L'aperçu Calendar embarqué est retiré ; l'agenda conserve la création d'événements, ses vues et ses paramètres natifs. Le bouton Mail retrouve la dernière URL Gmail du même compte et du même onglet.
- **Comptes et permissions** : le compte actif est transmis à Google par `authuser` ; la vue de retour est conservée dans `chrome.storage.session` et effacée à la fermeture de l'onglet. Seul le module de navigation s'exécute sur `calendar.google.com`, ajouté aux hôtes autorisés. Les enregistrements existants sont actualisés lors de la synchronisation.

## [2026.10.57] - 2026-10-21

### Fixed
- **Studio — bouton « Applications Google » de retour** : le tweak TopRight masquait aussi le bento Google en plus de l'aide et des notifications. Il ne masque plus que l'aide, le support et les notifications ; le sélecteur d'applications Google reste visible (v3).

### Added
- **Studio — Modules · Agenda intégré (test)** : un bouton « Agenda » sur le bord gauche ouvre l'agenda Google Calendar du compte dans la même page (embed signé `/u/0/`, fuseau et langue du navigateur), façon Outlook : Échap ou « Revenir au mail » ramène à Gmail sans nouvel onglet. Lien de repli vers l'onglet complet conservé.

## [2026.10.56] - 2026-10-20

### Fixed
- **Studio — « Annuler » préservé sur les toasts** : Gmail remplace le nœud d'un toast par le message suivant (erreur de traduction, autre notification), détruisant l'« Annuler » d'une suppression en cours. Le tweak clone secrètement le toast tant que son action est annulable et fait réapparaître une pilule « Annuler » fonctionnelle au-dessus du nouveau toast si celui-ci le vole (fenêtre native ~11,5 s mesurée, aucune manipulation du DOM de Gmail, délégation native préservée, `prefers-reduced-motion` respecté). Vérifié sur Gmail réel (réutilisation du nœud, remplacement de contenu, délégation via un clone `.bAp`) et sur un harnais déterministe (`tools/previews/studio-toast-preview/`) : vol simple, double vol, expiration naturelle et annulation déjà consommée.

## [2026.10.55] - 2026-10-20

### Changed
- **Nom public — PK Simple Gmail** : l'extension et son panneau retrouvent un nom explicite ; « Studio » reste le nom du thème maison et ses réglages ne changent pas. Résumé du paquet et documentation FR/EN synchronisés.

## [2026.10.54] - 2026-10-20

### Changed
- **Studio — états vides par catégorie** : six pictogrammes monochromes distincts et animés une fois : enveloppe pour Principale, étiquette pour Promotions, réseau de personnes pour Réseaux sociaux, cloche pour Notifications, bulles pour Forums et feuille pour Newsletters. Aucun mouvement si la réduction des animations est demandée ; le lien Gmail des catégories demeure natif.

## [2026.10.53] - 2026-10-20

### Changed
- **Studio — boîte à zéro monochrome** : suppression de la carte quadrillée et des accents colorés au profit d'un état vide directement sur le fond blanc. L'enveloppe en trait noir apparaît une fois, puis la coche se dessine ; l'animation est supprimée lorsque les mouvements sont réduits. Le lien natif vers les catégories reste intact.

## [2026.10.52] - 2026-10-20

### Added
- **Studio — boîte à zéro** : état vide centré pour les catégories Gmail, avec grille en léger relief, enveloppe cochée et message de satisfaction. Le lien natif « Configurer la boîte de réception » reste cliquable. Tweak indépendant, désactivable dans le panneau ; sans effet sur les autres thèmes, les recherches ou les catégories contenant des messages.

## [2026.10.51] - 2026-10-18

### Changed
- **Fiche Chrome Web Store — bloc marque** : résumé du paquet aligné sur le standard de recherche PK (« Made by PK-Labs · mondary.design », 72 caractères), description bilingue réécrite pour le Studio (six thèmes, tweaks activables) et terminée par les deux lignes standard `apps.pouark.com` / `mondary.design`, URL de la page d'accueil sur `https://mondary.design`. Justifications d'autorisations (`scripting`, `sidePanel`, `storage`) renseignées pour la soumission.

## [2026.10.50] - 2026-10-18

### Fixed
- **Toast — « Annuler » aligné sur le message** : dans la pilule centrée, le libellé « Annuler » apparaissait 10 px plus bas que le message (la rangée `.aT` héritait d'un `align-items: stretch` : le message s'alignait en haut, l'action au centre). La rangée et ses deux blocs sont désormais centrés verticalement. Vérifié au pixel sur Gmail réel en session isolée : centres de texte message / « Annuler » à 910 / 920 px avant, 920 / 920 px après.

## [2026.10.49] - 2026-10-18

### Fixed
- **Composeur — bouton « Envoyer » de retour** : « Masquer outils de saisie » et « Masquer volet de lecture » masquaient tout le pied du composeur (`.aDh`/`.aDj` et `.aDg` enveloppent la barre de mise en forme **et** la ligne Envoyer). Seule la vraie barre de mise en forme (`.aDh .LUPmie`) et le bouton/menus du volet de lecture sont désormais masqués ; le bouton « Envoyer », les pièces jointes, les emojis et le lien restent visibles. Vérifié sur Gmail réel en session isolée.

## [2026.10.48] - 2026-10-18

### Fixed
- **Header auto-hide — la réponse ne disparaît plus au scroll** : le tweak ne force plus le header en `position: fixed` et n'anime plus le `padding-top` de `body` ni la marge de la barre d'action. Ces décalages faisaient recalculer toute la vue par Gmail au scroll (surtout dans une réponse en cours de rédaction) et laissaient un écran blanc masquant la fenêtre de réponse. Le header s'efface désormais au scroll par simple transformation, sans déplacer l'interface. Reproduit et vérifié sur Gmail réel en session isolée.

## [2026.10.47] - 2026-10-18

### Fixed
- **Toast centré — bouton « Annuler » cliquable** : la boîte visible du toast (`.vh`, en `position: fixed`) est ramenée au centre bas en pilule sombre, et tout son contenu (message, « Annuler », fermeture) redevient cliquable. La cause était `pointer-events: none` sur `.bAp` neutralisé uniquement sur `.bAn` — une classe absente du DOM actuel : tout le toast, y compris « Annuler », héritait de `none`. Le conteneur `.bAp` n'est plus déplacé, seul `.vh` est recentré. Vérifié sur Gmail réel en session isolée : centrage exact, pastille sombre, clic sur « Annuler » et annulation effective. Le tweak s'appelle désormais « Toast redesign · centré bas, pilule sombre (Annuler cliquable) ».

## [2026.10.46] - 2026-10-17

### Added
- **Focus — catégories personnalisables** : afficher ou masquer indépendamment Principale, Promotions, Réseaux, Notifications, Forums et Newsletters ; aligner la barre à gauche, au centre ou à droite. Réglages disponibles dans le menu Focus et le panneau de l'extension, enregistrés dans `fosStyle` et synchronisés en direct, sans rechargement.

### Fixed
- **Focus — total Gmail** : le compteur reprend la pagination native de la vue active (« 1–100 sur 286 » donne 286), au lieu de compter uniquement les lignes chargées. Les totaux estimés restent signalés ; en l'absence de total, le libellé indique explicitement les messages chargés. Le compteur de liste et celui de l'en-tête concordent, y compris après pagination et pendant la lecture.
- **Panneau — préférences du thème actif** : chargement de la bonne clé de stockage plutôt que systématiquement `pkGmailStyle`, prise en compte des changements externes et conservation des préférences lors d'une modification depuis l'autre interface.

### Changed
- Harnais : tests des réglages persistants, des trois alignements à 1440 et 390 px, du panneau réel sur stockage fictif, des totaux exacts/estimés/indisponibles et des anciennes vues conservées par Gmail. Capture des réglages ajoutée.

## [2026.10.45] - 2026-10-17

### Fixed
- **Focus — retour vers Principale** : les onglets conservés dans une ancienne vue Gmail ne sont plus cliqués depuis une recherche. Le retour ouvre la boîte de réception puis sélectionne Principale, même si Gmail avait mémorisé Promotions ou Forums. Les catégories désactivées restent accessibles par recherche. Les noms d’onglets contenant un compteur de nouveaux messages sont reconnus.
- **Focus — filtres visibles** : la bande native Messagerie / Conversations / Espaces et ses filtres disposent de leur propre espace sous les catégories. La liste et le lecteur tiennent compte de sa hauteur réelle, y compris après redimensionnement. Les attributs de dates inchangés ne sont plus réécrits, pour laisser les menus natifs ouverts.
- **Focus — navigation répétée** : les séparateurs de dates passent en pseudo-éléments CSS. Les lignes artificielles ajoutées aux tableaux perturbaient le réaffichage des recherches mises en cache par Gmail. La mise en forme des anciennes vues est aussi retirée dès qu'elles perdent leur rôle principal.

### Changed
- **Focus OS devient Focus** dans le panneau et l'interface, sans changement d'identifiant interne ni perte du thème sélectionné.
- **Vérifications** : aller-retour depuis chaque catégorie, boîte native à trois onglets, recherches et filtres accessibles, géométrie desktop / 390 px et stabilité des observateurs. Capture fictive actualisée ; navigation des catégories vérifiée sur Gmail en session Ego isolée.

## [2026.10.44] - 2026-10-16

### Fixed
- **Thème Original — menu de gauche réparé** : les polices du thème (`Outfit`, `Material Symbols`) et le logo n'étaient pas déclarés dans `web_accessible_resources`, donc bloqués dans Gmail — chaque icône du rail et de l'en-tête s'affichait en toutes lettres (`inbox`, `view_quilt`, `expand_more`…), débordait du rail de 64 px et le logo restait cassé. Les ressources passent en globs (`icon.png`, `themes/*/fonts/*.ttf`, `themes/*/backgrounds/*.jpg`) pour qu'un thème ajouté plus tard ne puisse plus oublier son entrée. Un échec de chargement des polices s'affiche désormais en avertissement console au lieu d'être avalé en silence.
- **Harnais d'aperçu** : `tools/previews/focus-os-preview/` et `tools/previews/simplemail-original-preview/` chargeaient `theme.js` depuis un chemin d'un niveau trop court — le thème ne se montait jamais dans les aperçus fictifs. Le thème Original gagne sa capture de démonstration (`store/screenshots/11-original.png`) et son harnais vérifiable (`verify.mjs` : géométrie 1440×900 et 390 px, polices, pictos, logo, observateur au repos, navigation, lecteur, recherche, sélection, tiroir).

### Changed
- **Thème renommé « Original »** : « SimpleMail Original » devient « Original » dans le panneau, le dialogue du thème et la documentation, comme « Classique » avant lui — l'identifiant interne `theme-simplemail-original` est conservé pour ne pas perdre la sélection enregistrée.

## [2026.10.43] - 2026-10-16

### Changed
- **Arborescence — étape 5** : `store/assets/` ne garde que le ZIP courant — les huit versions antérieures de l'extension Simplify partent dans `archives/releases/extension-pk/`. Les APK de `releases/android/` restent suivis (politique du workflow : la dernière build est committée, les anciennes retirées). Note : le manifest de l'extension garde 2026.10.42 tant que les retouches du thème Original en cours ne sont pas committées ; il rejoindra le compteur au prochain commit de l'extension.

## [2026.10.42] - 2026-10-16

### Changed
- **Arborescence — étape 4** : `src/desktop/` sépare le code des données — les fichiers vivants (`config.json`, `secrets/mail.env`, `simplemail.db`) déménagent sous `src/desktop/var/` (hors git), `VERSION` rejoint le compteur unique (2026.09.02 → 2026.10.42), les anciens installateurs `.pkg` partent dans `archives/releases/macos/` et les READMEs FR/EN (mode dev, configuration, installation, arborescence) sont réécrits.

## [2026.10.41] - 2026-10-16

### Changed
- **Arborescence — étape 3** : la source CSS des tweaks est absorbée dans `src/extension-pk/sources/gmail.css` — le build ne dépend plus de l'ancienne extension, dont le dossier gelé quitte le dépôt (miré intégralement dans `archives/versions/01-extension-simplemail-2026.08.01/`). L'icône de l'extension se synchronise désormais depuis l'icône de la racine, et les tweaks CSS du panneau reprennent le compteur de version unique (2026.10.25 → 2026.10.41).

## [2026.10.40] - 2026-10-16

### Changed
- **Arborescence — étape 2** : `tools/` rangé par usage — harnais d'aperçu regroupés sous `tools/previews/` (Focus OS, SimpleMail Original), page de test des versions sous `tools/tester/`, client Himalaya regroupé sous `tools/pkmail/` (CLI, interface Next.js, config `.himalaya/`, README). Chemins internes, `.gitignore` et documentation mis à jour.

## [2026.10.39] - 2026-10-16

### Changed
- **Arborescence — étape 1** : documentation regroupée dans `docs/` (`CONFIGURATION_GMAIL_OAUTH.md`, `DEPLOIEMENT_O2SWITCH.md`, nouvelle `ROADMAP.md` qui fusionne `src/rust/`). Chemins morts `src/extension-simplify/` réparés dans le store, le kit média et Sombre Mail ; coquilles vides `src/android/`, `src/ios/`, `src/macos/` retirées ; bandeaux de version rattrapés.

### Added
- **Guide et confidentialité de l'extension canonique** : `src/extension-pk/README.md` (guide d'installation, thèmes, build) et `src/extension-pk/PRIVACY.md` (permissions et données), liés depuis la landing du store.

## [2026.10.38] - 2026-10-16

### Added
- **Thème Classique** : nouvelle option « Masquer Mail, Chat et Meet » — la barre latérale gauche (rail + dossiers) et la fenêtre Chat/Meet disparaissent, comme dans Studio et Focus OS. Désactivée par défaut, pilotée en direct via `smcStyle`.
- **Thème SimpleMail Original** : transposition de l'archive 01 — rail de 64 px, recherche large, composer noir et liste aérée, polices Outfit et Material Symbols embarquées, avec son harnais d'aperçu fictif (`tools/simplemail-original-preview/`).

## [2026.10.37] - 2026-10-16

### Fixed
- **Focus OS** : la sélection active survit aux mises à jour de la liste, les commandes du thème ne déclenchent plus les boutons Gmail eux-mêmes et les groupes de dates sont nettoyés sur boîte vide. Guide du thème ajouté et vérifications élargies (lecteur natif, statut, mobile).

## [2026.10.36] - 2026-10-16

### Added
- **Thème Focus OS** reconstruit en transposition fidèle du snapshot Lab (`archives/versions/03`) : rail d'icônes seules, liste mono compacte, polices JetBrains Mono embarquées, couche DOM dédiée — avec son harnais de prévisualisation locale (`tools/focus-os-preview/`) et sa capture de démonstration (`store/screenshots/10-focus-os.png`). L'entrée était déjà référencée dans le panneau ; les fichiers suivent.

## [2026.10.35] - 2026-10-16

### Fixed
- Panneau : le rendu de la liste Studio plantait sur `classList.add('')` (token vide interdit par Chrome) — seuls les 3 tweaks « nouveau » apparaissaient. Les 28 réglages s'affichent à nouveau, groupés par statut.

### Added
- **Réglages du thème Classique** : salutation, avatars initiales, groupes de dates, bouton de rédaction flottant, masquage des onglets et du panneau Google — pilotés en direct via le stockage `smcStyle`, comme ceux de Simplify.

## [2026.10.34] - 2026-10-16

### Fixed
- **Un seul compteur de version** : le dépôt rattrape l'extension (2026.10.34) et les deux vivent désormais au même numéro — CHANGELOG, bandeaux README et `chrome://extensions` affichent la même version, bumpée ensemble à chaque commit. Fini les numéros divergents (27 côté dépôt, 33/34 côté extension).

## [2026.10.27] - 2026-10-16

### Fixed
- Classique : le menu latéral passe en **blanc** (filet de séparation, texte gris, dossier actif à barre ambre) — la sidebar noire alourdissait l'ensemble.
- Panneau : les 28 réglages Studio réapparaissent contextuellement — auto-réparation des états hérités (tweaks actifs sans thème → recontextualisés sous Studio) ; plus de liste orpheline.

### Changed
- Thèmes renommés en famille harmonieuse : **Natif · Studio · Simplify · Classique**. Extension en v2026.10.33.

## [2026.10.26] - 2026-10-16

### Changed
- Retrait des six premières moutures de thèmes (OMP Terminal, Focus OS, Label Canvas, Paper Reader, K7 Médiathèque, K7 Clair) : de simples changements de couleurs, pas des layouts. Le panneau garde Gmail normal, PK Studio, Simplify (avec réglages) et SimpleMail Classique ; les suivantes seront de vraies transpositions de layout, une par une. Extension en v2026.10.32.

## [2026.10.25] - 2026-10-16

### Added
- **Thème SimpleMail Classique** — première vraie transposition de layout (archives 01/02) : sidebar sombre avec compteurs ambre, salutation « Bonjour », avatars initiales colorées, groupes de dates, onglets et panneau Google masqués, rédaction en bouton flottant (`themes/simplemail-classic/`, CSS + couche DOM).
- **Section Scripts relative au thème** : sous PK Studio, les 28 tweaks ; sous Simplify, ses réglages propres (actions en-tête, boîte vide, dates, densité, largeur, arrière-plan Océan/Nuit) écrits en direct dans `pkGmailStyle` et appliqués sans rechargement ; les thèmes sans réglages affichent un état calme. Les fonds Océan/Nuit sont embarqués et accessibles.

## [2026.10.24] - 2026-10-16

### Added
- **Les 8 thèmes du Lab transposés en 6 thèmes Gmail réels** (doublons fusionnés) : OMP Terminal (noir & rose), Focus OS (compact mono orange — fusion des deux Focus OS), Label Canvas (toile + libellés verts en cartes), Paper Reader (serif éditoriale sur papier chaud), K7 Médiathèque (sombre cuivre — fusion Media Shelf + Preview Deck) et K7 Clair. Chacun vit dans `themes/<nom>/theme.css`, sélectionnable depuis le panneau.

### Changed
- Les commandes Tout activer / Tout désactiver déménagent de l'en-tête du panneau vers la section Scripts (elles ne concernent que les tweaks). Extension en v2026.10.29.

## [2026.10.23] - 2026-10-16

### Changed
- Les presets du thème PK (première installation et sélection « PK — thème Studio ») n'activent plus les tweaks « bonus » : **Custom Tabs** devient opt-in (liste `PRESET_OFF` dans `data/themes.js`, le manifest restant généré). Extension en v2026.10.28.

## [2026.10.22] - 2026-10-16

### Added
- **PK Gmail Studio en drawer** : le popup devient un panneau latéral Chrome (Side Panel) ouvert par le bouton de barre d'outils — interface claire pleine hauteur, thèmes et tweaks lisibles.
- Choix de thème en trois options propres : **Gmail normal** (aucun style), **PK — thème Studio** (applique ses presets : tweaks validés actifs, `ko` désactivés) et **Simplify**. Le doublon « PK — thème Studio » est corrigé.
- Les huit thèmes du Lab (OMP Terminal, Focus OS, Label Canvas, Paper Reader, K7…) sont proposés dans le panneau en attente de transposition vers le DOM de Gmail.

### Changed
- `src/extension-simplify/` quitte `src/` : Simplify vit désormais comme thème de PK Gmail Studio (`src/extension-pk/themes/simplify/`), son extension autonome restant archivée dans `archives/versions/05-simplify-2026.10.16/` (hors git). README FR/EN et PKSTACK mis à jour.
- Extension en v2026.10.27 : permission `sidePanel`, description « Studio de thèmes pour Gmail ».

## [2026.10.21] - 2026-10-16

### Added
- **PK Gmail Studio** : système de thèmes dans l'extension canonique — nouvelle section « Thème » en radio dans le popup (`PK — thème Studio` par défaut, `Simplify`), enregistrement mutuellement exclusif via `chrome.scripting` (`data/themes.js`, thèmes sous `themes/<nom>/`).
- Le thème Simplify embarque sa logique complète (`settings.js` + `content.js`, monde isolé, réglages par défaut recommandés) — paramétrable via le stockage `pkGmailStyle` ; l'exposition des réglages dans le popup est la suite prévue.

### Changed
- Renommage : `src/extension-bench/` → `src/extension-pk/`, produit « PK Gmail Studio » (ex « PK Gmail Scripts Lab ») — README FR/EN, Simplify et scaffold rust mis à jour.
- Les APKs déplacés dans `archives/releases/` sortent de l'index git (alignement sur le changelog v2026.10.20).

## [2026.10.20] - 2026-10-16

### Changed
- `extension/` retourne dans `src/extension-bench/` : toute l'implémentation vit sous `src/` ; l'ancienne `src/extension/` (SimpleMail v2026.08.01) reste en place et demeure la source CSS de `build.sh`. Références (README FR/EN, Simplify, scaffold rust) mises à jour.
- Releases : une seule version conservée par plateforme — macOS `PKMail.app` (31 août) et Android `PKMail-2026.08.07.apk` ; les six APKs et deux builds macOS antérieurs sont déplacés dans `archives/releases/` (locale, hors git).

## [2026.10.19] - 2026-10-16

### Changed
- Le scaffold de l'application desktop rejoint le motif par plateforme : `rust/` devient `src/rust/`, aux côtés de `src/desktop` et `src/mobile`.

## [2026.10.18] - 2026-10-16

### Changed
- Refacto structurel (aucune suppression, uniquement des déplacements) : `src/extension-bench` devient `extension/` à la racine (version canonique), `src/lab` et `src/lab-focus-os-2026.08.01` deviennent `tools/lab/atelier-actuel` et `tools/lab/focus-os-2026.08.01` (montages de `main.py` et Tester mis à jour), `benchmark/` rejoint `archives/benchmark/` (hors git), et le scaffold `rust/` accueille l'application desktop à venir (Go ou Rust).
- Arbres de structure des README FR/EN alignés sur le nouveau découpage.

## [2026.10.17] - 2026-10-16

### Fixed
- En-tête de l’extension Gmail aligné sur la référence : le menu compact, la loupe et l’avatar partagent la même ligne médiane, calculée depuis le compte Google à chaque rafraîchissement.
- Les menus natifs ouverts depuis le menu compact (paramètres, applications, aide, disponibilité, outils de saisie) se positionnent sous celui-ci grâce à une ancre mesurable, sans rester en haut à gauche ni déborder de l’écran.

### Changed
- L’icône du menu compact est dessinée en SVG (trois points réguliers) au lieu d’un glyphe texte.
- Les actions natives des messages restent dans leur barre d’en-tête, sans boutons clonés ; elles s’estompent quand aucune sélection n’est active et la loupe les remplace en lecture.
- Captures du store, archive Chrome et liens de téléchargement mis à jour en v2026.10.17.

## [2026.10.16] - 2026-10-16

### Changed
- Dédoublonnage réel des versions archivées : le snapshot `src/lab-atelier-2026.08.07` n'est plus servi ni suivi (montage et test de fumée retirés), et la branche `archive/v1.0.4` est supprimée du dépôt — son état reste atteignable depuis l'historique de `main`.

## [2026.10.15] - 2026-10-16

### Fixed
- L’en-tête Gmail reste aligné sur la référence : la recherche et le compte gardent leur place, les actions restent dans leur barre native.
- Les anciennes préférences qui déplaçaient les actions dans l’en-tête sont ignorées ; les compteurs non lus restent visibles.

### Changed
- Archive Chrome et liens de téléchargement mis à jour en v2026.10.15.

## [2026.10.14] - 2026-10-16

### Changed
- Tester dédoublonné : quatre entrées réduites aux deux versions les plus avancées — « Lab V2 — Atelier (actuel) » et « Interface classique (2026.08.01) ». Les quasi-doublons (snapshot Lab du 2026.08.07, classique V1.0.4) restent dans l'historique git et les snapshots servis par l'app.

## [2026.10.13] - 2026-10-16

### Fixed
- En-tête et menu compact restaurés à la base v2026.10.6, dernière version documentée comme vérifiée sur Gmail réel.
- Compteurs de messages non lus conservés sur les onglets de catégories.

### Changed
- Archive Chrome et liens de téléchargement mis à jour en v2026.10.13.

## [2026.10.12] - 2026-10-16

### Added
- « Sombre Mail » (`tools/mail-client/`) : client mail autonome FastAPI + IMAP/SMTP promu depuis les archives locales — multi-comptes, envoi réel, pièces jointes, temps réel IDLE, mots de passe par variables d'environnement et mode démo `MAIL_CLIENT_DEMO=1`.
- Documentation du composant (`tools/mail-client/README.md`) et sections correspondantes dans les README FR/EN.

## [2026.10.11] - 2026-10-16

### Fixed
- Menu compact et en-tête restaurés à leur disposition stable de v2026.10.8, après la régression d’alignement.
- Retour à l’ouverture des commandes Gmail via leurs contrôles natifs, sans menus repositionnés par l’extension.

### Changed
- Archive Chrome et liens de téléchargement mis à jour en v2026.10.11.

## [2026.10.10] - 2026-10-16

### Fixed
- Paramètres Gmail ouvre le panneau natif « Configuration rapide » et celui-ci reste visible malgré le masquage de la barre latérale Google.
- Le menu natif d’Aide et les autres menus contrôlés depuis le menu compact sont repositionnés près de l’option choisie au lieu de s’ouvrir en haut à gauche.
- La barre d’applications Google est masquée sans masquer le conteneur des panneaux et menus Gmail.

### Changed
- Archive Chrome et liens de téléchargement mis à jour en v2026.10.10.

## [2026.10.9] - 2026-10-16

### Added
- Dix fonds d'écran candidats générés par IA stockés dans `src/extension-simplify/backgrounds/candidates/` (1672×941, non packagés dans l'extension) en attente du réagencement.

## [2026.10.8] - 2026-10-16

### Fixed
- Le clic sur une option du menu compact arrive au contrôle Gmail natif. La roue des paramètres et le lanceur d’applications s’ouvrent en un clic, puis le menu compact se referme.
- Les cibles invisibles restent alignées sur leur entrée lors du réagencement de l’en-tête, et les icônes Gmail débordantes ne capturent plus les clics d’autres options.
- Les compteurs de messages non lus des catégories restent visibles, sans badge vide sur les catégories à zéro.

### Changed
- Paquet, captures et références de version actualisés.

## [2026.10.7] - 2026-10-16

### Changed
- Les compteurs Gmail de messages non lus restent visibles sur les onglets de catégories et sont plus lisibles dans la liste.
- Les entrées du menu compact activent directement les contrôles natifs Gmail par clic, au lieu de faire réapparaître leurs icônes dans l’en-tête.
- Captures de démonstration et paquet Chrome renouvelés.

## [2026.10.6] - 2026-10-16

### Changed
- Simplify Style : cartes photo arrondies et contraste des commandes sur le fond nocturne.
- Documentation FR/EN, confidentialité, paquet et landing synchronisés ; captures fictives renouvelées pour les fonds, la boîte vide, le menu et la lecture.
- Tests complétés à partir de Gmail réel : couche de fond fixe, activation du volet, largeur des séparateurs, recherche et synchronisation des préférences.

### Fixed
- Icônes de l’extension ajoutées au suivi Git malgré l’exclusion globale du dossier `icons`, pour rendre le chargement depuis un clone reproductible.
- Références et crédits inclus dans le ZIP ; localisation de la landing conservée après remplacement de la démonstration ancienne par les nouvelles captures.

### [2026.10.5] - 2026-10-16

#### Changed
- Lab : les réglages « Interfaces », « Thèmes Mail Worlds » et « Style visuel » fusionnent en une liste unique de dispositions avec aperçus miniature redessinés (rail latéral, navigation haute, canvas, paper, K7, OMP).
- Nouvelles entrées « Focus OS (Nav Haute) » et « OMP Terminal » ; choisir une disposition applique d'un geste la disposition, le style visuel et le thème actif.

### [2026.10.4] - 2026-10-16

#### Added
- Fonds de l'extension : « Océan » et « Lac de nuit » packagés (photos Unsplash, crédits dans `backgrounds/CREDITS.md`), import d'une image personnelle redimensionnée et stockée localement, fond permanent ou réservé à la boîte vide.
- Menu compact « ⋮ » à gauche du compte : apparence, paramètres, aide, applications, Gemini et options de volet selon les contrôles natifs présents — navigation clavier, fermeture Escape, délégation réelle à Gmail.
- Actions Gmail natives fixées dans l'en-tête ; la recherche se replie en loupe dès qu'un message est sélectionné ou en lecture.
- État « boîte vide » immersif (fond + statut discret) annoncé uniquement quand Gmail confirme une boîte ou catégorie vide, jamais pour une recherche sans résultat.
- Séparateurs de dates (aujourd'hui, hier, cette semaine…) insérés sans remplacer les lignes Gmail.
- `REFERENCES.md` documentant les dix captures de référence (`benchmark/`) et l'analyse de l'archive Simplify 3.4.9, dont le code propriétaire reste hors paquet.

#### Changed
- `content.js` réécrit : les contrôles natifs Gmail restent en place (annotés) au lieu d'être clonés, la pause retire toute l'UI injectée et l'extension démarre sous la politique Trusted Types de Gmail.
- Tests d'intégration étendus (menu clavier, thèmes, sélection, boîte vide, import d'image, Trusted Types) et `build.py` embarque les fonds dans l'archive.

### [2026.10.3] - 2026-10-15

#### Changed
- Header auto-hide v3 : le header devient un calque flottant et le corps remonte au scroll (`padding-top` animé) — l'espace est réellement récupéré au lieu de laisser un bandeau vide.
- Masquage des séparateurs vertical et horizontal de la barre Gmail (`div.G-asx.J-J5-Ji`, `div.aBS.J-J5-Ji`).

### [2026.10.2] - 2026-10-15

#### Added
- Nouvelle extension Chrome `src/extension-simplify/` : surcouche visuelle indépendante pour Gmail, préférences de densité et de largeur, et bouton de rédaction flottant.
- Réglages de l'extension liés à la confidentialité et au soutien du projet sur Ko-fi.
- Kit de présentation bilingue `store/` avec captures de démonstration et instructions d'installation locale.
- Licence MIT et `PKSTACK.md` pour documenter les compétences utilisées.

### [2026.10.1] - 2026-10-15

#### Added
- `src/extension-bench/` : banc de test Chrome « PK Gmail Scripts Lab » — 28 scripts chargeables/déchargeables à la volée depuis un popup, régénérable par `build.sh` depuis `gmail.css` et les snippets ScriptCat.
- Sections 10 à 19 dans `src/extension/src/gmail.css` : ScrollBarGrey, thème PK Web Memory, masquage du statut Actif/absent, header auto-hide au scroll (scroll-driven), barre supérieure en niveaux de gris, masquage des outils de saisie, masquage du volet de lecture, toast centré en pilule, bouton Composer aligné sur la largeur des dossiers, sidebar en niveaux de gris.
- Réglage des marges du tweak Margin en pourcentage (variable `--pk-margin-side`, défaut 5 %) piloté depuis le banc de test.

#### Changed
- Section 1 renommée « Background White » (ex-FullWhite) pour refléter son rôle réel.
- Section 7 (TopRight) réancrée sur des `aria-label` stables au lieu des classes Google obfusquées.

#### Fixed
- Tweak Margin : sélecteurs « frère adjacent » périmés remplacés par un centrage structurel (`calc(100% - 2 × marges)` + marges auto).

### [2026.09.02] - 2026-09-01

#### Fixed
- `?minimal=1` force aussi les données de démonstration Focus OS afin de restituer l'interface à huit messages de la capture historique.

### [2026.09.01] - 2026-09-01

#### Added
- Paramètre d'URL `?minimal=1` dans le Lab : applique et sauvegarde le look Focus OS d'origine (catégories en haut en icônes seules, style standard mono, liste sujet seul, libellés masqués, animations de fond coupées).

### [2026.08.08] - 2026-08-31

#### Added
- Client mail en ligne de commande `tools/pkmail` adossé à Himalaya : inbox, lecture, recherche, envoi, archive, suppression, favoris et dossiers (doc dans `tools/PKMAIL.md`).
- Interface web `tools/pkmail-ui` (Next.js) branchée sur le CLI pkmail.
- Snapshot `lab-atelier-2026.08.07` servi par l'app desktop et ancien thème « Interface classique » accessible depuis le lab.
- Vue conversation empilée dans le lecteur Lab : messages du même fil triés de l'ancien au récent, repliés sauf le courant, dépliage à la demande.
- Bouton flottant « nouveau message » avec envoi réel via le backend et transfert pré-rempli avec le message cité.
- Annulation de suppression façon Gmail : disparition immédiate, toast « Annuler » pendant 6 secondes avant l'exécution réelle.
- Thème OMP inspiré d'omp.sh : fond noir, hairlines, accent déclinable en six couleurs, particules teintées à l'accent.
- Jeu étendu de raccourcis Gmail : `c`, `f`, `z`, `!`, `s`, `u`, `v`, `[`, `]`, `Shift+I`/`Shift+U` et la séquence `g` puis `i`.
- Layout avec catégories en haut conservé en complément du rail latéral repliable.
- Thème K7 Media Shelf inspiré d'une bibliothèque média sombre à accent cuivre.
- Thème K7 Preview Deck séparé avec miniatures HTML sandboxées chargées à l'approche de l'écran.
- Variante claire de K7 Preview Deck et barre de raccourcis intégrée au défilement.
- Vue K7 enrichie avec message vedette, jaquettes abstraites et étagère sans bordures décoratives.
- Fonds animés Particules, Ondes et Cassette sélectionnables et désactivables dans les réglages.
- Anciens styles Aero Glass, Nordic Zen et Editorial réintégrés dans les réglages.

#### Fixed
- Pièces jointes accessibles et prévisualisables dans le lecteur Lab : liens cliquables (nom, taille), ouverture inline des PDF et images, et pièces jointes fictives valides servies par le backend en mode démo.
- La touche du raccourci libellés/réponse ne s'inscrit plus dans le champ de recherche du sélecteur ni dans la zone de réponse.
- Entrée applique désormais le libellé sélectionné, avec message visible si aucun message n'est actif.
- Repli sur le preset quand un raccourci sauvegardé est vide : `j`/`k` fonctionnent dans tous les cas.
- Hiérarchie parent/enfant et emojis des noms visibles dans la gestion des libellés.
- Ligne sélectionnée lisible dans tous les thèmes et layouts (fin du blanc sur blanc en menu latéral).
- Raccourcis archiver, supprimer, libellés, répondre, rechercher et actualiser disponibles dans tous les thèmes et lecteurs.
- Miniatures HTML rendues inertes pour ne plus capturer les raccourcis dans WKWebView.

#### Changed
- Navigation Atelier disponible comme layout optionnel avec rail desktop et barre de catégories mobile.
- Suppression de Three.js, de la boucle WebGL permanente et des filtres plein écran.
- Largeurs de liste, colonne expéditeur et colonnes Canvas réglées en pourcentages, avec migration automatique des anciennes valeurs en pixels.
- Navigation clavier optimisée sans reconstruction de toute la liste à chaque déplacement.
- Lignes mobiles réorganisées sur deux niveaux pour conserver expéditeur, sujet et date lisibles.

### [2026.08.07] - 2026-08-27

#### Added
- Recherche intelligente dans les expéditeurs, sujets, contenus et libellés Gmail.
- Vue de recherche dédiée conservant tous les résultats pendant la lecture des messages.
- Recherche Gmail native et filtres de libellés classés par pertinence.
- Bulles avatars expéditeurs : photo si disponible, initiales colorées sinon, noms courts intelligents.

#### Fixed
- Couleurs multicolores appliquées par défaut aux mémos à la place du jaune fixe.

### [2026.08.06] - 2026-08-27

#### Fixed
- Chargement des catégories dans la liste, sans écran plein bloquant.
- Hauteur minimale des lignes Label Canvas pour éviter leur compression.
- Retour permanent vers Mail Worlds depuis l'interface classique.
- Vraie icône PKMail affichée sur l'action d'installation, à la place d'une miniature de layout.
- Rendu des mémos restauré en post-its avec palette multicolore stable.

#### Added
- Réglages modulaires pour la liste, la lecture, les mémos et les newsletters.
- Navigation des catégories en icônes seules ou avec libellés.
- Mode Ultra Light noir et blanc et choix d'ouverture des liens dans le drawer ou le navigateur.
- Largeurs de liste, d'expéditeur et de colonnes Canvas ajustables.
- Densité et contenu des lignes configurables : expéditeur, sujet, aperçu, favicons, libellés et dates.
- Colonnes Label Canvas configurables, avec Principale verrouillée en premier et sélection automatique par non-lus.
- Chargement au choix par bouton, défilement infini, ou les deux.

### [2026.08.05] - 2026-08-26

#### Fixed
- Démarrage immédiat depuis le dernier instantané local, sans attendre la connexion IMAP.
- Premier lancement non bloquant avec synchronisation Gmail visible en arrière-plan.

### [2026.08.04] - 2026-08-26

#### Fixed
- Icône PKMail appliquée au launcher Android natif.
- Actualisation Gmail forcée au lancement, manuellement et toutes les 60 secondes.
- Cache de la boîte de réception ramené de 24 heures à 60 secondes.
- Réglages enrichis avec raccourcis configurables, palettes de post-its et aperçus des layouts.
- Activation et désactivation des comptes mail, avec navigation complète des réglages au clavier.

### [2026.08.03] - 2026-08-26

#### Fixed
- Catégories Principale, Promotions, Réseaux, Notifications et Forums alignées sur les résultats natifs Gmail via `X-GM-RAW`.
- Réglages plein écran réparés et raccourci Gmail `#` relié à la suppression vers la corbeille.
- Ajout et retrait des libellés Gmail, noms courts après le dernier `/` et couleurs personnalisables.
- Version CalVer injectée dans les métadonnées du bundle macOS.

### [2026.08.01] - 2026-08-26

#### Added
- Interface Lab V2 avec trois thèmes et retour vers l'interface classique.
- Catégories Gmail, previews newsletters et mémos personnels en post-its.
- Installation PWA, Android natif et extension Chrome depuis la même interface.
- Preset de raccourcis Gmail officiel configurable.
- Navigation Mail Worlds plein écran, transitions Three.js et swipe entre catégories, sans menu latéral.
- Application macOS autonome `SimpleMail.app`, signée localement et ouvrant directement Mail Worlds.

#### Changed
- Chargements Gmail bornés et Canvas limité aux éléments visibles.
- Lecture Canvas dans un drawer bas plutôt qu'une popup.
- Architecture local-only : extension vers localhost, backend public retiré et builds mobiles automatiques suspendus.

### [1.0.4] — pré-CalVer
- Interface classique archivée dans `archive/v1.0.4` et disponible dans le Tester.
