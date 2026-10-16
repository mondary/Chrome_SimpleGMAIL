# Comparaison Simplify

Références consultées le 15 octobre 2026 : dix captures dans `../../benchmark/`, [simpl.fyi](https://simpl.fyi/) via EGO, archive locale `../../../simpli.zip` (Simplify Gmail 3.4.9).

L’archive originale est extraite dans `../../Vendors/simplify-3.4.9/`, répertoire local ignoré par Git. Son CSS et son script documentent notamment les états de boîte vide, le menu des applications et le volet de lecture. Ce code propriétaire n’est pas intégré au paquet PK. Le dépôt historique [leggett/simplify](https://github.com/leggett/simplify) sert aujourd’hui au suivi des problèmes. L’historique local contient aussi les premiers styles PK dans `ext/gmail.css` (notamment `ab17fd6`), mais l’archive retrouvée à côté du projet est la référence complète.

| Capture | Trait retenu | Mise en œuvre |
| --- | --- | --- |
| 01 inbox zero | Fond plein écran, en-tête transparent, statut bas gauche | Détection d’un état vide natif et uniquement dans la boîte ou une catégorie ; aucun résultat de recherche n’est annoncé comme boîte vide. |
| 02 inbox theme | Panneau de messages clair sur photographie | Thème Gmail conservé, fonds locaux Océan / Lac de nuit, image personnelle ; fond permanent ou réservé à la boîte vide. |
| 03–04 reading pane | Liste latérale, panneau de lecture distinct, actions en haut | Styles du volet Gmail natif, fond visible entre les panneaux, rédaction placée côté liste. |
| 05 inbox | Large marge, recherche centrée, catégories sobres, dates | Largeur proportionnelle, lignes 48 px par défaut, séparateurs de dates lisibles sans modifier le tri Gmail. |
| 06 navigation | Menu gauche simple, sélection rouge discrète | Le hamburger reste celui de Gmail. |
| 07 addons | Panneau Google accessible | Accès dans le menu compact et respect de sa place dans le viewport. |
| 08 conversation | Actions de message à la place de la recherche | Barre Gmail native fixée dans l’en-tête, recherche repliée en loupe et réouvrable. |
| 09–10 compose | Composeur clair, barre supérieure anthracite | Composeur Gmail conservé, styles de sa fenêtre uniquement. |
| Toutes | Trois points à gauche du compte | Menu clavier avec apparence, paramètres, aide, applications, Gemini et volet de lecture selon les contrôles présents. |

Les deux fonds livrés sont de nouvelles photographies Unsplash ; les thèmes des captures d’origine peuvent aussi être choisis dans Gmail ou importés comme image personnelle. Crédits dans `backgrounds/CREDITS.md`.
