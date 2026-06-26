# Connecter Modern Gmail Client a Gmail avec OAuth

Ce document decrit la procedure complete pour connecter l'extension Chrome **Modern Gmail Client** a Gmail avec l'API Chrome Identity et l'API Gmail.

L'erreur actuelle :

```text
Authentication Failed: OAuth2 request failed: Service responded with error: 'bad client id'
```

signifie que Chrome rejette le `client_id` OAuth configure dans `src/manifest.json`. Le probleme arrive avant meme l'appel a Gmail : le client OAuth Google ne correspond pas a l'extension Chrome chargee localement, ou il n'a pas ete cree avec le bon type d'application.

## Liens rapides

- [Chrome Extensions OAuth 2.0 guide](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [Chrome Identity API reference](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Auth Platform](https://console.cloud.google.com/auth)
- [Google Cloud APIs & Services](https://console.cloud.google.com/apis)
- [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
- [Gmail API overview](https://developers.google.com/gmail/api)
- [Gmail API scopes](https://developers.google.com/gmail/api/auth/scopes)
- [OAuth app branding help](https://support.google.com/cloud/answer/15549049)
- [OAuth app verification help](https://support.google.com/cloud/answer/13463073)
- [Unverified apps help](https://support.google.com/cloud/answer/7454865)
- [When verification is not needed](https://support.google.com/cloud/answer/13464323)
- [Manage OAuth clients](https://support.google.com/cloud/answer/15549257)

## Fichiers locaux concernes

- [`src/manifest.json`](src/manifest.json) : contient `permissions`, `oauth2.client_id` et les scopes.
- [`src/app.js`](src/app.js) : appelle `chrome.identity.getAuthToken()` et l'API Gmail.
- [`src/background.js`](src/background.js) : service worker Manifest V3.
- [`src/index.html`](src/index.html) : interface de l'extension.

Important : pour tester l'extension, il faut charger le dossier `src`, pas la racine du depot.

```text
/Users/clm/Documents/GitHub/PROJECTS/Chrome_GmailPK/src
```

## Pourquoi l'ID de l'extension est central

Avec `chrome.identity.getAuthToken()`, Chrome utilise deux informations :

1. le `client_id` dans `src/manifest.json` ;
2. les scopes OAuth dans `src/manifest.json`.

Mais le `client_id` Google doit lui-meme avoir ete cree pour l'**ID exact de l'extension Chrome**.

La doc officielle Chrome indique de creer un OAuth Client de type **Chrome Extension** et de renseigner l'**Item ID** de l'extension. Si l'Item ID ne correspond pas a l'extension chargee dans `chrome://extensions/`, Chrome peut renvoyer `bad client id`.

Reference :

- [Create an OAuth client ID for a Chrome extension](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#create-oauth-client-id)
- [Register OAuth in the manifest](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#register-oauth)
- [chrome.identity.getAuthToken](https://developer.chrome.com/docs/extensions/reference/api/identity#getAuthToken)

## Vue d'ensemble de la procedure

1. Charger l'extension locale dans Chrome.
2. Copier son extension ID.
3. Creer ou selectionner un projet Google Cloud.
4. Activer la Gmail API.
5. Configurer l'ecran de consentement OAuth.
6. Creer un OAuth Client ID de type **Chrome Extension**.
7. Coller l'extension ID dans le champ **Item ID**.
8. Copier le nouveau Client ID.
9. Remplacer `oauth2.client_id` dans `src/manifest.json`.
10. Recharger l'extension et retester.

## Etape 1 - Charger l'extension dans Chrome

1. Ouvrir Chrome.
2. Aller sur :

```text
chrome://extensions/
```

3. Activer **Developer mode** en haut a droite.
4. Cliquer sur **Load unpacked**.
5. Selectionner exactement ce dossier :

```text
/Users/clm/Documents/GitHub/PROJECTS/Chrome_GmailPK/src
```

6. Verifier que l'extension **Modern Gmail Client** apparait.
7. Copier l'**ID** affiche sur la carte de l'extension.

L'ID ressemble a une chaine de 32 caracteres, par exemple :

```text
abcdefghijklmnopabcdefghijklmnop
```

Garde cet ID ouvert ou colle-le temporairement dans une note. Il faudra le renseigner dans Google Cloud.

## Etape 2 - Ouvrir Google Cloud Console

Aller sur :

- [Google Cloud Console](https://console.cloud.google.com/)

Puis :

1. Connecte-toi avec le compte Google qui doit posseder le projet.
2. En haut de l'interface, selectionne un projet existant ou cree un nouveau projet.

Liens utiles :

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Cloud Project selector](https://console.cloud.google.com/projectselector2/home/dashboard)

Conseil : pour du developpement local, cree un projet dedie, par exemple :

```text
Modern Gmail Client Dev
```

Cela evite de melanger les credentials de test et une future version publiee.

## Etape 3 - Activer Gmail API

Dans Google Cloud :

1. Aller dans **APIs & Services > Library**.
2. Chercher **Gmail API**.
3. Ouvrir la fiche Gmail API.
4. Cliquer sur **Enable**.

Liens directs :

- [Google Cloud API Library](https://console.cloud.google.com/apis/library)
- [Gmail API in Google Cloud Library](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Gmail API documentation](https://developers.google.com/gmail/api)

Sans cette activation, l'authentification peut fonctionner, mais les appels a Gmail echoueront ensuite.

## Etape 4 - Configurer l'ecran de consentement OAuth

Aller dans :

- [Google Auth Platform](https://console.cloud.google.com/auth)
- ou [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)

Selon l'interface Google Cloud affichee, le menu peut s'appeler **Google Auth Platform**, **OAuth consent screen**, ou **Branding**.

### Type d'utilisateur

Choisir :

- **External** si tu utilises un compte Gmail classique ou si l'app doit marcher hors de ton organisation.
- **Internal** seulement si le projet appartient a une organisation Google Workspace et que l'app est limitee aux comptes de cette organisation.

Pour un projet personnel, prends generalement **External**.

Reference :

- [Submitting your app for verification - user type](https://support.google.com/cloud/answer/13461325)

### Informations obligatoires

Renseigner au minimum :

- **App name** : par exemple `Modern Gmail Client`
- **User support email** : ton email
- **Developer contact information** : ton email

Reference :

- [Manage OAuth App Branding](https://support.google.com/cloud/answer/15549049)

### Test users

Si l'application est en mode test :

1. Aller dans la section **Audience** ou **Test users**.
2. Ajouter ton adresse Gmail comme test user.
3. Sauvegarder.

Sans cela, ton compte peut etre bloque par l'ecran de consentement pendant les tests.

Reference :

- [OAuth app verification help](https://support.google.com/cloud/answer/13463073)
- [Unverified apps](https://support.google.com/cloud/answer/7454865)

## Etape 5 - Ajouter les scopes OAuth

Le manifeste actuel demande :

```json
"scopes": [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
]
```

Ces scopes correspondent aux fonctionnalites suivantes :

- `gmail.modify` : lire les messages et modifier les labels, par exemple marquer un message comme lu.
- `gmail.compose` : creer et envoyer des messages.
- `userinfo.email` : lire l'adresse email du compte.
- `userinfo.profile` : lire le nom et l'avatar du compte.

Liens utiles :

- [Gmail API scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Requesting minimum scopes](https://support.google.com/cloud/answer/13807380)

Note importante : les scopes Gmail peuvent etre sensibles ou restreints selon l'usage. Pour un outil personnel ou de test, tu peux souvent continuer avec des test users. Pour une extension publique, Google peut demander une verification OAuth.

References :

- [Unverified apps](https://support.google.com/cloud/answer/7454865)
- [OAuth app verification help](https://support.google.com/cloud/answer/13463073)
- [When verification is not needed](https://support.google.com/cloud/answer/13464323)

## Etape 6 - Creer un OAuth Client ID de type Chrome Extension

Aller dans :

- [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)

Puis :

1. Cliquer sur **Create credentials**.
2. Choisir **OAuth client ID**.
3. Dans **Application type**, choisir :

```text
Chrome Extension
```

4. Donner un nom au client, par exemple :

```text
Modern Gmail Client Local
```

5. Dans **Item ID**, coller l'ID de l'extension copie depuis `chrome://extensions/`.
6. Cliquer sur **Create**.
7. Copier le **Client ID** genere.

Le Client ID doit ressembler a ceci :

```text
123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

References :

- [Chrome guide - Create an OAuth client ID](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#create-oauth-client-id)
- [Manage OAuth clients](https://support.google.com/cloud/answer/15549257)

## Etape 7 - Mettre a jour `src/manifest.json`

Ouvrir :

```text
/Users/clm/Documents/GitHub/PROJECTS/Chrome_GmailPK/src/manifest.json
```

Remplacer la valeur actuelle :

```json
"client_id": "972215801802-64qe05idesl9r129rassjqens6gdlquq.apps.googleusercontent.com"
```

par le nouveau Client ID Google Cloud :

```json
"client_id": "TON_NOUVEAU_CLIENT_ID.apps.googleusercontent.com"
```

Le bloc complet doit ressembler a ceci :

```json
"oauth2": {
  "client_id": "TON_NOUVEAU_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ]
}
```

Reference :

- [Chrome guide - Register OAuth in the manifest](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#register-oauth)

## Etape 8 - Recharger l'extension

1. Retourner dans :

```text
chrome://extensions/
```

2. Trouver **Modern Gmail Client**.
3. Cliquer sur **Reload**.
4. Ouvrir un nouvel onglet.
5. L'extension doit remplacer la page nouvel onglet.
6. Accepter l'autorisation Google.

Si tout est correct, `chrome.identity.getAuthToken()` renvoie un token OAuth et l'application peut appeler Gmail.

Reference :

- [chrome.identity.getAuthToken](https://developer.chrome.com/docs/extensions/reference/api/identity#getAuthToken)

## Etape 9 - Verifier dans la console

Sur la page nouvel onglet de l'extension :

1. Ouvrir DevTools avec `F12` ou `Cmd + Option + I`.
2. Aller dans l'onglet **Console**.
3. Recharger la page.
4. Regarder les erreurs eventuelles.

Pour inspecter le service worker :

1. Aller dans `chrome://extensions/`.
2. Trouver l'extension.
3. Cliquer sur le lien du **service worker** si Chrome l'affiche.
4. Regarder la console du service worker.

## Checklist de validation

Verifier ces points dans l'ordre :

- L'extension chargee dans Chrome est bien le dossier `src`.
- L'extension ID visible dans `chrome://extensions/` correspond exactement a l'Item ID du client OAuth.
- Le client OAuth Google est de type **Chrome Extension**.
- Le `client_id` dans `src/manifest.json` est celui du client OAuth Chrome Extension.
- Gmail API est activee dans le projet Google Cloud.
- L'ecran de consentement OAuth est configure.
- Ton compte Gmail est ajoute comme test user si l'app est en mode test.
- Les scopes dans Google Cloud correspondent aux scopes demandes dans `src/manifest.json`.
- L'extension a ete rechargee apres modification du manifeste.

## Depannage : `bad client id`

Erreur :

```text
Authentication Failed: OAuth2 request failed: Service responded with error: 'bad client id'
```

Causes probables :

- Le `client_id` dans `src/manifest.json` est faux.
- Le client OAuth n'est pas de type **Chrome Extension**.
- Le client OAuth a ete cree avec un autre extension ID.
- L'extension chargee dans Chrome n'est pas le dossier `src`.
- L'extension ID a change depuis la creation du client OAuth.
- Le manifeste a ete modifie mais l'extension n'a pas ete rechargee.

Correction :

1. Copier a nouveau l'ID depuis `chrome://extensions/`.
2. Retourner dans [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
3. Creer un nouveau client OAuth de type **Chrome Extension**.
4. Coller l'ID exact dans **Item ID**.
5. Copier le nouveau Client ID.
6. Remplacer `oauth2.client_id` dans [`src/manifest.json`](src/manifest.json).
7. Recharger l'extension.

## Depannage : l'ecran dit que l'app n'est pas verifiee

Ce n'est pas forcement bloquant pour un usage personnel ou un test local.

Google peut afficher un avertissement si l'application utilise des scopes sensibles ou restreints et n'a pas ete verifiee. Pour tester :

- garde l'application en mode test ;
- ajoute ton compte dans **Test users** ;
- continue le flux d'autorisation si Chrome/Google le permet.

Pour une extension publique, il faudra probablement passer par une verification OAuth.

References :

- [Unverified apps](https://support.google.com/cloud/answer/7454865)
- [OAuth app verification help](https://support.google.com/cloud/answer/13463073)
- [When verification is not needed](https://support.google.com/cloud/answer/13464323)

## Depannage : Gmail API renvoie 403

Si l'authentification fonctionne mais que Gmail renvoie une erreur 403 :

- verifier que [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) est activee ;
- verifier que le projet Google Cloud est le meme que celui du client OAuth ;
- verifier que les scopes demandes sont bien acceptes ;
- verifier que ton compte est test user si l'app est en mode test ;
- revoquer l'acces puis refaire le flux OAuth si les scopes ont change.

Page utile pour gerer les acces OAuth de ton compte :

- [Google Account - Third-party access](https://myaccount.google.com/connections)

## Depannage : les anciens tokens restent caches

Chrome Identity met en cache des tokens. Si tu as change le client OAuth ou les scopes, il peut etre utile de repartir proprement.

Options :

1. Recharger l'extension dans `chrome://extensions/`.
2. Retirer l'acces depuis [Google Account - Third-party access](https://myaccount.google.com/connections).
3. Supprimer et recharger l'extension locale.
4. Redemarrer Chrome.

Reference :

- [chrome.identity.removeCachedAuthToken](https://developer.chrome.com/docs/extensions/reference/api/identity#method-removeCachedAuthToken)
- [chrome.identity.clearAllCachedAuthTokens](https://developer.chrome.com/docs/extensions/reference/api/identity#method-clearAllCachedAuthTokens)

## Stabiliser l'extension ID en developpement

En local, l'extension ID peut changer si Chrome considere que l'extension est differente. Comme l'OAuth Client ID depend de cet ID, il est utile de le stabiliser.

La doc Chrome recommande de conserver un ID stable pendant le developpement. Une methode consiste a ajouter une cle publique dans le champ `"key"` du manifeste.

Reference :

- [Chrome guide - Keep a consistent extension ID](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#keep-consistent-id)

Approche pratique :

1. Charger l'extension localement.
2. Creer le client OAuth avec l'extension ID actuel.
3. Tant que tu ne supprimes pas/recrees pas l'extension dans Chrome, l'ID reste normalement stable.
4. Avant une publication ou une distribution plus serieuse, stabiliser l'ID avec une cle `"key"` ou via un brouillon Chrome Web Store.

## Notes sur le code actuel

Dans [`src/app.js`](src/app.js), l'authentification passe par :

```javascript
chrome.identity.getAuthToken({ interactive }, (token) => {
    if (chrome.runtime.lastError) {
        const errMsg = chrome.runtime.lastError.message || "Unknown Auth Error";
        alert("Authentication Failed: " + errMsg + "\nCheck if the Client ID in manifest.json is correct.");
    } else {
        authToken = token;
        resolve(token);
    }
});
```

Ce code utilise donc bien l'API Chrome Identity. Il ne faut pas utiliser un client OAuth de type **Web application**, **Desktop app**, **Android**, ou **iOS** pour ce flux. Il faut bien un client OAuth de type **Chrome Extension**.

## References officielles

- [OAuth 2.0: authenticate users with Google - Chrome Extensions](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [chrome.identity API reference](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Google Auth Platform](https://console.cloud.google.com/auth)
- [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
- [Gmail API](https://developers.google.com/gmail/api)
- [Gmail API scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Manage OAuth App Branding](https://support.google.com/cloud/answer/15549049)
- [Manage OAuth Clients](https://support.google.com/cloud/answer/15549257)
- [OAuth App Verification Help Center](https://support.google.com/cloud/answer/13463073)
- [Unverified apps](https://support.google.com/cloud/answer/7454865)
- [When verification is not needed](https://support.google.com/cloud/answer/13464323)
- [Requesting minimum scopes](https://support.google.com/cloud/answer/13807380)
