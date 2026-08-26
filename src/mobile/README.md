# SimpleMail Mobile (Android + iOS)

## État actuel : en pause

SimpleMail fonctionne désormais en mode local-only : le backend FastAPI et les
identifiants Gmail restent sur l'ordinateur. Une WebView Android/iOS ne peut pas
joindre `127.0.0.1:8000` sur le Mac, car cette adresse désigne le téléphone.

`capacitor.config.json` ne contient donc plus de `server.url` public. Le shell
embarqué explique que le mode mobile est indisponible au lieu de charger une
ancienne URL distante. La CI Android est déclenchable manuellement uniquement.

## Options futures

1. Accès privé au Mac avec Tailscale ou un VPN équivalent.
2. Backend privé en ligne avec authentification renforcée.
3. Refonte vers Gmail API + OAuth pour éviter un backend IMAP public.

Ne pas réactiver de build mobile avant d'avoir choisi et validé l'une de ces
architectures.

## Architecture conservée

```text
src/mobile/
├── package.json
├── capacitor.config.json     ← aucune URL distante
├── web/index.html            ← écran d'information local-only
├── android/                  ← généré par `npm run add:android`
└── ios/                      ← généré par `npm run add:ios`
```
