# Changelog

Historique des versions de SimpleMail.

## Releases

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
