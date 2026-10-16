# Kit média — régénération

Toutes les commandes partent de la racine `Chrome_SimpleGMAIL`. Les messages et expéditeurs
visibles sont fictifs. `gmail-fixture.html` n'est pas Gmail : Chrome charge `src/extension-simplify/`
comme une vraie extension MV3 et applique le CSS/JS de production à cette page de démonstration.
Les captures ne prétendent donc pas montrer une session Gmail authentifiée. La vérification de
Gmail réel reste décrite dans le README de l'extension ; ses images ne sont pas distribuées.

## Environnement

- Node.js 18+ et une installation existante de Playwright.
- Chrome for Testing compatible avec l'installation Playwright.
- `rsvg-convert` et `ffmpeg` pour décliner et contrôler les exports.
- Pillow 11 pour composer la carte et la bannière.

Le chemin Playwright et le binaire Chromium se configurent avec `PLAYWRIGHT_MODULE` et
`CHROMIUM_EXECUTABLE`. Avec Playwright déjà installé :

```sh
node store/media-kit/capture-extension.mjs
python3 store/media-kit/export-assets.py
```

La commande de capture extrait les fixtures de la suite `src/extension-simplify/tests/browser.mjs`
pour conserver la même source de messages. Elle ouvre un profil temporaire, route uniquement
`https://mail.google.com/mail/*` vers cette fixture locale, charge l'extension avec le manifest
courant, et capture inbox, popup, avant/après, composeur, fonds, boîte vide, menu et lecture.
Utiliser `PK_GIF_FRAMES=0` pour ne régénérer que les captures statiques. Les frames sont générées dans
`media-kit/.frames/`, répertoire local ignoré par Git, prêt pour l'export.

`export-assets.py` compose les images 1544 × 500 et 1200 × 630 à partir de captures locales et
des icônes de l'extension, puis produit deux GIFs et un MP4 1280 × 720 à partir des frames
numérotées. Les couleurs, le texte et les fenêtres d'interface du produit proviennent des
captures ; la carte et la bannière sont des compositions éditoriales.

## Résultats

- `../screenshots/01-inbox.png`, `02-reglages.png`, `03-avant.png`, `04-compose.png`
- `../screenshots/05-ocean.png`, `06-boite-vide.png`, `07-menu.png`, `08-nuit.png`, `09-lecture.png`
- `../assets/banner-1544x500.png`, `card-1200x630.png`
- `../gifs/demo-large.gif`, `demo-compact.gif`
- `../videos/demo.mp4`

Aucun Web Store ou autre canal de publication n'est créé. Pour modifier le déroulé d'une capture,
modifier l'adaptateur dans `capture-extension.mjs`, puis les textes et ratios éditoriaux dans
`export-assets.py`. La surcouche du produit demeure exclusivement dans `src/extension-simplify/`.
