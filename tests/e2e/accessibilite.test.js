// Contrôle automatique WCAG 2.1 A et AA (axe-core) et affichage sur téléphone.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { fermer, onglet, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const ONGLETS = ['soiree', 'donnees', 'binomes', 'repartition', 'planning', 'documents'];

for (const theme of ['light', 'dark']) {
  test('aucune violation WCAG 2.1 AA, thème ' + (theme === 'light' ? 'clair' : 'sombre'), async () => {
    const page = await ouvrir({ etat: college(), theme });
    await onglet(page, 'binomes');
    await page.click('[data-action=toutGenerer]');
    await page.addScriptTag({ content: AXE });
    const violations = [];
    for (const id of ONGLETS) {
      await onglet(page, id);
      if (id === 'planning') await page.click('.el-btn'); // avec un élève sélectionné
      if (id === 'binomes') await page.click('[data-action=comparerPropositions]'); // avec la comparaison ouverte
      const r = await page.evaluate(() =>
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
      );
      r.violations.forEach((v) => violations.push(id + ' : ' + v.id + ' (' + v.nodes.length + ')'));
    }
    assert.deepEqual(violations, []);
  });
}

test('pas de défilement horizontal de la page sur téléphone', async () => {
  const page = await ouvrir({ etat: college(), largeur: 390, hauteur: 800 });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  for (const id of ONGLETS) {
    await onglet(page, id);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, id);
  }
});
