# Changelog

Historique des versions de SimpleMail.

## Releases

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
