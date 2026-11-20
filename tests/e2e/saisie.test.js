// Version 2, lot 3, étape 3c : saisie des langues et options, du professeur principal, des enseignements
// et des LVB, options et ULIS des élèves (onglet Données).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college4e } from '../fixtures/college4e.js';
import { fermer, lireEtat, onglet, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const etat = (page) => lireEtat(page, '4e');
const prof = async (page, id) => (await etat(page)).profs.find((p) => p.id === id);

async function ouvrirDonnees() {
  const page = await ouvrir({ etat: college4e(), niveau: '4e' });
  await onglet(page, 'donnees');
  return page;
}

test('langues et options : ajouter, renommer, attribuer à un élève, supprimer après confirmation', async () => {
  const page = await ouvrirDonnees();
  await page.click('[data-action=ajouterLvb]');
  assert.equal(await page.evaluate(() => document.activeElement.value), 'Nouvelle LVB', 'focus sur le nom de la nouvelle LVB');
  await page.fill('#langues-options input[value="Nouvelle LVB"]', 'Italien');
  await page.keyboard.press('Tab');
  const italien = (await etat(page)).lvb.find((x) => x.nom === 'Italien');
  assert.ok(italien);

  const eleve = (await etat(page)).eleves[0];
  await page.selectOption('[data-champ=lvbEleve][data-id="' + eleve.id + '"]', italien.id);
  assert.equal((await etat(page)).eleves[0].lvbId, italien.id);
  assert.ok(
    await page
      .locator('#langues-options .ligne-liste', { has: page.locator('input[value="Italien"]') })
      .locator('.badge', { hasText: '1 él.' })
      .count(),
  );

  page.refuserConfirmations = true;
  await page.click('[data-action=supprimerLvb][data-id="' + italien.id + '"]');
  assert.match(page.confirmations.at(-1), /1 élève\(s\) la suivent/);
  assert.ok(
    (await etat(page)).lvb.some((x) => x.id === italien.id),
    'refus : rien n’est supprimé',
  );
  page.refuserConfirmations = false;
  await page.click('[data-action=supprimerLvb][data-id="' + italien.id + '"]');
  const apres = await etat(page);
  assert.ok(!apres.lvb.some((x) => x.id === italien.id));
  assert.equal(apres.eleves[0].lvbId, null, 'l’élève perd la LVB supprimée');
  assert.deepEqual(page.erreurs, []);
});

test('professeur principal de chaque classe', async () => {
  const page = await ouvrirDonnees();
  await page.selectOption('[data-champ=ppClasse][data-id=c4B]', 'pLa');
  assert.equal((await etat(page)).classes.find((c) => c.id === 'c4B').ppId, 'pLa');
  await page.selectOption('[data-champ=ppClasse][data-id=c4B]', '');
  assert.equal((await etat(page)).classes.find((c) => c.id === 'c4B').ppId, null);
});

test('enseignements : ajouter une classe, préciser le type, retirer ; clavier et focus', async () => {
  const page = await ouvrirDonnees();
  // Ajout direct : toute la classe.
  await page.click('[data-action=basculerClasseProf][data-id=pLa][data-param=c4A]');
  assert.deepEqual((await prof(page, 'pLa')).enseignements.at(-1), { classeId: 'c4A', type: 'classe', refId: null, sansUlis: false });

  // Précision : option Latin, au clavier.
  await page.focus('[data-action=choisirEnseignement][data-id=pLa][data-param=c4A]');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#dlg[open]').count());
  assert.equal(await page.evaluate(() => document.activeElement.value), 'classe', 'focus sur le choix actuel');
  await page.check('#dlg input[value="option:opt-latin"]');
  await page.click('[data-action=validerEnseignement]');
  const latin = (await prof(page, 'pLa')).enseignements.find((x) => x.classeId === 'c4A');
  assert.deepEqual(latin, { classeId: 'c4A', type: 'option', refId: 'opt-latin', sansUlis: false });
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '4A · Latin', 'le focus revient sur la puce');

  // Échap : rien ne change.
  await page.keyboard.press('Enter');
  await page.check('#dlg input[value="classe"]');
  await page.keyboard.press('Escape');
  assert.equal((await prof(page, 'pLa')).enseignements.find((x) => x.classeId === 'c4A').type, 'option');

  // LVB sans les élèves ULIS.
  await page.click('[data-action=choisirEnseignement][data-id=pEs2][data-param=c4E]');
  await page.check('#dlg input[value="lvb:lvb-espagnol"]');
  await page.check('#ensSansUlis');
  await page.click('[data-action=validerEnseignement]');
  assert.equal((await prof(page, 'pEs2')).enseignements.find((x) => x.classeId === 'c4E').sansUlis, true);
  assert.equal(await page.textContent('[data-action=choisirEnseignement][data-id=pEs2][data-param=c4E]'), '4E · Espagnol sans ULIS');

  // Retirer la classe.
  await page.click('[data-action=choisirEnseignement][data-id=pLa][data-param=c4A]');
  await page.check('#dlg input[value="aucun"]');
  await page.click('[data-action=validerEnseignement]');
  assert.ok(!(await prof(page, 'pLa')).enseignements.some((x) => x.classeId === 'c4A'));
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '4A');
  assert.deepEqual(page.erreurs, []);
});

test('élève : options et ULIS', async () => {
  const page = await ouvrirDonnees();
  const e = (await etat(page)).eleves.find((x) => x.classeId === 'c4B' && !x.optionIds.length);
  await page.click('[data-action=basculerOptionEleve][data-id="' + e.id + '"][data-param=opt-latin]');
  await page.check('[data-champ=ulisEleve][data-id="' + e.id + '"]');
  const apres = (await etat(page)).eleves.find((x) => x.id === e.id);
  assert.deepEqual([apres.optionIds, apres.ulis], [['opt-latin'], true]);
  await page.click('[data-action=basculerOptionEleve][data-id="' + e.id + '"][data-param=opt-latin]');
  assert.deepEqual((await etat(page)).eleves.find((x) => x.id === e.id).optionIds, []);
});

for (const theme of ['light', 'dark']) {
  test('onglet Données et dialogue d’enseignement : WCAG 2.1 AA, thème ' + (theme === 'light' ? 'clair' : 'sombre'), async () => {
    const page = await ouvrir({ etat: college4e(), niveau: '4e', theme });
    await onglet(page, 'donnees');
    await page.addScriptTag({ content: AXE });
    const regles = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };
    const avant = await page.evaluate((o) => axe.run(document, o), regles);
    await page.click('[data-action=choisirEnseignement][data-id=pH1][data-param=c4A]');
    const dialogue = await page.evaluate((o) => axe.run(document, o), regles);
    const violations = [...avant.violations, ...dialogue.violations].map((v) => v.id + ' (' + v.nodes.length + ')');
    assert.deepEqual(violations, []);
  });
}
