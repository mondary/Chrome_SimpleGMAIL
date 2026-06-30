# SimpleGMAIL v22

![Project icon](icon.png)

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

✨ Un client Gmail moderne et immersif en JavaScript/HTML/CSS pur — remplace la nouvelle page Chrome par une interface épurée avec mode lecture immersif, threading conversationnel, catégories Gmail et design inspiré de Netflix.

## ✅ Fonctionnalités (v22)

### Core UI
- **Hero Netflix** : clic sur newsletter → plein écran cinématographique
- **Mode lecture immersif** (style v4.html) pour newsletters
- **Cartes newsletters scrollables** qui passent sous le header sticky
- **Thème clair par défaut** avec mode sombre global
- **Sélecteur de fond "chill"** : 6 options d'arrière-plan
- **Bouton compose** (FAB) glass comme "no new mail"
- **Recherche centrée** sur la colonne avec curseur visible (`caret-color`)

### Email Features
- **Threading conversation** avec `THREAD=REFERENCES`
- **Emails HTML** (iframe sandbox)
- **Pièces jointes** (icônes et liens)
- **Ordre conversation** : plus récent en haut (paramétrable)

### Categories & Navigation
- **Catégories Gmail** : Principal/Promotions/Social/Updates/Forums (heuristique)
- **Burger menu + sidebar** : dossiers, libellés, catégories avec compteurs
- **Raccourcis clavier** : Échap (fermer), j/k (suivant/précédent), r (répondre), l (lire immersif)
- **Newsletters masquées hors INBOX** (Sent, Spam…) — n'apparaissent que dans la boîte de réception

### Newsletters
- **Vue carousel** horizontale par défaut
- **Vue mosaïque** multi-lignes/colonnes (toggle "Mosaïque")
- **Hero Netflix** au clic sur une newsletter

### Recherche
- **Message "Aucun résultat"** dédié quand la recherche ne retourne rien (au lieu de "boîte propre")
- Bouton "Effacer la recherche" dans l'état vide

### Polices (sans-serif uniquement)
- **Plus de serif** nulle part dans l'app
- **Sélecteur de police** dans les Paramètres : Futura / Poppins / Nerd Fonts (JetBrains/Space/Iosevka)
- **Police monospace** configurable : JetBrains Mono / Space Mono / Iosevka

### Page Paramètres (plein écran)
- **Navigation par pages dédiées** (style macOS Réglages) via sidebar gauche
- **Pages** : Raccourcis · Apparence · Langue · Comptes · À propos
- **Thème** : Clair / Sombre / Photo
- **Polices** : principale + monospace
- **Langue** : Français / English / Español / Deutsch
- **Presets raccourcis** : Gmail / Outlook / Personnalisé
- **Comptes IMAP** : ajout / gestion
- Lignes de réglage optimisées (label + contrôle), selects pleine largeur

### Other
- **Composeur plein écran** sans distraction (envoi réel)
- **Base backend** : catégories + threading

## ⚠️ Fonctionnalités Partielles

| # | Feature | Statut |
|---|---------|--------|
| 20 | **Vrais mails** clement@mondary.design | Code prêt, nécessite `MONDARY_MAIL_PASSWORD` |
| 21 | **Icône dans le drawer** | Markup + route statique faits, serveur à redémarrer |

## 🧠 Utilisation

1. Clonez le repo
2. Allez dans `mail-client-v22/`
3. Lancez le serveur :
```bash
npm install
MONDARY_MAIL_PASSWORD=votre_mdp npm run dev
```
4. Ouvrez `http://localhost:3000` dans Chrome

## 🧾 Changelog

- **v22.1** : Polices sans-serif + sélecteur, page Paramètres plein écran (pages dédiées + sidebar gauche), mosaïque newsletters, masquer catégories hors INBOX, message recherche sans résultat, caret-color
- **v22** : Hero Netflix, threading, HTML emails, catégories, shortcuts, compose plein écran
- **v20** : Base newsletter client immersif
- **v4** : Prototype lecture immersif
- **1.0** : Extension SimpleGMAIL CSS-only

## 🔗 Liens

- **Chrome Web Store** : [SimpleGMAIL](https://chromewebstore.google.com/detail/simplegmail/kijhhekofbbmdgnheepmjcenehmgepgl?hl=fr)
- **GitHub** : [mondary/SimpleGMAIL](https://github.com/mondary/SimpleGMAIL)
- EN README : [README_en.md](README_en.md)
- Issues : [GitHub Issues](https://github.com/mondary/SimpleGMAIL/issues/new)
- Contact : clement.mondary@gmail.com
