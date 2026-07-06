# Déploiement SimpleMail sur o2switch

Backend FastAPI déployé via **cPanel → Setup Python App**, frontend servi par
LiteSpeed en parallèle. Tout tient sur un seul domaine.

## 1. Préparer les fichiers

Sur ton Mac (dans le dossier du projet) :

```bash
cd src/desktop
```

Fichiers à uploader vers o2switch (via **FTP** ou **cPanel → Gestionnaire de fichiers**) :

```
passenger_wsgi.py        ← entry point WSGI
main.py                  ← backend FastAPI
ai.py                    ← module IA (optionnel)
index.html               ← frontend PWA
manifest.webmanifest     ← manifest PWA
sw.js                    ← service worker
icon.png
bg.jpg
config.example.json
requirements-o2switch.txt
```

## 2. Domaine / sous-domaine

**Recommandé : un sous-domaine dédié** (ex. `mail.tondomaine.fr`).

cPanel → **Sous-domaines** → Créer `mail` → dossier racine `public_html/mail`.

Tous les fichiers ci-dessus vont dans `public_html/mail/` (sauf indication
contraire ci-dessous).

## 3. SSL (HTTPS gratuit)

cPanel → **SSL/TLS Status** → "Run AutoSSL" pour le sous-domaine.
La PWA et la "distribution facile" iPhone **exigent** HTTPS.

## 4. Setup Python App (le cœur du déploiement)

cPanel → **Setup Python App** → **Create Application** :

| Champ | Valeur |
|-------|--------|
| Python version | 3.9 ou supérieur |
| Application root | `simplemail` (crée `~/simplemail`) |
| Application URL | `mail.tondomaine.fr` |
| Application startup file | `passenger_wsgi.py` |
| Application entry point | `application` |
| Passenger log file | `logs/simplemail.log` (optionnel) |

**Déplace les fichiers** uploadés de `public_html/mail/` vers `~/simplemail/`
(le dossier de l'app Python n'est PAS dans public_html — il est à la racine de
ton home). Conserve dans `public_html/mail/` **uniquement les fichiers
statiques** :

```bash
# Dans public_html/mail/ (statique, servi par LiteSpeed) :
index.html, manifest.webmanifest, sw.js, icon.png, bg.jpg

# Dans ~/simplemail/ (app Python) :
passenger_wsgi.py, main.py, ai.py, config.example.json,
requirements-o2switch.txt, et AUSSI index.html, icon.png, bg.jpg
(car main.py les sert via FileResponse)
```

## 5. Configurer requirements

Dans **Setup Python App** → édite le fichier requirements (ou crée-le) et colle
le contenu de `requirements-o2switch.txt` :

```
fastapi>=0.110
uvicorn>=0.29
imap_tools>=1.7
python-multipart>=0.0.9
a2wsgi>=1.0
```

Clique **Run Pip Install** (ou utilise le terminal cPanel) :
```bash
cd ~/simplemail
source virtualenv/bin/activate
pip install -r requirements-o2switch.txt
```

## 6. Configurer les comptes mail

Dans `~/simplemail/` :
```bash
cp config.example.json config.json
# Édite config.json avec tes comptes IMAP/SMTP
mkdir -p secrets
# Crée secrets/mail.env avec MAIL_PASS_<ID>=ton_mot_de_passe_app
chmod 600 secrets/mail.env
```

**Astuce** : tu peux aussi tout configurer via l'UI de l'app
(Paramètres → Comptes) une fois déployée — le backend écrira `config.json`
et `secrets/mail.env` lui-même.

## 7. Démarrer / redémarrer

Dans **Setup Python App** → clique **Restart**.
Consulte `logs/simplemail.log` si besoin.

Ouvre `https://mail.tondomaine.fr/` → l'app se charge.

## 8. Distribution mobile

### iPhone (zéro compte, zéro App Store) — PWA
1. Ouvre `https://mail.tondomaine.fr/` dans **Safari** sur iPhone
2. Bouton Partager → **"Sur l'écran d'accueil"**
3. Icône sur le home screen, plein écran, comme une app native

### Android (PWA)
1. Ouvre l'URL dans **Chrome**
2. Menu → **"Installer l'application"** / "Add to Home screen"

### .apk / .ipa natifs (optionnel)
Voir `src/mobile/README.md` (Capacitor). Pour TestFlight / Play Store.

## 9. Limites du mutualisé (à connaître)

- **Pas de SSE fiable** (`/api/events`) → le frontend bascule
  automatiquement en **polling** (60 s) si le flux coupe. Comportement normal.
- **Threads de fond** (IMAP IDLE, purge cache) : ils tournent tant que le
  worker Python vit ; le serveur peut les recycler — c'est transparent car
  le cache SQLite persiste et le lifespan est résilient.
- **Ressources** : surveille cPanel → **Utilisation de ressources**.
  Pour un usage perso, largement suffisant.

## Dépannage

| Symptôme | Action |
|----------|--------|
| 500 Internal Server Error | Voir `logs/simplemail.log` dans cPanel |
| `ModuleNotFoundError` | Re-run `pip install -r requirements-o2switch.txt` |
| `Permission denied` sur `simplemail.db` | `chmod 600 ~/simplemail/simplemail.db` |
| SSL / mixed content | Forcer HTTPS : cPanel → **Redirections** (301 http→https) |
| Les mails ne se chargent pas | Vérifier `config.json` + `secrets/mail.env` (chmod 600) |
