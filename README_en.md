# PKMail

![icon](src/desktop/icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

Immersive IMAP mail client — Python FastAPI backend + vanilla HTML/JS. Packaged as native desktop app (macOS · Windows · Linux).

**Local version 2026.10.103** — [Changelog](CHANGELOG.md)

[![Gmail extension preview](store/screenshots/05-ocean.png)](store/index.html)
[![Gmail extension settings](store/screenshots/02-reglages.png)](store/index.html)

![Fictional preview of Studio inbox zero in Promotions](store/screenshots/12-studio-empty.png)

[Social](store/screenshots/13-studio-social.png) · [Forums](store/screenshots/14-studio-forums.png) — other Studio icons with fictional data.

## Features

### V2 interface — Lab (6 concepts)
- **Six themes with previews**: Focus OS (dense one-line queue), Label Canvas (columns by label), Paper Reader (paper queue), K7 Media Shelf (dark cover-art library), K7 Preview Deck (dark cards with HTML thumbnails), K7 Preview Deck Light (warm white variant)
- **Gmail categories**: 6 categories with dedicated icon and color (Primary, Promotions, Social, Updates, Forums, Newsletters)
- **Preserved layouts**: top categories or a collapsible navigation rail, selectable in settings
- **Configurable animated backgrounds**: off, particles, waves, or cassette; suspended while the app is hidden
- **Arrow navigation**: `←` / `→` switch category, `↑` / `↓` (or `J`/`K`) move between messages
- **Gmail search**: `/` opens a fullscreen overlay, server-side IMAP search (sender, subject, body), keyboard-driven results
- **Conversation view**: messages of the same thread stack in the reader — original collapsed on top, newest open, each message expands on demand
- **Compose & forward**: always-visible floating ＋ button, real sending through the backend, forward pre-filled with the quoted message
- **Undo delete**: the message disappears immediately and an "Undo" toast stays for 6 seconds before the actual deletion
- **OMP theme**: black background, subtle hairlines, and a pink accent declinable into six colors (rose, cyan, violet, amber, green, blue) with accent-tinted particles
- **Sticky notes**: self-sent emails displayed as square sticky notes on a dedicated wall; toggleable with eight preset colors or a custom color
- **Newsletters**: adaptive multi-card carousel (4→8 columns), previews with real images (hero + og:image), hero detail
- **Inline labels and attachments**: short tags + paperclip icon on each list row
- **Real archive counter**: `[Gmail]/All Mail` total (EXAMINE fallback when STATUS returns 0)
- **Gmail shortcuts**: `J`/`K` navigate, `E` archive, `#` delete, `Z` undo, `C` compose, `R` reply, `F` forward, `!` spam, `S` star, `L`/`V` labels, `Shift+I`/`Shift+U` read/unread, `U` back to list, `[`/`]` archive ± navigate, `G` then `I` inbox — fully configurable and active in every theme and reader
- **Gmail refresh**: always-visible button, forced update on launch, app resume, and every 60 seconds
- **Accounts**: enable or disable each account in fully keyboard-navigable settings
- **Preloading**: other categories load in the background
- **Pagination**: infinite scroll + "Load more" button per category
- **Day grouping**: Today / Yesterday / date
- **Unread**: near-white background + bold
- **Immersive fullscreen loading screen** with a lightweight animated bar
- **Local PWA + Chrome**: installable from `127.0.0.1:8000`, permission-free extension; Android is paused

### Chrome extension — PK Simple Gmail
- **Studio tabs (local build)**: one shared strip, fitted to the mail column width (it follows the margin setting), gathers Gmail categories — opened through the `in:inbox category:<id>` search, including “Purchases” (`category:purchases`, even when Gmail gives it no tab), i.e. non-archived messages — and configured labels, with stable names and order across views. Each tab shows its unread count as a badge on the icon and its category colour. The active tab is a solid black segment underlined with its colour, and the strip scrolls it back into view. At narrow widths: a 20 px icon + 4 px padding on each side, 28 px buttons and tooltips. Arrow keys move focus; Enter/Space opens the tab. [Desktop preview](store/screenshots/studio-tabs-desktop.png) · [compact preview](store/screenshots/studio-tabs-compact.png): simulations running the actual module; authenticated Gmail verification awaits sign-in.
- **Chrome Web Store**: [PK Simple Gmail](https://chromewebstore.google.com/detail/pk-simple-gmail/kijhhekofbbmdgnheepmjcenehmgepgl) — public version 2026.10.56, update 2026.10.73 submitted for review.
- **PK Simple Gmail**: the canonical extension, with a side panel and six themes — *Natif*, *Studio* (36 toggleable tweaks, including “Inbox zero” with a distinct animated monochrome icon for each empty category, “Undo preserved”, category tab renaming, “Mail / full Google Calendar” with a triple-logo header switch (Mail, Calendar, Drive) and black Calendar accents), *Simplify* (photo backgrounds, inbox zero and reading pane), *Classique*, **Focus** (900 px monospace list, category icons, 35 px rows, black selection and keyboard shortcuts) and **Original** (64 px rail, wide search, black composer, airy list). The other Lab concepts still await transposition.
- **Mail / Calendar / Drive (Studio)**: the triple-logo switch (Gmail + Calendar + Drive) replaces the logo in the top bar on all three sites; the active segment is white. It opens the real Google Calendar and Drive in the same tab and the same window, with native event creation, views and settings, and the real Drive on the active account's My Drive; Calendar and Drive pick up the Studio accents (black buttons, black today marker, calendar, event and file colours preserved). Mail returns to the inbox of the active account (the Gmail mark does too, even when it is active). Each switch loads the corresponding Google page. Enable “Modules · Mail / Google Agenda / Drive complet, même onglet” and allow `calendar.google.com` and `drive.google.com` when updating the extension.
- **Focus**: show/hide categories, left/center/right alignment and Gmail total count · [guide and activation](src/extension-pk/themes/focus-os/README.md) · [screenshot with fictional messages](store/screenshots/10-focus-os.png) · local preview in `tools/previews/focus-os-preview/`.
- **Original**: [screenshot with fictional messages](store/screenshots/11-original.png) · local preview in `tools/previews/simplemail-original-preview/`.
- Guide: [`src/extension-pk/`](src/extension-pk/). Simplify now lives as a theme (`src/extension-pk/themes/simplify/`); its standalone extension is archived (`archives/versions/05-simplify-2026.10.16/`, untracked), separate from PK Simple Gmail published on the Chrome Web Store.

### Sombre Mail — standalone mail client (`tools/mail-client/`)
- **Independent mail interface**: a local FastAPI server wired straight to your IMAP/SMTP accounts — multi-account, reading, real sending, flags, deletion, attachments and realtime updates (IMAP IDLE). Gmail itself is never opened, unlike the Chrome extension which only restyles it.
- Passwords come from environment variables (`start.sh`), with a built-in demo mode (`MAIL_CLIENT_DEMO=1`) — no credentials needed to try it. Documentation: [`tools/mail-client/`](tools/mail-client/README.md).

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
source var/secrets/mail.env
SIMPLEMAIL_AUTH=0 python3 main.py
# http://127.0.0.1:8000
```

### Packaged app
```bash
src/desktop/start.sh                          # macOS (dev, reads var/secrets/mail.env)
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

In development, the same files live in `src/desktop/var/` (untracked):

Contents:
- `config.json`: IMAP/SMTP accounts
- `secrets/mail.env`: passwords (never in repo)
- `simplemail.db`: message cache, settings, labels

## Performance

The backend keeps its memory footprint bounded:
- No permanent WebGL loop or fullscreen filters; off-screen rows use `content-visibility`
- Keyboard list navigation updates selection without rebuilding the full DOM
- Bounded in-RAM LRU caches: threads (40 entries), message bodies (150 entries, 5 min TTL)
- Immediate SQLite snapshot followed by a silent Gmail sync in the background
- Reused IMAP connections and folder loading limited to useful system statuses
- Bounded recent window for categories and newsletters; general searches remain capped
- Background thread purges SQLite caches every 10 min (`response_cache`, `msg_detail_cache`, `newsletter_msg_cache`)

## Installation

1. Clone the project
2. `cd src/desktop`
3. `mkdir -p var && cp config.example.json var/config.json`, fill your accounts
4. Create `var/secrets/mail.env` with your passwords
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
├── docs/                     ← Documentation (Gmail OAuth, o2switch deployment, roadmap)
├── src/
│   ├── desktop/              ← FastAPI backend of the classic app + V2 UI
│   │   ├── main.py           ← FastAPI backend
│   │   ├── app.py            ← pywebview launcher (cross-platform)
│   │   ├── index.html        ← Full UI
│   │   ├── var/              ← Local dev data (config, secrets, cache — untracked)
│   │   ├── config.example.json
│   │   └── build_macos.sh / build_linux.sh / build_windows.ps1
│   ├── extension-pk/         ← PK Simple Gmail — canonical Chrome extension (six themes)
│   │   └── sources/gmail.css ← CSS source of the tweaks (absorbed from the former SimpleMail extension)
│   └── mobile/               ← Mobile attempt (Capacitor)
├── tools/
│   ├── lab/                  ← Lab attempts (atelier-actuel, focus-os)
│   ├── previews/             ← Fictional theme previews (focus-os, simplemail-original)
│   ├── mail-client/          ← Sombre Mail (standalone mail client)
│   ├── pkmail/               ← Himalaya CLI + Next.js UI + local config
│   └── tester/               ← Version picker page (port 9900)
├── releases/                 ← macOS / Windows / Linux builds
├── archives/                 ← Old versions, benchmark and Simplify (local, untracked)
├── store/                    ← Bilingual landing and media kit
└── README.md / CHANGELOG.md
```

## History

- **14 January 2022** — first commit of the repository; the extension is published the next day on the Chrome Web Store.
- **2022–2024** — “PK Gmail / Simplify” releases: centered search, photo backgrounds, inbox zero, list density and width.
- **16 December 2024** — messages fetched through an API and a rework of the client-side layout.
- **May 2026** — repository and README restructure.
- **August–September 2026** — PKMail (native macOS, Windows, Linux app), then the Lab themes: Focus OS, Label Canvas, Paper Reader, K7.
- **October 2026** — PK Simple Gmail: six themes, Studio (tweaks, toasts, renameable categories), Mail / Calendar / Drive switch, Studio accents on Calendar and Drive; package 2026.10.73 submitted to the Chrome Web Store.

## Support

If PKMail is useful to you: [Ko-fi](https://ko-fi.com/pouark)
