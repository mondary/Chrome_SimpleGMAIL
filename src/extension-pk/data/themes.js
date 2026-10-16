// PK Gmail Studio — thèmes (radio du panneau latéral, mutuellement exclusifs).
// '' = Gmail normal ; 'theme-pk' = presets Studio (les tweaks du manifest) ;
// les autres = dossier themes/<nom>/ injecté par chrome.scripting.
self.LAB_THEMES = [
  {
    id: '',
    label: 'Natif',
    description: 'Gmail sans retouche.',
  },
  {
    id: 'theme-pk',
    label: 'Studio',
    description: 'Le look maison : 28 réglages cochables, presets validés.',
  },
  {
    id: 'theme-simplify',
    label: 'Simplify',
    description: 'Surcouche épurée : en-tête, recherche loupe, fonds, boîte vide.',
    css: 'themes/simplify/theme.css',
    js: ['themes/simplify/settings.js', 'themes/simplify/content.js'],
  },
  {
    id: 'theme-simplemail-classic',
    label: 'Classique',
    description: 'La V1 : salutation, avatars initiales, groupes de dates.',
    css: 'themes/simplemail-classic/theme.css',
    js: ['themes/simplemail-classic/theme.js'],
  },
];

// Tweaks « bonus », jamais actifs dans les presets du thème PK : opt-in uniquement.
self.PRESET_OFF = ['js-custom-tabs'];

// (OMP Terminal, Focus OS, Label Canvas, Paper Reader, K7 : premières moutures retirées —
// à retravailler en vrais layouts, une par une.)
self.LAB_THEMES_UPCOMING = [];

// Réglages par thème, affichés dans la section Scripts du panneau.
// storage = clé chrome.storage.local que le thème écoute en direct.
self.THEME_SETTINGS = {
  'theme-simplify': {
    storage: 'pkGmailStyle',
    defaults: {
      headerActions: true, inboxZero: true, groupDates: true,
      quietHeader: true, hideAddons: true, floatingCompose: true,
      density: 'comfortable', width: 'balanced', background: 'native',
    },
    toggles: [
      ['headerActions', 'Actions dans l’en-tête'],
      ['inboxZero', 'Boîte vide immersive'],
      ['groupDates', 'Séparer par date'],
      ['quietHeader', 'Interface épurée'],
      ['hideAddons', 'Masquer le panneau Google'],
      ['floatingCompose', 'Bouton de rédaction flottant'],
    ],
    choices: [
      ['density', 'Densité', [['compact', 'Compacte'], ['comfortable', 'Confortable'], ['spacious', 'Aérée']]],
      ['width', 'Largeur', [['balanced', 'Centrée'], ['wide', 'Large'], ['full', 'Toute la largeur']]],
      ['background', 'Arrière-plan', [['native', 'Thème Gmail'], ['white', 'Blanc'], ['ocean', 'Océan'], ['night', 'Lac de nuit']]],
    ],
  },
};

