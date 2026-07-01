# Chrome_GmailPK

![Project icon](icon.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

✨ Client mail IMAP immersif avec neuftalks, mode cinéma, et backend Python.

## ✅ Fonctionnalités

- override de nouvelle page Chrome
- vue liste + conversation avec colonne redimensionnable
- newsletters : carrousel multicartes, dock macOS animé, détail hero 33vh
- catégories Gmail (icônes + badges dans la barre d'en-tête)
- raccourcis clavier entièrement configurables
- page Paramètres plein écran (polices, thème, format date, mode newsletters, langues, comptes, à propos)
- thème light/dark/fond photo unifié (`#1a1a1a`)
- mode sélection avec actions groupées (check, favori, archiver, supprimer)
- hover actions : checkbox à gauche, star/archive/delete à droite avec dégradé
- suppression par thread entier
- recherche centrée avec compteur et effacement
- favicon expéditeur (`google.com/s2/favicons`) avec fallback initiales
- compteur de pièces jointes
- mode lecture immersive
- composeur plein écran
- données de démo intégrées (55 messages, 9 sources newsletters)

## 🧠 Utilisation

```bash
cd mail-client-v22
export $(grep -v '^#' secrets/mail.env | xargs)
python3 main.py
```

Ou depuis la racine :
```bash
./mail-client-v22.command
```

Le serveur écoute sur `http://0.0.0.0:8000`.

## ⚙️ Réglages

- `mail-client-v22/config.json` : comptes IMAP (mondary, pouark, gmail)
- `mail-client-v22/secrets/mail.env` : mots de passe locaux
- `DEMO=1` : force toutes les données en mode démo (désactiver en prod)
- localStorage : polices, thème, format date, mode newsletters, raccourcis perso

## 🧾 Commandes

- `./mail-client-v22.command` : lance le client complet
- `python3 main.py` dans `mail-client-v22/` : serveur backend uniquement
- `curl http://127.0.0.1:8000/api/messages?account=demo` : API directe

## 📦 Build & Package

Aucun build. HTML/CSS/JS vanilla + Python FastAPI. Charger l'extension unpacked dans `chrome://extensions/`.

## 🧪 Installation (Antigravity)

1. Cloner le projet
2. Remplir `mail-client-v22/secrets/mail.env`
3. Lancer `./mail-client-v22.command`
4. Charger l'extension unpacked dans Chrome
5. Ouvrir un nouvel onglet

## 🧾 Changelog

- v22.9 : suppression par thread, dock newsletters sans bordures, grille responsive, 9 sources démo
- v22.8 : raccourcis clavier configurables, format date (relatif/jj/mm/aaaa/aaaa/mm/jj), mode newsletters (cartes/dock), thème dark unifié `#1a1a1a`
- v22.7 : og-image backend, hero newsletter 33vh, fallback favicon→gradient, favicon domaine dans le dock
- v22.6 : hover actions split (checkbox gauche + actions droite avec gradient), sélection clavier, bulk actions
- v22.5 : paramètres plein écran avec navigation latérale, polices (Futura/Poppins/Nerd), carrousel newsletters
- v22.4 : recherche fiable avec focus, bouton d'effacement et touche Échap ; compteurs de pièces jointes ; couleurs de catégories configurables ; actions du header reliées au backend
- v22.3 : backend IMAP fonctionnel pour move/copy/archive/spam/snooze/label
- v22.2 : favicon expéditeur, nombre de pièces jointes, bouton immersif en header, burger→retour contextuel, compteur mails dans la recherche, sélection clavier visible
- v22.1 : polices sans-serif, page Paramètres plein écran, mosaïque newsletters, masquer catégories hors INBOX, message recherche sans résultat

## 🔗 Liens

- EN README : [README_en.md](README_en.md)
- Client principal : [mail-client-v22](mail-client-v22)
