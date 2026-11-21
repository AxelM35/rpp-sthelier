// Élèves prioritaires du professeur principal (lot 4) : données, imports, contrôles.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { proposerVariantes } from '../../src/algos/binomes.js';
import { aCorriger, controler } from '../../src/algos/controles.js';
import { genererTout } from '../../src/algos/generation.js';
import { couverture, grouperEleves, recevable } from '../../src/algos/groupes.js';
import { PRIORITAIRES_MAX, VERSION_DONNEES } from '../../src/config.js';
import { detecterColonnes, importerLignes } from '../../src/io/import.js';
import { analyserEleves, analyserProfs, importerEleves, importerProfs } from '../../src/io/pronote.js';
import { classeDuPP, prioritairesDe } from '../../src/modele/acces.js';
import { etatVide, migrer, valider } from '../../src/modele/etat.js';
import { college } from '../fixtures/college.js';
import { college4e } from '../fixtures/college4e.js';
import { exportEleves4e, exportEnseignants } from '../fixtures/pronote.js';
import { verifierPlanning } from './invariants.js';

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

// ---------- Calcul (V2-R11, V2-F6, décision 3) ----------

/** Professeurs du binôme d'un élève (ids). */
const profsDe = (etat, e) => (etat.binomes.find((b) => b.id === e.binomeId) || { profIds: [] }).profIds;
const prioritaires = (etat) => etat.eleves.filter((e) => e.prioritaire);
const avecSonPP = (etat, e) => profsDe(etat, e).includes(etat.classes.find((c) => c.id === e.classeId).ppId);

test('les élèves prioritaires forment un groupe à part, que seul un binôme avec le professeur principal reçoit', () => {
  const etat = sixieme([0, 1]);
  const groupes = grouperEleves(etat).filter((g) => g.classeId === 'c6A');
  const prio = groupes.find((g) => g.pp);
  const autres = groupes.find((g) => !g.pp);
  assert.deepEqual([groupes.length, prio.eleves.length, prio.pp, autres.eleves.length], [2, 2, 'p0', 25]);
  assert.equal(recevable(prio, ['p0', 'p3'], ['c6A']), true);
  assert.equal(recevable(prio, ['p3', 'p5'], ['c6A']), false);
  assert.equal(recevable(autres, ['p3', 'p5'], ['c6A']), true);

  etat.classes[0].ppId = null;
  assert.equal(grouperEleves(etat).filter((g) => g.classeId === 'c6A').length, 1, 'sans professeur principal : groupe ordinaire');
});

test('génération : chaque élève prioritaire est reçu par le binôme de son professeur principal, dans les deux modes', () => {
  for (const mode of ['tous', 'min']) {
    const etat = sixieme([0, 1, 2, 3, 4]);
    etat.classes[1].ppId = 'p5';
    etat.eleves.filter((e) => e.classeId === 'c6B').forEach((e, i) => (e.prioritaire = i < 3));
    etat.opt.mode = mode;
    const r = genererTout(etat);
    assert.ok(r.rapport.ok, r.rapport.txt);
    verifierPlanning(r.etat);
    assert.equal(prioritaires(r.etat).length, 8);
    assert.ok(
      prioritaires(r.etat).every((e) => avecSonPP(r.etat, e)),
      mode,
    );
    // Le professeur principal garde un seul binôme (H1) et reçoit aussi d'autres élèves de sa classe.
    const b = r.etat.binomes.find((x) => x.profIds.includes('p0'));
    assert.ok(r.etat.eleves.some((e) => e.binomeId === b.id && !e.prioritaire));
  }
});

test('proposition : un professeur principal qui a des élèves prioritaires est toujours placé dans un binôme', () => {
  const base = college({ effectifs: [20, 20, 20, 20] }); // 7 binômes suffisent : 6 professeurs restent libres
  base.opt.mode = 'min';
  const sansPrio = genererTout(base).etat;
  const pris = new Set(sansPrio.binomes.flatMap((b) => b.profIds));
  const libre = base.profs.find((p) => !pris.has(p.id) && p.enseignements.some((x) => x.classeId === 'c6C'));
  assert.ok(libre, 'un professeur reste sans binôme en mode « min »');

  base.classes[2].ppId = libre.id;
  base.eleves.find((e) => e.classeId === 'c6C').prioritaire = true;
  const r = genererTout(base);
  assert.ok(r.rapport.ok, r.rapport.txt);
  assert.ok(r.etat.binomes.some((b) => b.profIds.includes(libre.id)));
  assert.ok(prioritaires(r.etat).every((e) => avecSonPP(r.etat, e)));
  verifierPlanning(r.etat);
});

test('repli : professeur principal présent sur 3 créneaux pour 5 élèves prioritaires', () => {
  const etat = college({ effectifs: [24, 24, 24, 24] });
  etat.classes[0].ppId = 'p0';
  etat.eleves.filter((e) => e.classeId === 'c6A').forEach((e, i) => (e.prioritaire = i < 5));
  etat.profs[0].dispoA = '17:45'; // 3 créneaux de 15 minutes
  const r = genererTout(etat);
  verifierPlanning(r.etat);
  const prio = prioritaires(r.etat);
  assert.equal(prio.filter((e) => avecSonPP(r.etat, e)).length, 3, 'autant que le binôme du professeur principal en peut');
  assert.ok(
    prio.every((e) => e.binomeId),
    'aucune famille privée de rendez-vous',
  );
  // Les deux autres, derniers par ordre alphabétique, sont reçus par un autre binôme de leur équipe.
  assert.match(r.rapport.txt, /2 élève\(s\) prioritaire\(s\) reçu\(s\) par un autre binôme que celui de leur professeur principal/);
  const texte = textes(r.etat).find((t) => /sans leur professeur principal/.test(t));
  assert.match(texte, /^2 élève\(s\) prioritaire\(s\) reçu\(s\) par un binôme sans leur professeur principal/);
});

test('repli : binôme du professeur principal conservé à la main et déjà plein de rendez-vous verrouillés', () => {
  const etat = sixieme([0, 1]);
  etat.binomes = [{ id: 'bx', fixe: true, profIds: ['p0', 'p3'], classeIds: ['c6A'], salle: '' }];
  etat.eleves
    .filter((e) => e.classeId === 'c6A' && !e.prioritaire && !e.pasAvant && !e.pasApres)
    .slice(0, 12)
    .forEach((e, i) => Object.assign(e, { binomeId: 'bx', slot: i, verrou: true }));
  const r = genererTout(etat);
  verifierPlanning(r.etat);
  assert.ok(prioritaires(r.etat).every((e) => e.binomeId && !avecSonPP(r.etat, e)));
});

test('variantes : toutes respectent les élèves prioritaires', () => {
  const etat = sixieme([0, 1, 2]);
  const { variantes } = proposerVariantes(etat, { essais: 150 });
  assert.ok(variantes.length > 1);
  for (const v of variantes) assert.ok(v.etat.binomes.some((b) => b.profIds.includes('p0')));
});

test('couverture : élèves prioritaires comptés avec leur groupe, sans place quand nul ne peut les recevoir', () => {
  const etat = sixieme([0, 1]);
  etat.binomes = [{ id: 'bx', fixe: true, profIds: ['p3', 'p5'], classeIds: ['c6A'], salle: '' }];
  const sixA = couverture(etat).find((c) => c.classe.id === 'c6A');
  assert.deepEqual([sixA.eleves, sixA.manque], [27, 15], '27 élèves pour 12 créneaux, prioritaires repliés chez ce binôme');
  assert.deepEqual(sixA.groupes.map((g) => [g.libelle, g.eleves, g.binomes]).sort(), [
    ['Sans LVB ni option', 25, 1],
    ['★ Prioritaires · Sans LVB ni option', 2, 0],
  ]);
});

// ---------- Contrôles du planning (section 6.3) ----------

test('contrôle : professeur principal sans binôme', () => {
  const etat = sixieme([0]);
  etat.binomes = [{ id: 'bx', fixe: true, profIds: ['p3', 'p5'], classeIds: ['c6A'], salle: '' }];
  const p0 = etat.profs.find((p) => p.id === 'p0');
  const point = controler(etat).find((p) => /n’a pas de binôme/.test(p.texte));
  assert.equal(point.texte, p0.nom + ', professeur principal de 6A, n’a pas de binôme pour recevoir ses 1 élève(s) prioritaire(s) de 6A.');
  assert.equal(point.onglet, 'binomes');
  etat.binomes.push({ id: 'by', fixe: true, profIds: ['p0', 'p7'], classeIds: ['c6A'], salle: '' });
  assert.ok(!textes(etat).some((t) => /n’a pas de binôme/.test(t)));
});

test('contrôle : professeur principal présent sur trop peu de créneaux pour ses élèves prioritaires', () => {
  const etat = sixieme([0, 1, 2, 3]);
  const p0 = etat.profs.find((p) => p.id === 'p0');
  p0.dispoA = '17:30'; // 2 créneaux
  assert.match(
    controler(etat).find((p) => /créneau/.test(p.texte) && /prioritaire/.test(p.texte)).texte,
    new RegExp('^' + p0.nom + ' n’est présent que sur 2 créneau\\(x\\) pour les 4 élève\\(s\\) prioritaire\\(s\\) de 6A'),
  );
  etat.binomes = [{ id: 'by', fixe: true, profIds: ['p0', 'p7'], classeIds: ['c6A'], salle: '' }];
  const avecBinome = controler(etat).find((p) => /n’est présent que sur/.test(p.texte));
  assert.match(avecBinome.texte, /^Le binôme .+ n’est présent que sur 2 créneau\(x\) pour les 4 élève\(s\)/);
  assert.equal(avecBinome.onglet, 'binomes');
  p0.dispoA = '';
  assert.ok(!textes(etat).some((t) => /n’est présent que sur/.test(t)));
});

test('4e (LVB, options, ULIS, professeure principale de LVB) : élèves prioritaires reçus par leur professeur principal', () => {
  const etat = college4e();
  etat.classes.forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .filter((e, i) => i % 5 === 0)
      .slice(0, PRIORITAIRES_MAX)
      .forEach((e) => (e.prioritaire = true)),
  );
  const r = genererTout(etat);
  assert.ok(r.rapport.ok, r.rapport.txt);
  verifierPlanning(r.etat);
  assert.equal(prioritaires(r.etat).length, 25);
  assert.ok(prioritaires(r.etat).every((e) => avecSonPP(r.etat, e)));
});

test('capacité insuffisante : les élèves prioritaires sont placés en premier (V2-F6)', () => {
  const etat = college({ effectifs: [35, 35, 35, 34] }); // 139 élèves pour 120 rendez-vous
  etat.classes.forEach((c, i) => (c.ppId = ['p0', 'p1', 'p2', 'p4'][i]));
  etat.classes.forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .slice(-PRIORITAIRES_MAX)
      .forEach((e) => (e.prioritaire = true)),
  );
  const r = genererTout(etat);
  assert.equal(r.rapport.ok, false);
  verifierPlanning(r.etat, { complet: false });
  assert.ok(
    r.etat.eleves.some((e) => !e.binomeId),
    'des élèves restent sans place',
  );
  assert.equal(prioritaires(r.etat).length, 20);
  assert.ok(prioritaires(r.etat).every((e) => e.binomeId && e.slot != null && avecSonPP(r.etat, e)));
});

test('4e, professeure principale présente sur 3 créneaux : prioritaires tous placés, un seul message de repli', () => {
  const etat = college4e();
  etat.classes.forEach((c) =>
    etat.eleves
      .filter((e) => e.classeId === c.id)
      .filter((e, i) => i % 5 === 0)
      .slice(0, PRIORITAIRES_MAX)
      .forEach((e) => (e.prioritaire = true)),
  );
  etat.profs.find((p) => p.id === etat.classes[0].ppId).dispoA = '17:45';
  const r = genererTout(etat);
  verifierPlanning(r.etat, { complet: false });
  assert.ok(
    prioritaires(r.etat).every((e) => e.binomeId && e.slot != null),
    'tous les élèves prioritaires ont un rendez-vous',
  );
  // Les autres professeurs principaux reçoivent tous leurs élèves prioritaires : aucun n'est immobilisé ailleurs.
  const horsPP = prioritaires(r.etat).filter((e) => !avecSonPP(r.etat, e));
  assert.ok(horsPP.every((e) => e.classeId === etat.classes[0].id));
  assert.ok(horsPP.length >= 2, 'au moins 2 sur 5 : la professeure principale n’a que 3 créneaux');
  assert.equal(r.rapport.txt.match(/reçu\(s\) par un autre binôme que celui de leur professeur principal/g).length, 1);
});
