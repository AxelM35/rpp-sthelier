import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aCorriger, controler } from '../../src/algos/controles.js';
import { deplacerEleve, deposer } from '../../src/algos/deplacement.js';
import { genererTout } from '../../src/algos/generation.js';
import { college } from '../fixtures/college.js';
import { verifierPlanning } from './invariants.js';

const planning = () => genererTout(college()).etat;

test('déplacer vers un créneau occupé échange les deux rendez-vous', () => {
  const etat = planning();
  const [a, b] = etat.eleves.filter((e) => e.binomeId === etat.binomes[0].id).sort((x, y) => x.slot - y.slot);
  const r = deposer(etat, a.id, 'cell:' + etat.binomes[0].id + ':' + b.slot);
  assert.equal(r.refus, null);
  const apres = (id) => r.etat.eleves.find((e) => e.id === id).slot;
  assert.deepEqual([apres(a.id), apres(b.id)], [b.slot, a.slot]);
  verifierPlanning(r.etat);
});

test('un rendez-vous verrouillé ne peut pas être pris', () => {
  const etat = planning();
  const [a, b] = etat.eleves.filter((e) => e.binomeId === etat.binomes[0].id);
  etat.eleves.find((e) => e.id === b.id).verrou = true;
  const r = deplacerEleve(etat, a.id, b.binomeId, b.slot);
  assert.equal(r.refus, 'Ce rendez-vous est verrouillé.');
  assert.equal(r.etat, etat);
});

test('retirer un élève de son binôme efface horaire et verrou', () => {
  const etat = planning();
  const e = etat.eleves[0];
  etat.eleves[0].verrou = true;
  const r = deposer(etat, e.id, 'none');
  assert.deepEqual(
    ['binomeId', 'slot', 'verrou'].map((k) => r.etat.eleves[0][k]),
    [null, null, false],
  );
});

test('contrôles : un planning généré ne présente aucun point à corriger', () => {
  assert.deepEqual(aCorriger(controler(planning())), []);
});

test('contrôles : date manquante, salle en double, déséquilibre, mauvaise classe', () => {
  const etat = planning();
  etat.soiree.date = '';
  etat.binomes[0].salle = 'B12';
  etat.binomes[1].salle = 'b12 ';
  // Déséquilibre : on vide le binôme 2 vers « non affecté ».
  etat.eleves.filter((e) => e.binomeId === etat.binomes[2].id).forEach((e) => Object.assign(e, { binomeId: null, slot: null }));
  // Élève chez un binôme qui ne reçoit pas sa classe.
  const intrus = etat.eleves.find((e) => e.binomeId && !etat.binomes[3].classeIds.includes(e.classeId));
  intrus.binomeId = etat.binomes[3].id;
  intrus.slot = null;
  const textes = controler(etat).map((p) => p.niveau + ' ' + p.texte);
  const attendu = [
    /avertissement La date de la soirée/,
    /bloquant Salle B12 attribuée à plusieurs binômes/,
    /avertissement Répartition déséquilibrée/,
    /avertissement .* est chez un binôme qui ne couvre pas sa classe/,
    /avertissement \d+ élève\(s\) sans binôme/,
  ];
  for (const motif of attendu)
    assert.ok(
      textes.some((t) => motif.test(t)),
      'attendu : ' + motif + '\n' + textes.join('\n'),
    );
});

test('contrôles : deux élèves sur le même créneau et professeur absent', () => {
  const etat = planning();
  const [a, b] = etat.eleves.filter((e) => e.binomeId === etat.binomes[0].id);
  etat.eleves.find((e) => e.id === b.id).slot = a.slot;
  const prof = etat.profs.find((p) => p.id === etat.binomes[0].profIds[0]);
  prof.dispoA = '17:00';
  const textes = controler(etat).map((p) => p.niveau + ' ' + p.texte);
  assert.ok(textes.some((t) => /^bloquant Deux élèves sur le même créneau/.test(t)));
  assert.ok(textes.some((t) => t.includes(prof.nom + ' est indisponible')));
});

test('génération complète sur plusieurs situations', () => {
  const cas = [
    ['soirée standard', {}, true],
    ['soirée jusqu’à 21h', { fin: '21:00' }, true],
    ['soirée raccourcie à 19h30', { fin: '19:30' }, false],
    ['rendez-vous de 10 minutes', { duree: 10 }, true],
    ['avec une pause', { pauses: [{ debut: '18:30', duree: 15 }], fin: '20:30' }, true],
  ];
  for (const [nom, soiree, possible] of cas) {
    const etat = college();
    Object.assign(etat.soiree, soiree);
    const r = genererTout(etat);
    assert.equal(r.rapport.ok, possible, nom + ' : ' + r.rapport.txt);
    verifierPlanning(r.etat, { complet: possible });
  }
});
