// Six quiet folder links below the burger. No native hidden-node click delegation.
(() => {
  const RAIL_ID = 'pk-no-left-menu-rail';
  if (document.getElementById(RAIL_ID)) return;

  const folders = [
    {
      id: 'inbox',
      hash: 'inbox',
      title: { fr: 'Boîte de réception', en: 'Inbox' },
      icon: '<path d="M4 5h16v14H4z"/><path d="M4 12h4l2 3h4l2-3h4"/>',
    },
    {
      id: 'starred',
      hash: 'starred',
      title: { fr: 'Messages suivis', en: 'Starred' },
      icon: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    },
    {
      id: 'sent',
      hash: 'sent',
      title: { fr: 'Messages envoyés', en: 'Sent' },
      icon: '<path d="m21 3-7.2 18-3.8-7-7-3.8z"/><path d="M10 14 21 3"/>',
    },
    {
      id: 'drafts',
      hash: 'drafts',
      title: { fr: 'Brouillons', en: 'Drafts' },
      icon: '<path d="M4 4h16v16H4z"/><path d="m8 16 1-3 7-7 3 3-7 7z"/><path d="m14 7 3 3"/>',
    },
    {
      id: 'spam',
      hash: 'spam',
      title: { fr: 'Spam', en: 'Spam' },
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 17h.01"/>',
    },
    {
      id: 'trash',
      hash: 'trash',
      title: { fr: 'Corbeille', en: 'Trash' },
      icon: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="m5 7 1 13h12l1-13"/><path d="M9 7V4h6v3"/>',
    },
  ];

  const isFrench = /^fr(?:-|$)/i.test(document.documentElement.lang || navigator.language || 'fr');
  const rail = document.createElement('nav');
  rail.id = RAIL_ID;
  rail.setAttribute('aria-label', isFrench ? 'Dossiers Gmail' : 'Gmail folders');

  for (const folder of folders) {
    const title = folder.title[isFrench ? 'fr' : 'en'];
    // Real same-document links work even when Gmail never mounts Spam/Trash
    // under its collapsed "More" section. The current account path is preserved.
    const link = document.createElement('a');
    link.setAttribute('href', `#${folder.hash}`);
    link.setAttribute('aria-label', title);
    link.title = title;
    link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${folder.icon}</svg>`;
    rail.append(link);
  }

  (document.body || document.documentElement).append(rail);

  function alignWithBurger() {
    const burger = document.querySelector('#gb [data-ogmb], #gb [aria-label="Menu principal"], #gb [aria-label="Main menu"]');
    if (!burger) return false;
    const rect = burger.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    rail.style.setProperty('--pk-folder-left', `${Math.max(0, rect.left + rect.width / 2 - 20)}px`);
    rail.style.setProperty('--pk-folder-top', `${rect.bottom}px`);
    return true;
  }
  alignWithBurger();
  rail.addEventListener('pointerenter', alignWithBurger);
  rail.addEventListener('focusin', alignWithBurger);
  window.addEventListener('resize', alignWithBurger);
  // Gmail can mount the header after document_end. Stop observing once found;
  // no polling and no layout animation on hover, just the CSS opacity fade.
  const observer = new MutationObserver(() => {
    if (alignWithBurger()) observer.disconnect();
  });
  if (!alignWithBurger()) observer.observe(document.documentElement, { childList: true, subtree: true });
})();
