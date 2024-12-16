// app.js
function renderEmailList(emails) {
    const container = document.getElementById('email-items');
    container.innerHTML = '';

    emails.forEach((email) => {
        const date = new Date(email.payload.headers.find(h => h.name === 'Date')?.value);
        const sender = email.payload.headers.find(h => h.name === 'From')?.value;
        const subject = email.payload.headers.find(h => h.name === 'Subject')?.value;
        
        const emailElement = document.createElement('div');
        emailElement.className = 'email-item';
        
        emailElement.innerHTML = `
            <input type="checkbox" class="email-checkbox">
            <button class="email-star">★</button>
            <div class="email-sender">${sender}</div>
            <div class="email-content">
                <span class="email-title">${subject}</span>
                <span class="email-snippet"> - ${email.snippet}</span>
                ${email.labelIds?.includes('IMPORTANT') ? '<span class="label">Simplify</span>' : ''}
            </div>
            <div class="email-time">${formatDate(date)}</div>
        `;
        
        container.appendChild(emailElement);
    });
}

function formatDate(date) {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Reste du code pour getEmails() et l'initialisation...
