// Données personnelles : information, rappel après la soirée, effacement définitif.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ajouterJours, dateDuJour } from '../../src/modele/confidentialite.js';
import { college } from '../fixtures/college.js';
import { CLE, fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);

const cles = (page) => page.evaluate(() => Object.keys(localStorage).sort());

test('l’onglet Soirée informe sur les données personnelles', async () => {
  const page = await ouvrir({ etat: college() });
  const texte = await page.textContent('#donnees-personnelles');
  assert.match(texte, /Uniquement dans ce navigateur/);
  assert.match(texte, /au plus tard 30 jours après la soirée/);
  assert.equal(await page.locator('#donnees-personnelles [data-action=effacerDefinitivement]').count(), 1);
});

test('soirée à venir : pas de rappel ; soirée passée : rappel sur tous les onglets', async () => {
  const aVenir = await ouvrir({ etat: college({ date: ajouterJours(dateDuJour(), 7) }) });
  assert.equal(await aVenir.locator('.rappel').count(), 0);

  const hier = ajouterJours(dateDuJour(), -1);
  const page = await ouvrir({ etat: college({ date: hier }) });
  for (const id of ['soiree', 'donnees', 'planning', 'documents']) {
    await onglet(page, id);
    assert.match(await page.textContent('.rappel'), /La soirée est passée.*au plus tard le/);
  }

  const ancienne = await ouvrir({ etat: college({ date: ajouterJours(dateDuJour(), -60) }) });
  assert.match(await ancienne.textContent('.rappel'), /durée de conservation recommandée est dépassée/);
});

test('l’effacement définitif ne laisse aucune trace et ne peut pas être annulé', async () => {
  const page = await ouvrir({ etat: college({ date: ajouterJours(dateDuJour(), -2) }) });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  await page.evaluate((cle) => localStorage.setItem(cle + '-secours', '{"ancien":"contenu"}'), CLE);
  assert.deepEqual(await cles(page), [CLE, CLE + '-meta', CLE + '-secours']);

  page.refuserConfirmations = true;
  await page.click('.rappel [data-action=effacerDefinitivement]');
  assert.equal((await lireEtat(page)).eleves.length, 108, 'refus : rien n’est effacé');
  assert.match(page.confirmations.at(-1), /ne peut pas être annulée/);

  page.refuserConfirmations = false;
  await page.click('.rappel [data-action=effacerDefinitivement]');
  assert.deepEqual(await cles(page), []);
  assert.match(await message(page), /Toutes les données ont été effacées/);
  assert.equal(await page.locator('.rappel').count(), 0);

  await page.click('[data-action=annuler]');
  assert.match(await page.textContent('#toast'), /Rien à annuler/);
  await page.reload();
  assert.match(await page.textContent('#donnees-personnelles'), /Aucune donnée personnelle/);
  assert.deepEqual(page.erreurs, []);
});

test('les fichiers exportés sont signalés comme personnels', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  await onglet(page, 'planning');
  await Promise.all([page.waitForEvent('download'), page.click('[data-action=exporterExcel]')]);
  assert.match(await page.textContent('#toast'), /données personnelles/);
  await Promise.all([page.waitForEvent('download'), page.click('[data-action=sauvegarder]')]);
  assert.match(await page.textContent('#toast'), /données personnelles/);
});
