# Chrome_GmailPK

![Project icon](icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

✨ Immersive IMAP mail client with newsletters, cinema mode, and a Python backend.

## ✅ Features

- Chrome new-tab override
- message list + resizable conversation column
- newsletters: multi-card carousel, animated macOS-style dock, 33vh hero detail
- Gmail categories (icons + badges in header bar)
- fully configurable keyboard shortcuts
- full-screen Settings page (fonts, theme, date format, newsletter mode, languages, accounts, about)
- light/dark/photo background theme (unified `#1a1a1a`)
- selection mode with bulk actions (check, star, archive, delete)
- hover actions: checkbox left + star/archive/delete right with gradient
- thread-aware delete
- centered search with mail counter and clear button
- sender favicon (`google.com/s2/favicons`) with initials fallback
- attachment counter
- immersive reading mode
- fullscreen distraction-free composer
- built-in demo data (55 messages, 9 newsletter sources)

## 🧠 Usage

```bash
cd mail-client-v22
export $(grep -v '^#' secrets/mail.env | xargs)
python3 main.py
```

Or from the repo root:
```bash
./mail-client-v22.command
```

The server listens on `http://0.0.0.0:8000`.

## ⚙️ Settings

- `mail-client-v22/config.json`: IMAP accounts (mondary, pouark, gmail)
- `mail-client-v22/secrets/mail.env`: local passwords
- `DEMO=1`: forces all accounts to demo data (disable in production)
- localStorage: fonts, theme, date format, newsletter mode, custom shortcuts

## 🧾 Commands

- `./mail-client-v22.command`: launch the full client
- `python3 main.py` inside `mail-client-v22/`: backend server only
- `curl http://127.0.0.1:8000/api/messages?account=demo`: direct API access

## 📦 Build & Package

No build step. Vanilla HTML/CSS/JS + Python FastAPI. Load unpacked extension in `chrome://extensions/`.

## 🧪 Install (Antigravity)

1. Clone the project
2. Fill `mail-client-v22/secrets/mail.env`
3. Run `./mail-client-v22.command`
4. Load unpacked extension in Chrome
5. Open a new tab

## 🧾 Changelog

- v22.9: thread-aware delete, borderless newsletter dock, responsive grid, 9 demo sources
- v22.8: configurable keyboard shortcuts, date format (relative/dd/mm/yyyy/yyyy/mm/dd), newsletter mode (cards/dock), unified dark theme `#1a1a1a`
- v22.7: og-image backend, newsletter hero 33vh, favicon→gradient fallback, domain favicon in dock
- v22.6: split hover actions (checkbox left + actions right with gradient), keyboard selection, bulk actions
- v22.5: full-screen settings with sidebar navigation, fonts (Futura/Poppins/Nerd), newsletter carousel
- v22.4: reliable search focus, clear button and Escape support; attachment counters; customizable category colors; header actions wired to the backend
- v22.3: functional IMAP backend for move/copy/archive/spam/snooze/label
- v22.2: sender favicon, attachment counts, immersive header button, contextual burger-back button, mail counter in search, visible keyboard selection
- v22.1: sans-serif fonts, full-screen Settings pages, newsletter mosaic, hide non-INBOX categories, no-results search state

## 🔗 Links

- FR README: [README.md](README.md)
- Main client: [mail-client-v22](mail-client-v22)
