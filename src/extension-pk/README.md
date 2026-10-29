# PK Simple Gmail — extension Chrome canonique

Version synchronisée avec le dépôt (voir `manifest.json` et
[`CHANGELOG.md`](../../CHANGELOG.md)) · Licence MIT · [Confidentialité](PRIVACY.md)

Studio de thèmes pour Gmail web : un panneau latéral applique une surcouche
visuelle aux onglets `mail.google.com`, sans backend ni compte supplémentaire.

## Thèmes

| Thème | Contenu |
| --- | --- |
| *Natif* | Gmail tel quel, avec les scripts cochables du panneau. |
| *Studio* | 36 tweaks cochables, dont « Boîte à zéro », « Annuler préservé », le renommage des catégories, la bascule à triple logo Mail / Google Agenda / Drive complet et les accents Studio sur Agenda et Drive — bouton apps Google conservé. |
| *Simplify* | Fonds photo, boîte vide et volet de lecture (`themes/simplify/`). |
| *Classique* | Transposition V1 : salutation, avatars, groupes de dates (`themes/simplemail-classic/`). |
| *Focus* | Liste mono de 900 px, catégories masquables et alignables, compteur total Gmail et raccourcis (`themes/focus-os/`). |
| *Original* | Transposition de l'archive 01 : rail 64 px, recherche large, Composer noir, liste aérée (`themes/simplemail-original/`). |

## Installer

1. Ouvrir `chrome://extensions` et activer **Mode développeur**.
2. **Charger l'extension non empaquetée**, sélectionner **ce dossier** (`src/extension-pk/`,
   celui qui contient `manifest.json`).
3. Épingler l'icône, l'ouvrir sur Gmail : le panneau latéral liste les thèmes,
   les réglages du thème actif et les scripts.

## Construire les sources générées

### Mail / Google Agenda / Drive

Activer **Modules · Mail / Google Agenda / Drive complet, même onglet** dans Studio.
Une bascule à triple logo, à la place du logo dans la barre supérieure des trois sites,
propose **Gmail**, **Agenda** et **Drive** (pictogrammes officiels, segment actif blanc sur capsule noire).
Elle navigue vers le vrai Google Agenda (création d'événements, vues et paramètres natifs),
vers le vrai Drive sur « Mon Drive », puis ramène à la **boîte de réception** du compte actif.
Le logo Gmail, même quand il est déjà le segment actif, rouvre aussi la boîte de réception.
Chaque bascule charge la page cible.
La bascule navigue sur place : un seul onglet, une seule fenêtre, le retour navigateur intact.
Sur Drive, un burger Studio (à gauche de la bascule) replie ou déplie le panneau latéral ;
l'état est mémorisé dans `pkDriveRailCollapsed`.
Dans une fenêtre d'application installée (mode standalone), Chrome superpose sa propre barre
d'URL « hors périmètre » ; ouvrir Gmail dans un onglet classique l'évite complètement.
Agenda reçoit les accents Studio (`calendar.css`) : fond blanc, jour courant et boutons en noir ;
les couleurs des calendriers et des événements restent intactes.
La préférence Studio existante est conservée ; l'extension demande désormais aussi
l'accès à `https://calendar.google.com/*` et `https://drive.google.com/*` pour y afficher la bascule.
Les retouches Gmail ne sont pas injectées dans Calendar.

### Onglets Studio

Activer **Onglets · catégories + libellés** dans Studio. Une seule barre réunit les
catégories Gmail détectées et jusqu'à six libellés configurés. Chaque catégorie
s'ouvre par la recherche `in:inbox category:<id>` : seuls les messages de la boîte
de réception apparaissent, donc archiver un message le retire de l'onglet.
**Achats** utilise `category:purchases`, même quand Gmail ne lui donne pas d'onglet,
et reste présent même sans libellé configuré. Aucun libellé n'est ouvert par défaut.
La barre se cale sur la largeur de la colonne des mails et suit le réglage des marges.
Chaque onglet reprend le compteur de non-lus en pastille sur l'icône et la couleur
Gmail de sa catégorie (icône, soulignement de l'onglet actif). L'onglet actif est un segment
noir plein ; en mode icônes, la barre le ramène automatiquement dans la zone visible.
Les catégories sont mémorisées dans la session par compte/langue : visiter la
boîte de réception une première fois pour découvrir les catégories activées.
La barre reste présente au changement de vue. Les noms renommés sont repris.
Quand le texte ne tient plus, tous les boutons passent à l'icône seule : 20 px
+ 4 px de padding de chaque côté. Les infobulles gardent le nom complet.
Le clavier utilise les flèches, Début/Fin puis Entrée/Espace pour activer.

### Génération des fichiers

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

- `node tools/tests/studio-tabs.test.mjs` : tests de navigation, géométrie,
  responsive et clavier dans un Chrome headless à profil jetable, DOM Gmail fictif.
  `CHROME_BIN` permet de préciser le binaire ; `CAPTURE_TABS=1` régénère les deux
  captures Studio. Le test ne prouve pas la compatibilité avec le DOM Gmail actuel.
- `node --test tools/tests/studio-modules.test.mjs` depuis la racine : navigation,
  comptes, isolation des onglets et actualisation des enregistrements.
- `tools/tests/verify-modules-live.mjs` : aller-retour sur les vraies pages via Ego,
  avec API Chrome simulée dans un monde isolé (aucun mail ni événement modifié).
- Harnais d'aperçu fictif : `tools/previews/focus-os-preview/` (Focus),
  `tools/previews/simplemail-original-preview/` (Original),
  `tools/previews/studio-empty-preview/` (Studio, Promotions vides) et
  `tools/previews/studio-toast-preview/` (Studio, toast « Annuler » préservé).
- Les polices et le logo d'un thème vivent dans la page Gmail : ils doivent être
  déclarés dans `web_accessible_resources` (`manifest.json`), sinon Chrome les
  bloque et les icônes s'affichent en toutes lettres à la place des pictos.
- La validation sur Gmail réel doit se faire dans un navigateur isolé
  (skill `ego-browser`), jamais dans le navigateur personnel.
