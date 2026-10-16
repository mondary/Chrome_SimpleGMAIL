// PK Gmail Studio — thèmes (radio du panneau latéral, mutuellement exclusifs).
// '' = Gmail normal ; 'theme-pk' = presets Studio (les tweaks du manifest) ;
// les autres = dossier themes/<nom>/ injecté par chrome.scripting.
self.LAB_THEMES = [
  {
    id: '',
    label: 'Gmail normal',
    description: 'Aucun style appliqué.',
  },
  {
    id: 'theme-pk',
    label: 'PK — thème Studio',
    description: 'Presets validés : les tweaks ci-dessous, cochables un à un.',
  },
  {
    id: 'theme-simplify',
    label: 'Simplify',
    description: 'Surcouche V2 : en-tête à actions, recherche loupe, boîte vide.',
    css: 'themes/simplify/theme.css',
    js: ['themes/simplify/settings.js', 'themes/simplify/content.js'],
  },
  {
    id: 'theme-simplemail-classic',
    label: 'SimpleMail Classique',
    description: 'Layout V1 : sidebar sombre, salutation, avatars initiales, groupes de dates.',
    css: 'themes/simplemail-classic/theme.css',
    js: ['themes/simplemail-classic/theme.js'],
  },
  {
    id: 'theme-omp-terminal',
    label: 'OMP Terminal',
    description: 'Noir & rose, hairlines, accents monospace.',
    css: 'themes/omp-terminal/theme.css',
  },
  {
    id: 'theme-focus-os',
    label: 'Focus OS',
    description: 'Liste compacte mono, accent orange (fusion des deux Focus OS).',
    css: 'themes/focus-os/theme.css',
  },
  {
    id: 'theme-label-canvas',
    label: 'Label Canvas',
    description: 'Fond toile, libellés en blocs verts, lignes façon cartes.',
    css: 'themes/label-canvas/theme.css',
  },
  {
    id: 'theme-paper-reader',
    label: 'Paper Reader',
    description: 'Lecture éditoriale : serif Georgia sur papier chaud.',
    css: 'themes/paper-reader/theme.css',
  },
  {
    id: 'theme-k7-dark',
    label: 'K7 Médiathèque',
    description: 'Bibliothèque sombre, lignes façon jaquettes, accent cuivre.',
    css: 'themes/k7-dark/theme.css',
  },
  {
    id: 'theme-k7-light',
    label: 'K7 Clair',
    description: 'Cartes claires sur fond chaud, accent cuivre clair.',
    css: 'themes/k7-light/theme.css',
  },
];

// Tweaks « bonus », jamais actifs dans les presets du thème PK : opt-in uniquement.
self.PRESET_OFF = ['js-custom-tabs'];

// Thèmes du Lab en attente de transposition vers le DOM de Gmail.
// (Les 8 thèmes du Lab ont été transposés en 6 — doublons fusionnés.)
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

