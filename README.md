# SimpleMail

![icon](src/desktop/icon.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

Client mail IMAP immersif — backend Python FastAPI + interface HTML/JS vanilla. Packagé en application macOS native.

## Fonctionnalités

- Vue liste + conversation avec colonne redimensionnable
- Newsletters : carrousel multicartes, dock macOS animé, détail hero
- Catégories Gmail (icônes + badges)
- Raccourcis clavier entièrement configurables
- Page Paramètres plein écran (polices, thème, format date, newsletters, langues, comptes, à propos)
- Thème light/dark/fond photo
- Mode sélection avec actions groupées
- Hover actions : checkbox à gauche, star/archive/delete à droite
- Recherche centrée avec compteur
- Favicon expéditeur avec fallback initiales
- Compteur de pièces jointes
- Mode lecture immersive
- Composeur plein écran
- Import/export des comptes (JSON : config + mots de passe)
- Flux RSS intégré
- macOS .app native (pywebview + PyInstaller)

## Utilisation

### Mode développement
```bash
cd src/desktop
source secrets/mail.env  # ou export des variables
python3 main.py
# http://0.0.0.0:8000
```

### Mode application (macOS)
```bash
./SimpleMail.command
# ou ouvrir releases/macos/SimpleMail.app
```

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `⌘,` | Ouvrir les Paramètres |
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

- `src/desktop/config.json` : comptes IMAP/SMTP
- `src/desktop/secrets/mail.env` : mots de passe (jamais dans le dépôt)

En mode packagé (.app), ces fichiers sont dans `~/Library/Application Support/SimpleMail/`.

## Installation

1. Cloner le projet
2. `cd src/desktop`
3. Copier `config.example.json` → `config.json`, renseigner vos comptes
4. Créer `secrets/mail.env` avec les mots de passe
5. Lancer `python3 main.py` ou ouvrir `SimpleMail.app`

## Build macOS

```bash
cd src/desktop
./build_macos.sh
# Livré dans releases/macos/SimpleMail.app
```

Le bundle est nettoyé : aucun compte, aucun mot de passe, aucune donnée personnelle embarquée.

## Structure du projet

```
├── src/desktop/          ← Application principale
│   ├── main.py           ← Backend FastAPI
│   ├── app.py            ← Lanceur pywebview (macOS .app)
│   ├── index.html        ← Interface complète
│   ├── config.example.json
│   ├── build_macos.sh
│   └── icon.png
├── releases/             ← Builds distribuables (.app)
├── archives/             ← Anciennes versions
├── SimpleMail.command    ← Lanceur développement
└── README.md
```
