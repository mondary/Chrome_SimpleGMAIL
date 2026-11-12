# Audit performances de l’extension Gmail

Version locale : 2026.11.7 — 12 novembre 2026.

## Signalement et portée

L’utilisateur signale 2,5 Go de mémoire et 147 % de CPU pour sa boîte Gmail dans
le gestionnaire des tâches Chrome. Ces chiffres concernent un processus comprenant
Gmail et les scripts injectés : ils ne suffisent pas à attribuer toute la mémoire
à l’extension, ni à identifier une fuite GPU.

Aucune session personnelle, capture d’écran ou mesure du processus Gmail réel n’a
été utilisée. Les tests ci-dessous utilisent des données fictives, un Chrome
headless avec profil jetable et le réseau HTTP(S) bloqué. Les pages chargent les
vrais modules de production, avec seulement le stockage et le transport Gmail simulés.

## Causes reproduites et corrections

- `themes/studio/empty-state.js` : `classList.add/remove` répétés, même lorsque la
  classe avait déjà le bon état, déclenchaient le même observateur et une nouvelle
  passe à la prochaine frame. Les écritures sont maintenant conditionnelles.
- Surligneur : l’observateur recevait ses propres suppressions/recréations après
  la remise à `false` de `isApplying`. Il relançait donc le traitement toutes les
  250 ms avec des mots-clés actifs. L’observation est suspendue pendant ces écritures,
  puis rétablie ; les panneaux de réglages et éléments Studio sont ignorés.
- Renommage/états vides : regroupement des notifications DOM sur 100 ms.
  Onglets : filtrage des écritures des interfaces internes et regroupement par
  microtâche conservé pour ne pas retarder navigation et géométrie du drag.
  Ces scans sont suspendus dans les onglets masqués et reprennent à la visibilité.
- Compteurs : intervalle minimal entre séries porté de 10 à 45 s. Requêtes et
  timers sont annulés quand la page est masquée ou le module désactivé. Les requêtes
  restent séquentielles, la pagination bornée et les derniers totaux vérifiés conservés.
- Écritures de dimensions des onglets, noms accessibles et positions des toasts :
  pas de réécriture lorsque la valeur est déjà correcte.

Le surligneur corrigé est maintenu dans `src/extension-pk/sources/` ; `build.sh`
privilégie ce fichier sur le snippet partagé. Le dépôt voisin n’est pas modifié.

## Mesures avant/après

Même harnais et même attente de 1,6 s pour laisser finir les animations d’entrée,
puis observation du repos pendant 1,2 s. Référence avant : commit `c97dc5f`.

| Scénario fictif | Mutations avant | Mutations après | Layouts avant → après |
| --- | ---: | ---: | ---: |
| Recherche de catégorie vide | 144 | 0 | 0 → 0 |
| Onglet vide visible et notice vide en cache cachée | 144 | 0 | 0 → 0 |
| Surligneur actif sur « Atelier » | 35 | 0 | 5 → 0 |

Ces compteurs démontrent des boucles de travail supprimées, pas une valeur absolue
de CPU/RAM pour Gmail. Les durées de tâches et la taille du heap synthétique sont
imprimées à titre diagnostique, pas utilisées comme promesse de performance.

Le test vérifie également que le contenu ajouté continue d’être surligné, que les
traitements attendent le retour au premier plan, et que huit remplacements de
200 lignes ne conservent pas un nombre croissant de nœuds DOM après collecte GC.
Mesure locale : 1 049 nœuds après le premier rendu et 1 049 après huit remplacements ;
les 200 lignes surlignées reviennent aussi à 0 mutation/0 layout au repos.
Ce test court ne prouve pas l’absence de toute fuite mémoire sur plusieurs heures.

## Reproduire depuis la racine du dépôt

Prérequis : Node avec WebSocket global et Chrome installé. `CHROME_BIN` permet
de choisir un autre binaire. Aucun package à installer, aucune capture effectuée.

```sh
src/extension-pk/build.sh
node tools/tests/studio-performance.test.mjs
node tools/tests/studio-tabs.test.mjs
node tools/tests/studio-toast.test.mjs
node --test tools/tests/studio-build-sources.test.mjs tools/tests/no-left-menu.test.mjs tools/tests/studio-counts.test.mjs tools/tests/studio-modules.test.mjs
```

Pour une comparaison historique, extraire avec `git archive` le commit `c97dc5f`
dans un répertoire temporaire, sans changer de branche ni toucher au travail courant.
Passer sa racine au harnais actuel :

```sh
PERF_ROOT="/chemin/vers/extraction" PERF_REPORT_ONLY=1 node tools/tests/studio-performance.test.mjs
```

`PERF_REPORT_ONLY` imprime les trois scénarios de base sans exiger qu’ils soient
déjà corrigés. Les répertoires requis dans l’extraction sont
`tools/previews/studio-tabs-preview/`, `src/extension-pk/themes/studio/` et le
surligneur dans `src/extension-pk/scripts/`.

## Validation réelle encore nécessaire

Après chargement de 2026.11.7 dans Chrome, comparer dans des conditions identiques
le même compte et la même vue avec l’extension activée puis désactivée : CPU après
stabilisation, mémoire après plusieurs changements de catégorie et au bout de
15–30 minutes. Distinguer le renderer Gmail du processus GPU partagé. Si la
consommation persiste, un profil CPU/allocation permet d’identifier les autres
scripts ou Gmail ; ne pas conclure à un problème GPU à partir de la seule RAM.

Le navigateur personnel n’a pas été rechargé par l’agent. Pas de publication store
ou FTP pour ce correctif local, pas de retouche marketing ni de changement visuel.
