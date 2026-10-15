# PK Gmail — Simplify Style

Version **2026.10.2** · Licence MIT · [Confidentialité](PRIVACY.md)

Une extension Chrome autonome qui applique une surcouche visuelle à **Gmail web**,
inspirée des captures Simplify du dossier `../../benchmark/`.

Ce dossier est indépendant de `../extension/` et de `../extension-bench/`.
Aucun backend, compte supplémentaire, OAuth, compilation ou abonnement nécessaire.

## Installer

1. Ouvrir `chrome://extensions`.
2. Activer **Mode développeur**.
3. Cliquer sur **Charger l'extension non empaquetée**.
4. Sélectionner ce dossier **`src/extension-simplify`**, qui contient `manifest.json`.
5. Désactiver les autres surcouches Gmail (PK Gmail Scripts Lab, Simplify ou
   userscripts de style) pour éviter que leurs règles CSS se cumulent.
6. Recharger les onglets Gmail déjà ouverts.

Épingler l'icône de l'extension pour accéder aux réglages. Après une modification
du code, cliquer sur **Actualiser** dans `chrome://extensions`, puis recharger Gmail.

## Apparence

- Fond blanc, interface allégée, barre de recherche grise et centrée.
- Liste centrée, lignes sans séparateurs lourds, non-lus et sélection distincts.
- Catégories en capitales et onglet actif rouge.
- Menu natif repliable, avec sélection rouge pâle. L'état du menu Gmail est conservé :
  cliquer sur le hamburger pour retrouver la présentation sans barre latérale.
- Bouton rond multicolore en bas à droite, qui ouvre le composeur Gmail.
- Lecture centrée et titre plus ample ; le HTML des messages n'est pas réécrit.
- En-tête sombre du composeur ; mise en forme, pièces jointes et envoi natifs.

Le réglage **Soutenir sur Ko-fi** mène à [ko-fi.com/pouark](https://ko-fi.com/pouark).

Le panneau propose trois densités (**38 / 48 / 58 px**) et trois largeurs,
ainsi que des interrupteurs pour les outils secondaires, le panneau des modules
Google et le bouton flottant. Les changements s'appliquent aux onglets ouverts.
L'interrupteur principal restaure immédiatement l'apparence native de Gmail.

## Périmètre

Il s'agit du **look**, pas d'une reproduction de toutes les fonctions de Simplify.
Les regroupements par date, bundles, rappels, blocage des traqueurs, fonds photo
et thèmes sombres ne sont pas implémentés. Les onglets, dossiers, libellés,
conversations et actions restent ceux de Gmail.

La surcouche vise Gmail bureau en thème clair. Les pages de paramètres, Chat/Meet,
impression et rédaction indépendante conservent la présentation native. Les
sélecteurs Gmail peuvent évoluer ; ils sont regroupés et commentés dans `gmail.css`.
Les règles du volet de lecture partagé sont prévues, mais ce mode nécessite une
validation sur chaque configuration de volet.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Manifest V3, injection CSS/JS sur Gmail, permission `storage` |
| `gmail.css` | Surcouche entièrement conditionnée par `html[data-pks="on"]` |
| `content.js` | Détection des vues, suivi du menu natif, bouton flottant |
| `settings.js` | Préférences par défaut et validation des valeurs |
| `popup.*` | Réglages stockés localement, sans service worker |
| `PRIVACY.md` | Accès et données utilisés par l'extension |
| `build.py` | Archive ZIP des seuls fichiers nécessaires |
| `LICENSE` | Licence MIT |

Le script de contenu ne déplace ni ne remplace les nœuds de Gmail. Il n'analyse
pas les courriels, n'intercepte pas l'envoi et ne crée aucune requête réseau.
Il utilise des observateurs de mutations, sans scrutation périodique, et les
déconnecte lorsque la surcouche est en pause.

## Vérifier et empaqueter

```sh
node --check content.js
node --check settings.js
node --check popup.js
python3 build.py
```

Le ZIP est créé dans `dist/`. Le décompresser avant de le charger dans Chrome.

Tests navigateur avec Chromium et Playwright installés :

```sh
node tests/browser.mjs
```

Ces tests utilisent un profil temporaire et des pages Gmail simulées, sans
connexion à un compte. Ils chargent réellement l'extension Manifest V3 et
vérifient les réglages, la restauration, le bouton de rédaction, les changements
de vue et la persistance. `PLAYWRIGHT_MODULE` permet d'indiquer le chemin d'une
installation existante de Playwright.
`CHROMIUM_EXECUTABLE` permet de réutiliser un binaire Chromium déjà installé.

Vérifications également effectuées sur Gmail réel dans une session EGO isolée :
liste, menu, lecture, recherche avancée, ouverture du composeur et désactivation.
Les 25 vérifications automatisées passent. Aucun message envoyé.

## Références

[Simplify](https://simpl.fyi/) et les captures locales servent de référence visuelle.
Cette extension est une réalisation indépendante, sans code ni assets récupérés
de Simplify et sans affiliation avec Simplify ou Google.
L'injection suit le fonctionnement des
[content scripts Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
