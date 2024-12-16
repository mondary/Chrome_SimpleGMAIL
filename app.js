// app.js

let nextPageToken = null;
let isLoading = false;

async function getEmails(pageToken = null) {
    try {
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(token);
                }
            });
        });

        const response = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100',
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();
        
        if (!data.messages) {
            console.error('No messages found:', data);
            return [];
        }

        const emails = await Promise.all(
            data.messages.map(async (message) => {
                const messageDetails = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                return messageDetails.json();
            })
        );

        console.log('Fetched emails:', emails); // Pour le debug
        return emails;

    } catch (error) {
        console.error('Error fetching emails:', error);
        return [];
    }
}

function formatDate(date) {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderEmailList(emails) {
    const container = document.getElementById('email-items');
    container.innerHTML = ''; // Vide le conteneur

    if (!emails || emails.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-gray-500">No emails found</div>';
        return;
    }

    emails.forEach((email) => {
        const date = new Date(email.payload.headers.find(h => h.name === 'Date')?.value);
        const sender = email.payload.headers.find(h => h.name === 'From')?.value;
        const subject = email.payload.headers.find(h => h.name === 'Subject')?.value;
        
        const emailElement = document.createElement('div');
        emailElement.className = 'email-item';
        
        emailElement.innerHTML = `
            <input type="checkbox" class="mr-4">
            <div class="email-sender">${sender || 'No sender'}</div>
            <div class="email-content ml-4">
                <span class="font-medium">${subject || 'No subject'}</span>
                <span class="text-gray-600"> - ${email.snippet || 'No preview'}</span>
            </div>
            <div class="email-time ml-4">${formatDate(date)}</div>
        `;
        
        container.appendChild(emailElement);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Loading emails...'); // Pour le debug
    const emails = await getEmails();
    console.log('Emails loaded, rendering...'); // Pour le debug
    renderEmailList(emails);
});

// Pour déboguer
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ', msg, '\nURL: ', url, '\nLine:', lineNo, '\nColumn:', columnNo, '\nError object:', error);
    return false;
};

// Fonction pour charger plus d'emails
async function loadMoreEmails() {
    if (isLoading || !nextPageToken) return;
    
    isLoading = true;
    const emails = await getEmails(nextPageToken);
    if (emails) {
        renderEmailList(emails, true); // true pour ajouter à la suite
    }
    isLoading = false;
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Chargement initial
    const emails = await getEmails();
    if (emails) {
        renderEmailList(emails);
    }

    // Détection du scroll pour charger plus d'emails
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            loadMoreEmails();
        }
    });
});

// Gestionnaire pour les onglets
document.querySelectorAll('.tab-inactive, .tab-active').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-inactive, .tab-active').forEach(t => {
            t.className = 'tab-inactive py-4 text-sm font-medium';
        });
        e.target.className = 'tab-active py-4 text-sm font-medium';
    });
});