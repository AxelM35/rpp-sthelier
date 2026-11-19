// Comparaison de plusieurs propositions de binômes.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);

async function comparer() {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=comparerPropositions]');
  return page;
}
const libellesBinomes = (page, i) => page.locator('.proposition').nth(i).locator('.binomes-proposes li').allInnerTexts();

test('trois propositions affichées côte à côte, sans modifier les données', async () => {
  const page = await comparer();
  assert.equal(await page.locator('.proposition').count(), 3);
  assert.match(await page.textContent('.proposition.recommandee h3'), /Proposition A\s+recommandée/);
  assert.match(await page.textContent('.proposition >> nth=1'), /binôme\(s\) différent\(s\) de la proposition A/);
  assert.equal((await lireEtat(page)).binomes.length, 0, 'comparer ne change rien');
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent),
    'Choisir la proposition A',
    'le focus va sur la première proposition',
  );
  assert.deepEqual(page.erreurs, []);
});

test('choisir la proposition B applique ses binômes et génère le planning', async () => {
  const page = await comparer();
  const attendus = await libellesBinomes(page, 1);
  await page.click('[data-action=choisirProposition][data-id="1"]');
  assert.match(await message(page), /^Proposition B retenue\. .*Horaires générés/);
  assert.equal(await page.locator('#comparaison').count(), 0);
  const etat = await lireEtat(page);
  assert.equal(etat.eleves.filter((e) => e.slot != null).length, 108);
  const noms = (id) => etat.profs.find((p) => p.id === id).nom;
  const obtenus = etat.binomes.map((b) => b.profIds.map(noms).join(' / '));
  assert.deepEqual(obtenus.sort(), attendus.map((l) => l.split(' — ')[0]).sort());
});

test('choisir une proposition demande confirmation si un planning existe', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  const avant = await lireEtat(page);
  await page.click('[data-action=comparerPropositions]');
  page.refuserConfirmations = true;
  await page.click('[data-action=choisirProposition][data-id="2"]');
  assert.match(page.confirmations.at(-1), /vont être remplacés/);
  assert.deepEqual((await lireEtat(page)).binomes, avant.binomes);
});

test('la comparaison disparaît quand les données changent ou à la fermeture', async () => {
  const page = await comparer();
  await page.click('[data-action=ajouterBinome]');
  assert.equal(await page.locator('#comparaison').count(), 0, 'données modifiées');
  await page.click('[data-action=comparerPropositions]');
  await page.click('[data-action=fermerComparaison]');
  assert.equal(await page.locator('#comparaison').count(), 0, 'fermeture');
});
