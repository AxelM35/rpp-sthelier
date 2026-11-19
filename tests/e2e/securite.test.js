// Protection des données : fichiers piégés, actions destructrices, import en double, verrous.

import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);

const dossier = await mkdtemp(join(tmpdir(), 'rpp-'));
async function fichier(nom, contenu) {
  const chemin = join(dossier, nom);
  await writeFile(chemin, contenu);
  return chemin;
}

test('une sauvegarde piégée ou abîmée est refusée et les données conservées', async () => {
  const page = await ouvrir({ etat: college() });
  const piege = college();
  piege.classes[0].id = 'x" onmouseover="window.pirate=1" data-z="';
  const cas = [
    ['piege.json', JSON.stringify(piege), /identifiant invalide/],
    ['abime.json', '{"v":1,"eleves":[],"profs":[{"nom":"A"}]}', /identifiant invalide dans « professeurs »/],
    ['texte.json', 'nimporte quoi', /pas un fichier de sauvegarde lisible/],
  ];
  for (const [nom, contenu, motif] of cas) {
    await page.setInputFiles('[data-champ=ouvrirFichier]', await fichier(nom, contenu));
    await page.waitForSelector('#main > .msg.bad');
    assert.match(await message(page), motif);
    assert.equal((await lireEtat(page)).eleves.length, 108);
  }
  assert.equal(await page.locator('[onmouseover]').count(), 0);
  assert.deepEqual(page.erreurs, []);
});

test('« Tout effacer » demande confirmation', async () => {
  const page = await ouvrir({ etat: college() });
  page.refuserConfirmations = true;
  await page.click('[data-action=toutEffacer]');
  assert.equal((await lireEtat(page)).eleves.length, 108);
  assert.match(page.confirmations[0], /108 élèves, 20 professeurs/);
  page.refuserConfirmations = false;
  await page.click('[data-action=toutEffacer]');
  assert.equal((await lireEtat(page)).eleves.length, 0);
});

test('régénérer demande confirmation et conserve les rendez-vous verrouillés', async () => {
  const page = await ouvrir({ etat: college() });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  assert.equal(page.confirmations.length, 0, 'pas de confirmation sans travail à perdre');

  await onglet(page, 'planning');
  const etat = await lireEtat(page);
  const verrouille = etat.eleves[0];
  await page.click('[data-action=basculerVerrou][data-id="' + verrouille.id + '"]');

  await onglet(page, 'binomes');
  page.refuserConfirmations = true;
  await page.click('[data-action=toutGenerer]');
  assert.match(page.confirmations[0], /1 rendez-vous verrouillé/);
  page.refuserConfirmations = false;
  await page.click('[data-action=toutGenerer]');
  const apres = (await lireEtat(page)).eleves[0];
  assert.deepEqual([apres.binomeId, apres.slot, apres.verrou], [verrouille.binomeId, verrouille.slot, true]);
});

test('importer deux fois le même fichier Excel n’ajoute pas de doublons', async () => {
  const page = await ouvrir();
  await onglet(page, 'donnees');
  const xlsx = fileURLToPath(new URL('../fixtures/eleves-libreoffice.xlsx', import.meta.url));
  for (let i = 0; i < 2; i++) {
    await page.click('[data-action=ouvrirImport][data-id=eleves]');
    await page.setInputFiles('[data-champ=fichierImport]', xlsx);
    await page.waitForSelector('[data-action=validerImport]');
    await page.click('[data-action=validerImport]');
  }
  assert.match(await message(page), /0 élève\(s\) importé\(s\) ; 2 doublon\(s\) ignoré\(s\)/);
  assert.equal((await lireEtat(page)).eleves.length, 2, 'la ligne sans classe est ignorée');
});
