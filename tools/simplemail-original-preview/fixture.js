/* The five fictional conversations shown in archive 01. No mailbox connection. */
window.chrome = { runtime: { getURL: path => new URL('../../src/extension-pk/' + path, location.href).href } };
const fixtureMessages = [
  ['Sophie Mercier', "Re: Appel d'offres — Félicitations !", 3, 'À lire', "C'est officiel : vous êtes retenu pour la refonte de notre C", '15 oct.', false, false],
  ['Marc Leblanc', 'Compte-rendu Sprint Planning #24', 2, 'Clients', 'Voici le compte-rendu du sprint planning. 18 tickets chargés', '14 oct.', false, false],
  ['Julie Renard', 'Re: Dashboard — Retours client sur la V2', 2, 'Clients', "Le client vient d'envoyer ses retours sur la V2 des rapports", '12 oct.', false, true],
  ['Tech Weekly', 'The State of TypeScript 2026', 3, 'À lire', 'TypeScript 6.0 features, strict mode best practices, and the', '15 oct.', false, false],
  ['Intercom', 'Nouveau message de Thomas (Client ABC) — Urgent', 10, 'Clients', "Thomas a écrit : 'Bonjour, la page de connexion ne fonctionn", '15 oct.', true, false],
];
const main = document.querySelector('main'), tbody = main.querySelector('tbody');
const make = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
for (const [i, [sender, subject, count, label, snippet, date, unread, attachment]] of fixtureMessages.entries()) {
  const row = make('tr', 'zA ' + (unread ? 'zE' : 'yO')); row.id = `original-demo-${i}`; row.tabIndex = 0; row.setAttribute('role', 'row');
  const checkCell = make('td', 'oZ-x3 xY'), check = make('div', ''); check.setAttribute('role', 'checkbox'); check.setAttribute('aria-checked', 'false'); check.tabIndex = 0;
  check.addEventListener('click', e => { e.stopPropagation(); check.setAttribute('aria-checked', String(check.getAttribute('aria-checked') !== 'true')); }); checkCell.append(check);
  const from = make('td', 'yX xY'), yW = make('div', 'yW'); yW.append(make('span', 'yP', sender), make('span', 'bx0', String(count))); from.append(yW);
  const cell = make('td', 'a4W xY'), xs = make('div', 'xS'), xt = make('div', 'xT'), yi = make('div', 'yi');
  const at = make('div', 'at', label); at.title = label; at.style.backgroundColor = '#4b91ef'; yi.append(at);
  const y6 = make('div', 'y6'); y6.append(make('span', 'bog', subject)); xt.append(yi, y6, make('span', 'y2', '- ' + snippet)); xs.append(xt); cell.append(xs);
  const byZ = make('td', 'byZ xY'); if (attachment) byZ.append(make('span', 'aZo smo-icon', 'attach_file'));
  const stamp = make('td', 'xW xY', date), actions = make('td', 'bq4 xY');
  row.append(checkCell, from, cell, byZ, stamp, actions);
  row.addEventListener('click', () => {
    main.querySelector('.Nr').style.display = 'none';
    const article = make('article', 'fixture-reader'); article.append(make('h2', 'hP', subject), make('div', 'gD', sender), make('p', 'a3s', 'Bonjour, ceci est un message fictif pour vérifier le lecteur SimpleMail Original.'));
    main.append(article); location.hash = '#inbox/original-demo-' + i;
  }); tbody.append(row);
}
for (const [label, count] of [['Principale', 2], ['Promotions', 2], ['Réseaux sociaux', 0], ['Notifications', 0], ['Forums', 0]]) {
  const tab = make('button', '', count ? `${count} nouveaux ${label}` : label); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-label', label); tab.setAttribute('aria-selected', String(label === 'Principale'));
  tab.addEventListener('click', () => main.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab)))); main.querySelector('.aKh').append(tab);
}
document.querySelector('.G-atb button').addEventListener('click', () => { document.body.dataset.refreshed = 'true'; });
window.addEventListener('hashchange', () => { if (!location.hash.includes('/original-demo-')) { main.querySelectorAll('.fixture-reader').forEach(e => e.remove()); main.querySelector('.Nr').style.display = ''; } });
