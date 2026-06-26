# AGENTS.md - Modern Gmail Client Chrome Extension

## Project Overview

This is a **Chrome Extension (Manifest V3)** that replaces the new tab page with a modern Gmail client interface. It fetches and displays emails from the Gmail API.

## Project Structure

```
Chrome_GmailPK/
├── manifest.json    # Extension manifest (v3)
├── background.js    # Service worker
├── index.html      # New tab override (main UI)
├── app.js          # Core application logic
├── style.css       # Additional styles
└── icons/          # Extension icons (16, 48, 128px)
```

## Key Architecture Decisions

### Manifest V3 Extension
- Overrides `chrome://newtab` via `chrome_url_overrides.newtab`
- Uses a service worker (`background.js`) for extension lifecycle
- Requires OAuth2 for Gmail API access

### Authentication Flow
- Uses `chrome.identity.getAuthToken()` for OAuth
- Token is fetched asynchronously before each API call
- Hardcoded client ID in manifest.json (`972215801802-64qe05idesl9r129rassjqens6gdlquq.apps.googleusercontent.com`)

### Gmail API Integration
- Endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/messages`
- Fetches 100 messages per page with pagination via `pageToken`
- Fetches full message details for each message ID
- Extracts headers (From, Date, Subject) for display

## Essential Commands

**No build step required.** This is a plain JavaScript/HTML/CSS Chrome extension.

1. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

2. **Debug**:
   - Right-click extension icon → Inspect views → background page
   - Or press F12 on new tab page

## Code Patterns

### Async API Calls
```javascript
async function getEmails(pageToken = null) {
    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(token);
        });
    });
    // ... fetch logic
}
```

### Email Rendering
- Parses headers array to find Date, From, Subject
- Checks `labelIds` for UNREAD status
- Strips quotes from sender names: `sender.split('<')[0].trim().replace(/"/g, '')`

### Date Formatting
- Same day → shows time only
- Older → shows `Mon DD` format

## Styling Approach

**⚠️ INCONSISTENT STYLING - Major Gotcha**

The project uses Tailwind CSS but in an inconsistent way:

1. **CDN in HTML** (`index.html` line 5):
   ```html
   <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
   ```
   This makes Tailwind work in the HTML file itself.

2. **style.css uses @apply directives but Tailwind is NOT configured for processing**.
   Classes like `@apply py-4 text-sm font-medium` will NOT be processed because there is no Tailwind config or build pipeline.

   **Impact**: Custom styles defined in `style.css` using `@apply` will not work. Only inline styles and Tailwind CDN classes (in HTML) function correctly.

3. **Recommendation**: Either:
   - Remove `@apply` from `style.css` and use standard CSS properties, OR
   - Set up a build process (PostCSS/Tailwind CLI) to process the CSS

### Inline Styles in index.html
Additional styles are defined in a `<style>` block within `index.html` (lines 6-89). These handle:
- Header layout
- Email item sizing
- FAB button styling

## Important Gotchas

### 1. OAuth Requires Chrome Web Store
`chrome.identity.getAuthToken()` only works properly when the extension is published to the Chrome Web Store or has a valid client ID registered in Chrome. Local loading may prompt for authorization but won't persist tokens reliably.

### 2. renderEmailList Clears Container
The `renderEmailList()` function (line 56) does:
```javascript
container.innerHTML = '';
```
This means pagination **overwrites** existing emails instead of appending. The `loadMoreEmails()` function passes `true` to indicate append mode, but this parameter is ignored - it clears the container regardless. Pagination will lose previously loaded emails.

### 3. No Error Display to Users
Errors are only logged to console (`console.error`). Users see no feedback on API failures.

### 4. API Rate Limits
Gmail API has quotas. The current implementation makes N+1 API calls per load (1 for message list + N for each message detail). Consider batching or caching.

### 5. No Message Body Content
The app only fetches message metadata, not the actual email body content (no multipart MIME parsing).

### 6. French Comments
Code contains French comments mixed with English variable names. Be aware when modifying.

## Testing Approach

No test framework is configured. Manual testing via:
1. Load extension unpacked in Chrome
2. Open new tab
3. Authenticate with Google
4. Observe email list

## Style Conventions

- **Variable naming**: camelCase (e.g., `nextPageToken`, `emailDetails`)
- **Function naming**: camelCase, descriptive (e.g., `renderEmailList`, `loadMoreEmails`)
- **Class names**: kebab-case in HTML (e.g., `email-item`, `tab-active`)
- **CSS variables**: not used (colors hardcoded as hex)
