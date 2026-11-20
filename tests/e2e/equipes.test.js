// Version 2, lot 3 : équipes des élèves (LVB, options, ULIS, professeur principal) dans l'application.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college4e } from '../fixtures/college4e.js';
import { fermer, lireEtat, onglet, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

/** 4e sans enseignante d'allemand : des contrôles « Données » apparaissent. */
function quatrieme() {
  const etat = college4e();
  etat.profs = etat.profs.filter((p) => p.id !== 'pAl');
  return etat;
}

for (const theme of ['light', 'dark']) {
  test('4e, thème ' + (theme === 'light' ? 'clair' : 'sombre') + ' : génération, couverture par groupe, WCAG 2.1 AA', async () => {
    const page = await ouvrir({ etat: quatrieme(), niveau: '4e', theme });
    await onglet(page, 'binomes');
    await page.click('[data-action=toutGenerer]');
    assert.match(await page.textContent('#main > .msg'), /Chaque élève peut obtenir un rendez-vous/);
    assert.equal((await lireEtat(page, '4e')).eleves.filter((e) => e.slot != null).length, 127);

    const groupes = await page.locator('table.couverture tr.groupe td:first-child').allTextContents();
    assert.ok(
      groupes.some((t) => /4C, groupe Espagnol · Latin · Athlétisme/.test(t)),
      groupes.join(' | '),
    );
    assert.match(await page.textContent('.diag'), /limité à un groupe : Athlétisme en 4B/);

    await page.addScriptTag({ content: AXE });
    const violations = [];
    for (const id of ['binomes', 'donnees']) {
      await onglet(page, id);
      const r = await page.evaluate((o) => axe.run(document, o), WCAG);
      r.violations.forEach((v) => violations.push(id + ' : ' + v.id + ' (' + v.nodes.length + ')'));
    }
    assert.deepEqual(violations, []);
    assert.match(await page.textContent('#main'), /4A : 3 élève\(s\) suivent Allemand, sans enseignant déclaré dans la classe/);
    assert.deepEqual(page.erreurs, []);
  });
}

test('4e : un élève placé chez un enseignant qui ne l’a pas en cours est signalé', async () => {
  const page = await ouvrir({ etat: college4e(), niveau: '4e' });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  const etat = await lireEtat(page, '4e');
  const latin = etat.binomes.find((b) => b.profIds.includes('pLa'));
  const intrus = etat.eleves.find((e) => latin.classeIds.includes(e.classeId) && !e.optionIds.includes('opt-latin') && !e.verrou);

  await onglet(page, 'repartition');
  await page.click('.el-btn[data-id="' + intrus.id + '"]');
  await page.click('[data-action=placer][data-id="bin:' + latin.id + '"]');
  assert.equal((await lireEtat(page, '4e')).eleves.find((e) => e.id === intrus.id).binomeId, latin.id);

  const vignette = page.locator('.el.pb .el-btn[data-id="' + intrus.id + '"]');
  assert.match(await vignette.getAttribute('aria-label'), /attention : un professeur du binôme n'a pas cet élève en cours/);
  assert.match(await page.textContent('.diag'), /est reçu\(e\) par M\. Lacaze, qui ne l'a pas en cours/);
  assert.deepEqual(page.erreurs, []);
});
