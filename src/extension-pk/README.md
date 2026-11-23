# PK Simple Gmail — extension Chrome canonique

Version synchronisée avec le dépôt (voir `manifest.json` et
[`CHANGELOG.md`](../../CHANGELOG.md)) · Licence MIT · [Confidentialité](PRIVACY.md)

Studio de thèmes pour Gmail web : un panneau latéral applique une surcouche
visuelle aux onglets `mail.google.com`, sans backend ni compte supplémentaire.

## Thèmes

| Thème | Contenu |
| --- | --- |
| *Natif* | Gmail tel quel, avec les scripts cochables du panneau. |
| *Studio* | 37 tweaks cochables, dont « Boîte à zéro », « Annuler préservé » (le vrai bouton Gmail conservé dans une pilule), « Focus lecture » (actions et pagination réunies au survol haut, rail de dossiers dégagé, réponse au bord bas — les bandeaux bas glissent au-dessus d'un toast « Annuler » vivant), le renommage des catégories, la bascule à triple logo Mail / Google Agenda / Drive complet et les accents Studio sur Agenda et Drive — bouton apps Google conservé. |
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
catégories Gmail détectées et jusqu'à six libellés configurés. Les catégories
standard activent les vrais onglets Gmail sous `#inbox`, pas les vues de libellé
`#category/…` : les archives sont exclues et le classement natif reste disponible.
**Achats** utilise `category:purchases`, même quand Gmail ne lui donne pas d'onglet,
et reste présent même sans libellé configuré. Aucun libellé n'est ouvert par défaut.
Le glisser-déposer d'une catégorie standard vers une autre (notamment Promotions
vers Principale) passe par les vraies cibles Gmail, alignées sous la barre Studio
dès le mousedown. Les catégories sans onglet natif, dont Achats, n'ont pas de cible
native ajoutée artificiellement. Les anciens liens de recherche Studio vers une
catégorie standard sont migrés vers son vrai onglet de boîte de réception.
Quand une recherche de catégorie ne renvoie aucun message, l'état vide illustré Studio
reste affiché au lieu du message générique de recherche.
La barre se cale sur la largeur de la colonne des mails et suit le réglage des marges.
Chaque onglet reprend le compteur de non-lus en pastille sur l'icône et la couleur
Gmail de sa catégorie (icône, soulignement de l'onglet actif). Le compteur de catégorie
vient d'une recherche Gmail en lecture seule `in:inbox category:<id> is:unread` dans
le compte actif : seules les conversations non lues et non archivées sont comptées.
Le transport interne Gmail démarre avant l'application ; il attend la session Gmail
et se rafraîchit après ses actions et toutes les 45 secondes quand la page est visible.
Si Gmail n'émet aucune requête au démarrage, le bouton natif Actualiser de la liste
initialise la session, sans navigation ni ouverture de message et hors saisie.
Une liste visible complète constitue aussi une source exacte. Aucun repli vers les
« nouveaux » ou les totaux de catégorie incluant les archives. Si Gmail ne fournit
qu'une estimation, le module sonde un nombre borné de pages natives jusqu'à obtenir
le total exact. Il mémorise la page utile, pas les conversations. Les compteurs sont
publiés individuellement, sans attendre les autres catégories. Lors d'un échec, le
dernier chiffre vérifié reste affiché avec la mention « actualisation en attente »
dans l'infobulle ; `…` apparaît uniquement si aucun total exact n'a encore été obtenu.
La coche verte apparaît uniquement en inbox zéro : 0 non-lu **et** boîte réellement vide
(le total `in:inbox category:<id>` vaut 0, interrogé en lecture seule seulement quand
les non-lus tombent à 0). Une boîte à 0 non-lu mais qui garde du courrier lu n'affiche
pas de pastille ; l'infobulle dit « boîte à zéro » ou « 0 non lu ».
Les libellés configurés conservent leur badge de navigation Gmail. Voir [confidentialité](PRIVACY.md).
L'onglet actif est repéré par le soulignement de sa couleur, sans fond noir ; en mode
icônes, la barre le ramène automatiquement dans la zone visible. Ouvrir une
conversation depuis une catégorie conserve cet onglet pendant la lecture et au retour
à la liste, même si Gmail réinitialise ses propres onglets cachés à Principale.
Cliquer l'icône Gmail, « Boîte de réception » ou l'onglet Principale réinitialise
explicitement la sélection.
Les catégories sont mémorisées dans la session par compte/langue : visiter la
boîte de réception une première fois pour découvrir les catégories activées.
La barre reste présente au changement de vue. Un onglet renommé garde le vrai nom
Gmail de sa catégorie entre parenthèses — « Job (Promotions) » — dans la barre,
les infobulles, le lecteur d'écran et l'état vide « Boîte à zéro ».
Quand le texte ne tient plus, tous les boutons passent à l'icône seule : 20 px
+ 4 px de padding de chaque côté. Les infobulles gardent le nom complet.
Le clavier utilise les flèches, Début/Fin puis Entrée/Espace pour activer.

### Menu latéral masqué

Dans les réglages de l’extension, activer **NoLeftMenu · dossiers au survol**.
Le menu natif Gmail reste masqué ; survoler la zone sous le burger révèle six icônes
grises uniquement : Boîte de réception, Messages suivis, Messages envoyés, Brouillons,
Spam et Corbeille. Aucun panneau, fond, bordure ou ombre ; apparition et disparition
par fondu de 160 ms, désactivé en mouvement réduit. Les liens ouvrent les dossiers
Gmail du compte courant même si leurs entrées natives sont absentes du menu caché.
Aucune catégorie ni aucun libellé ajouté. Accessible au clavier, noms FR/EN ; le
focus clavier révèle les liens, sans qu’un clic souris bloque la disparition.

### Toasts « Annuler »

Le tweak **Toast · Annuler préservé** ne clone plus le toast. Un clic sur un clone
n'est plus reconnu par Gmail. Quand un nouveau toast remplace une action annulable,
la pilule Studio déplace la **ligne originale** — donc le vrai nœud `#link_undo` —
dans un second `.vh` sous le même conteneur `.bAp`. Le gestionnaire natif reste actif
et le clic annule réellement la suppression, l'archivage ou le déplacement.
La détection repose aussi sur la disparition du nœud, utile lorsque deux actions
affichent le même texte (« Brouillon supprimé. »). La croix de la pilule ferme
seulement le rappel. La durée affichée ne dépasse jamais la fenêtre d'annulation
native, même si le réglage est plus long. Vérifié sur Gmail réel avec des brouillons
jetables ; aucun courrier personnel n'est modifié.

L'empilement est **mesuré** : une seule bulle reste affichée — la plus récente,
toast natif ou pilule — à 24 px du bord. Les tuiles plus anciennes, quelle que soit
leur nature, partagent la même chronologie et se replient derrière une puce
« **+N** » posée au-dessus d'elle : la pile ne recouvre plus le bas du message. Un
clic déplie tout (la puce passe en « − »), un second replie, et le dépliage se
referme seul après 4 s. Le dépliage est alors mesuré à son tour : les tuiles
montent avec un écart constant de 10 px calculé sur leurs hauteurs réelles — un
message sur deux lignes ne chevauche jamais sa voisine, et les toasts natifs
simultanés ne s'écrasent plus sur le même pixel. Les lignes « Annuler » repliées
gardent leur nœud dans le DOM : leur fenêtre d'annulation continue de courir
pendant le repli et reste cliquable une fois la pile dépliée.

### Focus lecture

Le tweak **Focus lecture · interface effacée, révélée au bord de l'écran** ne
s'active que dans un fil ouvert : la barre globale (logo + recherche), le bandeau
de catégories, la barre d'actions du fil et la barre de réponse flottante quittent
le flux (`position: fixed`, masquées hors survol). Le sujet sticky est compacté (une
ligne, hairline) et la colonne de lecture est
resserrée à 920 px. La barre d'actions est détectée par le hook Gmail
`.aeH .iH.bzn[gh="mtb"]` (même ancrage que le filtre « messages similaires »), sans
dépendre du libellé localisé « Retour ». Les rangées natives `div.G-atb.D.E` et
`div.G-atb.D.F`, relevées dans l’inspecteur Gmail, sont ciblées directement même
sans `.Dj` / `.aqJ` ; ces anciens hooks restent un repli. Leurs `::before` et
`::after` sont neutralisés uniquement pendant Focus. Le sticky `div.V8djrc.byY`
est reconnu comme en-tête de lecture et ramené à `top: 0`, sans marge ni hauteur
minimale réservée aux commandes. Le groupe natif compteur/flèches est repéré
par ses anciens hooks ou, dans les rangées natives, par le compteur numérique
et ses deux boutons. La sélection des actions et de la navigation précède tout
marquage : la cible ne bascule plus entre parent et enfant à chaque scan.
Les commandes sont en superposition fixe et les wrappers qui ne contiennent que
ces commandes perdent leur boîte de mise en page (`display: contents`). Cela
supprime aussi leurs hauteurs imposées, paddings et contextes de transformation.
Actions et pagination reviennent ensemble au survol sans déplacer le sujet ni
le message ; aucune rangée dédiée ne doit subsister, même invisible. Les wrappers
contenant d'autres éléments visibles ne sont pas neutralisés. La zone des commandes commence après le rail NoLeftMenu et garde un
espace avant le compteur ; actions et navigation forment deux zones contiguës du
même bandeau blanc, sans fond supplémentaire posé au-dessus des commandes Gmail.
Le rail reste sous la barre même lorsque le bandeau Gmail est masqué. La zone de
survol haute couvre au moins 44 px et la hauteur réelle du bandeau. Le survol haut
garde les actions et la pagination au bord même de l'écran — le point d'arrivée du
curseur, donc Retour reste sous le pointeur — et la vraie recherche Gmail (logo et
bascule Mail / Agenda / Drive inclus) s'empile en dessous, à sa hauteur réelle
mesurée ; le rail de dossiers glisse sous la pile le temps du survol avant de
retrouver sa place au retrait. Actions et
pagination reviennent ensemble par fondu de 180 ms, sans `transform` sur leurs
conteneurs pour ne pas piéger une navigation fixe imbriquée ; retrait après 700 ms
loin du bord. À moins de 64 px du bord bas, Répondre / Répondre à tous / Transférer
quittent leur position sticky pour une superposition fixe à 12 px du bord inférieur,
à gauche du bouton « Nouveau message », avec un écart horizontal de 12 px. La
largeur réelle du bouton réserve sa zone, sa couche reste au-dessus du fond de
réponse, et les commandes de réponse peuvent passer à la ligne. En lecture, le
bouton « Nouveau message » prend une forme compacte à contour gris, sans ombre ;
sa hauteur suit le premier bouton de réponse et son bord inférieur la dernière
ligne des réponses natives. Son style de vue liste n’est pas modifié. Cette barre
ne réserve donc plus un footer blanc quand elle est masquée, ni ne raccourcit le
message quand elle revient. La recherche réapparaît quand le focus clavier entre
dans `#gb` (raccourci `/`, Tab) — seule, à sa place officielle au-dessus de la
lecture — et reste la dernière rangée du bandeau de survol ; le focus
clavier force la zone concernée visible, donc rien n'est piégé ; `prefers-reduced-motion` supprime les transitions. Aucun
nœud Gmail n'est cloné ni déplacé : le script marque les conteneurs sur place
(`data-pk-focus-tools`, `data-pk-focus-pager`, `data-pk-focus-floatbar`) et l'état
vit dans des classes sur `<html>` (`pk-focus`, `pk-focus-top`, `pk-focus-bottom`).
La vue liste n'est jamais touchée ; le retour à la liste restaure tout
instantanément. Seul un Gmail avec survol est concerné (`hover: hover`).

**Échap** ramène à la liste depuis la lecture, comme le bouton retour que le survol
révèle : le clic part vers le vrai contrôle Gmail (`#back` / `.ar0`, sinon le libellé
« Retour » / « Back » de la barre d'actions), donc le dossier, le libellé ou la
recherche en cours sont conservés. Gmail garde Échap quand il a lui-même quelque
chose à fermer : brouillon (`.M9` / `.aoI`), boîte de dialogue, menu ou liste
déroulante visibles, champ de saisie ou zone éditable (recherche, objet, corps de
réponse). Sans barre d'actions reconnue, `#inbox` sert de repli ; le raccourci est
ignoré en vue liste, pendant une répétition de touche et avec un modificateur.
**J / K** parcourent les conversations sans quitter la lecture : `J` ouvre la plus
ancienne, `K` la plus récente, via les vraies flèches de pagination Gmail que le
survol révèle — flèche désactivée respectée, libellés FR/EN, répétition permise.
Si la flèche n'est pas trouvée, la touche reste à Gmail (raccourcis natifs actifs
ou non), et flèches, `o`, `e` ne sont jamais interceptés. Un champ de saisie, un
brouillon, un dialogue ou une touche modifiée gardent leurs lettres. L'écoute
clavier vit sur `window` en capture, donc un handler Gmail ne peut plus l'avaler ;
la détection lecture survit au renommage de l'en-tête sticky (repli : barre de fil
`gh="mtb"` au-dessus d'un corps de message réel).
Le triptyque Mail / Agenda / Drive reste à sa position habituelle dans `#gb` :
il est masqué avec cet en-tête en lecture, sans capsule flottante dans le coin
ni bouton Retour permanent. Aucun dégagement supplémentaire n’est ajouté au sujet.
La suite simule aussi 45 mises à jour de classe Gmail sans réécriture des marqueurs,
vérifie l’absence de mutations au repos et le hit-test des commandes du bas à
1280 et 384 px. Ces vérifications ne remplacent pas une validation dans Gmail réel.

### Génération des fichiers

`tweaks/`, `scripts/` et `data/manifest.js` sont régénérés depuis la source CSS
absorbée (`sources/gmail.css`, ex-extension SimpleMail) et les snippets ScriptCat :

```sh
cd src/extension-pk
./build.sh
```

Le script exige le symlink `vendors/scriptcat-snippets` (voir la racine du dépôt).
Un userscript présent dans `sources/` est prioritaire sur le snippet partagé : le
correctif anti-boucle du surligneur y vit, sans modifier le dépôt ScriptCat voisin.
Les fichiers `data/*.js` portent l'en-tête « Généré par build.sh » : ne pas les
éditer à la main.

## Structure

- `manifest.json`, `background.js`, `popup.*` — extension MV3 et panneau latéral.
- `data/` — manifeste des scripts et définition des thèmes (générés + à la main).
- `themes/<thème>/` — `theme.css`, `theme.js`, polices et fonds embarqués.
- `tweaks/`, `scripts/` — CSS et userscripts générés depuis la source historique.
- `build.sh` — régénération des tweaks et du manifeste des scripts.

## Vérifications

- `node tools/tests/studio-performance.test.mjs` : absence de mutations et de
  recalculs de mise en page au repos, surlignage après ajout de contenu, pause en
  arrière-plan et absence d’accumulation de lignes DOM après remplacements répétés.
  Profil Chrome headless jetable, réseau bloqué, aucune capture ni session personnelle.
  Méthode et limites : [`docs/PERFORMANCE_GMAIL.md`](../../docs/PERFORMANCE_GMAIL.md).
- `node --test tools/tests/no-left-menu.test.mjs` : contenu exact du rail, routes
  Gmail sans menu natif, conservation du compte, libellés FR/EN, alignement sous le
  burger (chargement tardif et redimensionnement), styles du fondu et focus clavier.
- `node tools/tests/studio-tabs.test.mjs` : tests de navigation, géométrie,
  responsive, clavier, glisser-déposer natif, ouverture d’un mail sans perdre la
  catégorie d’origine et état vide de recherche dans un Chrome headless à profil
  jetable, DOM Gmail fictif.
  `CHROME_BIN` permet de préciser le binaire ; `CAPTURE_TABS=1` régénère les deux
  captures d'onglets et `CAPTURE_EMPTY=1` l'état vide de recherche. Le test ne prouve
  pas la compatibilité avec le DOM Gmail actuel.
- `node --test tools/tests/studio-modules.test.mjs` depuis la racine : navigation,
  comptes, isolation des onglets et actualisation des enregistrements.
- `node --test tools/tests/studio-counts.test.mjs` : décomptes exacts, estimations
  résolues par pagination, démarrage depuis le cache, sessions XHR/fetch, synchronisation
  pendant le décompte, isolation de compte et absence de requêtes quand le module est inactif.
  Vérifie aussi l’annulation en arrière-plan/désactivation et l’espacement des séries.
- `node tools/tests/studio-toast.test.mjs` : identité du vrai lien Gmail, clic après
  remplacement du toast, deux messages identiques, fermeture clavier et expiration de
  la pilule ; rafale de 3 toasts natifs (une seule bulle affichée, « +2 » au-dessus),
  dépliage mesuré sans chevauchement (écarts ≥ hauteur + 9 px), repli « +N » et
  refermeture automatique après 4 s.
- `node tools/tests/studio-focus.test.mjs` : retrait du chrome en vue fil, marquage
  unique des conteneurs, réapparition au bord haut (barre d'actions) et bas (réponse +
  FAB) avec vrais événements pointeur, recherche révélée par le focus clavier, J/K
  pilotant les vraies flèches de pagination (avec gardes champ/dialogue/brouillon/Maj
  et inertie en vue liste), détection lecture résistante au renommage de l'en-tête
  sticky, retour à la liste sans attribut résiduel et désactivation par réglage.
  Vérifie aussi les wrappers à hauteur imposée, la rangée actions/pagination commune
  et l'absence de déplacement du sujet/message au survol. Validation sur DOM fictif
  uniquement. Banc :
  `tools/previews/studio-focus-preview/` (captures `01-focus` à `04-liste`).
- QA Gmail du 2 novembre : brouillon jetable supprimé, toast remplacé, puis clic
  sur « Annuler » de la pilule — brouillon rouvert. Aucun courrier personnel touché.
- QA Gmail du 30 octobre : totaux Principale et Réseaux vérifiés ; drag Promotions
  vers Principale reconnu comme « Déplacer 1 conversation », annulé avant dépôt.
  Aucun message personnel reclassé pour ce test ; les dépôts effectifs sont testés
  sur des messages fictifs dans `studio-tabs.test.mjs`.
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

Si PKMail vous est utile : [Ko-fi](https://ko-fi.com/pouark)
