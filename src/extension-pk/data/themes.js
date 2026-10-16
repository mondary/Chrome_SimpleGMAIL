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
];

// Thèmes du Lab en attente de transposition vers le DOM de Gmail.
self.LAB_THEMES_UPCOMING = [
  { label: 'OMP Terminal', note: 'noir & rose' },
  { label: 'Focus OS', note: 'liste mono compacte' },
  { label: 'Focus OS — Nav haute', note: 'catégories en haut' },
  { label: 'Label Canvas', note: 'colonnes par libellé' },
  { label: 'Paper Reader', note: 'lecture plein écran' },
  { label: 'K7 Media Shelf', note: 'bibliothèque sombre' },
  { label: 'K7 Preview Deck', note: 'cartes avec aperçu' },
  { label: 'K7 Preview Clair', note: 'cartes claires' },
];
