// Génère src/theme.css : les jetons de couleur Material 3 (thèmes clair et sombre) à partir d'une couleur source.
// La bibliothèque de Google n'est utilisée qu'ici, au développement : le fichier livré n'en dépend pas.
//
// Utilisation : npm run theme

import {
  argbFromHex,
  Blend,
  hexFromArgb,
  Hct,
  MaterialDynamicColors as C,
  SchemeVibrant,
  TonalPalette,
} from '@material/material-color-utilities';
import { writeFile } from 'node:fs/promises';

const SOURCE = '#2456c9'; // bleu de la version 1
// Couleurs de statut absentes de Material 3, harmonisées avec la couleur source.
const PERSONNALISEES = { success: '#1b7a43', warning: '#a15c00' };

const ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'shadow',
  'scrim',
];

const enTiret = (nom) => nom.replace(/[A-Z]/g, (l) => '-' + l.toLowerCase());

function jetons(sombre) {
  const schema = new SchemeVibrant(Hct.fromInt(argbFromHex(SOURCE)), sombre, 0);
  const lignes = ROLES.map((r) => `  --md-sys-color-${enTiret(r)}: ${hexFromArgb(C[r].getArgb(schema))};`);
  for (const [nom, valeur] of Object.entries(PERSONNALISEES)) {
    // Teinte harmonisée avec la source, saturation modérée (comme les couleurs secondaires de M3).
    const hct = Hct.fromInt(Blend.harmonize(argbFromHex(valeur), argbFromHex(SOURCE)));
    const palette = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, 28));
    const [couleur, sur, conteneur, surConteneur] = sombre ? [80, 20, 30, 90] : [40, 100, 90, 10];
    lignes.push(
      `  --md-sys-color-${nom}: ${hexFromArgb(palette.tone(couleur))};`,
      `  --md-sys-color-on-${nom}: ${hexFromArgb(palette.tone(sur))};`,
      `  --md-sys-color-${nom}-container: ${hexFromArgb(palette.tone(conteneur))};`,
      `  --md-sys-color-on-${nom}-container: ${hexFromArgb(palette.tone(surConteneur))};`,
    );
  }
  return lignes.join('\n');
}

const css = `/* Jetons de couleur Material 3 — fichier généré par scripts/theme.mjs (source ${SOURCE}), ne pas modifier à la main. */

:root {
${jetons(false)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${jetons(true).replace(/^ {2}/gm, '    ')}
  }
}

:root[data-theme='dark'] {
${jetons(true)}
}
`;

await writeFile(new URL('../src/theme.css', import.meta.url), css);
console.log('src/theme.css généré à partir de ' + SOURCE);
