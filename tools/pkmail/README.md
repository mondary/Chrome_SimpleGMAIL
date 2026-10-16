# PKMail — Client terminal pour Gmail

Client mail en ligne de commande basé sur [Himalaya](https://github.com/pimalaya/himalaya).

## Prérequis

- Python 3.9+
- Himalaya v2.1.0+ (`brew install himalaya`)
- Node.js 18+ (pour l'interface web)

## Démarrage rapide

```bash
# 1. Générer la config Himalaya depuis config.json
python3 tools/pkmail/pkmail configure

# 2. Lister la boîte de réception
python3 tools/pkmail/pkmail inbox

# 3. Lire un message
python3 tools/pkmail/pkmail read <message-id>

# 4. Rechercher
python3 tools/pkmail/pkmail search "from:alice"

# 5. Envoyer
python3 tools/pkmail/pkmail send --to bob@example.com --subject Hello --body "Salut"

# 6. Archiver / Supprimer
python3 tools/pkmail/pkmail archive <id>
python3 tools/pkmail/pkmail delete <id>

# 7. Suivi / Désuivi
python3 tools/pkmail/pkmail flag <id>
python3 tools/pkmail/pkmail unflag <id>
```

## Comptes

Par défaut, le premier compte de `config.json` est utilisé. Pour cibler un autre compte :

```bash
python3 tools/pkmail/pkmail inbox --account gmail
python3 tools/pkmail/pkmail inbox --account pouark
python3 tools/pkmail/pkmail inbox --account mondary
```

## Architecture

```
src/desktop/config.json  ──→  pkmail configure  ──→  .himalaya/config.toml
src/desktop/secrets/mail.env                              ↓
                                                    himalaya CLI
                                                          ↓
                                                     IMAP / SMTP
```

- `src/desktop/config.json` contient les comptes IMAP/SMTP
- `src/desktop/secrets/mail.env` contient les mots de passe (variables d'environnement)
- `pkmail configure` génère un TOML Himalaya avec des `command` pour résoudre les secrets
- Les mots de passe ne sont jamais stockés en clair dans le TOML

## Interface web

```bash
cd tools/pkmail/ui
npm install
npm run dev
# → http://localhost:3000
```

L'interface web utilise les mêmes appels Himalaya en server-side (aucune credentials côté client).

## Fichiers

| Fichier | Description |
|---|---|
| `tools/pkmail/pkmail` | CLI Python wrappant Himalaya |
| `tools/pkmail/.himalaya/config.toml` | Config Himalaya générée (gitignored) |
| `tools/pkmail/ui/` | Interface web Next.js |
| `tools/pkmail/README.md` | Ce fichier |
