# Focus OS

Transposition du thème 01 de `archives/versions/03-lab-focus-os-2026.08.01/`
dans le DOM réel de Gmail. Sélectionner **Focus OS** dans le panneau PK Gmail
Studio après avoir rechargé l’extension depuis `chrome://extensions`.

![Focus OS — données fictives](../../../../store/screenshots/10-focus-os.png)

Les deux fontes JetBrains Mono Nerd Font de l’archive sont embarquées. La liste
fait 900 px au maximum, avec des lignes de 35 px, un en-tête de 44 px, une barre
de catégories de 38 px et les couleurs de l’original. À 1440 × 900, la première
ligne commence en `(270, 170)` et le pied de page en `y=861`.

Les messages, pièces jointes, cases de sélection, actions et fenêtres de rédaction
restent gérés par Gmail. La vue de lecture conserve le HTML des messages ; elle
n’impose pas la typographie du thème aux newsletters. Les favicons utilisent le
même service Google que l’archive, avec une icône locale en cas d’échec.

## Commandes

- `J` / `K`, `↓` / `↑` : naviguer ; `Entrée` : ouvrir.
- `E` : archiver ; `L` : ouvrir les libellés ; `R` : répondre ; `C` : rédiger.
- `/` : recherche Gmail ; `Échap` : fermer la recherche ou revenir à la liste.
- `,` ou **réglages** : dossiers, pagination / outils Gmail, compte et paramètres.
- `?` : aide. Les raccourcis n’interceptent pas la saisie dans les messages.

Le compteur indique les messages **chargés dans la vue**, sans inventer le total
de la boîte. Les archives comptent les actions confirmées pendant la session du
thème. La catégorie Newsletters utilise la recherche
`in:inbox {category:updates list:unsubscribe}` ; elle n’est pas une catégorie
native supplémentaire de Gmail. Les catégories désactivées dans Gmail passent
également par sa recherche.

## Vérification locale

Depuis la racine du dépôt :

```sh
python3 -m http.server 8769 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8769/tools/focus-os-preview/#inbox` pour l’aperçu fictif
(les huit messages de l’archive). Cette page charge les vrais fichiers du thème,
sur une structure DOM de test ; elle ne se connecte à aucune boîte mail.
`tools/focus-os-preview/verify.mjs` exporte `verify(page)` pour une Page Ego.

Vérifications : mesures à 1440 × 900, stabilité de l’observateur, navigation,
recherche, lecture et retour, archivage fictif, recalcul des groupes de dates,
largeur 390 px. Vérification complémentaire sur Gmail dans une session Ego isolée :
liste, catégories, recherche et lecteur natifs. L’archivage réel et l’envoi ne sont
pas exécutés pendant les essais.
