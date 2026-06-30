# Chrome_GmailPK

![Project icon](icon.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

✨ Client mail local inspiré de Gmail, avec interface moderne, lecture immersive et backend IMAP fonctionnel.

## ✅ Fonctionnalités

- override de nouvelle page Chrome
- liste des messages, conversations et recherche centrée avec effacement rapide
- drawer avec dossiers, libellés et catégories colorées personnalisables
- mode lecture immersive
- navigation clavier dans la liste
- composeur plein écran
- actions de message branchées sur le backend
- compteur réel des pièces jointes dans la liste

## 🧠 Utilisation

1. Ouvrir le projet
2. Aller dans `mail-client-v22/`
3. Lancer le serveur :

```bash
cd mail-client-v22
./start.sh
```

Ou depuis la racine :

```bash
./mail-client-v22.command
```

Le serveur écoute sur `http://0.0.0.0:8000`.

## ⚙️ Réglages

- `mail-client-v22/config.json` : comptes IMAP
- `mail-client-v22/secrets/mail.env` : mots de passe locaux

Comptes prévus :

- `c@pouark.com`
- `clement@mondary.design`
- `clement.mondary@gmail.com`

## 🧾 Commandes

- `./mail-client-v22.command` : lance le client
- `./start.sh` dans `mail-client-v22/` : lance le backend + front

## 📦 Build & Package

Aucun build frontend n’est requis. Le projet tourne en JavaScript/HTML/CSS avec un backend Python.

## 🧪 Installation (Antigravity)

1. Déposer le dossier du projet localement
2. Renseigner `mail-client-v22/secrets/mail.env`
3. Lancer `./mail-client-v22.command`
4. Ouvrir Chrome sur l’override de nouvelle page

## 🧾 Changelog

- v22.4 : recherche fiable avec focus, bouton d’effacement et touche Échap ; compteurs de pièces jointes ; couleurs de catégories configurables ; actions du header reliées au backend
- v22.3 : backend IMAP fonctionnel pour move/copy/archive/spam/snooze/label, README remis au format du projet
- v22.2 : favicon expéditeur, nombre de pièces jointes, bouton immersive en header, burger→retour contextuel, compteur mails dans la recherche, sélection clavier visible
- v22.1 : polices sans-serif, page Paramètres plein écran, mosaïque newsletters, masquer catégories hors INBOX, message recherche sans résultat

## 🔗 Liens

- EN README : [README_en.md](README_en.md)
- Client principal : [mail-client-v22](mail-client-v22)
