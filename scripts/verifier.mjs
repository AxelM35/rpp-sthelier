// Vérifications statiques simples du code source : imports inutilisés et lignes trop longues.
// Utilisation : npm run verifier

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LONGUEUR_MAX = 180;
const problemes = [];

async function fichiers(dossier) {
  const liste = [];
  for (const e of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) liste.push(...(await fichiers(chemin)));
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) liste.push(chemin);
  }
  return liste;
}

for (const chemin of [...(await fichiers('src')), ...(await fichiers('tests')), ...(await fichiers('scripts'))]) {
  const texte = await readFile(chemin, 'utf8');
  for (const [, noms] of texte.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const nom of noms
      .split(',')
      .map((n) =>
        n
          .trim()
          .split(/\s+as\s+/)
          .pop(),
      )
      .filter(Boolean)) {
      const motif = new RegExp('(?<![\\w$])' + nom.replace(/\$/g, '\\$') + '(?![\\w$])', 'g');
      const usages = texte.match(motif) || [];
      if (usages.length < 2) problemes.push(chemin + ' : import inutilisé « ' + nom + ' »');
    }
  }
  texte.split('\n').forEach((ligne, i) => {
    if (ligne.length > LONGUEUR_MAX && !chemin.includes('fixtures'))
      problemes.push(chemin + ':' + (i + 1) + ' : ligne de ' + ligne.length + ' caractères');
  });
}

if (problemes.length) {
  console.log(problemes.join('\n'));
  process.exitCode = 1;
} else console.log('Aucun problème détecté.');
