# Lab — tentatives d'interfaces

Chaque tentative gardée a son sous-dossier. Rien ne se supprime : on
déplace, on archive, on fusionne.

| Sous-dossier | Tentative | Servie par l'app |
| --- | --- | --- |
| `atelier-actuel/` | Lab V2 « Atelier » — version de travail actuelle | `/lab/` |
| `focus-os-2026.08.01/` | Snapshot Focus OS (interface mono historique) | `/lab-focus-os-2026-08-01/` |

Les montages sont dans `../../src/desktop/main.py` (`_static_asset_dir`),
le point d'entrée est `atelier-actuel/index.html`, et la page de test des
versions est `../tester/tester-server.py` (port 9900).
