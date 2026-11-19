// Utilisation au clavier seul.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, onglet, ouvrir } from './navigateur.js';

after(fermer);

async function avecPlanning() {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  return page;
}
const focus = (page) =>
  page.evaluate(() => ({
    id: document.activeElement.id,
    action: document.activeElement.dataset.action,
    cible: document.activeElement.dataset.id,
  }));

test('onglets : flèches, Début et Fin', async () => {
  const page = await ouvrir();
  await page.focus('#tab-soiree');
  await page.keyboard.press('ArrowRight');
  assert.equal((await focus(page)).id, 'tab-donnees');
  assert.equal(await page.getAttribute('#tab-donnees', 'aria-selected'), 'true');
  await page.keyboard.press('End');
  assert.equal((await focus(page)).id, 'tab-documents');
  await page.keyboard.press('ArrowRight');
  assert.equal((await focus(page)).id, 'tab-soiree', 'retour au début');
});

test('déplacer un élève : Entrée, « Placer ici », focus conservé', async () => {
  const page = await avecPlanning();
  await onglet(page, 'repartition');
  const etat = await lireEtat(page);
  const e = etat.eleves[0];
  const cible = etat.binomes.find((b) => b.id !== e.binomeId && b.classeIds.includes(e.classeId));
  await page.focus('[data-action=selectionner][data-id="' + e.id + '"]');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.selbar').count(), 1);
  await page.waitForFunction(() => /sélectionné/.test(document.querySelector('#annonce').textContent)); // annonce différée pour les lecteurs d'écran
  await page.focus('[data-action=placer][data-id="bin:' + cible.id + '"]');
  await page.keyboard.press('Enter');
  assert.equal((await lireEtat(page)).eleves[0].binomeId, cible.id);
  assert.deepEqual(await focus(page), { id: '', action: 'selectionner', cible: e.id });
});

test('Échap annule la sélection', async () => {
  const page = await avecPlanning();
  await onglet(page, 'repartition');
  await page.focus('.el-btn');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.selbar').count(), 0);
});

test('planning : échanger deux rendez-vous et verrouiller au clavier', async () => {
  const page = await avecPlanning();
  await onglet(page, 'planning');
  const etat = await lireEtat(page);
  const [a, b] = etat.eleves.filter((e) => e.binomeId === etat.binomes[1].id).sort((x, y) => x.slot - y.slot);
  await page.focus('[data-action=selectionner][data-id="' + a.id + '"]');
  await page.keyboard.press('Enter');
  await page.focus('[data-action=selectionner][data-id="' + b.id + '"]');
  await page.keyboard.press('Enter');
  const apres = await lireEtat(page);
  const slot = (id) => apres.eleves.find((e) => e.id === id).slot;
  assert.deepEqual([slot(a.id), slot(b.id)], [b.slot, a.slot]);
  await page.focus('[data-action=basculerVerrou][data-id="' + a.id + '"]');
  await page.keyboard.press('Enter');
  assert.equal((await lireEtat(page)).eleves.find((e) => e.id === a.id).verrou, true);
  assert.equal(await page.getAttribute('[data-action=basculerVerrou][data-id="' + a.id + '"]', 'aria-pressed'), 'true');
});

test('un binôme composé à la main est conservé par la génération', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=ajouterBinome]');
  assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /Premier professeur du binôme B1/);
  const id = (await lireEtat(page)).binomes[0].id;
  await page.selectOption('[data-champ=profBinome][data-id="' + id + '"][data-param="0"]', 'p13');
  await page.selectOption('[data-champ=profBinome][data-id="' + id + '"][data-param="1"]', 'p19');
  await page.click('[data-action=basculerClasseBinome][data-id="' + id + '"][data-param="c6C"]');
  await page.click('[data-action=toutGenerer]');
  const garde = (await lireEtat(page)).binomes.find((b) => b.id === id);
  assert.deepEqual([garde.profIds, garde.classeIds, garde.fixe], [['p13', 'p19'], ['c6C'], true]);
});
