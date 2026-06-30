# Chrome_GmailPK

![Project icon](icon.png)

[🇬🇧 EN](README_en.md) · [🇫🇷 FR](README.md)

✨ Local Gmail-like mail client with a modern UI, immersive reading mode, and a functional IMAP backend.

## ✅ Features

- Chrome new-tab override
- message list, conversation view, and centered search with quick clearing
- drawer with folders, labels, and customizable category colors
- immersive reading mode
- keyboard navigation in the list
- fullscreen distraction-free composer
- message actions wired to the backend
- real attachment count in the message list

## 🧠 Usage

1. Open the project
2. Go to `mail-client-v22/`
3. Start the server:

```bash
cd mail-client-v22
./start.sh
```

Or from the repo root:

```bash
./mail-client-v22.command
```

The server listens on `http://0.0.0.0:8000`.

## ⚙️ Settings

- `mail-client-v22/config.json`: IMAP accounts
- `mail-client-v22/secrets/mail.env`: local passwords

Configured accounts:

- `c@pouark.com`
- `clement@mondary.design`
- `clement.mondary@gmail.com`

## 🧾 Commands

- `./mail-client-v22.command`: launch the client
- `./start.sh` inside `mail-client-v22/`: launch backend + frontend

## 📦 Build & Package

No frontend build step is required. The project runs on JavaScript/HTML/CSS with a Python backend.

## 🧪 Install (Antigravity)

1. Put the project folder locally
2. Fill `mail-client-v22/secrets/mail.env`
3. Run `./mail-client-v22.command`
4. Open Chrome on the new-tab override

## 🧾 Changelog

- v22.4: reliable search focus, clear button and Escape support; attachment counters; customizable category colors; header actions wired to the backend
- v22.3: functional IMAP backend for move/copy/archive/spam/snooze/label, README brought back to the project format
- v22.2: sender favicon, attachment counts, immersive header button, contextual burger-back button, mail counter in search, visible keyboard selection
- v22.1: sans-serif fonts, full-screen Settings pages, newsletter mosaic, hide non-INBOX categories, no-results search state

## 🔗 Links

- FR README: [README.md](README.md)
- Main client: [mail-client-v22](mail-client-v22)
