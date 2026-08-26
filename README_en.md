# PKMail

![icon](src/desktop/icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

Immersive IMAP mail client — Python FastAPI backend + vanilla HTML/JS. Packaged as native desktop app (macOS · Windows · Linux).

## Features

### V2 interface — Lab (3 concepts)
- **Three themes with previews**: Focus OS (dense one-line queue), Label Canvas (columns by label), Paper Reader (paper queue)
- **Gmail categories**: 6 categories with dedicated icon and color (Primary, Promotions, Social, Updates, Forums, Newsletters)
- **Mail Worlds**: each category fills the screen, with neighboring categories at the edges and atmospheric Three.js transitions (no sidebar)
- **Arrow navigation**: `←` / `→` switch category, `↑` / `↓` (or `J`/`K`) move between messages
- **Gmail search**: `/` opens a fullscreen overlay, server-side IMAP search (sender, subject, body), keyboard-driven results
- **Sticky notes**: self-sent emails displayed as square sticky notes on a dedicated wall; toggleable with eight preset colors or a custom color
- **Newsletters**: adaptive multi-card carousel (4→8 columns), previews with real images (hero + og:image), hero detail
- **Inline labels and attachments**: short tags + paperclip icon on each list row
- **Real archive counter**: `[Gmail]/All Mail` total (EXAMINE fallback when STATUS returns 0)
- **Official Gmail shortcuts**: `E` archive / `L` labels preset (or SimpleMail preset), fully configurable
- **Gmail refresh**: always-visible button, forced update on launch, app resume, and every 60 seconds
- **Accounts**: enable or disable each account in fully keyboard-navigable settings
- **Preloading**: other categories load in the background
- **Pagination**: infinite scroll + "Load more" button per category
- **Day grouping**: Today / Yesterday / date
- **Unread**: near-white background + bold
- **Immersive fullscreen loading screen** with animated bar
- **Local PWA + Chrome**: installable from `127.0.0.1:8000`, permission-free extension; Android is paused

### Classic interface — V1
- Immersive cardless white interface, responsive from mobile to large displays
- Full-screen Settings (fonts, theme, date format, newsletters, language, accounts, about)
- Light/dark/photo background theme
- Selection mode with bulk actions
- Centered search with counter
- Sender favicon with initials fallback
- Editorial immersive reader by default, `J` / `K` navigation and sandboxed HTML
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
SIMPLEMAIL_AUTH=0 python3 main.py
# http://127.0.0.1:8000
```

### Packaged app
```bash
./SimpleMail.command                          # macOS (dev)
# releases/macos/PKMail.app               # macOS (packaged)
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

## Performance

The backend keeps its memory footprint bounded:
- Bounded in-RAM LRU caches: threads (40 entries), message bodies (150 entries, 5 min TTL)
- Immediate SQLite snapshot followed by a silent Gmail sync in the background
- Reused IMAP connections and folder loading limited to useful system statuses
- Bounded recent window for categories and newsletters; general searches remain capped
- Background thread purges SQLite caches every 10 min (`response_cache`, `msg_detail_cache`, `newsletter_msg_cache`)

## Installation

1. Clone the project
2. `cd src/desktop`
3. Copy `config.example.json` → `config.json`, fill your accounts
4. Create `secrets/mail.env` with your passwords
5. Run `SIMPLEMAIL_AUTH=0 python3 main.py`

To migrate to another machine: **Settings → Accounts → Export**, then **Import** on the target machine.

## Local architecture

The FastAPI backend, Gmail credentials, and cache remain on the computer. The UI,
PWA, and Chrome extension use `http://127.0.0.1:8000/lab/`.

No SimpleMail backend is currently public. Android/iOS are paused until a private
access method (VPN/Tailscale) or a Gmail API + OAuth architecture is selected.

## Build

### macOS
```bash
cd src/desktop
./build_macos.sh
# → releases/macos/PKMail.app
# → /Applications/PKMail.app
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
