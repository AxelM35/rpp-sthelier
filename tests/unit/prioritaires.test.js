// Élèves prioritaires du professeur principal (lot 4) : données, imports, contrôles.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aCorriger, controler } from '../../src/algos/controles.js';
import { PRIORITAIRES_MAX, VERSION_DONNEES } from '../../src/config.js';
import { detecterColonnes, importerLignes } from '../../src/io/import.js';
import { analyserEleves, analyserProfs, importerEleves, importerProfs } from '../../src/io/pronote.js';
import { classeDuPP, prioritairesDe } from '../../src/modele/acces.js';
import { etatVide, migrer, valider } from '../../src/modele/etat.js';
import { college } from '../fixtures/college.js';
import { exportEleves4e, exportEnseignants } from '../fixtures/pronote.js';

/** 6e de test avec un professeur principal en 6A et les élèves prioritaires demandés (indices dans la 6A). */
function sixieme(indices = [0, 1, 2]) {
  const etat = college();
  etat.classes[0].ppId = 'p0';
  const sixA = etat.eleves.filter((e) => e.classeId === 'c6A');
  indices.forEach((i) => (sixA[i].prioritaire = true));
  return etat;
}

const textes = (etat) => controler(etat).map((p) => p.texte);

// ---------- Format des données ----------

test('format version 4 : indication « prioritaire » validée, fausse par défaut', () => {
  assert.equal(VERSION_DONNEES, 4);
  assert.equal(PRIORITAIRES_MAX, 5);
  const etat = sixieme();
  assert.deepEqual(valider(JSON.parse(JSON.stringify(etat))), etat, 'rechargée à l’identique');

  const brut = JSON.parse(JSON.stringify(etat));
  brut.eleves[0].prioritaire = 'oui';
  delete brut.eleves[1].prioritaire;
  const v = valider(brut);
  assert.deepEqual([v.eleves[0].prioritaire, v.eleves[1].prioritaire, v.eleves[2].prioritaire], [false, false, true]);
});

test('migration 3 → 4 : aucun élève prioritaire', () => {
  const v3 = { ...JSON.parse(JSON.stringify(college())), v: 3 };
  v3.eleves.forEach((e) => delete e.prioritaire);
  assert.equal(migrer(structuredClone(v3)).v, 4);
  assert.ok(valider(v3).eleves.every((e) => e.prioritaire === false));
});

test('un enseignant est professeur principal d’une seule classe : la première est gardée à la validation', () => {
  const etat = college();
  etat.classes[0].ppId = 'p0';
  etat.classes[2].ppId = 'p0';
  etat.classes[1].ppId = 'p1';
  const v = valider(etat);
  assert.deepEqual(
    v.classes.map((c) => c.ppId),
    ['p0', 'p1', null, null],
  );
  assert.equal(classeDuPP(v, 'p0').nom, '6A');
  assert.equal(classeDuPP(v, 'p5'), null);
});

// ---------- Imports ----------

test('import générique : un élève réimporté garde son indication « prioritaire »', () => {
  const etat = sixieme([0]);
  const marc = etat.eleves.find((e) => e.prioritaire);
  const lignes = [
    ['Nom', 'Prénom', 'Classe'],
    [marc.nom.toUpperCase(), marc.prenom, '6A'],
    ['Nouveau', 'Élève', '6A'],
  ];
  const options = { type: 'eleves', lignes, ...detecterColonnes('eleves', lignes) };
  const r = importerLignes(etat, { ...options, remplacer: true });
  assert.deepEqual(
    r.etat.eleves.map((e) => [e.nom, e.prioritaire]),
    [
      [marc.nom.toUpperCase(), true],
      ['Nouveau', false],
    ],
  );
  const sansRemplacer = importerLignes(etat, options);
  assert.equal(prioritairesDe(sansRemplacer.etat, 'c6A').length, 1, 'élève déjà présent : inchangé');
  assert.equal(sansRemplacer.etat.eleves.at(-1).prioritaire, false);
});

test('import Pronote des élèves : un élève réimporté garde son indication « prioritaire »', () => {
  let etat = importerProfs(etatVide('4e'), analyserProfs(exportEnseignants(), etatVide('4e'), '4e')).etat;
  etat = importerEleves(etat, analyserEleves(exportEleves4e(), etat, '4e')).etat;
  assert.ok(etat.eleves.every((e) => e.prioritaire === false));
  const choisi = etat.eleves[3];
  choisi.prioritaire = true;
  const apres = importerEleves(etat, analyserEleves(exportEleves4e(), etat, '4e'), { remplacer: true }).etat;
  assert.deepEqual(
    apres.eleves.filter((e) => e.prioritaire).map((e) => [e.nom, e.prenom, e.classeId]),
    [[choisi.nom, choisi.prenom, choisi.classeId]],
  );
});

test('import Pronote des enseignants : un professeur principal ne garde que la classe de l’export', () => {
  const vide = etatVide('4e');
  const etat = importerProfs(vide, analyserProfs(exportEnseignants(), vide, '4e')).etat;
  const classe = etat.classes.find((c) => c.ppId);
  const autre = etat.classes.find((c) => c !== classe);
  const pp = classe.ppId;
  autre.ppId = pp;
  const apres = importerProfs(etat, analyserProfs(exportEnseignants(), etat, '4e')).etat;
  assert.equal(apres.classes.find((c) => c.id === classe.id).ppId, pp);
  assert.notEqual(apres.classes.find((c) => c.id === autre.id).ppId, pp);
  assert.equal(apres.classes.filter((c) => c.ppId === pp).length, 1);
});

// ---------- Contrôles des données ----------

test('contrôle : élèves prioritaires dans une classe sans professeur principal', () => {
  const etat = sixieme([0, 1]);
  assert.ok(!textes(etat).some((t) => /aucun professeur principal/.test(t)));
  etat.classes[0].ppId = null;
  const point = controler(etat).find((p) => /aucun professeur principal/.test(p.texte));
  assert.equal(point.texte.slice(0, 40), '6A : 2 élève(s) prioritaire(s), mais auc');
  assert.equal(point.onglet, 'donnees');
  assert.ok(aCorriger([point]).length, 'point à corriger');
});

test('contrôle : plus de 5 élèves prioritaires dans une classe (élève changé de classe)', () => {
  const etat = sixieme([0, 1, 2, 3, 4]);
  assert.ok(!textes(etat).some((t) => /au plus/.test(t)));
  const venu = etat.eleves.find((e) => e.classeId === 'c6B');
  venu.prioritaire = true;
  venu.classeId = 'c6A';
  const point = controler(etat).find((p) => /élèves prioritaires, 5 au plus/.test(p.texte));
  assert.match(point.texte, /^6A : 6 élèves prioritaires, 5 au plus\. Décochez-en 1 dans la liste des élèves/);
  assert.ok(aCorriger([point]).length);
});
