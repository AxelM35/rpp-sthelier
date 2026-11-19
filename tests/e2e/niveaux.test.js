// Version 2, lot 2 : écran d'accueil, préparations indépendantes par niveau, reprise des données de la v1,
// sauvegardes en fichier aiguillées selon le niveau, effacement par niveau.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { genererTout } from '../../src/algos/generation.js';
import { college } from '../fixtures/college.js';
import { CLE_V1, cleNiveau, cles, fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);

const dossier = await mkdtemp(join(tmpdir(), 'rpp-niveaux-'));
async function fichier(nom, contenu) {
  const chemin = join(dossier, nom);
  await writeFile(chemin, typeof contenu === 'string' ? contenu : JSON.stringify(contenu));
  return chemin;
}

/** Le jeu de test, rangé dans un autre niveau (classes 5A, 5B…), avec n élèves. */
function preparation(niveau, n = 108) {
  const etat = { ...college(), niveau };
  etat.classes.forEach((c) => (c.nom = c.nom.replace('6', niveau[0])));
  etat.eleves = etat.eleves.slice(0, n);
  return etat;
}

/** Ouvre l'accueil avec des préparations déjà enregistrées. */
function ouvrirAccueil(etats, options = {}) {
  const stockage = Object.fromEntries(etats.map((e) => [cleNiveau(e.niveau), JSON.stringify(e)]));
  return ouvrir({ stockage, niveau: null, ...options });
}

/** Attend qu'une condition côté test devienne vraie (2 s au plus). */
async function attendre(condition) {
  for (let i = 0; i < 100 && !condition(); i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(condition(), 'condition non remplie à temps');
}

const carte = (page, niveau) => page.locator('section.niveau', { has: page.locator('#niveau-' + niveau) });
const ouvrirFichier = async (page, chemin) => page.setInputFiles('#fichierSauvegarde', chemin);
async function telecharger(page, selecteur) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(selecteur)]);
  return { nom: dl.suggestedFilename(), contenu: JSON.parse(await readFile(await dl.path(), 'utf8')) };
}

test('au lancement, l’accueil présente une carte par niveau avec son avancement', async () => {
  const sixieme = genererTout(college({ date: '2026-12-01' })).etat;
  const cinquieme = preparation('5e', 20);
  cinquieme.soiree.date = '';
  const page = await ouvrirAccueil([sixieme, cinquieme]);
  assert.equal(await page.title(), 'Rencontres parents-professeurs');
  assert.equal(await page.locator('#tabs').isHidden(), true, 'pas d’onglets sur l’accueil');
  assert.deepEqual(await page.locator('section.niveau h2').allTextContents(), ['Niveau 6e', 'Niveau 5e', 'Niveau 4e', 'Niveau 3e']);

  const six = await carte(page, '6e').textContent();
  assert.match(six, /Soirée du mardi 1 décembre 2026/);
  assert.match(six, /Élèves\s*108/);
  assert.match(six, /Enseignants\s*20/);
  assert.match(six, /Planifiés\s*108\s*\/ 108/);
  assert.match(six, /Aucun point à corriger/);
  assert.match(six, /Pas encore sauvegardé dans un fichier/);

  const cinq = await carte(page, '5e').textContent();
  assert.match(cinq, /Date de la soirée non fixée/);
  assert.match(cinq, /Planifiés\s*0\s*\/ 20/);
  assert.match(cinq, /\d+ points? à corriger/);

  assert.match(await carte(page, '3e').textContent(), /Aucune donnée pour l'instant/);
  assert.equal(await carte(page, '3e').locator('button').count(), 1, 'niveau vide : seulement « Commencer »');
  assert.deepEqual(page.erreurs, []);
});

test('ouvrir un niveau, l’afficher en permanence, revenir à l’accueil (bouton, Précédent, clavier)', async () => {
  const page = await ouvrirAccueil([preparation('5e')]);
  await page.click('[data-action=ouvrirNiveau][data-id="5e"]');
  assert.equal(await page.textContent('.niveau-courant'), '5e');
  assert.match(page.url(), /#5e$/);
  assert.equal(await page.title(), '5e — Rencontres parents-professeurs');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-soiree', 'focus sur le premier onglet');

  for (const id of ['donnees', 'planning']) {
    await onglet(page, id);
    assert.equal(await page.textContent('.niveau-courant'), '5e');
  }
  await page.reload();
  assert.equal(await page.textContent('.niveau-courant'), '5e', 'un rechargement garde le niveau');

  await page.click('[data-action=accueil]');
  await page.waitForSelector('.niveaux');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Ouvrir la 5e', 'focus sur la carte quittée');

  await page.keyboard.press('Enter');
  assert.equal(await page.textContent('.niveau-courant'), '5e');
  await page.goBack();
  await page.waitForSelector('.niveaux');
  assert.equal(await page.locator('.niveau-courant').count(), 0, 'Précédent ramène à l’accueil');

  // Le lien d'évitement ne fait pas quitter le niveau.
  await page.click('[data-action=ouvrirNiveau][data-id="4e"]');
  await page.focus('.skip');
  await page.keyboard.press('Enter');
  assert.equal(await page.textContent('.niveau-courant'), '4e');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  assert.deepEqual(page.erreurs, []);
});

test('les niveaux sont indépendants, y compris pour « Annuler »', async () => {
  const page = await ouvrirAccueil([college()]);
  await page.click('[data-action=ouvrirNiveau][data-id="5e"]');
  await onglet(page, 'donnees');
  await page.click('[data-action=ajouterClasse]');
  assert.deepEqual(
    (await lireEtat(page, '5e')).classes.map((c) => c.nom),
    ['5A'],
  );
  assert.equal((await lireEtat(page, '6e')).classes.length, 4, '6e inchangée');

  // Passage par l'accueil et la 6e : l'annulation de la 5e est conservée, celle de la 6e est vide.
  await page.click('[data-action=accueil]');
  await page.click('[data-action=ouvrirNiveau][data-id="6e"]');
  await page.click('[data-action=annuler]');
  assert.match(await page.textContent('#toast'), /Rien à annuler/);
  await page.click('[data-action=accueil]');
  await page.click('[data-action=ouvrirNiveau][data-id="5e"]');
  await page.click('[data-action=annuler]');
  assert.deepEqual((await lireEtat(page, '5e')).classes, []);
  assert.equal((await lireEtat(page, '6e')).classes.length, 4);
});

test('les données de la v1 sont reprises comme niveau 6e, une seule fois', async () => {
  const { niveau, ...v1 } = genererTout(college()).etat;
  assert.equal(niveau, '6e');
  const meta = JSON.stringify({ modif: 1, export: 2 });
  const page = await ouvrir({ stockage: { [CLE_V1]: JSON.stringify({ ...v1, v: 1 }), [CLE_V1 + '-meta']: meta }, niveau: null });
  assert.match(await message(page), /Vos données de la version 1 ont été reprises dans le niveau 6e/);
  assert.deepEqual(await cles(page), ['rpp-v2-6e', 'rpp-v2-6e-meta']);
  assert.match(await carte(page, '6e').textContent(), /Élèves\s*108[\s\S]*Planifiés\s*108/);

  await page.reload();
  assert.equal(await page.locator('#main > .msg').count(), 0, 'message affiché une seule fois');
  await page.click('[data-action=ouvrirNiveau][data-id="6e"]');
  await onglet(page, 'planning');
  assert.equal((await lireEtat(page)).eleves.filter((e) => e.slot != null).length, 108);
  assert.deepEqual(page.erreurs, []);
});

test('des données v1 illisibles sont mises de côté sans bloquer l’application', async () => {
  const page = await ouvrir({ stockage: { [CLE_V1]: '{abîmé' }, niveau: null });
  assert.match(await message(page), /étaient illisibles/);
  assert.deepEqual(await cles(page), ['rpp-v2-6e-secours']);
  assert.match(await carte(page, '6e').textContent(), /données illisibles ont été mises de côté/);
  assert.deepEqual(page.erreurs, []);
});

test('sauvegardes : niveau dans le fichier et dans son nom, depuis le niveau ou sa carte', async () => {
  const page = await ouvrirAccueil([preparation('5e'), college()]);
  const carteCinq = await telecharger(page, '[data-action=sauvegarderNiveau][data-id="5e"]');
  assert.equal(carteCinq.nom, 'rencontres-parents-profs-5e.json');
  assert.equal(carteCinq.contenu.niveau, '5e');
  assert.match(await carte(page, '5e').textContent(), /Sauvegardé le/);
  assert.match(await carte(page, '6e').textContent(), /Pas encore sauvegardé/);

  await page.click('[data-action=ouvrirNiveau][data-id="6e"]');
  const six = await telecharger(page, '[data-action=sauvegarder]');
  assert.equal(six.nom, 'rencontres-parents-profs-6e.json');
  assert.equal(six.contenu.niveau, '6e');
});

test('ouvrir une sauvegarde dans un niveau : seul ce niveau est accepté', async () => {
  const page = await ouvrir({ etat: college() });
  await ouvrirFichier(page, await fichier('cinq.json', preparation('5e', 10)));
  await page.waitForSelector('#main > .msg.bad');
  assert.match(await message(page), /c'est une sauvegarde de la 5e.*revenez à l'accueil.*Les données de la 6e sont conservées/);
  assert.equal((await lireEtat(page)).eleves.length, 108);
  assert.equal(await lireEtat(page, '5e'), null);

  await ouvrirFichier(page, await fichier('six.json', preparation('6e', 10)));
  await page.waitForSelector('#main > .msg.ok');
  assert.match(await message(page), /Sauvegarde de la 6e ouverte : 10 élèves/);
  assert.equal((await lireEtat(page)).eleves.length, 10);
});

test('ouvrir une sauvegarde depuis l’accueil : rangée dans son niveau, après confirmation si besoin', async () => {
  const page = await ouvrirAccueil([preparation('4e', 30)]);

  // Niveau vide : pas de confirmation, le niveau s'ouvre.
  await ouvrirFichier(page, await fichier('cinq.json', preparation('5e', 12)));
  await page.waitForSelector('.niveau-courant');
  assert.equal(await page.textContent('.niveau-courant'), '5e');
  assert.match(await message(page), /Sauvegarde de la 5e ouverte : 12 élèves/);
  assert.deepEqual(page.confirmations, []);
  assert.equal((await lireEtat(page, '5e')).eleves.length, 12);

  // Niveau rempli : confirmation ; un refus ne change rien.
  await page.click('[data-action=accueil]');
  page.refuserConfirmations = true;
  await ouvrirFichier(page, await fichier('quatre.json', preparation('4e', 5)));
  await attendre(() => page.confirmations.length === 1);
  assert.match(page.confirmations.at(-1), /sauvegarde de la 4e \(5 élèves.*contient déjà des données \(30 élèves/s);
  assert.equal((await lireEtat(page, '4e')).eleves.length, 30);
  assert.equal(await page.locator('.niveau-courant').count(), 0);

  page.refuserConfirmations = false;
  await ouvrirFichier(page, await fichier('quatre-bis.json', preparation('4e', 5)));
  await page.waitForSelector('.niveau-courant');
  assert.equal((await lireEtat(page, '4e')).eleves.length, 5);
  await page.click('[data-action=annuler]');
  assert.equal((await lireEtat(page, '4e')).eleves.length, 30, '« Annuler » rétablit les données remplacées');

  // Un fichier de la v1 (sans niveau) est une sauvegarde de 6e.
  await page.click('[data-action=accueil]');
  const { niveau, ...v1 } = college();
  await ouvrirFichier(page, await fichier('v1.json', { ...v1, v: 1, niveau: undefined }));
  await page.waitForSelector('.niveau-courant');
  assert.equal(await page.textContent('.niveau-courant'), niveau);
  assert.equal((await lireEtat(page, '6e')).eleves.length, 108);
  assert.deepEqual(page.erreurs, []);
});

test('effacement définitif d’un niveau depuis sa carte, puis de tous les niveaux', async () => {
  const page = await ouvrirAccueil([college(), preparation('5e')]);
  await page.evaluate(() => localStorage.setItem('rpp-v2-5e-secours', 'x'));

  page.refuserConfirmations = true;
  await page.click('[data-action=effacerNiveau][data-id="5e"]');
  assert.match(page.confirmations.at(-1), /données de la 5e.*108 élèves.*ne peut pas être annulée.*autres niveaux ne sont pas concernés/s);
  assert.equal(await lireEtat(page, '5e').then((e) => e.eleves.length), 108);

  page.refuserConfirmations = false;
  await page.click('[data-action=effacerNiveau][data-id="5e"]');
  assert.match(await message(page), /Les données de la 5e ont été effacées/);
  assert.deepEqual(await cles(page), ['rpp-v2-6e']);
  assert.match(await carte(page, '5e').textContent(), /Aucune donnée/);

  await page.click('[data-action=effacerToutDefinitivement]');
  assert.match(page.confirmations.at(-1), /tous les niveaux/);
  assert.deepEqual(await cles(page), []);
  assert.match(await page.textContent('#donnees-personnelles'), /Aucune donnée personnelle/);
  assert.equal(await page.locator('[data-action=effacerNiveau]').count(), 0);
  assert.deepEqual(page.erreurs, []);
});
