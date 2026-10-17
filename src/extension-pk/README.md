# PK Gmail Studio — extension Chrome canonique

Version synchronisée avec le dépôt (voir `manifest.json` et
[`CHANGELOG.md`](../../CHANGELOG.md)) · Licence MIT · [Confidentialité](PRIVACY.md)

Studio de thèmes pour Gmail web : un panneau latéral applique une surcouche
visuelle aux onglets `mail.google.com`, sans backend ni compte supplémentaire.

## Thèmes

| Thème | Contenu |
| --- | --- |
| *Natif* | Gmail tel quel, avec les scripts cochables du panneau. |
| *Studio* | 28 tweaks cochables historiques. |
| *Simplify* | Fonds photo, boîte vide et volet de lecture (`themes/simplify/`). |
| *Classique* | Transposition V1 : salutation, avatars, groupes de dates (`themes/simplemail-classic/`). |
| *Focus OS* | Liste mono de 900 px, catégories en icônes, raccourcis (`themes/focus-os/`). |
| *Original* | Transposition de l'archive 01 : rail 64 px, recherche large, Composer noir, liste aérée (`themes/simplemail-original/`). |

## Installer

1. Ouvrir `chrome://extensions` et activer **Mode développeur**.
2. **Charger l'extension non empaquetée**, sélectionner **ce dossier** (`src/extension-pk/`,
   celui qui contient `manifest.json`).
3. Épingler l'icône, l'ouvrir sur Gmail : le panneau latéral liste les thèmes,
   les réglages du thème actif et les scripts.

## Construire les sources générées

`tweaks/`, `scripts/` et `data/manifest.js` sont régénérés depuis la source CSS
absorbée (`sources/gmail.css`, ex-extension SimpleMail) et les snippets ScriptCat :

```sh
cd src/extension-pk
./build.sh
```

Le script exige le symlink `vendors/scriptcat-snippets` (voir la racine du dépôt).
Les fichiers `data/*.js` portent l'en-tête « Généré par build.sh » : ne pas les
éditer à la main.

## Structure

- `manifest.json`, `background.js`, `popup.*` — extension MV3 et panneau latéral.
- `data/` — manifeste des scripts et définition des thèmes (générés + à la main).
- `themes/<thème>/` — `theme.css`, `theme.js`, polices et fonds embarqués.
- `tweaks/`, `scripts/` — CSS et userscripts générés depuis la source historique.
- `build.sh` — régénération des tweaks et du manifeste des scripts.

## Vérifications

- Harnais d'aperçu fictif : `tools/previews/focus-os-preview/` (Focus OS),
  `tools/previews/simplemail-original-preview/` (Original).
- Les polices et le logo d'un thème vivent dans la page Gmail : ils doivent être
  déclarés dans `web_accessible_resources` (`manifest.json`), sinon Chrome les
  bloque et les icônes s'affichent en toutes lettres à la place des pictos.
- La validation sur Gmail réel doit se faire dans un navigateur isolé
  (skill `ego-browser`), jamais dans le navigateur personnel.
