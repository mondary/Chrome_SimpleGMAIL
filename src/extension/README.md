# Extension Chrome SimpleMail

L'extension ouvre l'interface V2 locale dans un onglet dédié. Elle ne stocke
aucun identifiant Gmail et ne demande aucune permission Chrome sensible.

Le backend doit être lancé localement avec `SIMPLEMAIL_AUTH=0 python3 main.py`.

## Installation locale

1. Ouvrir `chrome://extensions`.
2. Activer **Mode développeur**.
3. Cliquer **Charger l'extension non empaquetée**.
4. Sélectionner `src/extension/src`.

Le bouton SimpleMail ouvre `http://127.0.0.1:8000/lab/`.
