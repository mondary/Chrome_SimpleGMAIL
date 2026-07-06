# SimpleMail Mobile (Android + iOS)

Wrapper **Capacitor** qui génère un `.apk` Android et un `.ipa` iOS.
L'app native est une WebView qui charge le backend SimpleMail hébergé
(`server.url` dans `capacitor.config.json`).

## Prérequis (une seule fois)

```bash
cd src/mobile
npm install
```

## Config

Édite `capacitor.config.json` → remplace `VOTRE_DOMAINE` par ton domaine o2switch :
```json
"server": { "url": "https://mail.tondomaine.fr" }
```

## Android (.apk)

```bash
npm run add:android     # crée src/mobile/android/ (1ère fois)
npm run sync            # synchronise la config
npm run open:android    # ouvre Android Studio → Build > Build APK
```

Prérequis : [Android Studio](https://developer.android.com/studio) (SDK + NDK inclus).

Sortie : `android/app/build/outputs/apk/debug/app-debug.apk`.
Pour un `.apk` signé release : Android Studio → Build > Generate Signed Bundle/APK.

## iOS (.ipa)

```bash
npm run add:ios         # crée src/mobile/ios/ (1ère fois, macOS uniquement)
npm run sync
npm run open:ios        # ouvre Xcode
```

Prérequis (macOS uniquement) :
- [Xcode](https://developer.apple.com/xcode/) (~10 Go)
- Compte Apple Developer ($99/an) pour TestFlight/App Store
- **GRATUIT** pour test perso sur ton propre iPhone (branché en USB)

Sortie : Xcode → Product > Archive → Distribute (TestFlight / Ad Hoc / App Store).

## Architecture

```
src/mobile/
├── package.json              ← dépendances Capacitor
├── capacitor.config.json     ← URL du backend o2switch
├── web/index.html            ← shell de fallback (server.url prime)
├── android/                  ← généré par `npm run add:android`
└── ios/                      ← généré par `npm run add:ios`
```

Les apps natives ne contiennent **aucune logique** — tout passe par le backend
o2switch. Une mise à jour du backend = mise à jour immédiate des apps (sans
re-compiler l'APK/IPA).
