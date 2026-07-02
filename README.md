# SimpleMail

![icon](src/desktop/icon.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

Client mail IMAP immersif — backend Python FastAPI + interface HTML/JS vanilla. Packagé en application native (macOS · Windows · Linux).

## Fonctionnalités

- Vue liste + conversation avec colonne redimensionnable
- Newsletters : carrousel multicartes, dock animé, détail hero avec vraies images
- Catégories Gmail (icônes + badges)
- Raccourcis clavier entièrement configurables
- Page Paramètres plein écran (polices, thème, format date, newsletters, langues, comptes, à propos)
- Thème light/dark/fond photo
- Mode sélection avec actions groupées
- Recherche centrée avec compteur
- Favicon expéditeur avec fallback initiales
- Mode lecture immersive
- Composeur plein écran
- Import/export des comptes (JSON : config + mots de passe + base SQLite + réglages localStorage)
- Flux RSS intégré
- Données de démo intégrées avec images réelles (Unsplash)
- Export/import sauvegarde **tout** : comptes, mots de passe, cache emails, réglages UI, largeurs colonnes, raccourcis

## Utilisation

### Mode développement
```bash
cd src/desktop
source secrets/mail.env  # ou export des variables
python3 main.py
# http://0.0.0.0:8000
```

### Mode application
```bash
./SimpleMail.command                          # macOS (dev)
# releases/macos/SimpleMail.app               # macOS (packagé)
# releases/windows/SimpleMail/SimpleMail.exe  # Windows
# releases/linux/SimpleMail/SimpleMail        # Linux
```

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `⌘,` / `Ctrl+,` | Ouvrir les Paramètres |
| `Escape` (1×) | Recul progressif (sélection → recherche → vue liste) |
| `Escape` (suppl.) | Ouvrir/fermer le menu latéral (drawer) |
| `G` puis `I` | Boîte de réception |
| `G` puis `S` | Messages suivis |
| `G` puis `T` | Corbeille |
| `G` puis `D` | Brouillons |
| `G` puis `A` | Archives |
| `G` puis `N` | Envoyés |
| `C` | Nouveau message |
| `J` / `↓` | Message suivant |
| `K` / `↑` | Message précédent |
| `Enter` / `Espace` | Ouvrir le message |
| `/` | Rechercher |

Tous les raccourcis sont configurables dans Paramètres → Raccourcis.

## Configuration

Les fichiers de configuration sont stockés par plateforme :
- **macOS** : `~/Library/Application Support/SimpleMail/`
- **Windows** : `%APPDATA%/SimpleMail/`
- **Linux** : `~/.local/share/SimpleMail/`

Contenu :
- `config.json` : comptes IMAP/SMTP
- `secrets/mail.env` : mots de passe (jamais dans le dépôt)
- `simplemail.db` : cache des messages, réglages, labels

## Installation

1. Cloner le projet
2. `cd src/desktop`
3. Copier `config.example.json` → `config.json`, renseigner vos comptes
4. Créer `secrets/mail.env` avec les mots de passe
5. Lancer `python3 main.py`

Pour tout transférer vers une autre machine : **Réglages → Comptes → Exporter**, puis **Importer** sur l'autre machine.

## Build

### macOS
```bash
cd src/desktop
./build_macos.sh
# → releases/macos/SimpleMail.app
```

### Windows
```powershell
cd src\desktop
.\build_windows.ps1
# → releases\windows\SimpleMail\
```

### Linux
```bash
cd src/desktop
sudo apt install libwebkit2gtk-4.0-dev  # système requis
./build_linux.sh
# → releases/linux/SimpleMail
```

### Prérequis build (toutes plateformes)
```bash
python3 -m pip install --user -r src/desktop/build-requirements.txt
```

Les bundles sont nettoyés : aucun compte, aucun mot de passe, aucune donnée personnelle embarquée.
La première ouverture crée automatiquement les dossiers de données utilisateur.

## Structure du projet

```
├── src/desktop/              ← Application principale
│   ├── main.py               ← Backend FastAPI
│   ├── app.py                ← Lanceur pywebview (multi-plateforme)
│   ├── index.html            ← Interface complète
│   ├── config.example.json
│   ├── build_macos.sh
│   ├── build_linux.sh
│   ├── build_windows.ps1
│   └── icon.png
├── releases/macos            ← Builds macOS (.app)
├── releases/windows          ← Builds Windows (.exe)
├── releases/linux            ← Builds Linux
├── archives/                 ← Anciennes versions
├── SimpleMail.command        ← Lanceur développement (macOS)
└── README.md
```
