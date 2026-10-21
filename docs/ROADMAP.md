# Roadmap — PKMail / PK Simple Gmail

Suivi des chantiers prévus, en cours et validés. Le changelog (`CHANGELOG.md`)
décrit ce qui est livré ; ce fichier décrit ce qui vient après.

## Chantiers côté extension (PK Simple Gmail)

- [x] Six thèmes au panneau : Natif, Studio, Simplify, Classique, Focus, Original.
- [x] Focus : retour à Principale, navigation répétée entre catégories et filtres de recherche sans chevauchement.
- [x] Focus : visibilité et alignement des catégories, préférences persistantes et compteur total de la pagination Gmail.
- [x] Studio : bascule vers la vraie page Google Agenda dans le même onglet, avec retour à la vue Gmail du compte actif.
- [ ] Transposer les concepts restants du Lab, un vrai layout à la fois
      (atelier-actuel : Label Canvas, Paper Reader, K7 — voir `tools/lab/atelier-actuel/`).
- [ ] Guide utilisateur de l'extension dans un README unique (les thèmes ont
      aujourd'hui leur doc propre : `themes/focus-os/README.md`).

## Chantiers côté application

- [ ] Découper les monolithes : `src/desktop/main.py` (≈ 190 Ko) et
      `src/desktop/index.html` (≈ 413 Ko) — extraction en modules, sans changer
      le comportement.
- [ ] Trancher le destin des clients mail coexistants :
      `src/desktop/` (FastAPI + V2), `tools/mail-client/` (Sombre Mail autonome)
      et `tools/pkmail/` (CLI Himalaya + UI Next.js). Fusionner ou archiver.
- [ ] Android / iOS en pause jusqu'au choix d'un accès privé (VPN/Tailscale)
      ou d'une architecture Gmail API + OAuth ; la tentative Capacitor vit dans
      `src/mobile/`.

## Shell desktop natif — Go ou Rust (à trancher)

Futur shell desktop de SimpleMail (macOS, peut-être multi-plateforme).
Stack à décider entre **Go** et **Rust** avant tout code.

Destination prévue : enchevêtrer l'extension canonique (`src/extension-pk/`,
PK Simple Gmail), les thèmes des anciennes interfaces (`tools/lab/`) et les
boîtes mail (`tools/mail-client/`, `tools/pkmail/`).

Rien d'implémenté à ce jour. Conformément à la règle du projet : on ne
supprime rien, on fusionne. (Ancien emplacement : `src/rust/README.md`,
fusionné ici ; les coquilles vides `src/android/`, `src/ios/`, `src/macos/`
sont retirées — `src/mobile/` porte la tentative Android.)

## Maintenance de l'arborescence

- [x] `docs/` : documentation sortie du code (OAuth Gmail, déploiement o2switch,
      cette roadmap).
- [ ] `docs/CONFIGURATION_GMAIL_OAUTH.md` concerne le projet voisin
      `Chrome_GmailPK` (« Modern Gmail Client ») : à transférer dans son dépôt
      lors du prochain passage là-bas.
- [x] `store/assets/` : ne garde que le ZIP courant ; les versions antérieures
      partent dans `archives/releases/extension-pk/`.
- [x] `src/extension/` : absorbée dans `src/extension-pk/sources/` — le dossier
      gelé quitte le git, miré dans `archives/versions/01-extension-simplemail-2026.08.01/`.
