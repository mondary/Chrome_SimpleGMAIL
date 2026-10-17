/* Synthetic Gmail-shaped DOM: no account, network mailbox, or personal data. */
const fixtureMessages = [
  ['Camille Durand', 'camille@atelier-nord.fr', 'Compte rendu — réunion de cadrage lundi', '09:42', true],
  ['OVHcloud', 'noreply@ovhcloud.net', 'Facture FR-2026-0812 disponible', '08:15', false],
  ['Marc Lejeune', 'marc.lejeune@gmail.com', 'BBQ samedi — tu viens ?', 'hier 21:07', true],
  ['Hebdo TypeScript', 'hello@hebdo-ts.dev', 'Édition #214 — decorators et Node 26', 'hier 19:30', false],
  ['Emma Rousseau', 'emma.rousse@studio-flux.fr', 'Maquette v3 — retours attendus', 'hier 17:12', false],
  ['La Banque Postale', 'securite@labanquepostale.fr', 'Connexion depuis un nouvel appareil', 'hier 14:03', false],
  ['Lucas Ferrand', 'lucas@ferrand-cie.com', 'Devis rénovation — validation', 'hier 11:26', false],
  ['Nina Kowalski', 'nina.kowalski@pixelform.fr', 'Contrat freelance — signature électronique', 'lun 16:54', true],
];
const main = document.querySelector('main');
const mailbox = main.querySelector('.Nr');
const tbody = main.querySelector('tbody');
const make = (tag, className, text) => { const e = document.createElement(tag); e.className = className; if (text) e.textContent = text; return e; };
for (const [index, [from, email, subject, date, unread]] of fixtureMessages.entries()) {
  const row = make('tr', 'zA ' + (unread ? 'zE' : 'yO')); row.id = `demo-${index}`;
  row.setAttribute('role', 'row'); row.tabIndex = 0;
  const checkboxCell = make('td', 'oZ-x3 xY'), checkbox = make('div', '');
  checkbox.setAttribute('role', 'checkbox'); checkbox.setAttribute('aria-checked', 'false'); checkbox.tabIndex = 0;
  checkbox.addEventListener('click', event => { event.stopPropagation(); checkbox.setAttribute('aria-checked', String(checkbox.getAttribute('aria-checked') !== 'true')); }); checkboxCell.append(checkbox);
  const sender = make('td', 'yX xY'), name = make('div', 'yW'), span = make('span', unread ? 'zF' : 'yP', from);
  span.setAttribute('email', email); name.append(span); sender.append(name);
  const message = make('td', 'a4W xY'), xs = make('div', 'xS'), xt = make('div', 'xT'), y6 = make('div', 'y6');
  y6.append(make('span', 'bog', subject)); xt.append(y6, make('span', 'y2', 'Extrait masqué dans le thème Focus.')); xs.append(xt); message.append(xs);
  const stamp = make('td', 'xW xY'); stamp.append(make('span', '', date));
  const actions = make('td', 'bq4 xY'), archive = make('button', 'brq', 'Archiver');
  archive.dataset.tooltip = 'Archiver'; archive.addEventListener('click', event => { event.stopPropagation(); row.remove(); }); actions.append(archive);
  row.append(checkboxCell, sender, message, stamp, actions);
  row.addEventListener('click', () => {
    mailbox.style.display = 'none';
    const article = make('article', 'fixture-reader');
    article.append(make('h2', 'hP', subject), make('div', 'gE', from + ' · ' + date), make('div', 'a3s', 'Bonjour, voici un message fictif pour vérifier la lecture dans Focus. Le thème de production utilise la conversation et les pièces jointes natives de Gmail.'));
    const reply = make('button', '', 'Répondre'); reply.setAttribute('aria-label', 'Répondre');
    reply.addEventListener('click', () => { const input = make('textarea', ''); input.setAttribute('aria-label', 'Réponse fictive'); article.append(input); input.focus(); }); article.append(reply);
    main.append(article); location.hash = '#inbox/demo-' + index;
  });
  tbody.append(row);
}
// Match an inbox with only three enabled native categories.
for (const label of ['Principale', 'Promotions', 'Forums']) {
  const tab = make('button', '', label); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-label', label); tab.setAttribute('aria-selected', String(label === 'Principale'));
  tab.addEventListener('click', () => { main.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab))); });
  main.querySelector('.aKh').append(tab);
}
window.addEventListener('hashchange', () => {
  if (!location.hash.includes('/demo-')) { document.querySelectorAll('.fixture-reader').forEach(e => e.remove()); mailbox.style.display = ''; }
  document.querySelector('.fixture-search')?.remove();
  main.parentElement.style.display = '';
  if (location.hash.startsWith('#search/')) {
    // Gmail retains its old inbox (and selected tabs) in a hidden subtree.
    main.parentElement.style.display = 'none';
    const view = make('div', 'bf5 fixture-search');
    const bar = make('div', 'biW');
    const types = make('div', 'Th');
    for (const label of ['Messagerie', 'Conversations', 'Espaces']) types.append(make('button', '', label));
    const filters = make('div', 'G6');
    for (const label of ['De', 'Indifférente', 'Pièce jointe', 'À', 'Non lu']) filters.append(make('button', '', label));
    bar.append(types, filters);
    const searchMain = make('main', 'fixture-results'); searchMain.setAttribute('role', 'main');
    searchMain.append(mailbox.cloneNode(true));
    view.append(bar, searchMain); document.querySelector('.bkK').append(view);
  }
});
// Label the screenshot honestly without changing the production adapter.
const previewObserver = new MutationObserver(() => { const badge = document.querySelector('.fos-live'); if (badge && badge.textContent !== 'DÉMO') badge.textContent = 'DÉMO'; });
previewObserver.observe(document.body, { childList: true, subtree: true });
