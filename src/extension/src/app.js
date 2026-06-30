// app.js - Robust Elite Client

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
let currentFolder = 'INBOX';
let isLoading = false;
let authToken = null;

// --- API LAYER ---

async function getAuthToken(interactive = true) {
    if (authToken) return authToken;
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError) {
                console.error("Auth Error:", chrome.runtime.lastError.message);
                if (interactive) alert("Authentication Required. Click the Sync button.");
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                authToken = token;
                resolve(token);
            }
        });
    });
}

async function apiRequest(endpoint, options = {}) {
    const token = await getAuthToken();
    const url = endpoint.startsWith('http') ? endpoint : `${GMAIL_API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            authToken = null;
            chrome.identity.removeCachedAuthToken({ token }, () => {});
        }
        throw new Error(`API Error ${response.status}`);
    }
    return response.json();
}

// --- DATA FETCHING ---

async function fetchUserProfile() {
    try {
        const user = await apiRequest('https://www.googleapis.com/oauth2/v2/userinfo');
        if (user.picture) document.getElementById('user-avatar').src = user.picture;
        
        const inbox = await apiRequest('/labels/INBOX');
        const countEl = document.getElementById('inbox-count');
        if (countEl) countEl.textContent = inbox.messagesUnread > 0 ? `(${inbox.messagesUnread})` : '';
    } catch (e) { console.warn('Profile sync skipped'); }
}

async function fetchEmails(folder = 'INBOX', q = '') {
    if (isLoading) return;
    isLoading = true;
    
    const container = document.getElementById('email-items');
    container.innerHTML = '<div style="padding: 40px; text-align: center; opacity: 0.4; font-size: 11px; font-weight: 800; letter-spacing: 2px;">SYNCHRONIZING...</div>';

    try {
        let query = q;
        const folderQueries = { 'STARRED': 'is:starred', 'SENT': 'is:sent', 'TRASH': 'is:trash', 'INBOX': 'label:INBOX' };
        if (folderQueries[folder]) query += ` ${folderQueries[folder]}`;

        const data = await apiRequest(`/messages?maxResults=20${query ? '&q=' + encodeURIComponent(query) : ''}`);
        
        if (!data.messages) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; opacity: 0.3;">Inbox Zero</div>';
            isLoading = false;
            return;
        }

        const details = await Promise.all(data.messages.map(m => apiRequest(`/messages/${m.id}`).catch(() => null)));
        renderEmailList(details.filter(d => d !== null));
    } catch (error) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--accent); font-size: 12px; font-weight: 700;">SYNC ERROR. CHECK CLIENT ID.</div>';
    } finally { isLoading = false; }
}

// --- RENDERING ---

function renderEmailList(emails) {
    const container = document.getElementById('email-items');
    container.innerHTML = '';

    emails.forEach(email => {
        const headers = email.payload.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        const date = new Date(parseInt(email.internalDate));
        const isUnread = email.labelIds?.includes('UNREAD');

        const senderName = from.split('<')[0].trim().replace(/"/g, '') || from;

        const div = document.createElement('div');
        div.className = `email-item ${isUnread ? 'unread' : ''}`;
        div.innerHTML = `
            <div class="item-header">
                <span class="item-sender">${senderName}</span>
                <span class="item-date">${formatDate(date)}</span>
            </div>
            <div class="item-subject">${subject}</div>
            <div class="item-snippet">${email.snippet}</div>
        `;
        div.onclick = () => openEmail(email);
        container.appendChild(div);
    });
}

function getEmailBody(payload) {
    if (payload.body && payload.body.data) {
        return decodeBase64(payload.body.data);
    }
    if (payload.parts) {
        const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
        if (htmlPart) return getEmailBody(htmlPart);
        return getEmailBody(payload.parts[0]);
    }
    return '';
}

function decodeBase64(data) {
    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) { return "[Content Encrypted/Binary]"; }
}

function openEmail(email) {
    document.getElementById('reader-placeholder').style.display = 'none';
    const content = document.getElementById('reader-content');
    content.style.display = 'block';
    content.classList.add('active');

    const headers = email.payload.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = new Date(parseInt(email.internalDate)).toLocaleString();
    const body = getEmailBody(email.payload);

    document.getElementById('read-subject').textContent = subject;
    document.getElementById('read-from').textContent = from;
    document.getElementById('read-date').textContent = date;
    document.getElementById('read-avatar').textContent = from.charAt(0).toUpperCase();
    document.getElementById('read-body').innerHTML = body || '<i>No content available.</i>';

    // Mark as read
    if (email.labelIds?.includes('UNREAD')) {
        apiRequest(`/messages/${email.id}/modify`, {
            method: 'POST',
            body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
        }).then(() => fetchUserProfile()).catch(() => {});
    }
}

function formatDate(date) {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// --- INTERACTION ---

function initHandlers() {
    // Nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentFolder = link.dataset.folder;
            fetchEmails(currentFolder);
        };
    });

    // Modals
    const composeModal = document.getElementById('compose-modal');
    document.getElementById('compose-btn').onclick = () => composeModal.classList.add('active');
    document.getElementById('close-compose').onclick = () => composeModal.classList.remove('active');

    // Themes
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.onclick = () => {
            const t = btn.dataset.t;
            document.body.setAttribute('data-theme', t);
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chrome.storage.local.set({ theme: t });
        };
    });

    // Load saved theme
    chrome.storage.local.get(['theme'], (res) => {
        const t = res.theme || 'aero-glass';
        document.body.setAttribute('data-theme', t);
        const activeBtn = document.querySelector(`.theme-btn[data-t="${t}"]`);
        if (activeBtn) {
            themeBtns.forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    });

    // Search
    let searchTimeout;
    document.getElementById('search-input').oninput = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fetchEmails(currentFolder, e.target.value), 500);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initHandlers();
    fetchUserProfile();
    fetchEmails();
});
