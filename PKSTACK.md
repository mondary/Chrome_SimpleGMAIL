# Skills du projet

| Skill | Rôle | Livrable |
| --- | --- | --- |
| `frontend-design` | Préciser la direction visuelle Simplify et l'état vide Studio pour la surcouche Gmail. | `src/extension-pk/themes/simplify/theme.css`, `src/extension-pk/themes/studio/empty-state.css`, panneau latéral et icône. |
| `ego-browser` | Vérifier l'interface Gmail dans une session isolée. | Focus : `tools/previews/focus-os-preview/verify.mjs`, `verify-categories.mjs` et `verify-preferences.mjs` ; navigation et totaux Gmail, filtres, préférences persistantes, panneau synchronisé et captures fictives. |
| `ego-browser-user-policy` | Garder les interactions Gmail dans un navigateur isolé. | Validation sans utiliser les fenêtres personnelles. |
| `premium-promo-media` | Préparer une landing, des captures fictives et leurs dérivés média. | `store/`. |
| `pk-commits` | Synchroniser le CalVer, le changelog, les READMEs et la livraison. | `CHANGELOG.md`, `README.md`, `README_en.md`, commit et push. |
| `fixing-accessibility` | Rendre la navigation Mail / Agenda accessible au clavier. | `themes/studio/modules.js`, `modules.css` : contrôles natifs, état courant et focus visible. |
| `app-presence-sync` | Documenter la navigation vers Google Agenda complet et ses permissions. | README FR/EN, guide de l'extension et note locale de présentation. |

Onglets Studio : `fixing-accessibility` pour la navigation clavier et les noms des
icônes ; `ego-browser` / `ego-browser-user-policy` pour la tentative de QA Gmail
(reconnexion requise) ; `premium-promo-media` et `app-presence-sync` pour les captures
de simulation et la note bilingue locale. Suite sans dépendance :
`tools/tests/studio-tabs.test.mjs`, profil Chrome headless jetable.
