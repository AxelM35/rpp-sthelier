// Version 2, lot 4 : élèves prioritaires du professeur principal (saisie dans l'onglet Données).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { college } from '../fixtures/college.js';
import { college4e } from '../fixtures/college4e.js';
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

/** 4e de test avec des élèves prioritaires ; la professeure principale de 4A n'est présente que sur 3 créneaux. */
function quatriemePrioritaires() {
  const etat = college4e();
  etat.classes.forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .filter((e, i) => i % 5 === 0)
      .slice(0, 5)
      .forEach((e) => (e.prioritaire = true)),
  );
  etat.profs.find((p) => p.id === etat.classes[0].ppId).dispoA = '17:45';
  return etat;
}

for (const theme of ['light', 'dark']) {
  test(
    'génération avec élèves prioritaires : repli signalé, comparaison, WCAG 2.1 AA, thème ' + (theme === 'light' ? 'clair' : 'sombre'),
    async () => {
      const page = await ouvrir({ etat: quatriemePrioritaires(), niveau: '4e', theme });
      await onglet(page, 'binomes');
      await page.click('[data-action=toutGenerer]');
      const etat = await lireEtat(page, '4e');
      const pp = (e) => etat.classes.find((c) => c.id === e.classeId).ppId;
      const prio = etat.eleves.filter((e) => e.prioritaire);
      assert.ok(
        prio.every((e) => e.binomeId && e.slot != null),
        'tous les élèves prioritaires ont un rendez-vous',
      );
      const horsPP = prio.filter((e) => !etat.binomes.find((b) => b.id === e.binomeId).profIds.includes(pp(e)));
      assert.ok(horsPP.length > 0 && horsPP.every((e) => e.classeId === 'c4A'));
      assert.match(await page.textContent('#main > .msg'), /élève\(s\) prioritaire\(s\) reçu\(s\) par un autre binôme/);
      assert.match(await page.textContent('#main'), /n’est présent que sur 3 créneau\(x\) pour les 5 élève\(s\) prioritaire\(s\) de 4A/);
      assert.match(await page.textContent('#main'), /★ Prioritaires/);

      await page.click('[data-action=comparerPropositions]');
      assert.match(await page.textContent('.proposition'), /élève\(s\) prioritaire\(s\) reçu\(s\) sans leur professeur principal/);
      await page.addScriptTag({ content: AXE });
      const r = await page.evaluate((o) => axe.run(document, o), WCAG);
      assert.deepEqual(
        r.violations.map((v) => v.id + ' (' + v.nodes.length + ')'),
        [],
      );
      await onglet(page, 'repartition');
      assert.match(await page.textContent('#main'), /prioritaire\(s\) reçu\(s\) par un binôme sans leur professeur principal/);
      assert.deepEqual(page.erreurs, []);
    },
  );
}

test('signalement : étoile sur les vignettes, alerte si reçu sans son professeur principal (V2-F6 bis)', async () => {
  const page = await ouvrir({ etat: quatriemePrioritaires(), niveau: '4e' });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  const etat = await lireEtat(page, '4e');
  const pp = (e) => etat.classes.find((c) => c.id === e.classeId).ppId;
  const avec = etat.eleves.find((e) => e.prioritaire && etat.binomes.find((b) => b.id === e.binomeId).profIds.includes(pp(e)));
  const sans = etat.eleves.find((e) => e.prioritaire && !etat.binomes.find((b) => b.id === e.binomeId).profIds.includes(pp(e)));
  for (const id of ['repartition', 'planning']) {
    await onglet(page, id);
    const v = page.locator('[data-eleve="' + avec.id + '"]');
    assert.equal(await v.locator('.prio').textContent(), '★ ', id);
    assert.match(await v.locator('.el-btn').getAttribute('aria-label'), /, prioritaire/);
    assert.doesNotMatch(await v.getAttribute('class'), /\bpb\b/);
    const w = page.locator('[data-eleve="' + sans.id + '"]');
    assert.match(await w.getAttribute('class'), /\bpb\b/, id + ' : alerte');
    assert.match(await w.locator('.el-btn').getAttribute('aria-label'), /attention : élève prioritaire reçu sans son professeur principal/);
  }
  const autre = etat.eleves.find((e) => !e.prioritaire);
  assert.equal(await page.locator('[data-eleve="' + autre.id + '"] .prio').count(), 0);
  assert.deepEqual(page.erreurs, []);
});

test('documents : planning par binôme avec les élèves prioritaires ; LVB et options du planning par classe (V2-F10)', async () => {
  const page = await ouvrir({ etat: quatriemePrioritaires(), niveau: '4e' });
  await onglet(page, 'binomes');
  await page.click('[data-action=toutGenerer]');
  await onglet(page, 'documents');
  await page.click('[data-action=choisirDocument][data-id=binomes]');
  assert.match(await page.textContent('.papier'), /★ Élève prioritaire : rendez-vous demandé par le professeur principal/);
  assert.equal(await page.locator('[data-champ=lvbOptions]').count(), 0, 'case réservée au planning par classe');

  await page.click('[data-action=choisirDocument][data-id=classes]');
  assert.doesNotMatch(await page.textContent('.papier'), /★|LVB et options/);
  await page.check('[data-champ=lvbOptions]');
  await page.locator('.papier th', { hasText: 'LVB et options' }).first().waitFor();
  assert.equal((await lireEtat(page, '4e')).opt.lvbOptions, true, 'choix mémorisé pour le niveau');
  assert.match(await page.textContent('.papier'), /Espagnol · Latin/);
  assert.doesNotMatch(await page.textContent('.papier'), /ULIS/);

  await onglet(page, 'planning');
  await page.click('[data-action=vuePlanning][data-id=classe]');
  assert.equal(await page.isChecked('[data-champ=lvbOptions]'), true);
  assert.equal(await page.locator('.doc th', { hasText: 'LVB et options' }).count(), 5);
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate((o) => axe.run(document, o), WCAG);
  assert.deepEqual(
    r.violations.map((v) => v.id + ' (' + v.nodes.length + ')'),
    [],
  );
  assert.deepEqual(page.erreurs, []);
});
