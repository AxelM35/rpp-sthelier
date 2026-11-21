// Version 2, lot 4 : élèves prioritaires du professeur principal (saisie dans l'onglet Données).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { fermer, lireEtat, onglet, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

/** 6e de test, professeur principal désigné en 6A. */
function sixieme() {
  const etat = college();
  etat.classes[0].ppId = 'p0';
  return etat;
}

async function ouvrirDonnees(options = {}) {
  const page = await ouvrir({ etat: sixieme(), ...options });
  await onglet(page, 'donnees');
  return page;
}

const caseDe = (id) => '[data-champ=prioritaireEleve][data-id="' + id + '"]';

test('case « Prioritaire » : compteur de la classe, refus au-delà de 5 avec un message', async () => {
  const page = await ouvrirDonnees();
  const sixA = (await lireEtat(page)).eleves.filter((e) => e.classeId === 'c6A');
  for (const e of sixA.slice(0, 5)) await page.check(caseDe(e.id));
  assert.equal((await lireEtat(page)).eleves.filter((e) => e.prioritaire).length, 5);
  assert.match(await page.textContent('.classes'), /★ 5 \/ 5 prioritaires/);

  await page.click(caseDe(sixA[5].id));
  await page.waitForFunction((sel) => !document.querySelector(sel).checked, caseDe(sixA[5].id)); // après le nouveau rendu
  assert.equal(await page.isChecked(caseDe(sixA[5].id)), false, 'sixième case refusée');
  assert.equal((await lireEtat(page)).eleves.filter((e) => e.prioritaire).length, 5);
  assert.match(await page.textContent('#toast'), /6A compte déjà 5 élèves prioritaires, le maximum/);

  // Une autre classe a sa propre limite.
  const sixB = (await lireEtat(page)).eleves.find((e) => e.classeId === 'c6B');
  await page.check(caseDe(sixB.id));
  assert.equal((await lireEtat(page)).eleves.find((e) => e.id === sixB.id).prioritaire, true);

  await page.uncheck(caseDe(sixA[0].id));
  await page.check(caseDe(sixA[5].id));
  assert.equal(await page.isChecked(caseDe(sixA[5].id)), true, 'une place libérée');
  assert.deepEqual(page.erreurs, []);
});

test('classe sans professeur principal : case permise, point à corriger', async () => {
  const page = await ouvrirDonnees();
  const e = (await lireEtat(page)).eleves.find((x) => x.classeId === 'c6B');
  await page.check(caseDe(e.id));
  await page.locator('#main .diag li', { hasText: '6B : 1 élève(s) prioritaire(s), mais aucun professeur principal désigné' }).waitFor();
  assert.deepEqual(page.erreurs, []);
});

test('un enseignant ne peut être professeur principal que d’une classe', async () => {
  const page = await ouvrirDonnees();
  await page.selectOption('[data-champ=ppClasse][data-id=c6B]', 'p0');
  await page.waitForFunction(() => document.querySelector('[data-champ=ppClasse][data-id=c6B]').value === ''); // nouveau rendu
  const etat = await lireEtat(page);
  assert.equal(etat.classes.find((c) => c.id === 'c6B').ppId, null, 'refusé');
  assert.equal(await page.inputValue('[data-champ=ppClasse][data-id=c6B]'), '');
  assert.match(await page.textContent('#toast'), /est déjà professeur principal de 6A/);
  assert.deepEqual(page.erreurs, []);
});

for (const theme of ['light', 'dark']) {
  test('élèves prioritaires : aucune violation WCAG 2.1 AA, thème ' + (theme === 'light' ? 'clair' : 'sombre'), async () => {
    const etat = sixieme();
    etat.eleves.filter((e) => e.classeId === 'c6A').forEach((e, i) => (e.prioritaire = i < 6));
    const page = await ouvrir({ etat, theme });
    await onglet(page, 'donnees');
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate((o) => axe.run(document, o), WCAG);
    assert.deepEqual(
      r.violations.map((v) => v.id + ' (' + v.nodes.length + ')'),
      [],
    );
  });
}
