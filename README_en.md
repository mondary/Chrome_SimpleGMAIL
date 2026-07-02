# SimpleMail

![icon](src/desktop/icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

Immersive IMAP mail client — Python FastAPI backend + vanilla HTML/JS. Packaged as a native macOS app.

## Features

- Message list + resizable conversation column
- Newsletters: multi-card carousel, animated macOS-style dock, hero detail
- Gmail categories (icons + badges)
- Fully configurable keyboard shortcuts
- Full-screen Settings page (fonts, theme, date format, newsletters, languages, accounts, about)
- Light/dark/photo background theme
- Selection mode with bulk actions
- Hover actions: checkbox left + star/archive/delete right
- Centered search with mail counter
- Sender favicon with initials fallback
- Attachment counter
- Immersive reading mode
- Fullscreen composer
- Account import/export (JSON: config + passwords)
- Built-in RSS reader
- Native macOS .app (pywebview + PyInstaller)

## Usage

### Development mode
```bash
cd src/desktop
source secrets/mail.env
python3 main.py
# http://0.0.0.0:8000
```

### Packaged app (macOS)
```bash
./SimpleMail.command
# or open releases/macos/SimpleMail.app
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `⌘,` | Open Settings |
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

All shortcuts are customizable in Settings → Shortcuts.

## Configuration

- `src/desktop/config.json`: IMAP/SMTP accounts
- `src/desktop/secrets/mail.env`: passwords (never in repo)

In packaged mode (.app), these live in `~/Library/Application Support/SimpleMail/`.

## Installation

1. Clone the project
2. `cd src/desktop`
3. Copy `config.example.json` → `config.json`, fill your accounts
4. Create `secrets/mail.env` with passwords
5. Run `python3 main.py` or open `SimpleMail.app`

## Building the macOS app

```bash
cd src/desktop
./build_macos.sh
# Output: releases/macos/SimpleMail.app
```

The bundle is clean: zero accounts, zero passwords, zero personal data.

## Project structure

```
├── src/desktop/          ← Main application
│   ├── main.py           ← FastAPI backend
│   ├── app.py            ← pywebview launcher (macOS .app)
│   ├── index.html        ← Full UI
│   ├── config.example.json
│   ├── build_macos.sh
│   └── icon.png
├── releases/             ← Distributable builds (.app)
├── archives/             ← Old versions
├── SimpleMail.command    ← Dev launcher
└── README.md
```
