# Sombre Mail — client mail autonome

Client mail web autonome : un serveur FastAPI local qui se connecte directement
à vos boîtes IMAP/SMTP — multi-comptes, lecture, envoi réel, favoris,
suppression, pièces jointes et temps réel (IMAP IDLE → Server-Sent Events).
Gmail n'est jamais ouvert : ce n'est pas une surcouche, c'est une interface
indépendante. Pour l'habillage de Gmail lui-même, voir
[`src/extension-pk/`](../../src/extension-pk/README.md).

## Démarrage

```bash
cd tools/mail-client
uv venv .venv && uv pip install -r requirements.txt
# ou : python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

### Mode démo — aucun identifiant requis

```bash
MAIL_CLIENT_DEMO=1 .venv/bin/python main.py
# → http://localhost:8000 (données fictives, envois simulés)
```

### Comptes réels

Les mots de passe ne vivent pas dans `config.json` (ignoré par Git) : ils sont
lus dans les variables d'environnement référencées par `${…}` dans la config.

```bash
cp config.example.json config.json   # renseigner serveurs et adresses IMAP/SMTP
export MONDARY_MAIL_PASSWORD='…'     # mot de passe (Gmail : mot de passe d'application)
export POUARK_MAIL_PASSWORD='…'
./start.sh                           # vérifie les variables puis lance le serveur
```

Options : `PORT=8080` pour changer le port. Sans variable ni mode démo, l'API
répond explicitement qu'aucun compte n'est actif.

## Héritage

Version finale v1 du projet « mail-client » (24–26 juin 2026), promue depuis
les archives locales vers `tools/`. Successeurs en ligne de commande :
[`tools/pkmail`](../PKMAIL.md) et `tools/pkmail-ui`.
