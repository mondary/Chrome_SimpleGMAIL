# SimpleMail

![icon](src/desktop/icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

Immersive IMAP mail client — Python FastAPI backend + vanilla HTML/JS. Packaged as native desktop app (macOS · Windows · Linux).

## Features

- Resizable message list + conversation split
- Newsletters: multi-card carousel, animated dock, hero detail with real images
- Gmail categories (icons + badges)
- Fully configurable keyboard shortcuts
- Full-screen Settings (fonts, theme, date format, newsletters, language, accounts, about)
- Light/dark/photo background theme
- Selection mode with bulk actions
- Centered search with counter
- Sender favicon with initials fallback
- Immersive reading mode
- Fullscreen composer
- Account import/export (JSON: config + passwords + SQLite DB + localStorage settings)
- Built-in RSS reader
- Demo data with real Unsplash images
- Export/import backs up **everything**: accounts, passwords, email cache, UI prefs, column widths, shortcuts

## Usage

### Development mode
```bash
cd src/desktop
source secrets/mail.env
python3 main.py
# http://0.0.0.0:8000
```

### Packaged app
```bash
./SimpleMail.command                          # macOS (dev)
# releases/macos/SimpleMail.app               # macOS (packaged)
# releases/windows/SimpleMail/SimpleMail.exe  # Windows
# releases/linux/SimpleMail/SimpleMail        # Linux
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `⌘,` / `Ctrl+,` | Open Settings |
| `Escape` (1×) | Step back (selection → search → list view) |
| `Escape` (extra) | Toggle sidebar drawer |
| `G` then `I` | Inbox |
| `G` then `S` | Starred |
| `G` then `T` | Trash |
| `G` then `D` | Drafts |
| `G` then `A` | Archive |
| `G` then `N` | Sent |
| `C` | Compose |
| `J` / `↓` | Next message |
| `K` / `↑` | Previous message |
| `Enter` / `Space` | Open message |
| `/` | Search |

All shortcuts customizable in Settings → Shortcuts.

## Configuration

User data is stored per platform:
- **macOS**: `~/Library/Application Support/SimpleMail/`
- **Windows**: `%APPDATA%/SimpleMail/`
- **Linux**: `~/.local/share/SimpleMail/`

Contents:
- `config.json`: IMAP/SMTP accounts
- `secrets/mail.env`: passwords (never in repo)
- `simplemail.db`: message cache, settings, labels

## Installation

1. Clone the project
2. `cd src/desktop`
3. Copy `config.example.json` → `config.json`, fill your accounts
4. Create `secrets/mail.env` with your passwords
5. Run `python3 main.py`

To migrate to another machine: **Settings → Accounts → Export**, then **Import** on the target machine.

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
sudo apt install libwebkit2gtk-4.0-dev  # system dependency
./build_linux.sh
# → releases/linux/SimpleMail
```

### Build prerequisites (all platforms)
```bash
python3 -m pip install --user -r src/desktop/build-requirements.txt
```

Bundles are clean: zero accounts, zero passwords, zero personal data shipped.
First run auto-creates the user data directory with a generic config template.

## Project structure

```
├── src/desktop/              ← Main application
│   ├── main.py               ← FastAPI backend
│   ├── app.py                ← pywebview launcher (cross-platform)
│   ├── index.html            ← Full UI
│   ├── config.example.json
│   ├── build_macos.sh
│   ├── build_linux.sh
│   ├── build_windows.ps1
│   └── icon.png
├── releases/macos            ← macOS builds (.app)
├── releases/windows          ← Windows builds (.exe)
├── releases/linux            ← Linux builds
├── archives/                 ← Old versions
├── SimpleMail.command        ← Dev launcher (macOS)
└── README.md
```
