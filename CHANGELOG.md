# Changelog

Historique des versions de SimpleMail.

## Releases

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
