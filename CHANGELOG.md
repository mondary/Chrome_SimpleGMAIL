# Changelog

Historique des versions de SimpleMail.

## Releases

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
