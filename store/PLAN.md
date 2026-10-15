# Plan média — PK Gmail Simplify Style

## Produit et preuve

Extension Chrome MV3 qui applique une surcouche visuelle au Gmail de bureau. La boîte,
le compte, les identifiants, les messages et le composeur restent ceux de Gmail. L'extension
ne lit ni ne transmet le contenu des messages. Elle n'est pas publiée au Chrome Web Store.

Les captures du kit sont des **simulations de Gmail avec des courriels fictifs**, rendues par
le véritable CSS et le véritable script de contenu de l'extension dans une page de démonstration.
Elles valident le rendu de la surcouche ; elles ne démontrent pas la connexion à un compte Gmail.
La validation de Gmail réel est effectuée séparément dans `src/extension-simplify/README.md`.

## Storyboard et livrables

| Section | Promesse et état | Capture / interaction | Mouvement |
| --- | --- | --- | --- |
| Hero | Une boîte plus calme, déjà lisible. | `screenshots/01-inbox.png`, état par défaut de l'extension chargée. | Arrivée légère du visuel ; respecte mouvement réduit. |
| Même courrier, nouvel espace | La recherche, les catégories et la liste restent familières. | `screenshots/03-avant.png` puis `screenshots/01-inbox.png`, même fixture et même viewport. | Transition avant/après manuelle, aucune donnée personnelle. |
| Réglages | Trois densités, trois largeurs, masque indépendant et bouton de rédaction. | `screenshots/02-reglages.png`, vrai popup de l'extension. | Capture stable du popup réel. |
| Essayer l'effet | Voir une ligne sélectionnée et ouvrir le composeur natif simulé. | `media-kit/capture-extension.mjs`, état capturé après un clic. | Courte boucle GIF/MP4 déterministe, cursor visible. |
| Installer et soutenir | Charger le dossier sans compte ni Web Store. | Guide local, Ko-fi réel, README FR/EN et fichier ZIP construit à la demande. | Aucun faux bouton de publication. |

## Critères

- 2 captures 1280 × 800 pour les README ; 1 capture de réglages dimension native.
- Bannière 1544 × 500, carte 1200 × 630, GIF large et compact, MP4 1280 × 720.
- Même source d'interface de démonstration pour avant/après et vidéo. Les exports statiques
  ne servent pas d'argument sur une API Gmail ou le statut du Web Store.
- Landing autonome en français et en anglais ; langue navigateur ou préférence sauvegardée,
  bascule manuelle au clavier, texte français disponible sans JavaScript.
- Ko-fi visible près du lien d'installation dans les deux langues. Lien ciblé vérifié :
  `https://ko-fi.com/pouark`.
- Vérifier les ratios, les liens locaux, le focus clavier et la lecture du MP4/GIF avant livraison.
