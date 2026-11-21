// Version 2, lot 4, étape 4a : durée des rendez-vous par niveau et aide au réglage de la capacité (onglet Soirée).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, message, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

/** 6e trop nombreuse pour 12 créneaux de 15 minutes : 139 élèves, 20 professeurs, soit 10 binômes au plus. */
const sixiemeNombreuse = () => college({ effectifs: [35, 35, 35, 34] });
const champDuree = '[data-champ=soiree][data-param=duree]';

test('une soirée neuve dure 10 minutes en 6e et 15 minutes en 5e ; toute durée de 5 à 60 minutes', async () => {
  const page = await ouvrir();
  assert.equal(await page.inputValue(champDuree), '10');
  await page.fill(champDuree, '12');
  await page.keyboard.press('Tab');
  assert.equal((await lireEtat(page)).soiree.duree, 12);
  await page.fill(champDuree, '90');
  await page.keyboard.press('Tab');
  assert.equal((await lireEtat(page)).soiree.duree, 60);

  const cinquieme = await ouvrir({ niveau: '5e' });
  assert.equal(await cinquieme.inputValue(champDuree), '15');
  assert.deepEqual([...page.erreurs, ...cinquieme.erreurs], []);
});

test('capacité insuffisante : durée plus courte proposée et appliquée en un clic', async () => {
  const page = await ouvrir({ etat: sixiemeNombreuse() });
  const aide = page.locator('.msg.reglages');
  assert.match(
    await aide.textContent(),
    /139 élèves pour 10 binômes au plus : il faut au moins 14 créneaux par binôme, la soirée en compte 12/,
  );
  assert.match(await aide.textContent(), /Rendez-vous de 10 minutes : 18 créneaux/);
  assert.match(await aide.textContent(), /Fin à 20h30, avec la durée actuelle : 14 créneaux/);

  await page.click('[aria-label="Appliquer : rendez-vous de 10 minutes"]');
  assert.equal((await lireEtat(page)).soiree.duree, 10);
  assert.match(await message(page), /Rendez-vous de 10 minutes : 18 créneaux par binôme/);
  assert.equal(await aide.count(), 0, 'la capacité suffit : plus de proposition');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.param), 'duree', 'focus sur le champ modifié');

  await page.click('[data-action=annuler]');
  assert.equal((await lireEtat(page)).soiree.duree, 15, '« Annuler » rétablit la durée');
  assert.deepEqual(page.erreurs, []);
});

test('capacité insuffisante : heure de fin appliquée ; rappel de refaire un planning existant', async () => {
  const etat = sixiemeNombreuse();
  etat.binomes = [{ id: 'b1', fixe: true, profIds: ['p0', 'p1'], classeIds: ['c6A'], salle: '' }];
  Object.assign(etat.eleves[0], { binomeId: 'b1', slot: 0 });
  const page = await ouvrir({ etat });
  await page.click('[aria-label="Appliquer : fin à 20h30"]');
  assert.equal((await lireEtat(page)).soiree.fin, '20:30');
  assert.match(await message(page), /Fin de la soirée à 20h30 : 14 créneaux par binôme\. Relancez « Tout générer »/);
  assert.deepEqual(page.erreurs, []);
});

for (const theme of ['light', 'dark']) {
  test('aide au réglage : aucune violation WCAG 2.1 AA, thème ' + (theme === 'light' ? 'clair' : 'sombre'), async () => {
    const page = await ouvrir({ etat: sixiemeNombreuse(), theme });
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate((o) => axe.run(document, o), WCAG);
    assert.deepEqual(
      r.violations.map((v) => v.id + ' (' + v.nodes.length + ')'),
      [],
    );
  });
}

test('aide au réglage sur téléphone : pas de défilement horizontal', async () => {
  const page = await ouvrir({ etat: sixiemeNombreuse(), largeur: 390, hauteur: 800 });
  assert.equal(await page.locator('.msg.reglages').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
});
