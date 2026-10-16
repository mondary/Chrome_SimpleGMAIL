// PK Gmail Studio — thèmes (section radio du popup, mutuellement exclusifs).
// Thème absent ('') = PK : les tweaks du manifest, préconfigurés.
self.LAB_THEMES = [
  {
    id: 'theme-pk',
    label: 'PK — thème Studio',
    description: 'Les tweaks du manifest, préconfigurés. Coche/décoche pour ajuster.',
  },
  {
    id: 'theme-simplify',
    label: 'Simplify',
    description: 'La surcouche V2 : en-tête à actions, recherche loupe, boîte vide, réglages Simplify.',
    css: 'themes/simplify/theme.css',
    js: ['themes/simplify/settings.js', 'themes/simplify/content.js'],
  },
];
