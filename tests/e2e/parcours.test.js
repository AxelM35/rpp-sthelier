// Parcours complet d'un organisateur : saisie, génération, ajustement, exports, rechargement.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { ouvrirZip } from '../../src/io/zip.js';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);

test('import par copier-coller, génération complète, rechargement', async () => {
  const page = await ouvrir();
  await onglet(page, 'donnees');

  await page.click('[data-action=ouvrirImport][data-id=profs]');
  await page.fill('#impTxt', 'Nom;Matière;Classes\nMme A;Français;6A\nM. B;Maths;6A\nMme C;Anglais;6A,6B\nM. D;SVT;6B\nMme E;EPS;6B');
  await page.click('[data-action=analyserTexteColle]');
  await page.click('[data-action=validerImport]');
  assert.match(await message(page), /5 professeur\(s\) importé\(s\)/);

  await page.click('[data-action=ouvrirImport][data-id=eleves]');
  const eleves = ['Nom;Prénom;Classe'];
  for (let i = 0; i < 20; i++) eleves.push('Nom' + i + ';Prénom' + i + ';' + (i < 12 ? '6A' : '6B'));
  await page.fill('#impTxt', eleves.join('\n'));
  await page.click('[data-action=analyserTexteColle]');
  await page.click('[data-action=validerImport]');
  assert.match(await message(page), /20 élève\(s\) importé\(s\)/);

  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  assert.match(await message(page), /Chaque élève peut obtenir un rendez-vous/);
  const etat = await lireEtat(page);
  assert.equal(etat.eleves.filter((e) => e.slot != null).length, 20);

  await page.reload();
  const recharge = await lireEtat(page);
  assert.equal(recharge.eleves.filter((e) => e.slot != null).length, 20, 'les données survivent au rechargement');
  assert.deepEqual(page.erreurs, []);
});

test('exports : sauvegarde JSON, Excel et CSV', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');

  const [sauvegarde] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=sauvegarder]')]);
  const json = JSON.parse(await readFile(await sauvegarde.path(), 'utf8'));
  assert.equal(json.eleves.length, 108);
  assert.match(await page.textContent('#etatSauv'), /Sauvegardé le/);

  await onglet(page, 'planning');
  const [excel] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=exporterExcel]')]);
  assert.equal(excel.suggestedFilename(), 'planning-rencontres.xlsx');
  const zip = ouvrirZip(await readFile(await excel.path()));
  assert.match(await zip.lire('xl/workbook.xml'), /Planning général.*Par classe.*Par binôme/);

  await onglet(page, 'documents');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=exporterCSV]')]);
  assert.equal((await readFile(await csv.path(), 'utf8')).split('\r\n').length, 109);

  for (const doc of ['general', 'classes', 'convocations']) {
    await page.click('[data-action=choisirDocument][data-id=' + doc + ']');
    assert.ok((await page.textContent('.papier')).length > 100, doc);
  }
  assert.equal(await page.locator('.coupon').count(), 108);
  assert.deepEqual(page.erreurs, []);
});

test('modification manuelle : glisser un élève vers un autre binôme', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  await onglet(page, 'repartition');
  const avant = await lireEtat(page);
  const e = avant.eleves[0];
  const autre = avant.binomes.find((b) => b.id !== e.binomeId && b.classeIds.includes(e.classeId));
  await page.dragAndDrop('[data-eleve="' + e.id + '"]', '[data-cible="bin:' + autre.id + '"]');
  const apres = await lireEtat(page);
  assert.equal(apres.eleves[0].binomeId, autre.id);
  await page.click('[data-action=annuler]');
  assert.equal((await lireEtat(page)).eleves[0].binomeId, e.binomeId, '« Annuler » rétablit la situation');
});
