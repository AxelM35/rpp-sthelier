// Version 2, lot 3, étape 3d : import des exports Pronote dans l'application (dialogue d'import, confirmation).

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { creerClasseur } from '../../src/io/xlsx.js';
import { exportEleves4e, exportEnseignants } from '../fixtures/pronote.js';
import { fermer, lireEtat, message, onglet, ouvrir } from './navigateur.js';

after(fermer);
const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

const dossier = await mkdtemp(join(tmpdir(), 'rpp-pronote-'));
async function classeur(nom, lignes) {
  const chemin = join(dossier, nom);
  await writeFile(chemin, creerClasseur([{ nom: 'Feuil1', lignes, largeurs: lignes[0].map(() => 20) }]));
  return chemin;
}
const PROFS = await classeur('export_pronote_prof.xlsx', exportEnseignants());
const ELEVES = await classeur('export_pronote_eleves_4e.xlsx', exportEleves4e());

async function importer(page, type, fichier) {
  await onglet(page, 'donnees');
  await page.click('[data-action=ouvrirImport][data-id=' + type + ']');
  await page.setInputFiles('#dlg [data-champ=fichierImport]', fichier);
  await page.waitForSelector('#dlg .import-pronote');
}

for (const theme of ['light', 'dark']) {
  test(
    'import Pronote complet, thème ' + (theme === 'light' ? 'clair' : 'sombre') + ' : enseignants, élèves, génération, WCAG',
    async () => {
      const page = await ouvrir({ niveau: '4e', theme });
      await page.addScriptTag({ content: AXE });
      const violations = [];
      const verifier = async (ou) =>
        (await page.evaluate((o) => axe.run(document, o), WCAG)).violations.forEach((v) => violations.push(ou + ' : ' + v.id));

      // Enseignants : écran de confirmation.
      await importer(page, 'profs', PROFS);
      const ecran = await page.textContent('#dlg');
      assert.match(ecran, /Importer les enseignants depuis Pronote/);
      assert.match(ecran, /Classes de la 4e : 4 A, 4 B, 4 C \(1 classe\(s\) d’autres niveaux ignorée\(s\)\)/);
      assert.match(ecran, /Enseignants \(24\)/);
      assert.match(ecran, /Mme GUERIN Ada : « Suivi Inclusion », écarté\(e\) des binômes/);
      assert.match(ecran, /4 A, histoire-géographie : M\. HAMEL Yann \(2 élèves\)/);
      assert.match(ecran, /4 A : Mme FOURNIER Anne ; 4 B : Mme MEUNIER Clara ; 4 C : Mme ESPINASSE Ines/);
      await verifier('enseignants');
      // Matière inconnue classée « ignorée » : l'écran est recalculé, le focus reste sur le menu.
      await page.focus('[data-champ=choixPronote][data-param="classement|0"]');
      await page.selectOption('[data-champ=choixPronote][data-param="classement|0"]', 'ignoree');
      assert.match(await page.textContent('#dlg'), /Enseignants \(23\)/);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.param), 'classement|0');
      await page.click('#dlg [data-action=validerImport]');
      assert.match(await message(page), /^23 professeur\(s\) importé\(s\) depuis Pronote/);
      let etat = await lireEtat(page, '4e');
      assert.equal(etat.profs.length, 23);
      assert.ok(etat.options.some((o) => o.nom === 'Latin'));
      assert.equal(etat.classes.find((c) => c.nom === '4 A').ppId, etat.profs.find((p) => p.nom === 'Mme FOURNIER Anne').id);

      // Élèves : écran de confirmation.
      await importer(page, 'eleves', ELEVES);
      const ecranEleves = await page.textContent('#dlg');
      assert.match(ecranEleves, /75 élèves de la 4e \(4 A, 4 B, 4 C\) ; 1 élève\(s\) d’autres niveaux ignoré\(s\)/);
      assert.match(
        ecranEleves,
        /Colonnes non lues, rien n’en est enregistré : Né\(e\) le, Sexe, Projet d'accompagnement, Allergies, Majeur, Groupes/,
      );
      assert.match(ecranEleves, /4 A : M\. ESTEVE Hugo \(Espagnol\) n’a pas en cours les 2 élève\(s\) ULIS/);
      assert.match(ecranEleves, /Ajouter « Chinois » aux LVB du niveau/);
      await verifier('élèves');
      await page.uncheck('[data-champ=choixPronote][data-param="ajout|0"]');
      await page.click('#dlg [data-action=validerImport]');
      assert.match(await message(page), /^75 élève\(s\) importé\(s\) depuis Pronote/);
      etat = await lireEtat(page, '4e');
      assert.equal(etat.eleves.length, 75);
      assert.ok(!etat.lvb.some((x) => x.nom === 'Chinois'), 'valeur inconnue non ajoutée');
      assert.ok(!JSON.stringify(etat).includes('01/01/2012'), 'aucune date de naissance enregistrée');

      // Génération complète.
      await onglet(page, 'binomes');
      await page.click('[data-action=toutGenerer]');
      assert.match(await message(page), /Chaque élève peut obtenir un rendez-vous/);
      assert.deepEqual(violations, []);
      assert.deepEqual(page.erreurs, []);
    },
  );
}

test('import Pronote : le fichier décide du type (enseignants ouverts depuis « Importer » des élèves)', async () => {
  const page = await ouvrir({ niveau: '4e' });
  await importer(page, 'eleves', PROFS);
  assert.match(await page.textContent('#dlg h2'), /Importer les enseignants depuis Pronote/);
  assert.match(await page.textContent('#dlg'), /Ressources|Enseignants \(24\)/);
  await page.click('#dlg [data-action=fermerImport]');
  assert.equal(await page.locator('#dlg[open]').count(), 0);

  // Aide : les menus de Pronote sont indiqués avant le choix du fichier.
  await page.click('[data-action=ouvrirImport][data-id=eleves]');
  assert.match(await page.textContent('#dlg'), /Ressources → Élèves → Liste.*Élèves de 4ème/);
});
