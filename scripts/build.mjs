// Construit l'application en un seul fichier HTML autonome (sans dépendance réseau) :
// le code des modules de src/ est assemblé par esbuild puis inséré, avec la feuille de style,
// dans src/index.html.
//
// Utilisation : npm run build            → dist/rencontres-parents-profs.html
//               node scripts/build.mjs --sortie chemin/fichier.html

import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--sortie');
const sortie = i > 0 ? resolve(process.argv[i + 1]) : resolve(racine, 'dist/rencontres-parents-profs.html');

const resultat = await build({
  entryPoints: [resolve(racine, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome111', 'firefox113', 'safari16.4'],
  minify: false,
  legalComments: 'none',
  write: false,
  charset: 'utf8',
});
const script = resultat.outputFiles[0].text;
if (/<\/script/i.test(script)) throw new Error('Le code contient « </script », ce qui casserait la page.');

const [gabarit, theme, styles] = await Promise.all([
  readFile(resolve(racine, 'src/index.html'), 'utf8'),
  readFile(resolve(racine, 'src/theme.css'), 'utf8'),
  readFile(resolve(racine, 'src/styles.css'), 'utf8'),
]);
const page = gabarit.replace('/*STYLES*/', () => theme.trim() + '\n\n' + styles.trim()).replace('/*SCRIPT*/', () => script.trim());

await mkdir(dirname(sortie), { recursive: true });
await writeFile(sortie, page);
console.log('Construit : ' + sortie + ' (' + Math.round(page.length / 1024) + ' Ko)');
