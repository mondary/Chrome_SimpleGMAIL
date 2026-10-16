# PK Gmail — Simplify Style

Version **2026.10.7** · Licence MIT · [Confidentialité](PRIVACY.md)

Une extension Chrome autonome qui applique une surcouche visuelle à **Gmail web**,
inspirée des dix captures Simplify du dossier `../../benchmark/`.
Ce dossier est indépendant de `../extension/` et de `../extension-bench/`.
Aucun backend, compte supplémentaire, OAuth, compilation ou abonnement nécessaire.

## Installer ou actualiser

1. Ouvrir `chrome://extensions` et activer **Mode développeur**.
2. Cliquer sur **Charger l’extension non empaquetée**, puis sélectionner ce dossier
   **`src/extension-simplify`**, qui contient `manifest.json`.
3. Désactiver les autres surcouches Gmail (Scripts Lab, Simplify ou userscripts de
   style) pour éviter que leurs règles CSS se cumulent.
4. Recharger les onglets Gmail ouverts.

Pour une mise à jour, cliquer sur **Actualiser** sur la fiche de l’extension,
puis recharger Gmail. Un ZIP doit être décompressé avant le chargement.

## Apparence

- **Fonds** : thème Gmail conservé, blanc, Océan, Lac de nuit ou image personnelle
  JPEG/PNG/WebP. Affichage permanent ou uniquement lorsque la boîte est vide.
- **Boîte vide** : fond dégagé et statut « Aucun nouveau message ! » / « No new mail! »
  en bas à gauche. Les résultats de recherche vides ne déclenchent pas cet état.
- **Menu compact** : trois points immédiatement à gauche du compte, avec apparence,
  paramètres Gmail, applications, aide et commandes de volet selon leur disponibilité.
- **En-tête commun** : commandes natives des messages en haut ; la recherche se replie
  en loupe en lecture ou lors d’une sélection. Échap referme la recherche.
- Liste centrée, densités 38 / 48 / 58 px, trois largeurs, catégories en capitales,
  sélection rouge discrète dans la navigation et séparateurs par date.
- Lecture sur carte claire, volet Gmail vertical avec liste à deux lignes et fond
  entre les panneaux. Le volet horizontal conserve la disposition native.
- Bouton + flottant qui ouvre le composeur Gmail, avec barre supérieure anthracite.

Le menu **⋮ → Apparence de Gmail** et le popup de l’extension enregistrent les
préférences localement et les appliquent aux onglets Gmail ouverts. Le thème Gmail
reste le fond par défaut : choisir **Océan** ou **Lac de nuit** pour voir les fonds fournis.
L’interrupteur principal restaure immédiatement l’apparence native.

[Soutenir sur Ko-fi](https://ko-fi.com/pouark) est aussi accessible dans les réglages.

## Périmètre

Le projet reproduit les traits visuels étudiés, sans intégrer toutes les fonctions
de Simplify : bundles, rappels et blocage des traqueurs restent hors périmètre.
Les fonds livrés sont des photographies distinctes des thèmes des captures.
Les dossiers, libellés, conversations, pièces jointes et actions restent ceux de Gmail.

La surcouche vise Gmail bureau. Les paramètres complets, Chat/Meet, impression et
rédaction indépendante conservent la présentation native. Les sélecteurs Gmail
peuvent évoluer ; un changement côté Google peut nécessiter une adaptation.
Les dates affichées en français et anglais sont reconnues ; les dates inconnues
restent telles quelles, sans séparateur ajouté ni modification du tri.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Manifest V3, injection CSS/JS sur Gmail, seule permission API `storage` |
| `gmail.css` | Surcouche conditionnée par `html[data-pks="on"]` |
| `content.js` | États Gmail, menu, commandes natives, fonds et séparateurs |
| `settings.js` | Validation des préférences et traitement local des images |
| `popup.*` | Réglages de l’extension |
| `backgrounds/` | Photographies locales et crédits |
| `REFERENCES.md` | Correspondance des captures et sources retrouvées |
| `build.py` | Archive ZIP des fichiers nécessaires |

Les nœuds natifs Gmail ne sont ni déplacés ni remplacés. La barre d’actions est
positionnée par CSS, avec ses gestionnaires conservés. Le script lit les dates et
compteurs affichés pour la présentation ; il n’analyse pas les corps des messages,
n’intercepte pas l’envoi et ne crée aucune requête réseau. L’observateur est
déconnecté lorsque la surcouche est en pause.

## Vérifier et empaqueter

```sh
node --check content.js
node --check settings.js
node --check popup.js
python3 build.py
node tests/browser.mjs
```

Le ZIP est créé dans `dist/` et copié dans `../../store/assets/`.
Les tests nécessitent Playwright et Chromium. `PLAYWRIGHT_MODULE` et
`CHROMIUM_EXECUTABLE` permettent de réutiliser des installations existantes.
Ils chargent réellement l’extension MV3 dans un profil temporaire sur un DOM Gmail
simulé, y compris les contraintes Trusted Types, sans connexion à un compte.

La validation EGO sur Gmail réel utilise le CSS/JS de production injecté dans un
monde isolé avec un stockage temporaire : fonds, menu, paramètres natifs, volet
vertical, lecture et recherche. Elle complète le test du paquet MV3, sans valider
chaque variante de compte Gmail. Aucun message envoyé, supprimé ou archivé.
Les captures du store sont exclusivement des simulations à données fictives.

## Références

[Simplify](https://simpl.fyi/), les captures et l’archive locale Simplify 3.4.9 ont
servi à l’étude visuelle. Voir [REFERENCES.md](REFERENCES.md). Le code propriétaire
reste dans `Vendors`, hors Git et hors paquet. Cette extension est une réalisation
indépendante, sans affiliation avec Simplify ou Google. Les photographies fournies
ont leurs [crédits et licence](backgrounds/CREDITS.md).
